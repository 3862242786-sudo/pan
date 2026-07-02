package com.limeos.browser.model;

import android.webkit.WebView;

public class Tab {
    public int id;
    public String title;
    public String url;
    public WebView webView;
    public boolean isActive;
    public long createdAt;

    public Tab(int id, String url) {
        this.id = id;
        this.url = url;
        this.title = url;
        this.isActive = false;
        this.createdAt = System.currentTimeMillis();
    }
}
