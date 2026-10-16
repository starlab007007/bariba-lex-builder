package bj.fitila.fitila_native

import android.app.ActivityManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.SamplerConfig
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * DUNYA "cerveau" bridge: Gemma running fully on the phone with LiteRT-LM.
 *
 * MethodChannel `fitila/dunya_llm`
 *   deviceInfo                       -> {totalRamMb, availRamMb, lowRam, cores, abi}
 *   load {modelPath, cacheDir, preferGpu, maxTokens} -> {backend}
 *   startConversation {system, history:[{role,text}], temperature, maxOutput} -> null
 *   generate {requestId, text}       -> null (chunks on the event channel)
 *   cancel                           -> null
 *   unload                           -> null
 * EventChannel `fitila/dunya_llm/stream`
 *   {requestId, type: delta|done|error, text}
 */
class DunyaLlmChannel(private val context: Context, messenger: BinaryMessenger) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val main = Handler(Looper.getMainLooper())
    private val lock = Mutex()
    private var engine: Engine? = null
    private var conversation: Conversation? = null
    private var backendName = ""
    private var events: EventChannel.EventSink? = null
    private var currentJob: Job? = null

    init {
        EventChannel(messenger, STREAM).setStreamHandler(object : EventChannel.StreamHandler {
            override fun onListen(arguments: Any?, sink: EventChannel.EventSink?) {
                events = sink
            }

            override fun onCancel(arguments: Any?) {
                events = null
            }
        })

        MethodChannel(messenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "deviceInfo" -> result.success(deviceInfo())
                "load" -> {
                    val modelPath = call.argument<String>("modelPath")
                    if (modelPath == null || !File(modelPath).exists()) {
                        result.error("missing_model", "Modèle introuvable", null)
                        return@setMethodCallHandler
                    }
                    val preferGpu = call.argument<Boolean>("preferGpu") ?: true
                    val maxTokens = call.argument<Int>("maxTokens") ?: 2048
                    val cacheDir = call.argument<String>("cacheDir") ?: context.cacheDir.path
                    scope.launch {
                        try {
                            val backend = load(modelPath, cacheDir, preferGpu, maxTokens)
                            reply { result.success(mapOf("backend" to backend)) }
                        } catch (error: Throwable) {
                            reply { result.error("load_failed", error.message ?: error.toString(), null) }
                        }
                    }
                }
                "startConversation" -> {
                    val system = call.argument<String>("system") ?: ""
                    val history = call.argument<List<Map<String, Any?>>>("history") ?: emptyList()
                    val temperature = call.argument<Double>("temperature") ?: 0.7
                    val maxOutput = call.argument<Int>("maxOutput") ?: 512
                    scope.launch {
                        try {
                            startConversation(system, history, temperature, maxOutput)
                            reply { result.success(null) }
                        } catch (error: Throwable) {
                            reply { result.error("conversation_failed", error.message ?: error.toString(), null) }
                        }
                    }
                }
                "generate" -> {
                    val requestId = call.argument<Int>("requestId") ?: 0
                    val text = call.argument<String>("text") ?: ""
                    generate(requestId, text)
                    result.success(null)
                }
                "cancel" -> {
                    try {
                        conversation?.cancelProcess()
                    } catch (_: Throwable) {
                    }
                    currentJob?.cancel()
                    result.success(null)
                }
                "unload" -> {
                    scope.launch {
                        lock.withLock { release() }
                        reply { result.success(null) }
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun deviceInfo(): Map<String, Any> {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val info = ActivityManager.MemoryInfo()
        am.getMemoryInfo(info)
        return mapOf(
            "totalRamMb" to (info.totalMem / (1024 * 1024)).toInt(),
            "availRamMb" to (info.availMem / (1024 * 1024)).toInt(),
            "lowRam" to am.isLowRamDevice,
            "cores" to Runtime.getRuntime().availableProcessors(),
            "abi" to (android.os.Build.SUPPORTED_ABIS.firstOrNull() ?: ""),
            "loaded" to (engine != null),
            "backend" to backendName,
        )
    }

    private suspend fun load(modelPath: String, cacheDir: String, preferGpu: Boolean, maxTokens: Int): String =
        lock.withLock {
            release()
            val attempts = if (preferGpu) listOf("gpu", "cpu") else listOf("cpu")
            var lastError: Throwable? = null
            for (name in attempts) {
                try {
                    val backend = if (name == "gpu") Backend.GPU() else Backend.CPU()
                    val created = Engine(
                        EngineConfig(
                            modelPath = modelPath,
                            backend = backend,
                            maxNumTokens = maxTokens,
                            cacheDir = cacheDir,
                        ),
                    )
                    created.initialize()
                    engine = created
                    backendName = name
                    return@withLock name
                } catch (error: Throwable) {
                    lastError = error
                }
            }
            throw lastError ?: IllegalStateException("Échec du chargement")
        }

    private suspend fun startConversation(
        system: String,
        history: List<Map<String, Any?>>,
        temperature: Double,
        maxOutput: Int,
    ) = lock.withLock {
        val current = engine ?: throw IllegalStateException("Cerveau non chargé")
        try {
            conversation?.close()
        } catch (_: Throwable) {
        }
        val initial = history.mapNotNull { turn ->
            val text = turn["text"]?.toString()?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            if (turn["role"] == "user") Message.user(text) else Message.model(text)
        }
        conversation = current.createConversation(
            ConversationConfig(
                systemInstruction = if (system.isBlank()) null else Contents.of(system),
                initialMessages = initial,
                samplerConfig = SamplerConfig(topK = 40, topP = 0.95, temperature = temperature),
                maxOutputToken = maxOutput,
            ),
        )
    }

    private fun generate(requestId: Int, text: String) {
        currentJob?.cancel()
        currentJob = scope.launch {
            val convo = conversation
            if (convo == null) {
                emit(requestId, "error", "Conversation non démarrée")
                return@launch
            }
            try {
                convo.sendMessageAsync(text)
                    .catch { error -> emit(requestId, "error", error.message ?: error.toString()) }
                    .collect { chunk -> emit(requestId, "delta", chunk.toString()) }
                emit(requestId, "done", "")
            } catch (error: Throwable) {
                emit(requestId, "error", error.message ?: error.toString())
            }
        }
    }

    private fun release() {
        try {
            conversation?.close()
        } catch (_: Throwable) {
        }
        try {
            engine?.close()
        } catch (_: Throwable) {
        }
        conversation = null
        engine = null
        backendName = ""
    }

    private fun emit(requestId: Int, type: String, text: String) {
        main.post { events?.success(mapOf("requestId" to requestId, "type" to type, "text" to text)) }
    }

    private fun reply(block: () -> Unit) {
        main.post(block)
    }

    fun dispose() {
        scope.cancel()
        release()
    }

    companion object {
        const val CHANNEL = "fitila/dunya_llm"
        const val STREAM = "fitila/dunya_llm/stream"
    }
}
