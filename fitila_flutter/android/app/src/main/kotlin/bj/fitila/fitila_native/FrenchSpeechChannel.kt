package bj.fitila.fitila_native

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel

/** One bounded French recognition session, owned by the current screen. */
class FrenchSpeechChannel(private val context: Context, messenger: BinaryMessenger) {
    private val channel = MethodChannel(messenger, "fitila/french_speech")
    private val handler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var pending: MethodChannel.Result? = null
    private var deadline: Runnable? = null

    init {
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "available" -> result.success(SpeechRecognizer.isRecognitionAvailable(context))
                "listen" -> start(result)
                "stop" -> { recognizer?.stopListening(); result.success(null) }
                "cancel" -> { finish(""); result.success(null) }
                else -> result.notImplemented()
            }
        }
    }

    private fun finish(text: String?, error: Int? = null) {
        val result = pending
        pending = null
        deadline?.let { handler.removeCallbacks(it) }
        deadline = null
        val old = recognizer
        recognizer = null
        old?.cancel()
        old?.destroy()
        if (error != null) result?.error("french_speech_$error", "Reconnaissance française indisponible. Réessayez.", null)
        else result?.success(text ?: "")
    }

    private fun start(result: MethodChannel.Result) {
        finish("")
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            result.error("unavailable", "Reconnaissance française non installée.", null)
            return
        }
        pending = result
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(context)
            recognizer!!.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) { if (pending === result) channel.invokeMethod("level", ((rmsdB + 2) / 12).coerceIn(0f, 1f).toDouble()) }
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onEvent(eventType: Int, params: Bundle?) {}
                override fun onPartialResults(results: Bundle?) {
                    if (pending !== result) return
                    results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let {
                        channel.invokeMethod("partial", it)
                    }
                }
                override fun onResults(results: Bundle?) {
                    if (pending !== result) return
                    finish(results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull())
                }
                override fun onError(error: Int) {
                    if (pending !== result) return
                    if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) finish("")
                    else finish(null, error)
                }
            })
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR")
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            deadline = Runnable { if (pending === result) finish("") }.also { handler.postDelayed(it, 25000) }
            recognizer!!.startListening(intent)
        } catch (_: Exception) {
            finish(null, SpeechRecognizer.ERROR_CLIENT)
        }
    }
}
