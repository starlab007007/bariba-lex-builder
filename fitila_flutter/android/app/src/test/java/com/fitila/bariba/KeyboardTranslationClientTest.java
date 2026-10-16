package com.fitila.bariba;

import static org.junit.Assert.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 34)
public class KeyboardTranslationClientTest {
    static final String BASE = "https://dvswhjawiooprghzeyol.supabase.co";
    static final String KEY = "sb_publishable_test";
    static class Connection extends HttpURLConnection {
        final ByteArrayOutputStream sent = new ByteArrayOutputStream();
        String response = "{\"translation\":\"A kpuna n do ?\"}";
        int status = 200;
        boolean disconnected;
        boolean timeout;
        boolean offline;
        Connection(URL url) { super(url); }
        @Override public void connect() {}
        @Override public void disconnect() { disconnected = true; }
        @Override public boolean usingProxy() { return false; }
        @Override public OutputStream getOutputStream() { return sent; }
        @Override public int getResponseCode() throws IOException {
            if (timeout) throw new SocketTimeoutException();
            if (offline) throw new UnknownHostException();
            return status;
        }
        @Override public InputStream getInputStream() {
            return new ByteArrayInputStream(response.getBytes(StandardCharsets.UTF_8));
        }
    }
    private Connection connection;
    private KeyboardTranslationClient client() {
        return new KeyboardTranslationClient(BASE + "/", KEY, url -> {
            if (connection == null) connection = new Connection(url);
            return connection;
        });
    }
    private String failure(KeyboardTranslationClient client, String source, String direction) {
        try { client.translate(source, direction); fail("Expected an error"); return ""; }
        catch (KeyboardTranslationClient.TranslationException e) { return e.getMessage(); }
    }
    @Test public void sendsSameByT5ContractWithPublicKeyAndAdequateTimeout() throws Exception {
        assertEquals("A kpuna n do ?", client().translate(" Bonjour ", "fr-ba"));
        assertEquals(BASE + "/functions/v1/byt5-bariba-translate", connection.getURL().toString());
        assertEquals(KEY, connection.getRequestProperty("apikey"));
        assertNull(connection.getRequestProperty("Authorization"));
        assertEquals(65000, connection.getReadTimeout());
        JSONObject sent = new JSONObject(connection.sent.toString("UTF-8"));
        assertEquals("Bonjour", sent.getString("text"));
        assertEquals("french", sent.getString("sourceLang"));
        assertEquals("bariba", sent.getString("targetLang"));
        assertEquals("quality", sent.getString("mode"));
        assertTrue(connection.disconnected);
    }
    @Test public void preservesUnicodeNamesNumbersNegationQuotesAndNewlines() throws Exception {
        KeyboardTranslationClient client = client();
        String source = "ɔ ɛ ŋ, Aïcha n’a pas 12 \\\"livres\\\".\nBaatɔnum";
        client.translate(source, "ba-fr");
        JSONObject sent = new JSONObject(connection.sent.toString("UTF-8"));
        assertEquals(source, sent.getString("text"));
        assertEquals("bariba", sent.getString("sourceLang"));
        assertEquals("french", sent.getString("targetLang"));
    }
    @Test public void decodesEscapedUnicodeAndMultilineJson() throws Exception {
        connection = new Connection(new URL(BASE));
        connection.response = "{\"translation\":\"\\u0254\\u0300 \\\"ŋ\\\"\\n12\"}";
        assertEquals("ɔ̀ \"ŋ\"\n12", client().translate("Texte", "fr-ba"));
    }
    @Test public void rateLimitIsVisibleAndConnectionClosed() throws Exception {
        connection = new Connection(new URL(BASE)); connection.status = 429;
        assertTrue(failure(client(), "Bonjour", "fr-ba").contains("saturé"));
        assertTrue(connection.disconnected);
    }
    @Test public void rejectsAuthenticationError() throws Exception {
        connection = new Connection(new URL(BASE)); connection.status = 401;
        assertTrue(failure(client(), "Bonjour", "fr-ba").contains("refusé"));
    }
    @Test public void timeoutPreservesDraftAndAllowsRetry() throws Exception {
        connection = new Connection(new URL(BASE)); connection.timeout = true;
        assertTrue(failure(client(), "Bonjour", "fr-ba").contains("conservé"));
        connection.timeout = false;
        assertEquals("A kpuna n do ?", client().translate("Bonjour", "fr-ba"));
    }
    @Test public void networkErrorIsVisible() throws Exception {
        connection = new Connection(new URL(BASE)); connection.offline = true;
        assertTrue(failure(client(), "Bonjour", "fr-ba").contains("Internet"));
    }
    @Test public void rejectsEmptyMissingAndNonStringTranslations() throws Exception {
        for (String response : new String[]{"{}", "{\"translation\":\" \"}", "{\"translation\":null}", "{\"translation\":123}", "{\"error\":\"failed\",\"translation\":\"fake\"}"}) {
            connection = new Connection(new URL(BASE)); connection.response = response;
            assertTrue(failure(client(), "Bonjour", "fr-ba").contains("Aucune traduction"));
        }
    }
    @Test public void rejectsMalformedResponse() throws Exception {
        connection = new Connection(new URL(BASE)); connection.response = "not JSON";
        assertTrue(failure(client(), "Bonjour", "fr-ba").contains("invalide"));
        assertTrue(connection.disconnected);
    }
    @Test public void missingConfigDoesNotHangOrSendRequest() {
        assertTrue(failure(new KeyboardTranslationClient("", ""), "Bonjour", "fr-ba").contains("Ouvrez"));
        assertNull(connection);
    }
    @Test public void rejectsEmptyTextAndUnknownDirectionBeforeNetwork() {
        assertTrue(failure(client(), "  ", "fr-ba").contains("Saisissez"));
        assertTrue(failure(client(), "Bonjour", "other").contains("sens"));
        assertNull(connection);
    }
    @Test public void rejectsInsecureEndpointAndSecretKey() {
        assertTrue(failure(new KeyboardTranslationClient("http://example.com", KEY), "Bonjour", "fr-ba").contains("invalide"));
        assertTrue(failure(new KeyboardTranslationClient(BASE, "sb_secret_test"), "Bonjour", "fr-ba").contains("invalide"));
    }
    @Test public void cancellationDoesNotOpenConnection() {
        KeyboardTranslationClient client = client(); client.cancel();
        assertTrue(failure(client, "Bonjour", "fr-ba").contains("annulée"));
        assertNull(connection);
    }
}
