package com.fitila.bariba;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

@CapacitorPlugin(name = "BaribaKeyboard")
public class BaribaKeyboardPlugin extends Plugin {

    private static final String PREFS_NAME = "bariba_keyboard_data";

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void getHistory(PluginCall call) {
        try {
            String history = getPrefs().getString("history", "[]");
            JSObject result = new JSObject();
            result.put("history", history);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get history", e);
        }
    }

    @PluginMethod
    public void getSuggestions(PluginCall call) {
        try {
            SharedPreferences prefs = getPrefs();
            String suggestions = prefs.getString("suggestions", "[]");
            String lastWord = prefs.getString("lastWord", "");
            JSObject result = new JSObject();
            result.put("suggestions", suggestions);
            result.put("lastWord", lastWord);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get suggestions", e);
        }
    }

    @PluginMethod
    public void clearHistory(PluginCall call) {
        try {
            getPrefs().edit()
                .remove("history")
                .remove("suggestions")
                .remove("lastWord")
                .apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to clear history", e);
        }
    }

    @PluginMethod
    public void saveWord(PluginCall call) {
        try {
            String word = call.getString("word");
            if (word == null || word.trim().isEmpty()) {
                call.reject("Word is required");
                return;
            }

            SharedPreferences prefs = getPrefs();
            String existing = prefs.getString("history", "[]");
            JSONArray arr = new JSONArray(existing);

            // Build new array with word at front, deduplicated, max 50
            JSONArray newArr = new JSONArray();
            newArr.put(word);
            for (int i = 0; i < arr.length(); i++) {
                String item = arr.getString(i);
                if (!item.equals(word) && newArr.length() < 50) {
                    newArr.put(item);
                }
            }

            prefs.edit().putString("history", newArr.toString()).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to save word", e);
        }
    }

    @PluginMethod
    public void getStats(PluginCall call) {
        try {
            SharedPreferences prefs = getPrefs();
            String history = prefs.getString("history", "[]");
            JSONArray arr = new JSONArray(history);
            JSObject result = new JSObject();
            result.put("historyCount", arr.length());
            result.put("lastWord", prefs.getString("lastWord", ""));
            result.put("hasSuggestions", prefs.getString("suggestions", "[]").length() > 2);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get stats", e);
        }
    }

    @PluginMethod
    public void bulkImport(PluginCall call) {
        try {
            String wordsJson = call.getString("words");
            if (wordsJson == null) {
                call.reject("Words array is required");
                return;
            }
            JSONArray importWords = new JSONArray(wordsJson);
            SharedPreferences prefs = getPrefs();
            String existing = prefs.getString("history", "[]");
            JSONArray arr = new JSONArray(existing);

            // Merge: imported words first, then existing, dedup, max 50
            JSONArray merged = new JSONArray();
            java.util.Set<String> seen = new java.util.HashSet<>();

            for (int i = 0; i < importWords.length() && merged.length() < 50; i++) {
                String w = importWords.getString(i);
                if (!seen.contains(w)) {
                    merged.put(w);
                    seen.add(w);
                }
            }
            for (int i = 0; i < arr.length() && merged.length() < 50; i++) {
                String w = arr.getString(i);
                if (!seen.contains(w)) {
                    merged.put(w);
                    seen.add(w);
                }
            }

            prefs.edit().putString("history", merged.toString()).apply();
            JSObject result = new JSObject();
            result.put("imported", merged.length());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to bulk import", e);
        }
    }
}