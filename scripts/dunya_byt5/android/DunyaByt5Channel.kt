package bj.fitila.fitila_native

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.os.Handler
import android.os.Looper
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel
import java.nio.LongBuffer
import java.util.concurrent.Executors

/**
 * FITILA ByT5 French <-> Baatɔnum translation, fully offline (ONNX Runtime).
 *
 * MethodChannel `fitila/dunya_byt5`
 *   load {encoder, decoder, threads} -> null
 *   translate {text, prefix, maxLen} -> String
 *   unload -> null
 *
 * ByT5 tokens are UTF-8 bytes + 3 (0 = pad / decoder start, 1 = </s>).
 */
class DunyaByt5Channel(context: Context, messenger: BinaryMessenger) {
    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private var env: OrtEnvironment? = null
    private var encoder: OrtSession? = null
    private var decoder: OrtSession? = null

    init {
        MethodChannel(messenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "load" -> {
                    val enc = call.argument<String>("encoder")
                    val dec = call.argument<String>("decoder")
                    val threads = call.argument<Int>("threads") ?: 2
                    worker.execute {
                        try {
                            if (enc == null || dec == null) throw IllegalArgumentException("chemins manquants")
                            load(enc, dec, threads)
                            main.post { result.success(null) }
                        } catch (error: Throwable) {
                            main.post { result.error("load_failed", error.message ?: error.toString(), null) }
                        }
                    }
                }
                "translate" -> {
                    val text = call.argument<String>("text") ?: ""
                    val prefix = call.argument<String>("prefix") ?: ""
                    val maxLen = call.argument<Int>("maxLen") ?: 0
                    worker.execute {
                        try {
                            val out = translate(prefix + text, maxLen)
                            main.post { result.success(out) }
                        } catch (error: Throwable) {
                            main.post { result.error("translate_failed", error.message ?: error.toString(), null) }
                        }
                    }
                }
                "unload" -> worker.execute {
                    release()
                    main.post { result.success(null) }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun load(encoderPath: String, decoderPath: String, threads: Int) {
        release()
        val environment = OrtEnvironment.getEnvironment()
        val options = OrtSession.SessionOptions().apply {
            setIntraOpNumThreads(threads)
            setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
        }
        env = environment
        encoder = environment.createSession(encoderPath, options)
        decoder = environment.createSession(decoderPath, options)
    }

    private fun translate(input: String, maxLenArg: Int): String {
        val environment = env ?: throw IllegalStateException("Traducteur non chargé")
        val enc = encoder ?: throw IllegalStateException("Traducteur non chargé")
        val dec = decoder ?: throw IllegalStateException("Traducteur non chargé")
        val bytes = input.toByteArray(Charsets.UTF_8)
        val ids = LongArray(bytes.size + 1)
        for (i in bytes.indices) ids[i] = ((bytes[i].toInt() and 0xFF) + 3).toLong()
        ids[bytes.size] = 1L
        val shape = longArrayOf(1, ids.size.toLong())
        val mask = LongArray(ids.size) { 1L }
        val maxLen = if (maxLenArg > 0) maxLenArg else minOf(400, ids.size * 2 + 24)

        OnnxTensor.createTensor(environment, LongBuffer.wrap(ids), shape).use { idsTensor ->
            OnnxTensor.createTensor(environment, LongBuffer.wrap(mask), shape).use { maskTensor ->
                enc.run(mapOf("input_ids" to idsTensor, "attention_mask" to maskTensor)).use { encOut ->
                    val hidden = encOut.get(0) as OnnxTensor
                    val out = ArrayList<Long>(maxLen + 1)
                    out.add(0L)
                    for (step in 0 until maxLen) {
                        val decIds = out.toLongArray()
                        OnnxTensor.createTensor(environment, LongBuffer.wrap(decIds), longArrayOf(1, decIds.size.toLong())).use { decTensor ->
                            dec.run(
                                mapOf(
                                    "decoder_input_ids" to decTensor,
                                    "encoder_hidden_states" to hidden,
                                    "encoder_attention_mask" to maskTensor,
                                ),
                            ).use { decOut ->
                                @Suppress("UNCHECKED_CAST")
                                val logits = (decOut.get(0).value as Array<FloatArray>)[0]
                                var best = 0
                                for (i in 1 until logits.size) if (logits[i] > logits[best]) best = i
                                if (best == 1) return decode(out)
                                out.add(best.toLong())
                            }
                        }
                    }
                    return decode(out)
                }
            }
        }
    }

    private fun decode(ids: List<Long>): String {
        val bytes = ids.drop(1).filter { it in 3..258 }.map { (it - 3).toByte() }.toByteArray()
        return String(bytes, Charsets.UTF_8).replace("�", "").trim()
    }

    private fun release() {
        try {
            encoder?.close()
        } catch (_: Throwable) {
        }
        try {
            decoder?.close()
        } catch (_: Throwable) {
        }
        encoder = null
        decoder = null
    }

    companion object {
        const val CHANNEL = "fitila/dunya_byt5"
    }
}
