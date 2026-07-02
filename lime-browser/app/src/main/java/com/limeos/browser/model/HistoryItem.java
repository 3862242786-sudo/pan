package com.limeos.browser.model;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class HistoryItem {
    public long id;
    public String title;
    public String url;
    public long timestamp;
    public int visitCount;

    public HistoryItem(long id, String title, String url, long timestamp, int visitCount) {
        this.id = id;
        this.title = title;
        this.url = url;
        this.timestamp = timestamp;
        this.visitCount = visitCount;
    }

    public String getFormattedTime() {
        long now = System.currentTimeMillis();
        long diff = now - timestamp;
        if (diff < 60000) return "刚刚";
        if (diff < 3600000) return (diff / 60000) + "分钟前";
        if (diff < 86400000) return (diff / 3600000) + "小时前";
        if (diff < 604800000) return (diff / 86400000) + "天前";
        SimpleDateFormat sdf = new SimpleDateFormat("MM-dd HH:mm", Locale.getDefault());
        return sdf.format(new Date(timestamp));
    }

    public String getDomain() {
        try {
            java.net.URL u = new java.net.URL(url);
            return u.getHost();
        } catch (Exception e) {
            return url;
        }
    }
}
