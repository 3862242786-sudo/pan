package com.limeos.browser.db;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.limeos.browser.model.HistoryItem;

import java.util.ArrayList;
import java.util.List;

public class HistoryDbHelper extends SQLiteOpenHelper {

    private static final String DB_NAME = "lime_browser.db";
    private static final int DB_VERSION = 1;
    private static final String TABLE_HISTORY = "history";

    private static HistoryDbHelper instance;

    public static synchronized HistoryDbHelper getInstance(Context context) {
        if (instance == null) {
            instance = new HistoryDbHelper(context.getApplicationContext());
        }
        return instance;
    }

    private HistoryDbHelper(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE " + TABLE_HISTORY + " (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "title TEXT," +
                "url TEXT NOT NULL," +
                "timestamp INTEGER NOT NULL," +
                "visit_count INTEGER DEFAULT 1" +
                ")");
        db.execSQL("CREATE INDEX idx_history_time ON " + TABLE_HISTORY + "(timestamp DESC)");
        db.execSQL("CREATE INDEX idx_history_url ON " + TABLE_HISTORY + "(url)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_HISTORY);
        onCreate(db);
    }

    public void addHistory(String title, String url) {
        SQLiteDatabase db = getWritableDatabase();
        // Check if URL already exists
        Cursor cursor = db.query(TABLE_HISTORY, new String[]{"id", "visit_count"},
                "url = ?", new String[]{url}, null, null, null);
        if (cursor.moveToFirst()) {
            int id = cursor.getInt(0);
            int count = cursor.getInt(1);
            ContentValues values = new ContentValues();
            values.put("timestamp", System.currentTimeMillis());
            values.put("visit_count", count + 1);
            values.put("title", title);
            db.update(TABLE_HISTORY, values, "id = ?", new String[]{String.valueOf(id)});
        } else {
            ContentValues values = new ContentValues();
            values.put("title", title != null ? title : url);
            values.put("url", url);
            values.put("timestamp", System.currentTimeMillis());
            values.put("visit_count", 1);
            db.insert(TABLE_HISTORY, null, values);
        }
        cursor.close();
    }

    public List<HistoryItem> getAllHistory() {
        List<HistoryItem> list = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.query(TABLE_HISTORY, null, null, null, null, null,
                "timestamp DESC", "500");
        while (cursor.moveToNext()) {
            list.add(new HistoryItem(
                    cursor.getLong(cursor.getColumnIndexOrThrow("id")),
                    cursor.getString(cursor.getColumnIndexOrThrow("title")),
                    cursor.getString(cursor.getColumnIndexOrThrow("url")),
                    cursor.getLong(cursor.getColumnIndexOrThrow("timestamp")),
                    cursor.getInt(cursor.getColumnIndexOrThrow("visit_count"))
            ));
        }
        cursor.close();
        return list;
    }

    public List<HistoryItem> searchHistory(String query) {
        List<HistoryItem> list = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.query(TABLE_HISTORY, null,
                "title LIKE ? OR url LIKE ?",
                new String[]{"%" + query + "%", "%" + query + "%"},
                null, null, "timestamp DESC", "100");
        while (cursor.moveToNext()) {
            list.add(new HistoryItem(
                    cursor.getLong(cursor.getColumnIndexOrThrow("id")),
                    cursor.getString(cursor.getColumnIndexOrThrow("title")),
                    cursor.getString(cursor.getColumnIndexOrThrow("url")),
                    cursor.getLong(cursor.getColumnIndexOrThrow("timestamp")),
                    cursor.getInt(cursor.getColumnIndexOrThrow("visit_count"))
            ));
        }
        cursor.close();
        return list;
    }

    public void clearHistory() {
        SQLiteDatabase db = getWritableDatabase();
        db.delete(TABLE_HISTORY, null, null);
    }

    public void deleteHistoryItem(long id) {
        SQLiteDatabase db = getWritableDatabase();
        db.delete(TABLE_HISTORY, "id = ?", new String[]{String.valueOf(id)});
    }
}
