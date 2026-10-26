package bj.fitila.fitila_native

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.webkit.URLUtil
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel
import java.io.File

/**
 * Android system DownloadManager keeps transfers alive while the FITILA UI is
 * closed; files are written to public Downloads/FITILA, not app-private cache.
 * Android's notification and retry policies remain under OS control.
 *
 * Do not place secrets or authenticated URLs here: Downloads is user-visible.
 */
class PersistentPackDownloadChannel(
    private val context: Context,
    messenger: BinaryMessenger,
) {
    private val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    private val channel = MethodChannel(messenger, "fitila/persistent_packs")

    init {
        channel.setMethodCallHandler { call, result ->
            try {
                when (call.method) {
                    "enqueue" -> {
                        val url = call.argument<String>("url") ?: error("Missing URL")
                        require(Uri.parse(url).scheme == "https") { "HTTPS required" }
                        val filename = call.argument<String>("filename") ?: error("Missing filename")
                        require(Regex("^[A-Za-z0-9._-]{1,160}$").matches(filename) && !filename.contains("..")) {
                            "Invalid file name"
                        }
                        val req = DownloadManager.Request(Uri.parse(url))
                            .setTitle("FITILA · $filename")
                            .setDescription("Pack hors ligne · téléchargement persistant")
                            .setAllowedOverMetered(true)
                            .setAllowedOverRoaming(false)
                            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "FITILA/$filename")
                        result.success(manager.enqueue(req))
                    }
                    "status" -> {
                        val id = call.argument<Number>("id")?.toLong() ?: error("Missing id")
                        val query = DownloadManager.Query().setFilterById(id)
                        manager.query(query).use { cursor ->
                            if (!cursor.moveToFirst()) { result.success(null); return@setMethodCallHandler }
                            fun col(key: String) = cursor.getColumnIndexOrThrow(key)
                            val status = cursor.getInt(col(DownloadManager.COLUMN_STATUS))
                            val bytes = cursor.getLong(col(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
                            val total = cursor.getLong(col(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
                            val localUri = cursor.getString(col(DownloadManager.COLUMN_LOCAL_URI))
                            result.success(mapOf("status" to status, "received" to bytes, "total" to total, "uri" to localUri))
                        }
                    }
                    "cancel" -> {
                        val id = call.argument<Number>("id")?.toLong() ?: error("Missing id")
                        result.success(manager.remove(id))
                    }
                    else -> result.notImplemented()
                }
            } catch (e: Exception) {
                result.error("pack_download", e.message, null)
            }
        }
    }
}
