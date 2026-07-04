/**
 * LimeBrowser 青柠系网站设备适配检测脚本
 * 
 * 检测逻辑：
 * 1. 检查是否在 LimeBrowser 中打开（UA 含 LimeBrowser）
 * 2. 通过 JS Bridge 获取浏览器当前 UA 模式
 * 3. 通过 UA 字符串判断实际设备类型
 * 4. 如果 UA 模式和实际设备不匹配，弹窗提示
 * 
 * 使用方式：在页面中引入 <script src="lime-detect.js"></script>
 */

(function() {
    'use strict';

    // 检查是否在 LimeBrowser 中
    var ua = navigator.userAgent;
    if (ua.indexOf('LimeBrowser') === -1) return;

    // 通过 UA 判断实际设备类型
    function detectRealDeviceType() {
        if (/iPhone|iPod|Android(?!.*Tablet|.*iPad)/i.test(ua)) return 'phone';
        if (/iPad|Android(.*Tablet)|Tablet/i.test(ua)) return 'tablet';
        return 'desktop';
    }

    // UA 模式对应名称
    var modeNames = { '0': '手机', '1': '平板', '2': '电脑' };
    var modeMap = { '0': 'phone', '1': 'tablet', '2': 'desktop' };

    function check() {
        try {
            // 等待 JS Bridge 就绪
            if (typeof window.LimeBrowser === 'undefined') {
                setTimeout(check, 300);
                return;
            }

            var browserMode = window.LimeBrowser.getUAMode();      // "0"=手机 "1"=平板 "2"=电脑
            var browserModeName = window.LimeBrowser.getUAModeName(); // "手机"/"平板"/"电脑"
            var realDevice = detectRealDeviceType();
            var browserDevice = modeMap[browserMode] || 'phone';

            // 模式匹配则不弹窗
            if (browserDevice === realDevice) return;

            // 不匹配 → 弹窗提示
            var realDeviceName = { 'phone': '手机', 'tablet': '平板', 'desktop': '电脑' }[realDevice] || '未知';

            // 构建弹窗 HTML
            var overlay = document.createElement('div');
            overlay.id = 'lime-detect-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif;animation:fadeIn .25s ease';

            var card = document.createElement('div');
            card.style.cssText = 'background:#1e293b;border:1px solid #334155;border-radius:20px;padding:32px 28px 24px;max-width:340px;width:90%;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.5)';

            var icon = document.createElement('div');
            icon.style.cssText = 'width:56px;height:56px;margin:0 auto 16px;background:rgba(34,197,94,0.12);border-radius:16px;display:flex;align-items:center;justify-content:center';
            icon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>';

            var title = document.createElement('div');
            title.style.cssText = 'color:#f1f5f9;font-size:18px;font-weight:700;margin-bottom:8px';
            title.textContent = '你似乎正在使用' + realDeviceName + '？';

            var desc = document.createElement('div');
            desc.style.cssText = 'color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px';
            desc.textContent = '检测到你的浏览器当前以「' + browserModeName + '」模式加载页面，但实际设备可能是' + realDeviceName + '。';

            var btnPhone = document.createElement('button');
            btnPhone.style.cssText = 'width:100%;padding:12px 0;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px;transition:opacity .2s';
            btnPhone.textContent = '以' + realDeviceName + '方式加载';
            btnPhone.onmouseover = function() { this.style.opacity = '0.85'; };
            btnPhone.onmouseout = function() { this.style.opacity = '1'; };
            btnPhone.onclick = function() {
                var modeToSwitch = { 'phone': 0, 'tablet': 1, 'desktop': 2 }[realDevice] || 0;
                try { window.LimeBrowser.switchToMode(modeToSwitch); } catch(e) {}
                closeDetect();
            };

            var btnContinue = document.createElement('button');
            btnContinue.style.cssText = 'width:100%;padding:12px 0;background:transparent;color:#94a3b8;border:1px solid #334155;border-radius:12px;font-size:15px;cursor:pointer;transition:all .2s';
            btnContinue.textContent = '继续以「' + browserModeName + '」方式加载';
            btnContinue.onmouseover = function() { this.style.borderColor = '#22c55e'; this.style.color = '#22c55e'; };
            btnContinue.onmouseout = function() { this.style.borderColor = '#334155'; this.style.color = '#94a3b8'; };
            btnContinue.onclick = function() { closeDetect(); };

            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(desc);
            card.appendChild(btnPhone);
            card.appendChild(btnContinue);
            overlay.appendChild(card);
            document.body.appendChild(overlay);

            // 注入动画
            var style = document.createElement('style');
            style.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}#lime-detect-overlay>div{animation:slideUp .3s ease}';
            document.head.appendChild(style);
        } catch(e) {
            // 非 LimeBrowser 环境，忽略
        }
    }

    function closeDetect() {
        var el = document.getElementById('lime-detect-overlay');
        if (el) {
            el.style.opacity = '0';
            el.style.transition = 'opacity .2s';
            setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
        }
        // 记住用户选择，本次会话不再弹窗
        try { sessionStorage.setItem('lime_detect_dismissed', '1'); } catch(e) {}
    }

    // 如果本次会话已经关闭过弹窗，不再显示
    try {
        if (sessionStorage.getItem('lime_detect_dismissed') === '1') return;
    } catch(e) {}

    // 页面加载完成后检测
    if (document.readyState === 'complete') {
        setTimeout(check, 500);
    } else {
        if (window.addEventListener) {
            window.addEventListener('load', function() { setTimeout(check, 500); });
        } else {
            window.attachEvent('onload', function() { setTimeout(check, 500); });
        }
    }

})();
