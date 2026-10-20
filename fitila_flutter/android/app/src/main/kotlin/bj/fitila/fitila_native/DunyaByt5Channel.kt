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
import java.text.Normalizer
import org.json.JSONObject
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
    companion object { private const val EOS_ID = 1L }
    private val channel = MethodChannel(messenger, "fitila/dunya_byt5")
    private val worker = Executors.newSingleThreadExecutor()
    private val ui = Handler(Looper.getMainLooper())
    // Do not initialize a second ONNX JNI stack during app startup.
    // Shared Sherpa/ByT5 runtime compatibility is validated only on
    // an explicit local model load; missing/incompatible packs cannot
    // crash DUNYA's online-only users.
    private val env: OrtEnvironment by lazy(LazyThreadSafetyMode.SYNCHRONIZED) {
        OrtEnvironment.getEnvironment()
    }
    private var encoder: OrtSession? = null
    private var decoder: OrtSession? = null
    private val approvedMemory = HashMap<String, String>()

    private fun normalizeText(value: String): String =
        Normalizer.normalize(value, Normalizer.Form.NFC).trim()
            .replace(Regex("\\s+"), " ")

    private fun memoryKey(direction: String, source: String): String =
        direction + "\u0000" + normalizeText(source)

    private fun readApprovedMemory(file: File): Map<String, String> {
        if (!file.isFile) return emptyMap()
        val root = JSONObject(file.readText(Charsets.UTF_8))
        require(root.optString("format") == "fitila-approved-memory/1")
        val entries = root.getJSONArray("entries")
        val results = HashMap<String, String>()
        for (i in 0 until entries.length()) {
            val e = entries.getJSONObject(i)
            val direction = e.getString("direction")
            require(direction == "fr-ba" || direction == "ba-fr")
            val source = normalizeText(e.getString("source"))
            val target = normalizeText(e.getString("target"))
            require(source.isNotEmpty() && target.isNotEmpty())
            require(results.putIfAbsent(memoryKey(direction, source), target) == null)
        }
        return results
    }

    // Reject obvious generation loops instead of displaying fabricated sentences.
    // Do not use this heuristic to alter vocabulary or grammatical meaning.
    private fun checkedOutput(text: String): String {
        val normalized = normalizeText(text)
        require(normalized.isNotEmpty()) { "Traduction vide" }
        val words = normalized.split(Regex("\\s+"))
        for (size in 1..3) {
            if (words.size < size * 4) continue
            for (start in 0..(words.size - size * 4)) {
                val unit = words.subList(start, start + size)
                if ((1..3).all { k -> words.subList(start + k * size, start + (k + 1) * size) == unit }) {
                    throw IllegalStateException("Répétition détectée : traduction non fiable")
                }
            }
        }
        return normalized
    }

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
                        val verifiedMemory = readApprovedMemory(File(enc.parentFile, "approved_memory.json"))
                        approvedMemory.clear()
                        approvedMemory.putAll(verifiedMemory)
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
                        val direction = call.argument<String>("direction") ?: when {
                            prefix.contains("francais en bariba", ignoreCase = true) -> "fr-ba"
                            prefix.contains("bariba en francais", ignoreCase = true) -> "ba-fr"
                            else -> ""
                        }
                        val normalized = normalizeText(source)
                        val requestedWidth = call.argument<Int>("beamWidth") ?: if (direction == "fr-ba") 2 else 1
                        val beamWidth = requestedWidth.coerceIn(1, 4)
                        val translated = approvedMemory[memoryKey(direction, normalized)]
                            ?: checkedOutput(infer(prefix + normalized, maxOutput, beamWidth))
                        ui.post { result.success(translated) }
                    } catch (t: Throwable) {
                        ui.post { result.error("byt5_infer", t.message, null) }
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private data class Beam(val ids: List<Long>, val logScore: Double, val finished: Boolean)

    private fun infer(source: String, maxOutput: Int, beamWidth: Int): String {
        val enc = encoder ?: error("ByT5 non chargé")
        val dec = decoder ?: error("ByT5 non chargé")
        // Keep the same byte-level truncation as the FITILA ByT5 training pipeline.
        // The 511-byte limit includes the direction prefix and reserves EOS.
        val encoded = source.toByteArray(StandardCharsets.UTF_8)
            .take(511).map { (it.toInt() and 0xff).toLong() + 3L } + EOS_ID
        val inputs = longArrayOf(*encoded.toLongArray())
        val mask = LongArray(inputs.size) { 1L }
        OnnxTensor.createTensor(env, arrayOf(inputs)).use { ids ->
            OnnxTensor.createTensor(env, arrayOf(mask)).use { attention ->
                enc.run(mapOf("input_ids" to ids, "attention_mask" to attention)).use { encodedResult ->
                    val states = encodedResult[0] as OnnxTensor
                    var beams = listOf(Beam(listOf(0L), 0.0, false))
                    repeat(maxOutput) {
                        val candidates = ArrayList<Beam>()
                        for (beam in beams) {
                            if (beam.finished) {
                                candidates.add(beam)
                                continue
                            }
                            OnnxTensor.createTensor(env, arrayOf(beam.ids.toLongArray())).use { decoderIds ->
                                dec.run(mapOf(
                                    "decoder_input_ids" to decoderIds,
                                    "encoder_hidden_states" to states,
                                    "encoder_attention_mask" to attention
                                )).use { decoded ->
                                    @Suppress("UNCHECKED_CAST")
                                    val logits = decoded[0].value as Array<Array<FloatArray>>
                                    val last = logits[0].last()
                                    val maxLogit = last.maxOrNull()?.toDouble() ?: error("Sortie ByT5 vide")
                                    var sum = 0.0
                                    for (value in last) sum += kotlin.math.exp(value.toDouble() - maxLogit)
                                    val normalizer = maxLogit + kotlin.math.ln(sum)
                                    val top = last.indices.sortedByDescending { last[it] }.take(beamWidth)
                                    for (token in top) {
                                        candidates.add(Beam(
                                            beam.ids + token.toLong(),
                                            beam.logScore + last[token].toDouble() - normalizer,
                                            token == 1
                                        ))
                                    }
                                }
                            }
                        }
                        // Same length-normalized ranking as the standalone FP32 beam experiment.
                        beams = candidates.sortedByDescending {
                            it.logScore / java.lang.Math.pow((it.ids.size - 1).coerceAtLeast(1).toDouble(), 0.6)
                        }.take(beamWidth)
                        if (beams.all { it.finished }) {
                            val bytes = ByteArrayOutputStream()
                            for (token in beams.first().ids) if (token in 3L..258L) bytes.write((token - 3).toInt())
                            return bytes.toString("UTF-8").trim()
                        }
                    }
                    val bytes = ByteArrayOutputStream()
                    for (token in beams.first().ids) if (token in 3L..258L) bytes.write((token - 3).toInt())
                    return bytes.toString("UTF-8").trim()
                }
            }
        }
    }
}
