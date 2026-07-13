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
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
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

import com.google.android.material.bottomsheet.BottomSheetDialog;

import com.limeos.browser.db.HistoryDbHelper;
import com.limeos.browser.model.Tab;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private FrameLayout webViewContainer;
    private EditText urlInput;
    private ProgressBar progressBar;
    private ImageButton btnBack, btnForward, btnRefresh, btnHome, btnMenu;
    private View btnTabs, btnUAMode;
    private TextView tvTabCount;
    private TextView tvUAModeLabel;
    private SharedPreferences prefs;
    private HistoryDbHelper historyDb;
    private ExecutorService dbExecutor;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final List<Tab> tabs = new ArrayList<>();
    private int activeTabId = 0;
    private int nextTabId = 1;
    private static final String HOME_URL = "https://3862242786-sudo.github.io/pan/lime-start/";
    private static final String PREFS_NAME = "lime_browser_prefs";
    private static final String APP_VERSION = "1.3.0";

    // UA 模式常量
    private static final int MODE_PHONE = 0, MODE_TABLET = 1, MODE_DESKTOP = 2, MODE_CUSTOM = 3;

    // 从系统 WebView 提取的版本信息（运行时填充）
    private String defaultUA = "";
    private String chromeVer = "120";
    private String androidVer = "13";

    // 模式名称
    private final String[] modeNames = {"手机", "平板", "电脑", "自定义"};

    // 每种模式的 UA 模板（{chrome} 和 {android} 在运行时替换）
    private final String[][] uaTemplates = {
        // 手机模式
        {
            "Mozilla/5.0 (Linux; Android {android}; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome}.0.0.0 Mobile Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        },
        // 平板模式
        {
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Mozilla/5.0 (Linux; Android {android}; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome}.0.0.0 Safari/537.36"
        },
        // 电脑模式
        {
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome}.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome}.0.0.0 Safari/537.36 Edg/{chrome}.0.0.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0"
        },
        // 自定义模式（运行时从存储读取）
        {""}
    };

    // 每种模式的 UA 显示名称
    private final String[][] uaDisplayNames = {
        {"Chrome 手机", "Safari iPhone"},
        {"iPad Safari", "Android 平板"},
        {"Chrome 电脑", "Edge 电脑", "Firefox 电脑"},
        {"自定义"}
    };

    private int currentMode = MODE_PHONE;
    private int currentUaIndex = 0;
    private String currentUA = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        try {
            historyDb = HistoryDbHelper.getInstance(this);
        } catch (Exception e) {
            historyDb = null;
        }
        dbExecutor = Executors.newSingleThreadExecutor();

        // 从系统 WebView 获取默认 UA，提取版本号
        initUAFromSystem();

        currentMode = prefs.getInt("ua_mode", MODE_PHONE);
        if (currentMode < 0 || currentMode > 3) currentMode = MODE_PHONE;
        currentUaIndex = prefs.getInt("ua_index_" + currentMode, 0);
        if (currentMode == MODE_CUSTOM) {
            currentUA = prefs.getString("ua_custom", defaultUA);
        } else {
            if (currentUaIndex < 0 || currentUaIndex >= uaTemplates[currentMode].length) currentUaIndex = 0;
            currentUA = resolveTemplate(uaTemplates[currentMode][currentUaIndex]);
        }

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

        if (tvUAModeLabel != null) {
            tvUAModeLabel.setText(modeNames[currentMode]);
        }

        // 只在首次创建时新建标签，避免Activity重建重复创建
        if (savedInstanceState == null) {
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
            addTab(startUrl);
        }

        setupListeners();
        updateUI();
    }

    // 从系统 WebView 提取默认 UA 和版本信息
    private void initUAFromSystem() {
        try {
            WebView tmp = new WebView(this);
            defaultUA = tmp.getSettings().getUserAgentString();
            // 提取 Chrome 版本号
            int idx = defaultUA.indexOf("Chrome/");
            if (idx >= 0) {
                int end = defaultUA.indexOf(".", idx + 7);
                if (end > 0) chromeVer = defaultUA.substring(idx + 7, end);
            }
            // 提取 Android 版本号
            idx = defaultUA.indexOf("Android ");
            if (idx >= 0) {
                int end = defaultUA.indexOf(";", idx + 8);
                if (end > 0) androidVer = defaultUA.substring(idx + 8, end);
            }
        } catch (Exception e) {
            defaultUA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        }
    }

    // 将模板中的 {chrome} 和 {android} 替换为实际版本
    private String resolveTemplate(String template) {
        return template.replace("{chrome}", chromeVer).replace("{android}", androidVer);
    }

    // 获取最终要设置的 UA 字符串
    private String getEffectiveUA() {
        if (currentMode == MODE_PHONE) {
            return currentUA + " LimeBrowser/" + APP_VERSION;
        }
        return currentUA;
    }

    // 应用 UA 到所有 WebView 并刷新当前页
    private void applyUAAndReload() {
        String ua = getEffectiveUA();
        for (Tab t : tabs) {
            if (t.webView != null) {
                t.webView.getSettings().setUserAgentString(ua);
                if (t.isActive) {
                    String url = t.webView.getUrl();
                    if (url != null && !url.isEmpty()) {
                        t.webView.loadUrl(url);
                    } else {
                        t.webView.reload();
                    }
                }
            }
        }
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
        s.setUserAgentString(getEffectiveUA());

        try {
            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(wv, true);
        } catch (Exception e) {
            // Ignore
        }

        wv.setWebViewClient(new SafeWebViewClient());
        wv.setWebChromeClient(new SafeWebChromeClient());
        wv.setDownloadListener(new SafeDownloadListener());
        wv.addJavascriptInterface(new LimeJsBridge(), "LimeBrowser");

        return wv;
    }

    private class SafeWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (url.startsWith("http://") || url.startsWith("https://")) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl()));
            } catch (Exception e) {
                Toast.makeText(MainActivity.this, "无法打开", Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            if (isFinishing() || isDestroyed()) return;
            if (urlInput != null) urlInput.setText(url);
            if (progressBar != null) progressBar.setVisibility(View.VISIBLE);
            updateUI();
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (isFinishing() || isDestroyed()) return;
            if (progressBar != null) progressBar.setVisibility(View.GONE);
            if (url == null || url.equals("about:blank")) return;

            Tab t = getActiveTab();
            if (t != null && t.webView == view) {
                String title = view.getTitle();
                t.title = title != null && !title.isEmpty() ? title : url;
                t.url = url;
                safeAddHistory(t.title, url);
            }
            updateUI();
        }

        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            if (isFinishing() || isDestroyed()) return;
            if (progressBar != null) progressBar.setVisibility(View.GONE);
        }
    }

    private class SafeWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (isFinishing() || isDestroyed()) return;
            if (progressBar != null) progressBar.setProgress(newProgress);
        }
    }

    private class SafeDownloadListener implements DownloadListener {
        @Override
        public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimeType);
                req.addRequestHeader("User-Agent", userAgent);
                req.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimeType));
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.enqueue(req);
                    Toast.makeText(MainActivity.this, "开始下载", Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                Toast.makeText(MainActivity.this, "下载失败", Toast.LENGTH_SHORT).show();
            }
        }
    }

    // ========== LimeOS 网站联动 JS Bridge ==========
    public class LimeJsBridge {
        @JavascriptInterface
        public String getUAMode() {
            return String.valueOf(currentMode); // 0=手机 1=平板 2=电脑 3=自定义
        }

        @JavascriptInterface
        public String getUAModeName() {
            return modeNames[currentMode];
        }

        @JavascriptInterface
        public boolean isPhoneDevice() {
            return MainActivity.this.getResources().getBoolean(
                    MainActivity.this.getResources().getIdentifier("isPhone", "bool", "android")
            ) || (getResources().getConfiguration().screenLayout
                    & android.content.res.Configuration.SCREENLAYOUT_SIZE_MASK)
                    < android.content.res.Configuration.SCREENLAYOUT_SIZE_LARGE;
        }

        @JavascriptInterface
        public void switchToMode(final int mode) {
            if (mode < 0 || mode > 3) return;
            mainHandler.post(() -> {
                currentMode = mode;
                currentUaIndex = prefs.getInt("ua_index_" + currentMode, 0);
                if (currentMode == MODE_CUSTOM) {
                    currentUA = prefs.getString("ua_custom", defaultUA);
                } else {
                    if (currentUaIndex < 0 || currentUaIndex >= uaTemplates[currentMode].length) currentUaIndex = 0;
                    currentUA = resolveTemplate(uaTemplates[currentMode][currentUaIndex]);
                }
                prefs.edit().putInt("ua_mode", currentMode).apply();
                if (tvUAModeLabel != null) tvUAModeLabel.setText(modeNames[currentMode]);
                applyUAAndReload();
                updateUI();
            });
        }

        @JavascriptInterface
        public String getAppVersion() {
            return APP_VERSION;
        }

        @JavascriptInterface
        public String getDeviceArch() {
            return android.os.Build.SUPPORTED_ABIS[0];
        }

        @JavascriptInterface
        public String getDefaultUA() {
            return defaultUA;
        }

        @JavascriptInterface
        public String getCurrentUA() {
            return getEffectiveUA();
        }

        @JavascriptInterface
        public void setCustomUA(final String ua) {
            mainHandler.post(() -> {
                currentMode = MODE_CUSTOM;
                currentUA = ua;
                prefs.edit()
                    .putInt("ua_mode", MODE_CUSTOM)
                    .putString("ua_custom", ua)
                    .apply();
                if (tvUAModeLabel != null) tvUAModeLabel.setText(modeNames[currentMode]);
                applyUAAndReload();
                updateUI();
            });
        }
    }

    private void safeAddHistory(String title, String url) {
        if (historyDb == null || url == null || url.isEmpty()) return;
        if (dbExecutor != null && !dbExecutor.isShutdown()) {
            dbExecutor.execute(() -> {
                try {
                    historyDb.addHistory(title, url);
                } catch (Exception e) {
                    // Ignore
                }
            });
        }
    }

    private void addTab(String url) {
        Tab tab = new Tab(nextTabId++, url);
        try {
            tab.webView = createWebView();
        } catch (Exception e) {
            Toast.makeText(this, "创建标签失败", Toast.LENGTH_SHORT).show();
            return;
        }
        tabs.add(tab);
        switchToTab(tab.id);
        if (tab.webView != null) {
            tab.webView.loadUrl(url);
        }
    }

    private void switchToTab(int tabId) {
        if (webViewContainer == null) return;
        Tab target = getTabById(tabId);
        if (target == null) return;

        for (Tab t : tabs) {
            t.isActive = (t.id == tabId);
        }
        activeTabId = tabId;

        webViewContainer.removeAllViews();
        if (target.webView != null) {
            webViewContainer.addView(target.webView);
            try {
                String url = target.webView.getUrl();
                if (url != null && urlInput != null) urlInput.setText(url);
            } catch (Exception e) {
                // Ignore
            }
        }
        updateUI();
    }

    /**
     * 关闭标签。关键修复：清空后不再自动新建标签。
     */
    private void closeTab(int tabId) {
        Tab toClose = getTabById(tabId);
        if (toClose == null) return;

        // 先标记为非活动，防止回调中误判
        toClose.isActive = false;

        try {
            if (toClose.webView != null) {
                toClose.webView.stopLoading();
                toClose.webView.loadUrl("about:blank");
                toClose.webView.clearHistory();
                toClose.webView.removeAllViews();
                toClose.webView.destroy();
            }
        } catch (Exception e) {
            // Ignore
        }

        tabs.remove(toClose);

        if (tabs.isEmpty()) {
            // 清空后不自动新建，显示空状态
            activeTabId = 0;
            if (webViewContainer != null) webViewContainer.removeAllViews();
            if (urlInput != null) urlInput.setText("");
        } else {
            // 切换到剩余标签中最后一个
            Tab last = tabs.get(tabs.size() - 1);
            switchToTab(last.id);
        }
        updateUI();
    }

    private Tab getActiveTab() {
        return getTabById(activeTabId);
    }

    private Tab getTabById(int id) {
        for (Tab t : tabs) if (t.id == id) return t;
        return null;
    }

    private void setupListeners() {
        if (urlInput != null) {
            urlInput.setOnEditorActionListener((v, actionId, event) -> {
                if (actionId == EditorInfo.IME_ACTION_GO ||
                        (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                    String text = urlInput.getText() != null ? urlInput.getText().toString().trim() : "";
                    loadUrl(text);
                    hideKeyboard();
                    return true;
                }
                return false;
            });
        }

        if (btnBack != null) {
            btnBack.setOnClickListener(v -> {
                Tab t = getActiveTab();
                if (t != null && t.webView != null && t.webView.canGoBack()) t.webView.goBack();
            });
        }

        if (btnForward != null) {
            btnForward.setOnClickListener(v -> {
                Tab t = getActiveTab();
                if (t != null && t.webView != null && t.webView.canGoForward()) t.webView.goForward();
            });
        }

        if (btnRefresh != null) {
            btnRefresh.setOnClickListener(v -> {
                Tab t = getActiveTab();
                if (t != null && t.webView != null) t.webView.reload();
            });
        }

        if (btnHome != null) {
            btnHome.setOnClickListener(v -> loadUrl(HOME_URL));
        }

        if (btnTabs != null) {
            btnTabs.setOnClickListener(v -> showTabSwitcher());
        }

        if (btnMenu != null) {
            btnMenu.setOnClickListener(v -> showMenu());
        }

        if (btnUAMode != null) {
            btnUAMode.setOnClickListener(v -> showUAModePage());
        }
    }

    /**
     * 关键修复：无活动标签时自动新建标签
     */
    private void loadUrl(String url) {
        if (url == null || url.isEmpty()) return;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            if (url.contains(".") && !url.contains(" ")) url = "https://" + url;
            else url = "https://www.bing.com/search?q=" + Uri.encode(url);
        }
        Tab t = getActiveTab();
        if (t != null && t.webView != null) {
            t.webView.loadUrl(url);
        } else {
            // 没有活动标签时，自动新建一个
            addTab(url);
        }
    }

    private void updateUI() {
        Tab t = getActiveTab();
        if (t != null && t.webView != null) {
            if (btnBack != null) btnBack.setAlpha(t.webView.canGoBack() ? 1.0f : 0.4f);
            if (btnForward != null) btnForward.setAlpha(t.webView.canGoForward() ? 1.0f : 0.4f);
            if (btnBack != null) btnBack.setEnabled(true);
            if (btnForward != null) btnForward.setEnabled(true);
            if (btnRefresh != null) btnRefresh.setEnabled(true);
            if (btnHome != null) btnHome.setEnabled(true);
        } else {
            // 无标签时禁用导航按钮
            if (btnBack != null) { btnBack.setAlpha(0.3f); btnBack.setEnabled(false); }
            if (btnForward != null) { btnForward.setAlpha(0.3f); btnForward.setEnabled(false); }
            if (btnRefresh != null) btnRefresh.setEnabled(false);
            if (btnHome != null) btnHome.setEnabled(false);
        }
        if (tvTabCount != null) tvTabCount.setText(String.valueOf(tabs.size()));
    }

    private void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null && urlInput != null) {
            imm.hideSoftInputFromWindow(urlInput.getWindowToken(), 0);
        }
    }

    /**
     * 关键修复：TabAdapter直接使用tabs列表，避免数据不同步
     */
    private void showTabSwitcher() {
        try {
            View view = LayoutInflater.from(this).inflate(R.layout.dialog_tabs, null);
            RecyclerView rv = view.findViewById(R.id.recyclerTabs);
            if (rv != null) {
                rv.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));
                TabAdapter adapter = new TabAdapter();
                rv.setAdapter(adapter);
            }

            View btnNewTab = view.findViewById(R.id.btnNewTab);
            if (btnNewTab != null) {
                btnNewTab.setOnClickListener(v -> {
                    addTab(HOME_URL);
                    // 刷新Dialog中的列表
                    if (rv != null && rv.getAdapter() != null) {
                        rv.getAdapter().notifyDataSetChanged();
                    }
                });
            }

            new AlertDialog.Builder(this)
                    .setTitle("标签页 (" + tabs.size() + ")")
                    .setView(view)
                    .setNegativeButton("关闭", null)
                    .show();
        } catch (Exception e) {
            Toast.makeText(this, "打开标签页失败", Toast.LENGTH_SHORT).show();
        }
    }

    class TabAdapter extends RecyclerView.Adapter<TabAdapter.VH> {
        @NonNull @Override public VH onCreateViewHolder(@NonNull ViewGroup p, int vt) {
            return new VH(LayoutInflater.from(p.getContext()).inflate(R.layout.item_tab, p, false));
        }
        @Override public void onBindViewHolder(@NonNull VH h, int pos) {
            // 直接从tabs列表读取，确保数据同步
            if (pos < 0 || pos >= tabs.size()) return;
            Tab t = tabs.get(pos);
            h.tvTitle.setText(t.title != null ? t.title : "标签页");
            h.tvUrl.setText(t.url != null ? t.url : "");
            h.itemView.setAlpha(t.isActive ? 1.0f : 0.6f);
            h.itemView.setOnClickListener(v -> switchToTab(t.id));
            h.btnClose.setOnClickListener(v -> closeTab(t.id));
        }
        @Override public int getItemCount() { return tabs.size(); }
        class VH extends RecyclerView.ViewHolder {
            TextView tvTitle, tvUrl;
            ImageButton btnClose;
            VH(View v) {
                super(v);
                tvTitle = v.findViewById(R.id.tvTitle);
                tvUrl = v.findViewById(R.id.tvUrl);
                btnClose = v.findViewById(R.id.btnClose);
            }
        }
    }

    private void showMenu() {
        try {
            Tab t = getActiveTab();
            String url = t != null && t.webView != null ? t.webView.getUrl() : "";

            BottomSheetDialog dialog = new BottomSheetDialog(this);
            if (dialog.getWindow() != null) {
                dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
            }
            View sheet = getLayoutInflater().inflate(R.layout.bottom_sheet_menu, null);

            sheet.findViewById(R.id.menuShare).setOnClickListener(v -> {
                dialog.dismiss();
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("text/plain");
                share.putExtra(Intent.EXTRA_TEXT, url);
                try {
                    startActivity(Intent.createChooser(share, "分享"));
                } catch (Exception e) {
                    Toast.makeText(this, "无法分享", Toast.LENGTH_SHORT).show();
                }
            });

            sheet.findViewById(R.id.menuCopy).setOnClickListener(v -> {
                dialog.dismiss();
                copyToClipboard(url);
            });

            sheet.findViewById(R.id.menuHistory).setOnClickListener(v -> {
                dialog.dismiss();
                startActivity(new Intent(this, HistoryActivity.class));
            });

            sheet.findViewById(R.id.menuMode).setOnClickListener(v -> {
                dialog.dismiss();
                showUAModePage();
            });

            sheet.findViewById(R.id.menuAbout).setOnClickListener(v -> {
                dialog.dismiss();
                new AlertDialog.Builder(this)
                        .setTitle("关于 LimeBrowser")
                        .setMessage("LimeBrowser v1.3.0\n基于 Chromium WebView\n支持多标签 / 历史记录 / 电脑模式 / 自定义 UA / 青柠系网站智能适配\nLimeOS Project 2026")
                        .setPositiveButton("确定", null)
                        .show();
            });

            dialog.setContentView(sheet);
            dialog.show();
        } catch (Exception e) {
            Toast.makeText(this, "打开菜单失败", Toast.LENGTH_SHORT).show();
        }
    }

    private void copyToClipboard(String text) {
        try {
            android.content.ClipboardManager cb = (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cb != null && text != null) {
                cb.setPrimaryClip(android.content.ClipData.newPlainText("URL", text));
                Toast.makeText(this, "链接已复制", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "复制失败", Toast.LENGTH_SHORT).show();
        }
    }

    private void showUAModePage() {
        try {
            View view = LayoutInflater.from(this).inflate(R.layout.dialog_ua_mode, null);
            RadioGroup rgMode = view.findViewById(R.id.rgMode);
            RadioGroup rgBrowser = view.findViewById(R.id.rgBrowser);
            TextView tvDesc = view.findViewById(R.id.tvModeDesc);
            TextView tvCurrentUA = view.findViewById(R.id.tvCurrentUA);

            // 4 个模式按钮
            for (int i = 0; i < 4; i++) {
                RadioButton rb = new RadioButton(this);
                rb.setText(modeNames[i] + "模式");
                rb.setTextSize(16);
                rb.setId(i);
                rb.setPadding(32, 16, 16, 16);
                if (i == currentMode) rb.setChecked(true);
                if (rgMode != null) rgMode.addView(rb);
            }

            // 自定义 UA 输入框
            final EditText etCustomUA = new EditText(this);
            etCustomUA.setHint("输入自定义 User-Agent");
            etCustomUA.setTextSize(14);
            etCustomUA.setSingleLine(false);
            etCustomUA.setMinLines(2);
            etCustomUA.setMaxLines(4);
            etCustomUA.setText(currentMode == MODE_CUSTOM ? currentUA : defaultUA);
            etCustomUA.setVisibility(currentMode == MODE_CUSTOM ? View.VISIBLE : View.GONE);
            if (rgBrowser != null && rgBrowser.getParent() instanceof android.widget.LinearLayout) {
                ((android.widget.LinearLayout) rgBrowser.getParent()).addView(etCustomUA);
            }

            if (rgBrowser != null) loadBrowserOptions(rgBrowser, currentMode);
            if (tvDesc != null) tvDesc.setText(getModeDesc(currentMode));
            if (tvCurrentUA != null) {
                tvCurrentUA.setText("当前 UA:\n" + getEffectiveUA());
                tvCurrentUA.setTextSize(12);
            }

            final int[] tempMode = {currentMode};
            final int[] tempUaIndex = {currentUaIndex};

            if (rgMode != null) {
                rgMode.setOnCheckedChangeListener((group, checkedId) -> {
                    tempMode[0] = checkedId;
                    tempUaIndex[0] = 0;
                    if (tvDesc != null) tvDesc.setText(getModeDesc(tempMode[0]));
                    // 自定义输入框可见性
                    etCustomUA.setVisibility(tempMode[0] == MODE_CUSTOM ? View.VISIBLE : View.GONE);
                    if (rgBrowser != null) {
                        rgBrowser.removeAllViews();
                        if (tempMode[0] != MODE_CUSTOM) {
                            loadBrowserOptions(rgBrowser, tempMode[0]);
                            if (rgBrowser.getChildCount() > 0) ((RadioButton) rgBrowser.getChildAt(0)).setChecked(true);
                            rgBrowser.setVisibility(View.VISIBLE);
                        } else {
                            rgBrowser.setVisibility(View.GONE);
                        }
                    }
                    if (tvCurrentUA != null) {
                        if (tempMode[0] == MODE_CUSTOM) {
                            tvCurrentUA.setText("自定义 UA:\n" + etCustomUA.getText().toString());
                        } else {
                            String ua = resolveTemplate(uaTemplates[tempMode[0]][0]);
                            tvCurrentUA.setText("当前 UA:\n" + ua);
                        }
                    }
                });
            }
            if (rgBrowser != null) {
                rgBrowser.setOnCheckedChangeListener((group, checkedId) -> {
                    tempUaIndex[0] = checkedId;
                    if (tvCurrentUA != null && tempMode[0] < 3) {
                        String ua = resolveTemplate(uaTemplates[tempMode[0]][tempUaIndex[0]]);
                        tvCurrentUA.setText("当前 UA:\n" + ua);
                    }
                });
            }

            // 自定义输入框内容变化时更新预览
            etCustomUA.addTextChangedListener(new android.text.TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                    if (tvCurrentUA != null && tempMode[0] == MODE_CUSTOM) {
                        tvCurrentUA.setText("自定义 UA:\n" + s.toString());
                    }
                }
                @Override public void afterTextChanged(android.text.Editable s) {}
            });

            new AlertDialog.Builder(this)
                    .setTitle("浏览器模式")
                    .setView(view)
                    .setPositiveButton("应用并刷新", (dialog, which) -> {
                        currentMode = tempMode[0];
                        currentUaIndex = tempUaIndex[0];
                        if (currentMode == MODE_CUSTOM) {
                            String customUA = etCustomUA.getText().toString().trim();
                            if (customUA.isEmpty()) {
                                Toast.makeText(this, "请输入自定义 UA", Toast.LENGTH_SHORT).show();
                                return;
                            }
                            currentUA = customUA;
                            prefs.edit().putString("ua_custom", customUA).apply();
                        } else {
                            currentUA = resolveTemplate(uaTemplates[currentMode][currentUaIndex]);
                        }
                        prefs.edit().putInt("ua_mode", currentMode).putInt("ua_index_" + currentMode, currentUaIndex).apply();
                        if (tvUAModeLabel != null) tvUAModeLabel.setText(modeNames[currentMode]);
                        applyUAAndReload();
                        Toast.makeText(this, "已切换到" + modeNames[currentMode] + "模式", Toast.LENGTH_SHORT).show();
                    })
                    .setNegativeButton("取消", null)
                    .show();
        } catch (Exception e) {
            Toast.makeText(this, "打开模式设置失败", Toast.LENGTH_SHORT).show();
        }
    }

    private String getModeDesc(int mode) {
        switch (mode) {
            case MODE_PHONE: return "显示手机版网页，适合日常浏览";
            case MODE_TABLET: return "显示平板版网页，类似 iPad 体验";
            case MODE_DESKTOP: return "显示桌面版网页，像电脑一样浏览";
            case MODE_CUSTOM: return "输入任意 User-Agent 字符串";
            default: return "";
        }
    }

    private void loadBrowserOptions(RadioGroup rg, int mode) {
        rg.removeAllViews();
        if (mode == MODE_CUSTOM) return;
        String[] names = uaDisplayNames[mode];
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
        if (t != null && t.webView != null && t.webView.canGoBack()) {
            t.webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override protected void onPause() {
        super.onPause();
        for (Tab t : tabs) {
            if (t.webView != null) {
                try { t.webView.onPause(); } catch (Exception e) { /* ignore */ }
            }
        }
    }

    @Override protected void onResume() {
        super.onResume();
        for (Tab t : tabs) {
            if (t.webView != null) {
                try { t.webView.onResume(); } catch (Exception e) { /* ignore */ }
            }
        }
    }

    @Override protected void onDestroy() {
        for (Tab t : tabs) {
            if (t.webView != null) {
                try {
                    t.webView.stopLoading();
                    t.webView.loadUrl("about:blank");
                    t.webView.removeAllViews();
                    t.webView.destroy();
                } catch (Exception e) { /* ignore */ }
            }
        }
        tabs.clear();
        if (dbExecutor != null && !dbExecutor.isShutdown()) {
            dbExecutor.shutdown();
        }
        super.onDestroy();
    }
}
