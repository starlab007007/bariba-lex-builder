package com.fitila.bariba

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.charset.StandardCharsets
import java.text.Normalizer
import org.json.JSONObject

/**
 * Offline FR <-> Baatɔnum ByT5 for the system keyboard (same pack and same decoding as the app's
 * DUNYA channel). The pack is installed by the app under <filesDir>/dunya_packs/dunya-translate-byt5.
 * It is a BETA ("tested": false): every caller must announce "test (bêta)" next to the result.
 * Loaded lazily on the first offline request and released with [release].
 */
object OfflineByt5 {
    private const val PACK_ID = "dunya-translate-byt5"
    private const val EOS_ID = 1L
    private val lock = Any()
    private var env: OrtEnvironment? = null
    private var encoder: OrtSession? = null
    private var decoder: OrtSession? = null
    private var prefixFrBa = "fr-ba: "
    private var prefixBaFr = "ba-fr: "
    private var memory: Map<String, String> = emptyMap()
    private var loadedFrom: String? = null

    private fun normalize(value: String): String =
        Normalizer.normalize(value, Normalizer.Form.NFC).trim().replace(Regex("\\s+"), " ")

    private fun packDir(context: Context): File = File(context.filesDir, "dunya_packs/$PACK_ID")

    /** True when a beta or certified pack is installed (manifest declares its status). */
    fun isInstalled(context: Context): Boolean = try {
        val dir = packDir(context)
        val manifest = File(dir, "manifest.json")
        if (!manifest.isFile || !File(dir, "byt5/encoder.onnx").isFile || !File(dir, "byt5/decoder.onnx").isFile) {
            false
        } else {
            val json = JSONObject(manifest.readText(Charsets.UTF_8))
            json.optString("id") == PACK_ID && json.optString("format") == "dunya-pack/1" && json.has("tested")
        }
    } catch (_: Throwable) {
        false
    }

    private fun ensureLoaded(context: Context) {
        val dir = File(packDir(context), "byt5")
        if (loadedFrom == dir.absolutePath && encoder != null && decoder != null) return
        val enc = File(dir, "encoder.onnx")
        val dec = File(dir, "decoder.onnx")
        require(enc.isFile && dec.isFile) { "Pack ByT5 incomplet" }
        val e = env ?: OrtEnvironment.getEnvironment().also { env = it }
        val opts = OrtSession.SessionOptions()
        opts.setIntraOpNumThreads(2)
        val newEncoder = e.createSession(enc.absolutePath, opts)
        val newDecoder = e.createSession(dec.absolutePath, opts)
        require(newEncoder.inputNames.containsAll(setOf("input_ids", "attention_mask")))
        require(newDecoder.inputNames.containsAll(setOf("decoder_input_ids", "encoder_hidden_states", "encoder_attention_mask")))
        val cfg = File(dir, "config.json")
        if (cfg.isFile) {
            val c = JSONObject(cfg.readText(Charsets.UTF_8))
            require(c.optString("format") == "fitila-byt5-mobile/1" && c.optString("tokenizer") == "byt5-bytes-plus-3")
            prefixFrBa = c.optString("prefix_fr_ba", prefixFrBa)
            prefixBaFr = c.optString("prefix_ba_fr", prefixBaFr)
        }
        val mem = HashMap<String, String>()
        val memFile = File(dir, "approved_memory.json")
        if (memFile.isFile) {
            val root = JSONObject(memFile.readText(Charsets.UTF_8))
            if (root.optString("format") == "fitila-approved-memory/1") {
                val entries = root.getJSONArray("entries")
                for (i in 0 until entries.length()) {
                    val o = entries.getJSONObject(i)
                    mem[o.getString("direction") + "\u0000" + normalize(o.getString("source"))] = normalize(o.getString("target"))
                }
            }
        }
        encoder?.close()
        decoder?.close()
        encoder = newEncoder
        decoder = newDecoder
        memory = mem
        loadedFrom = dir.absolutePath
    }

    /** Returns the translation, or null when the pack is missing or the output is unreliable. Blocking: call off the main thread. */
    fun translate(context: Context, text: String, direction: String): String? {
        if (direction != "fr-ba" && direction != "ba-fr") return null
        val source = normalize(text)
        if (source.isEmpty() || !isInstalled(context)) return null
        synchronized(lock) {
            return try {
                ensureLoaded(context)
                memory[direction + "\u0000" + source]
                    ?: checked(source, infer((if (direction == "fr-ba") prefixFrBa else prefixBaFr) + source, 192, if (direction == "fr-ba") 2 else 1))
            } catch (_: Throwable) {
                null
            }
        }
    }

    fun release() {
        synchronized(lock) {
            try { encoder?.close() } catch (_: Throwable) {}
            try { decoder?.close() } catch (_: Throwable) {}
            encoder = null
            decoder = null
            loadedFrom = null
        }
    }

    // Reject empty output, an unchanged copy of the input and obvious generation loops.
    private fun checked(source: String, raw: String): String? {
        val out = normalize(raw)
        if (out.isEmpty() || out.equals(source, ignoreCase = true)) return null
        val words = out.split(" ")
        for (size in 1..3) {
            if (words.size < size * 4) continue
            for (start in 0..(words.size - size * 4)) {
                val unit = words.subList(start, start + size)
                if ((1..3).all { k -> words.subList(start + k * size, start + (k + 1) * size) == unit }) return null
            }
        }
        return out
    }

    private data class Beam(val ids: List<Long>, val logScore: Double, val finished: Boolean)

    private fun infer(source: String, maxOutput: Int, beamWidth: Int): String {
        val e = env ?: error("ByT5 non chargé")
        val enc = encoder ?: error("ByT5 non chargé")
        val dec = decoder ?: error("ByT5 non chargé")
        val encoded = source.toByteArray(StandardCharsets.UTF_8)
            .take(511).map { (it.toInt() and 0xff).toLong() + 3L } + EOS_ID
        val inputs = encoded.toLongArray()
        val mask = LongArray(inputs.size) { 1L }
        OnnxTensor.createTensor(e, arrayOf(inputs)).use { ids ->
            OnnxTensor.createTensor(e, arrayOf(mask)).use { attention ->
                enc.run(mapOf("input_ids" to ids, "attention_mask" to attention)).use { encodedResult ->
                    val states = encodedResult[0] as OnnxTensor
                    var beams = listOf(Beam(listOf(0L), 0.0, false))
                    repeat(maxOutput) {
                        val candidates = ArrayList<Beam>()
                        for (beam in beams) {
                            if (beam.finished) { candidates.add(beam); continue }
                            OnnxTensor.createTensor(e, arrayOf(beam.ids.toLongArray())).use { decoderIds ->
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
                                        candidates.add(Beam(beam.ids + token.toLong(), beam.logScore + last[token].toDouble() - normalizer, token == 1))
                                    }
                                }
                            }
                        }
                        beams = candidates.sortedByDescending {
                            it.logScore / Math.pow((it.ids.size - 1).coerceAtLeast(1).toDouble(), 0.6)
                        }.take(beamWidth)
                        if (beams.all { it.finished }) return decode(beams.first().ids)
                    }
                    return decode(beams.first().ids)
                }
            }
        }
    }

    private fun decode(ids: List<Long>): String {
        val bytes = ByteArrayOutputStream()
        for (token in ids) if (token in 3L..258L) bytes.write((token - 3).toInt())
        return bytes.toString("UTF-8").trim()
    }
}
