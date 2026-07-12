// ===== 网站关闭状态检查 + 青柠浏览器 UA 模式检测 =====

(function() {
    // 不检查的页面
    var excludePages = ['closed.html', 'auth.html', 'admin.html'];
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (excludePages.indexOf(currentPage) !== -1) return;

    // 站长已登录，跳过检查
    var isLoggedIn = localStorage.getItem('qn_logged_in');
    var isAdmin = localStorage.getItem('qn_is_admin');
    if (isLoggedIn === 'true' && isAdmin === 'true') return;

    // 已解锁，跳过检查
    if (sessionStorage.getItem('qn_site_unlocked') === 'true') return;

    // ===== 青柠浏览器 UA 模式检测 =====
    // 通过 CPU 架构判断是否为移动设备，与 UA 模式对比
    if (typeof LimeBrowser !== 'undefined' && LimeBrowser.getDeviceArch && LimeBrowser.getUAMode) {
        try {
            var arch = LimeBrowser.getDeviceArch();
            var isMobileArch = (arch.indexOf('arm') !== -1);
            var uaMode = parseInt(LimeBrowser.getUAMode()); // 0=手机 1=平板 2=电脑
            // ARM 架构（手机/平板）但 UA 模式是电脑
            if (isMobileArch && uaMode === 2 && !sessionStorage.getItem('qn_ua_mismatch_confirmed')) {
                showUAMismatchDialog(uaMode);
            }
        } catch(e) {}
    }

    function showUAMismatchDialog(uaMode) {
        var modeName = '电脑';
        if (uaMode === 1) modeName = '平板';

        var overlay = document.createElement('div');
        overlay.id = 'qn-ua-overlay';
        overlay.innerHTML = '' +
            '<style>' +
            '#qn-ua-overlay {' +
            '  position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;' +
            '  background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;' +
            '  font-family:"Noto Sans SC",sans-serif;' +
            '}' +
            '#qn-ua-dialog {' +
            '  background:#fff;border-radius:16px;padding:28px 24px 20px;margin:20px;' +
            '  max-width:320px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.15);' +
            '}' +
            '#qn-ua-dialog h3 {' +
            '  margin:0 0 8px;font-size:18px;color:#1e293b;font-weight:600;' +
            '}' +
            '#qn-ua-dialog p {' +
            '  margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;' +
            '}' +
            '#qn-ua-dialog .qn-ua-btns { display:flex;gap:10px; }' +
            '#qn-ua-dialog .qn-ua-btn {' +
            '  flex:1;padding:12px 0;border:none;border-radius:10px;font-size:15px;' +
            '  font-weight:500;cursor:pointer;transition:all 0.2s;' +
            '}' +
            '#qn-ua-dialog .qn-ua-btn:active { transform:scale(0.97); }' +
            '#qn-ua-dialog .qn-ua-btn-primary {' +
            '  background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;' +
            '}' +
            '#qn-ua-dialog .qn-ua-btn-secondary {' +
            '  background:#f1f5f9;color:#475569;' +
            '}' +
            '</style>' +
            '<div id="qn-ua-dialog">' +
            '  <h3>提示</h3>' +
            '  <p>你好，你是手机设备。如果使用' + modeName + '模式加载可能会出现未知问题。</p>' +
            '  <div class="qn-ua-btns">' +
            '    <button class="qn-ua-btn qn-ua-btn-secondary" id="qn-ua-continue">继续使用</button>' +
            '    <button class="qn-ua-btn qn-ua-btn-primary" id="qn-ua-switch">切换手机模式</button>' +
            '  </div>' +
            '</div>';

        document.body.appendChild(overlay);

        document.getElementById('qn-ua-continue').onclick = function() {
            sessionStorage.setItem('qn_ua_mismatch_confirmed', 'true');
            document.body.removeChild(overlay);
        };

        document.getElementById('qn-ua-switch').onclick = function() {
            document.body.removeChild(overlay);
            try {
                LimeBrowser.switchToMode(0); // 切换到手机模式，会自动刷新页面
            } catch(e) {
                window.location.reload();
            }
        };

        // 点击遮罩不关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) e.preventDefault();
        });
    }

    // ===== 网站关闭状态检查 =====
    // 从 localStorage 缓存检查（避免每次都请求网络）
    var cached = localStorage.getItem('qn_site_closed');
    var cachedTime = parseInt(localStorage.getItem('qn_site_closed_time') || '0');
    var now = Date.now();

    // 缓存有效期为 60 秒
    if (cached && (now - cachedTime) < 60000) {
        if (cached === 'true') {
            redirectToclosed();
            return;
        } else {
            return;
        }
    }

    // 从云端检查
    try {
        var supabaseUrl = localStorage.getItem('qn_supabase_url') || 'https://qljnyepwofqcrfjwjlhv.supabase.co';
        var settingsUrl = supabaseUrl + '/storage/v1/object/public/files/site_settings.json';

        fetch(settingsUrl + '?t=' + now)
            .then(function(resp) { return resp.json(); })
            .then(function(settings) {
                // 缓存结果
                localStorage.setItem('qn_site_closed', settings.siteClosed === true || settings.siteClosed === 'true' ? 'true' : 'false');
                localStorage.setItem('qn_site_closed_time', now.toString());

                if (settings.siteClosed === true || settings.siteClosed === 'true') {
                    redirectToclosed(settings);
                }
            })
            .catch(function() {
                // 网络错误时不阻止访问
            });
    } catch(e) {
        // 忽略错误
    }

    function redirectToclosed(settings) {
        var params = new URLSearchParams();
        if (settings) {
            if (settings.closedTitle) params.set('title', settings.closedTitle);
            if (settings.closedDesc) params.set('desc', settings.closedDesc);
        }
        var url = 'closed.html';
        if (params.toString()) url += '?' + params.toString();
        window.location.replace(url);
    }
})();
