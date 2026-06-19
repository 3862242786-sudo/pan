// ===== 网站关闭状态检查 =====
// 在每个页面加载时检查 site_settings.json，如果网站关闭则跳转到 closed.html

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
