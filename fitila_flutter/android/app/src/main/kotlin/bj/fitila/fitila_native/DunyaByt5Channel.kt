package bj.fitila.fitila_native

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.os.Handler
import android.os.Looper
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors

/**
 * Offline FR ↔ Baatɔnum ByT5 ONNX channel.
 *
 * The fine-tuned checkpoint is a separately installed (SHA-256 verified) pack;
 * no model weights are bundled in the APK. Exactly the same byte tokenizer as
 * scripts/dunya_translate/byt_common.py (byte + 3, EOS=1, PAD/start=0).
 *
 * The ONNX pack MUST use the documented no-cache graph signatures produced by
 * export_mobile_onnx.py. Reject other graphs instead of pretending success.
 */
class DunyaByt5Channel(messenger: BinaryMessenger) {
    private val channel = MethodChannel(messenger, "fitila/dunya_byt5")
    private val worker = Executors.newSingleThreadExecutor()
    private val ui = Handler(Looper.getMainLooper())
    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    private var encoder: OrtSession? = null
    private var decoder: OrtSession? = null

    init {
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "load" -> worker.execute {
                    try {
                        val enc = File(call.argument<String>("encoder") ?: "")
                        val dec = File(call.argument<String>("decoder") ?: "")
                        require(enc.isFile && dec.isFile) { "Pack ByT5 incomplet" }
                        val opts = OrtSession.SessionOptions()
                        opts.setIntraOpNumThreads((call.argument<Int>("threads") ?: 2).coerceIn(1, 4))
                        val newEncoder = env.createSession(enc.absolutePath, opts)
                        val newDecoder = env.createSession(dec.absolutePath, opts)
                        require(newEncoder.inputNames.containsAll(setOf("input_ids", "attention_mask")))
                        require(newDecoder.inputNames.containsAll(setOf(
                            "decoder_input_ids", "encoder_hidden_states", "encoder_attention_mask"
                        ))) { "Export ByT5 incompatible : decoder sans entrées attendues" }
                        encoder?.close()
                        decoder?.close()
                        encoder = newEncoder
                        decoder = newDecoder
                        ui.post { result.success(mapOf("backend" to "onnxruntime-mobile")) }
                    } catch (t: Throwable) {
                        ui.post { result.error("byt5_load", t.message, null) }
                    }
                }
                "translate" -> worker.execute {
                    try {
                        val source = call.argument<String>("text") ?: ""
                        val prefix = call.argument<String>("prefix") ?: ""
                        val maxOutput = (call.argument<Int>("maxLen") ?: 0).let {
                            if (it <= 0) 192 else it.coerceIn(8, 256)
                        }
                        val translated = infer(prefix + source, maxOutput)
                        ui.post { result.success(translated) }
                    } catch (t: Throwable) {
                        ui.post { result.error("byt5_infer", t.message, null) }
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun infer(source: String, maxOutput: Int): String {
        val enc = encoder ?: error("ByT5 non chargé")
        val dec = decoder ?: error("ByT5 non chargé")
        val encoded = source.toByteArray(StandardCharsets.UTF_8)
            .take(511).map { (it.toInt() and 0xff).toLong() + 3L } + 1L
        val inputs = longArrayOf(*encoded.toLongArray())
        val mask = LongArray(inputs.size) { 1L }
        OnnxTensor.createTensor(env, arrayOf(inputs)).use { ids ->
            OnnxTensor.createTensor(env, arrayOf(mask)).use { attention ->
                enc.run(mapOf("input_ids" to ids, "attention_mask" to attention)).use { encodedResult ->
                    val states = encodedResult[0] as OnnxTensor
                    val output = ByteArrayOutputStream()
                    val generated = ArrayList<Long>().apply { add(0L) }
                    repeat(maxOutput) {
                        val next = OnnxTensor.createTensor(env, arrayOf(generated.toLongArray()))
                        next.use { decoderIds ->
                            dec.run(mapOf(
                                "decoder_input_ids" to decoderIds,
                                "encoder_hidden_states" to states,
                                "encoder_attention_mask" to attention
                            )).use { decoded ->
                                @Suppress("UNCHECKED_CAST")
                                val logits = decoded[0].value as Array<Array<FloatArray>>
                                val last = logits[0].last()
                                var best = 0
                                for (i in 1 until last.size) if (last[i] > last[best]) best = i
                                if (best == 1) return output.toString("UTF-8").trim()
                                if (best in 3..258) output.write(best - 3)
                                generated.add(best.toLong())
                            }
                        }
                    }
                    return output.toString("UTF-8").trim()
                }
            }
        }
    }
}
