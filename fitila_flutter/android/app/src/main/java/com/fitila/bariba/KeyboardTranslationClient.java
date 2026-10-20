package com.fitila.bariba;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;

/** Uses the same public FITILA translation pipeline as the web translator.
 * Provider credentials and corpus fallbacks remain exclusively on the backend.
 */
final class KeyboardTranslationClient {
    static final String FUNCTION = "byt5-bariba-translate";
    static final int CONNECT_TIMEOUT_MS = 10_000;
    // The backend's own deadline is 55 seconds; do not abort it after 6 seconds.
    static final int READ_TIMEOUT_MS = 65_000;
    private final String baseUrl;
    private final String publicKey;
    private final ConnectionFactory connections;
    private volatile HttpURLConnection active;
    private volatile boolean cancelled;

    interface ConnectionFactory { HttpURLConnection open(URL url) throws IOException; }

    static final class TranslationException extends Exception {
        /** True when the failure is the network itself (offline, timeout), so an on-device fallback makes sense. */
        final boolean connectivity;
        TranslationException(String message) { this(message, false); }
        TranslationException(String message, boolean connectivity) { super(message); this.connectivity = connectivity; }
    }

    boolean isConfigured() { return !baseUrl.isEmpty() && !publicKey.isEmpty(); }

    KeyboardTranslationClient(String baseUrl, String publicKey) {
        this(baseUrl, publicKey, url -> (HttpURLConnection) url.openConnection());
    }

    KeyboardTranslationClient(String baseUrl, String publicKey, ConnectionFactory connections) {
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim().replaceAll("/+$", "");
        this.publicKey = publicKey == null ? "" : publicKey.trim();
        this.connections = connections;
    }

    void cancel() {
        cancelled = true;
        HttpURLConnection connection = active;
        if (connection != null) connection.disconnect();
    }

    String translate(String source, String direction) throws TranslationException {
        String text = source == null ? "" : Normalizer.normalize(source.trim(), Normalizer.Form.NFC);
        if (text.isEmpty()) throw new TranslationException("Saisissez un texte à traduire.");
        if (text.length() > 5000) throw new TranslationException("Limitez le texte à 5 000 caractères.");
        if (!"fr-ba".equals(direction) && !"ba-fr".equals(direction)) {
            throw new TranslationException("Choisissez un sens de traduction.");
        }
        if (baseUrl.isEmpty() || publicKey.isEmpty()) {
            throw new TranslationException("Ouvrez l’application FITILA pour activer la traduction du clavier, puis réessayez.");
        }
        if (publicKey.startsWith("sb_secret_")) {
            throw new TranslationException("Configuration de traduction invalide. Ouvrez FITILA.");
        }
        HttpURLConnection connection = null;
        try {
            URL endpoint = new URL(baseUrl + "/functions/v1/" + FUNCTION);
            if (!"https".equals(endpoint.getProtocol()) || endpoint.getHost().isEmpty()
                    || endpoint.getUserInfo() != null || endpoint.getQuery() != null) {
                throw new TranslationException("Configuration de traduction invalide. Ouvrez FITILA.");
            }
            if (cancelled) throw new TranslationException("Traduction annulée.");
            boolean toFrench = "ba-fr".equals(direction);
            JSONObject request = new JSONObject();
            request.put("text", text);
            request.put("sourceLang", toFrench ? "bariba" : "french");
            request.put("targetLang", toFrench ? "french" : "bariba");
            request.put("mode", "quality");
            byte[] payload = request.toString().getBytes(StandardCharsets.UTF_8);
            connection = connections.open(endpoint);
            active = connection;
            if (cancelled) throw new TranslationException("Traduction annulée.");
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setInstanceFollowRedirects(false);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            // A publishable key is not a JWT. The public function accepts apikey;
            // never put sb_publishable_* into an Authorization Bearer header.
            connection.setRequestProperty("apikey", publicKey);
            connection.setFixedLengthStreamingMode(payload.length);
            try (OutputStream output = connection.getOutputStream()) { output.write(payload); }
            int status = connection.getResponseCode();
            if (status == 429) throw new TranslationException("Service momentanément saturé. Patientez puis appuyez sur Traduire.");
            if (status == 401 || status == 403) {
                throw new TranslationException("Accès au traducteur refusé. Rouvrez FITILA puis réessayez.");
            }
            if (status == 408 || status == 504) throw new TranslationException("Le traducteur met trop de temps à répondre. Réessayez.");
            if (status < 200 || status >= 300) throw new TranslationException("Traducteur indisponible. Réessayez dans un instant.");
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (InputStream input = connection.getInputStream()) {
                byte[] chunk = new byte[4096];
                int count;
                while ((count = input.read(chunk)) != -1) {
                    if (cancelled) throw new TranslationException("Traduction annulée.");
                    bytes.write(chunk, 0, count);
                    if (bytes.size() > 1_000_000) throw new TranslationException("Réponse du traducteur invalide. Réessayez.");
                }
            }
            JSONObject response = new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
            Object translated = response.opt("translation");
            if (response.optBoolean("success", true) == false
                    || (response.has("error") && !response.isNull("error") && !response.optString("error").isEmpty())
                    || !(translated instanceof String) || ((String) translated).trim().isEmpty()) {
                throw new TranslationException("Aucune traduction disponible pour ce texte. Vous pouvez le modifier puis réessayer.");
            }
            if (cancelled) throw new TranslationException("Traduction annulée.");
            return Normalizer.normalize(((String) translated).trim(), Normalizer.Form.NFC);
        } catch (SocketTimeoutException e) {
            throw new TranslationException("Le traducteur met trop de temps à répondre. Votre texte est conservé ; réessayez.", true);
        } catch (IOException e) {
            throw new TranslationException(cancelled ? "Traduction annulée." : "Connexion impossible. Vérifiez Internet puis réessayez ; votre texte est conservé.", !cancelled);
        } catch (org.json.JSONException e) {
            throw new TranslationException("Réponse du traducteur invalide. Réessayez.");
        } finally {
            if (connection != null) connection.disconnect();
            active = null;
        }
    }
}
