package com.qingning.settings;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.AsyncTask;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class UpdateChecker {

    private static final String TAG = "UpdateChecker";
    private static final String UPDATE_URL = "https://3862242786-sudo.github.io/pan/rom-update.json";
    private static final String PREFS_NAME = "QingningUpdate";
    private static final String KEY_UPDATE_AVAILABLE = "update_available";
    private static final String KEY_UPDATE_VERSION = "update_version";
    private static final String KEY_UPDATE_URL = "update_url";
    private static final String KEY_CHANGELOG = "changelog";
    private static final String KEY_CHECK_TIME = "check_time";

    private Context mContext;
    private SharedPreferences mPrefs;

    public UpdateChecker(Context context) {
        mContext = context;
        mPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public boolean hasUpdateCache() {
        return mPrefs.getBoolean(KEY_UPDATE_AVAILABLE, false);
    }

    public String getCachedVersion() {
        return mPrefs.getString(KEY_UPDATE_VERSION, null);
    }

    public String getDownloadUrl() {
        return mPrefs.getString(KEY_UPDATE_URL, null);
    }

    public String getChangelog() {
        return mPrefs.getString(KEY_CHANGELOG, null);
    }

    public void checkForUpdate(final UpdateCallback callback) {
        new AsyncTask<Void, Void, UpdateResult>() {
            @Override
            protected UpdateResult doInBackground(Void... params) {
                return fetchUpdateInfo();
            }

            @Override
            protected void onPostExecute(UpdateResult result) {
                if (result != null) {
                    saveUpdateInfo(result);
                    if (callback != null) {
                        callback.onResult(result.hasUpdate, result.version);
                    }
                } else {
                    if (callback != null) {
                        callback.onResult(false, null);
                    }
                }
            }
        }.execute();
    }

    private UpdateResult fetchUpdateInfo() {
        HttpURLConnection connection = null;
        BufferedReader reader = null;

        try {
            URL url = new URL(UPDATE_URL);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);
            connection.setRequestProperty("User-Agent", "QingningROM-Updater/1.0");

            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "Server returned: " + responseCode);
                return null;
            }

            reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }

            return parseUpdateJson(response.toString());

        } catch (IOException e) {
            Log.e(TAG, "Network error: " + e.getMessage());
            return null;
        } finally {
            if (reader != null) {
                try {
                    reader.close();
                } catch (IOException e) {
                    // ignore
                }
            }
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private UpdateResult parseUpdateJson(String json) {
        try {
            JSONObject obj = new JSONObject(json);
            UpdateResult result = new UpdateResult();

            result.version = obj.optString("version", null);
            result.versionCode = obj.optInt("versionCode", 0);
            result.downloadUrl = obj.optString("downloadUrl", null);
            result.changelog = obj.optString("changelog", null);
            result.forceUpdate = obj.optBoolean("forceUpdate", false);

            // 获取当前版本
            String currentVersion = System.getProperty("ro.qingning.version", "1.0.0");
            int currentVersionCode = getVersionCode(currentVersion);

            result.hasUpdate = result.versionCode > currentVersionCode;

            return result;

        } catch (JSONException e) {
            Log.e(TAG, "JSON parse error: " + e.getMessage());
            return null;
        }
    }

    private void saveUpdateInfo(UpdateResult result) {
        SharedPreferences.Editor editor = mPrefs.edit();
        editor.putBoolean(KEY_UPDATE_AVAILABLE, result.hasUpdate);
        editor.putString(KEY_UPDATE_VERSION, result.version);
        editor.putString(KEY_UPDATE_URL, result.downloadUrl);
        editor.putString(KEY_CHANGELOG, result.changelog);
        editor.putLong(KEY_CHECK_TIME, System.currentTimeMillis());
        editor.apply();
    }

    private int getVersionCode(String version) {
        try {
            String[] parts = version.split("\\.");
            int major = Integer.parseInt(parts[0]);
            int minor = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            int patch = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
            return major * 10000 + minor * 100 + patch;
        } catch (Exception e) {
            return 10000; // 1.0.0
        }
    }

    public interface UpdateCallback {
        void onResult(boolean hasUpdate, String version);
    }

    private static class UpdateResult {
        boolean hasUpdate;
        String version;
        int versionCode;
        String downloadUrl;
        String changelog;
        boolean forceUpdate;
    }
}
