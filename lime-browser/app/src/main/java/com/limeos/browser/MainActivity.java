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
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private EditText urlInput;
    private ProgressBar progressBar;
    private ImageButton btnBack, btnForward, btnRefresh, btnHome, btnTabs, btnMenu;
    private ImageButton btnUAMode;
    private TextView tvUAModeLabel;
    private SwipeRefreshLayout swipeRefresh;
    private SharedPreferences prefs;

    private List<String> tabUrls = new ArrayList<>();
    private int currentTab = 0;
    private static final String HOME_URL = "https://www.bing.com";
    private static final String PREFS_NAME = "lime_browser_prefs";

    // 浏览模式 UA
    private static final String UA_DESKTOP_CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String UA_DESKTOP_EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    private static final String UA_DESKTOP_FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";
    private static final String UA_DESKTOP_IE = "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko";
    private static final String UA_TABLET_IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    private static final String UA_TABLET_ANDROID = "Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final String UA_PHONE_CHROME = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    private static final String UA_PHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

    // 模式定义
    private static final int MODE_PHONE = 0;
    private static final int MODE_TABLET = 1;
    private static final int MODE_DESKTOP = 2;

    private String currentUA = UA_PHONE_CHROME;
    private int currentMode = MODE_PHONE;
    private int currentUaIndex = 0;

    // 每种模式对应的 UA 选项
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
    private String[] modeNames = {"手机模式", "平板模式", "电脑模式"};
    private String[] modeDescriptions = {
        "显示手机版网页，适合日常浏览",
        "显示平板版网页，类似 iPad 体验",
        "显示桌面版网页，像电脑一样浏览"
    };
    private int[] modeIcons = {R.drawable.ic_phone, R.drawable.ic_tablet, R.drawable.ic_desktop};

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        currentMode = prefs.getInt("ua_mode", MODE_PHONE);
        currentUaIndex = prefs.getInt("ua_index_" + currentMode, 0);
        currentUA = modeUAValues[currentMode][currentUaIndex];

        initViews();
        setupWebView();
        setupListeners();

        updateModeUI();

        String url = HOME_URL;
        Intent intent = getIntent();
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri data = intent.getData();
            if (data != null) {
                url = data.toString();
            }
        }
        loadUrl(url);
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        urlInput = findViewById(R.id.urlInput);
        progressBar = findViewById(R.id.progressBar);
        btnBack = findViewById(R.id.btnBack);
        btnForward = findViewById(R.id.btnForward);
        btnRefresh = findViewById(R.id.btnRefresh);
        btnHome = findViewById(R.id.btnHome);
        btnTabs = findViewById(R.id.btnTabs);
        btnMenu = findViewById(R.id.btnMenu);
        btnUAMode = findViewById(R.id.btnUAMode);
        tvUAModeLabel = findViewById(R.id.tvUAModeLabel);
        swipeRefresh = findViewById(R.id.swipeRefresh);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        applyUserAgent();
        
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, request.getUrl());
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "无法打开链接", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                urlInput.setText(url);
                progressBar.setVisibility(View.VISIBLE);
                updateNavButtons();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
                updateNavButtons();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long contentLength) {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimeType);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("下载中...");
                request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
                request.allowScanningByMediaScanner();
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimeType));
                
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.enqueue(request);
                    Toast.makeText(MainActivity.this, "开始下载", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void applyUserAgent() {
        webView.getSettings().setUserAgentString(currentUA + " LimeBrowser/1.0");
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
            if (webView.canGoBack()) webView.goBack();
        });

        btnForward.setOnClickListener(v -> {
            if (webView.canGoForward()) webView.goForward();
        });

        btnRefresh.setOnClickListener(v -> webView.reload());

        btnHome.setOnClickListener(v -> loadUrl(HOME_URL));

        btnTabs.setOnClickListener(v -> showTabsDialog());

        btnMenu.setOnClickListener(v -> showMenuDialog());

        btnUAMode.setOnClickListener(v -> showUAModePage());

        swipeRefresh.setOnRefreshListener(() -> webView.reload());
    }

    private void loadUrl(String url) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            if (url.contains(".") && !url.contains(" ")) {
                url = "https://" + url;
            } else {
                url = "https://www.bing.com/search?q=" + Uri.encode(url);
            }
        }
        webView.loadUrl(url);
    }

    private void updateNavButtons() {
        btnBack.setAlpha(webView.canGoBack() ? 1.0f : 0.4f);
        btnForward.setAlpha(webView.canGoForward() ? 1.0f : 0.4f);
    }

    private void updateModeUI() {
        tvUAModeLabel.setText(modeNames[currentMode]);
    }

    private void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) {
            imm.hideSoftInputFromWindow(urlInput.getWindowToken(), 0);
        }
    }

    private void showTabsDialog() {
        String[] items = {"新建标签页", "关闭当前标签"};
        new AlertDialog.Builder(this)
                .setTitle("标签页")
                .setItems(items, (dialog, which) -> {
                    loadUrl(HOME_URL);
                })
                .show();
    }

    private void showMenuDialog() {
        String[] items = {"分享", "复制链接", "添加到书签", "浏览器模式", "关于 LimeBrowser"};
        new AlertDialog.Builder(this)
                .setTitle("菜单")
                .setItems(items, (dialog, which) -> {
                    String currentUrl = webView.getUrl();
                    switch (which) {
                        case 0:
                            Intent share = new Intent(Intent.ACTION_SEND);
                            share.setType("text/plain");
                            share.putExtra(Intent.EXTRA_TEXT, currentUrl);
                            startActivity(Intent.createChooser(share, "分享"));
                            break;
                        case 1:
                            android.content.ClipboardManager clipboard = 
                                (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                            if (clipboard != null) {
                                clipboard.setPrimaryClip(android.content.ClipData.newPlainText("URL", currentUrl));
                                Toast.makeText(this, "链接已复制", Toast.LENGTH_SHORT).show();
                            }
                            break;
                        case 2:
                            Toast.makeText(this, "已添加到书签", Toast.LENGTH_SHORT).show();
                            break;
                        case 3:
                            showUAModePage();
                            break;
                        case 4:
                            new AlertDialog.Builder(this)
                                    .setTitle("关于 LimeBrowser")
                                    .setMessage("LimeBrowser v1.1.0\n基于 Android WebView (Chromium)\n支持手机/平板/电脑模式\nLimeOS Project 2026")
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

        // 设置模式选项
        String[] modeLabels = {"手机模式", "平板模式", "电脑模式"};
        for (int i = 0; i < modeLabels.length; i++) {
            RadioButton rb = new RadioButton(this);
            rb.setText(modeLabels[i]);
            rb.setTextSize(16);
            rb.setId(i);
            rb.setPadding(32, 16, 16, 16);
            if (i == currentMode) rb.setChecked(true);
            rgMode.addView(rb);
        }

        // 加载当前模式的浏览器选项
        loadBrowserOptions(rgBrowser, currentMode);

        tvDesc.setText(modeDescriptions[currentMode]);
        tvCurrentUA.setText("当前UA: " + modeUANames[currentMode][currentUaIndex]);

        rgMode.setOnCheckedChangeListener((group, checkedId) -> {
            currentMode = checkedId;
            currentUaIndex = 0;
            tvDesc.setText(modeDescriptions[currentMode]);
            rgBrowser.removeAllViews();
            loadBrowserOptions(rgBrowser, currentMode);
            ((RadioButton) rgBrowser.getChildAt(0)).setChecked(true);
            tvCurrentUA.setText("当前UA: " + modeUANames[currentMode][currentUaIndex]);
        });

        rgBrowser.setOnCheckedChangeListener((group, checkedId) -> {
            currentUaIndex = checkedId;
            tvCurrentUA.setText("当前UA: " + modeUANames[currentMode][currentUaIndex]);
        });

        new AlertDialog.Builder(this)
                .setTitle("浏览器模式")
                .setView(view)
                .setPositiveButton("应用并刷新", (dialog, which) -> {
                    currentUA = modeUAValues[currentMode][currentUaIndex];
                    prefs.edit()
                        .putInt("ua_mode", currentMode)
                        .putInt("ua_index_" + currentMode, currentUaIndex)
                        .apply();
                    applyUserAgent();
                    updateModeUI();
                    webView.reload();
                    Toast.makeText(this, "已切换到 " + modeNames[currentMode] + " - " + modeUANames[currentMode][currentUaIndex], Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private void loadBrowserOptions(RadioGroup rgBrowser, int mode) {
        rgBrowser.removeAllViews();
        String[] names = modeUANames[mode];
        for (int i = 0; i < names.length; i++) {
            RadioButton rb = new RadioButton(this);
            rb.setText(names[i]);
            rb.setTextSize(15);
            rb.setId(i);
            rb.setPadding(32, 12, 16, 12);
            if (i == currentUaIndex && mode == currentMode) rb.setChecked(true);
            rgBrowser.addView(rb);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
