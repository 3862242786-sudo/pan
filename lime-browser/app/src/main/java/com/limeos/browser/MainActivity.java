package com.limeos.browser;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.limeos.browser.db.HistoryDbHelper;
import com.limeos.browser.model.Tab;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private FrameLayout webViewContainer;
    private EditText urlInput;
    private ProgressBar progressBar;
    private ImageButton btnBack, btnForward, btnRefresh, btnHome, btnTabs, btnMenu;
    private TextView tvTabCount;
    private TextView tvUAModeLabel;
    private SharedPreferences prefs;
    private HistoryDbHelper historyDb;

    private List<Tab> tabs = new ArrayList<>();
    private int activeTabId = 0;
    private int nextTabId = 1;
    private static final String HOME_URL = "https://www.bing.com";
    private static final String PREFS_NAME = "lime_browser_prefs";

    // UA presets
    private static final String UA_DESKTOP_CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String UA_DESKTOP_EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    private static final String UA_DESKTOP_FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";
    private static final String UA_DESKTOP_IE = "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko";
    private static final String UA_TABLET_IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    private static final String UA_TABLET_ANDROID = "Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String UA_PHONE_CHROME = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    private static final String UA_PHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

    private static final int MODE_PHONE = 0, MODE_TABLET = 1, MODE_DESKTOP = 2;
    private String[][] modeUANames = {
        {"Chrome 手机", "Safari iPhone"},
        {"iPad Safari", "Android 平板"},
        {"Chrome 电脑", "Edge 电脑", "Firefox 电脑", "IE 11 兼容"}
    };
    private String[][] modeUAValues = {
        {UA_PHONE_CHROME, UA_PHONE_SAFARI},
        {UA_TABLET_IPAD, UA_TABLET_ANDROID},
        {UA_DESKTOP_CHROME, UA_DESKTOP_EDGE, UA_DESKTOP_FIREFOX, UA_DESKTOP_IE}
    };
    private String[] modeNames = {"手机", "平板", "电脑"};
    private int currentMode = MODE_PHONE;
    private int currentUaIndex = 0;
    private String currentUA = UA_PHONE_CHROME;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        historyDb = HistoryDbHelper.getInstance(this);
        currentMode = prefs.getInt("ua_mode", MODE_PHONE);
        currentUaIndex = prefs.getInt("ua_index_" + currentMode, 0);
        currentUA = modeUAValues[currentMode][currentUaIndex];

        webViewContainer = findViewById(R.id.webViewContainer);
        urlInput = findViewById(R.id.urlInput);
        progressBar = findViewById(R.id.progressBar);
        btnBack = findViewById(R.id.btnBack);
        btnForward = findViewById(R.id.btnForward);
        btnRefresh = findViewById(R.id.btnRefresh);
        btnHome = findViewById(R.id.btnHome);
        btnTabs = findViewById(R.id.btnTabs);
        btnMenu = findViewById(R.id.btnMenu);
        tvTabCount = findViewById(R.id.tvTabCount);
        tvUAModeLabel = findViewById(R.id.tvUAModeLabel);

        tvUAModeLabel.setText(modeNames[currentMode]);

        // Handle intent
        String startUrl = HOME_URL;
        Intent intent = getIntent();
        if (intent != null) {
            if (Intent.ACTION_VIEW.equals(intent.getAction())) {
                Uri data = intent.getData();
                if (data != null) startUrl = data.toString();
            } else if (intent.hasExtra("url")) {
                startUrl = intent.getStringExtra("url");
            }
        }

        if (intent != null && intent.getBooleanExtra("new_tab", false) && !tabs.isEmpty()) {
            addTab(startUrl);
        } else {
            addTab(startUrl);
        }

        setupListeners();
        updateUI();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private WebView createWebView() {
        WebView wv = new WebView(this);
        wv.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setUserAgentString(currentUA + " LimeBrowser/1.2");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(wv, true);

        wv.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://") || url.startsWith("https://")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); }
                catch (Exception e) { Toast.makeText(MainActivity.this, "无法打开", Toast.LENGTH_SHORT).show(); }
                return true;
            }
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                urlInput.setText(url);
                progressBar.setVisibility(View.VISIBLE);
                updateUI();
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                Tab t = getActiveTab();
                if (t != null) {
                    t.title = view.getTitle() != null ? view.getTitle() : url;
                    t.url = url;
                }
                historyDb.addHistory(view.getTitle(), url);
                updateUI();
            }
        });

        wv.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
            }
        });

        wv.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setMimeType(mimeType);
            req.addRequestHeader("User-Agent", userAgent);
            req.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                    URLUtil.guessFileName(url, contentDisposition, mimeType));
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm != null) { dm.enqueue(req); Toast.makeText(this, "开始下载", Toast.LENGTH_SHORT).show(); }
        });

        return wv;
    }

    private void addTab(String url) {
        Tab tab = new Tab(nextTabId++, url);
        tab.webView = createWebView();
        tabs.add(tab);
        switchToTab(tab.id);
        tab.webView.loadUrl(url);
    }

    private void switchToTab(int tabId) {
        for (Tab t : tabs) {
            if (t.id == tabId) {
                t.isActive = true;
                activeTabId = tabId;
                webViewContainer.removeAllViews();
                webViewContainer.addView(t.webView);
                urlInput.setText(t.webView.getUrl());
            } else {
                t.isActive = false;
            }
        }
        updateUI();
    }

    private void closeTab(int tabId) {
        Tab toClose = null;
        for (Tab t : tabs) {
            if (t.id == tabId) { toClose = t; break; }
        }
        if (toClose == null) return;
        toClose.webView.destroy();
        tabs.remove(toClose);
        if (tabs.isEmpty()) {
            addTab(HOME_URL);
        } else {
            switchToTab(tabs.get(tabs.size() - 1).id);
        }
    }

    private Tab getActiveTab() {
        for (Tab t : tabs) if (t.isActive) return t;
        return null;
    }

    private void setupListeners() {
        urlInput.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_GO ||
                    (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                String text = urlInput.getText().toString().trim();
                loadUrl(text);
                hideKeyboard();
                return true;
            }
            return false;
        });

        btnBack.setOnClickListener(v -> {
            Tab t = getActiveTab();
            if (t != null && t.webView.canGoBack()) t.webView.goBack();
        });

        btnForward.setOnClickListener(v -> {
            Tab t = getActiveTab();
            if (t != null && t.webView.canGoForward()) t.webView.goForward();
        });

        btnRefresh.setOnClickListener(v -> {
            Tab t = getActiveTab();
            if (t != null) t.webView.reload();
        });

        btnHome.setOnClickListener(v -> loadUrl(HOME_URL));

        btnTabs.setOnClickListener(v -> showTabSwitcher());

        btnMenu.setOnClickListener(v -> showMenu());

        findViewById(R.id.btnUAMode).setOnClickListener(v -> showUAModePage());
    }

    private void loadUrl(String url) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            if (url.contains(".") && !url.contains(" ")) url = "https://" + url;
            else url = "https://www.bing.com/search?q=" + Uri.encode(url);
        }
        Tab t = getActiveTab();
        if (t != null) t.webView.loadUrl(url);
    }

    private void updateUI() {
        Tab t = getActiveTab();
        if (t != null) {
            btnBack.setAlpha(t.webView.canGoBack() ? 1.0f : 0.4f);
            btnForward.setAlpha(t.webView.canGoForward() ? 1.0f : 0.4f);
        }
        tvTabCount.setText(String.valueOf(tabs.size()));
    }

    private void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) imm.hideSoftInputFromWindow(urlInput.getWindowToken(), 0);
    }

    private void showTabSwitcher() {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_tabs, null);
        RecyclerView rv = view.findViewById(R.id.recyclerTabs);
        rv.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));

        TabAdapter adapter = new TabAdapter();
        rv.setAdapter(adapter);

        view.findViewById(R.id.btnNewTab).setOnClickListener(v -> {
            addTab(HOME_URL);
        });

        new AlertDialog.Builder(this)
                .setTitle("标签页 (" + tabs.size() + ")")
                .setView(view)
                .setNegativeButton("关闭", null)
                .show();
    }

    class TabAdapter extends RecyclerView.Adapter<TabAdapter.VH> {
        @NonNull @Override public VH onCreateViewHolder(@NonNull ViewGroup p, int vt) {
            return new VH(LayoutInflater.from(p.getContext()).inflate(R.layout.item_tab, p, false));
        }
        @Override public void onBindViewHolder(@NonNull VH h, int pos) {
            Tab t = tabs.get(pos);
            h.tvTitle.setText(t.title);
            h.tvUrl.setText(t.url);
            h.itemView.setAlpha(t.isActive ? 1.0f : 0.6f);
            h.itemView.setOnClickListener(v -> {
                switchToTab(t.id);
            });
            h.btnClose.setOnClickListener(v -> closeTab(t.id));
        }
        @Override public int getItemCount() { return tabs.size(); }
        class VH extends RecyclerView.ViewHolder {
            TextView tvTitle, tvUrl;
            ImageButton btnClose;
            VH(View v) { super(v); tvTitle = v.findViewById(R.id.tvTitle); tvUrl = v.findViewById(R.id.tvUrl); btnClose = v.findViewById(R.id.btnClose); }
        }
    }

    private void showMenu() {
        Tab t = getActiveTab();
        String url = t != null ? t.webView.getUrl() : "";
        String[] items = {"分享", "复制链接", "历史记录", "浏览器模式", "关于 LimeBrowser"};
        new AlertDialog.Builder(this)
                .setTitle("菜单")
                .setItems(items, (dialog, which) -> {
                    switch (which) {
                        case 0:
                            Intent share = new Intent(Intent.ACTION_SEND);
                            share.setType("text/plain");
                            share.putExtra(Intent.EXTRA_TEXT, url);
                            startActivity(Intent.createChooser(share, "分享"));
                            break;
                        case 1:
                            android.content.ClipboardManager cb = (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                            if (cb != null) { cb.setPrimaryClip(android.content.ClipData.newPlainText("URL", url)); Toast.makeText(this, "链接已复制", Toast.LENGTH_SHORT).show(); }
                            break;
                        case 2:
                            startActivity(new Intent(this, HistoryActivity.class));
                            break;
                        case 3:
                            showUAModePage();
                            break;
                        case 4:
                            new AlertDialog.Builder(this)
                                    .setTitle("关于 LimeBrowser")
                                    .setMessage("LimeBrowser v1.2.0\n基于 Chromium WebView\n支持多标签 / 历史记录 / 电脑模式\nLimeOS Project 2026")
                                    .setPositiveButton("确定", null)
                                    .show();
                            break;
                    }
                })
                .show();
    }

    private void showUAModePage() {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_ua_mode, null);
        RadioGroup rgMode = view.findViewById(R.id.rgMode);
        RadioGroup rgBrowser = view.findViewById(R.id.rgBrowser);
        TextView tvDesc = view.findViewById(R.id.tvModeDesc);
        TextView tvCurrentUA = view.findViewById(R.id.tvCurrentUA);

        for (int i = 0; i < 3; i++) {
            RadioButton rb = new RadioButton(this);
            rb.setText(modeNames[i] + "模式");
            rb.setTextSize(16);
            rb.setId(i);
            rb.setPadding(32, 16, 16, 16);
            if (i == currentMode) rb.setChecked(true);
            rgMode.addView(rb);
        }
        loadBrowserOptions(rgBrowser, currentMode);
        tvDesc.setText(getModeDesc(currentMode));
        tvCurrentUA.setText("当前: " + modeUANames[currentMode][currentUaIndex]);

        rgMode.setOnCheckedChangeListener((group, checkedId) -> {
            currentMode = checkedId;
            currentUaIndex = 0;
            tvDesc.setText(getModeDesc(currentMode));
            rgBrowser.removeAllViews();
            loadBrowserOptions(rgBrowser, currentMode);
            if (rgBrowser.getChildCount() > 0) ((RadioButton) rgBrowser.getChildAt(0)).setChecked(true);
            tvCurrentUA.setText("当前: " + modeUANames[currentMode][currentUaIndex]);
        });
        rgBrowser.setOnCheckedChangeListener((group, checkedId) -> {
            currentUaIndex = checkedId;
            tvCurrentUA.setText("当前: " + modeUANames[currentMode][currentUaIndex]);
        });

        new AlertDialog.Builder(this)
                .setTitle("浏览器模式")
                .setView(view)
                .setPositiveButton("应用并刷新", (dialog, which) -> {
                    currentUA = modeUAValues[currentMode][currentUaIndex];
                    prefs.edit().putInt("ua_mode", currentMode).putInt("ua_index_" + currentMode, currentUaIndex).apply();
                    tvUAModeLabel.setText(modeNames[currentMode]);
                    for (Tab t : tabs) {
                        t.webView.getSettings().setUserAgentString(currentUA + " LimeBrowser/1.2");
                        if (t.isActive) t.webView.reload();
                    }
                    Toast.makeText(this, "已切换到" + modeNames[currentMode] + "模式", Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private String getModeDesc(int mode) {
        switch (mode) {
            case MODE_PHONE: return "显示手机版网页，适合日常浏览";
            case MODE_TABLET: return "显示平板版网页，类似 iPad 体验";
            default: return "显示桌面版网页，像电脑一样浏览";
        }
    }

    private void loadBrowserOptions(RadioGroup rg, int mode) {
        rg.removeAllViews();
        String[] names = modeUANames[mode];
        for (int i = 0; i < names.length; i++) {
            RadioButton rb = new RadioButton(this);
            rb.setText(names[i]);
            rb.setTextSize(15);
            rb.setId(i);
            rb.setPadding(32, 12, 16, 12);
            if (i == currentUaIndex && mode == currentMode) rb.setChecked(true);
            rg.addView(rb);
        }
    }

    @Override
    public void onBackPressed() {
        Tab t = getActiveTab();
        if (t != null && t.webView.canGoBack()) {
            t.webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override protected void onPause() { super.onPause(); for (Tab t : tabs) t.webView.onPause(); }
    @Override protected void onResume() { super.onResume(); for (Tab t : tabs) t.webView.onResume(); }
    @Override protected void onDestroy() {
        for (Tab t : tabs) t.webView.destroy();
        super.onDestroy();
    }
}
