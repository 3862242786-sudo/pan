// ===== 青柠OS 网页体验系统 - 核心逻辑 =====
// 版本: 1.0.0

const QNOS_VERSION = '1.0.0';
const QNOS_KERNEL = '6.1.0-qn';
const QNOS_CODENAME = 'Qingning Alex';

// ===== 状态管理 =====
let currentActivationCode = '';
let currentPermission = null;
let openWindows = {};
let windowZIndex = 100;
let isMobileMode = false;
let startMenuOpen = false;
let terminalHistory = [];
let terminalCwd = '/home/user';
let terminalCommandHistory = [];
let terminalHistoryIndex = -1;

// ===== 壁纸定义 =====
const WALLPAPERS = {
    dark: {
        name: '深色渐变',
        style: 'linear-gradient(135deg, #0a0e1a 0%, #0d1117 30%, #0f1923 60%, #0a1628 100%)'
    },
    starry: {
        name: '星空',
        style: 'linear-gradient(135deg, #0a0e1a 0%, #0d1117 25%, #111827 50%, #0f172a 75%, #0a0e1a 100%)'
    },
    abstract: {
        name: '抽象',
        style: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #0a0e1a 100%)'
    }
};

// ===== 模拟文件系统 =====
const fileSystem = {
    '/home/user': {
        '桌面': {
            '欢迎.txt': { size: '1.2 KB', date: '2026-01-15', type: 'file' },
            '说明.md': { size: '0.8 KB', date: '2026-01-15', type: 'file' }
        },
        '文档': {
            '笔记.txt': { size: '2.1 KB', date: '2026-02-10', type: 'file' },
            '项目计划.md': { size: '3.5 KB', date: '2026-03-05', type: 'file' },
            '报告.pdf': { size: '1.5 MB', date: '2026-04-20', type: 'file' }
        },
        '下载': {
            '安装包.deb': { size: '45.2 MB', date: '2026-05-01', type: 'file' },
            '图片.zip': { size: '12.8 MB', date: '2026-05-10', type: 'file' },
            '工具.tar.gz': { size: '8.3 MB', date: '2026-05-15', type: 'file' }
        },
        '图片': {
            '壁纸1.png': { size: '2.4 MB', date: '2026-01-20', type: 'file' },
            '壁纸2.jpg': { size: '1.8 MB', date: '2026-02-14', type: 'file' },
            '截图.png': { size: '0.5 MB', date: '2026-05-20', type: 'file' }
        }
    }
};

// ===== 模拟应用列表 =====
const appStoreApps = [
    { id: 'app-office', name: '青柠办公', version: '1.0.0', size: '25 MB', desc: '文档编辑工具', installed: true },
    { id: 'app-music', name: '青柠音乐', version: '1.2.0', size: '18 MB', desc: '本地音乐播放器', installed: true },
    { id: 'app-video', name: '青柠视频', version: '2.0.0', size: '35 MB', desc: '视频播放器', installed: false },
    { id: 'app-notes', name: '青柠笔记', version: '1.1.0', size: '8 MB', desc: '轻量笔记工具', installed: false },
    { id: 'app-calc', name: '青柠计算器', version: '1.0.0', size: '3 MB', desc: '科学计算器', installed: true },
    { id: 'app-weather', name: '青柠天气', version: '1.0.1', size: '5 MB', desc: '天气预报应用', installed: false },
    { id: 'app-calendar', name: '青柠日历', version: '1.0.0', size: '6 MB', desc: '日历管理', installed: true },
    { id: 'app-code', name: '青柠代码', version: '2.1.0', size: '45 MB', desc: '代码编辑器', installed: false }
];

// ===== 权限系统 =====
function getPermissionLevel(code) {
    if (!code) return null;
    const upperCode = code.toUpperCase();
    const numPart = parseInt(code.substring(2));

    if (upperCode === 'XT0000') {
        return { level: 'system', name: '系统', code: code };
    } else if (upperCode === 'XT0001') {
        return { level: 'admin', name: '站长', code: code };
    } else if (!isNaN(numPart) && numPart >= 2 && numPart <= 1999) {
        return { level: 'admin', name: '管理员', code: code };
    } else {
        return { level: 'user', name: '普通用户', code: code };
    }
}

function canModifySettings() {
    return currentPermission && (currentPermission.level === 'system' || currentPermission.level === 'admin');
}

function canResetSettings() {
    return currentPermission && (currentPermission.level === 'system' || currentPermission.level === 'admin');
}

// ===== 激活码验证 =====
function validateActivationCode(code) {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    return /^xt\d{4,}$/i.test(trimmed);
}

function activate(code) {
    const trimmed = code.trim();
    if (!validateActivationCode(trimmed)) {
        showToast('激活码格式错误！格式为 xt + 4位以上数字', 'error');
        return false;
    }
    currentActivationCode = trimmed;
    currentPermission = getPermissionLevel(trimmed);
    localStorage.setItem('qn_os_activation_code', trimmed);
    showToast('激活成功！权限等级：' + currentPermission.name, 'success');
    return true;
}

function loadActivation() {
    const saved = localStorage.getItem('qn_os_activation_code');
    if (saved && validateActivationCode(saved)) {
        currentActivationCode = saved;
        currentPermission = getPermissionLevel(saved);
        return true;
    }
    return false;
}

function deactivate() {
    currentActivationCode = '';
    currentPermission = null;
    localStorage.removeItem('qn_os_activation_code');
    localStorage.removeItem('qn_os_wallpaper');
    localStorage.removeItem('qn_os_theme_color');
    localStorage.removeItem('qn_os_skipped_version');
    document.getElementById('activationScreen').style.display = 'flex';
    document.getElementById('osDesktop').style.display = 'none';
}

// ===== Toast 消息提示 =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== 时钟 =====
function startClock() {
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const elements = document.querySelectorAll('.clock-time');
        elements.forEach(el => el.textContent = timeStr);
        const dateElements = document.querySelectorAll('.clock-date');
        dateElements.forEach(el => el.textContent = dateStr);
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// ===== 响应式检测 =====
function checkResponsive() {
    const wasMobile = isMobileMode;
    isMobileMode = window.innerWidth < 768;

    const desktopUI = document.getElementById('desktopUI');
    const mobileUI = document.getElementById('mobileUI');

    if (isMobileMode) {
        if (desktopUI) desktopUI.style.display = 'none';
        if (mobileUI) mobileUI.style.display = 'block';
    } else {
        if (desktopUI) desktopUI.style.display = 'block';
        if (mobileUI) mobileUI.style.display = 'none';
    }
}

// ===== 窗口管理 =====
function openWindow(appId) {
    if (isMobileMode) {
        openMobileApp(appId);
        return;
    }

    if (openWindows[appId]) {
        const win = document.getElementById('window-' + appId);
        if (win) {
            win.style.display = 'flex';
            bringToFront(appId);
            return;
        }
    }

    const appConfig = getAppConfig(appId);
    if (!appConfig) return;

    const win = document.createElement('div');
    win.id = 'window-' + appId;
    win.className = 'os-window';
    win.style.width = appConfig.width || '700px';
    win.style.height = appConfig.height || '500px';
    win.style.left = (100 + Object.keys(openWindows).length * 30) + 'px';
    win.style.top = (60 + Object.keys(openWindows).length * 30) + 'px';
    win.style.zIndex = ++windowZIndex;

    win.innerHTML = `
        <div class="window-titlebar" onmousedown="startDrag(event, '${appId}')">
            <div class="window-titlebar-left">
                <span class="window-titlebar-icon">${appConfig.icon}</span>
                <span class="window-titlebar-text">${appConfig.name}</span>
            </div>
            <div class="window-titlebar-buttons">
                <button class="win-btn win-btn-minimize" onclick="minimizeWindow('${appId}')" title="最小化">&#8722;</button>
                <button class="win-btn win-btn-maximize" onclick="maximizeWindow('${appId}')" title="最大化">&#9723;</button>
                <button class="win-btn win-btn-close" onclick="closeWindow('${appId}')" title="关闭">&#10005;</button>
            </div>
        </div>
        <div class="window-content" id="window-content-${appId}">
            ${getAppContent(appId)}
        </div>
    `;

    win.addEventListener('mousedown', () => bringToFront(appId));
    document.getElementById('desktopArea').appendChild(win);
    openWindows[appId] = { maximized: false, minimized: false, prevStyle: {} };
    updateTaskbarWindows();
    bringToFront(appId);

    // 初始化应用内容
    if (appId === 'terminal') initTerminal();
    if (appId === 'settings') initSettings();
    if (appId === 'antivirus') initAntivirus();
    if (appId === 'filemanager') initFileManager();
}

function closeWindow(appId) {
    const win = document.getElementById('window-' + appId);
    if (win) win.remove();
    delete openWindows[appId];
    updateTaskbarWindows();
}

function minimizeWindow(appId) {
    const win = document.getElementById('window-' + appId);
    if (win) {
        win.style.display = 'none';
        if (openWindows[appId]) openWindows[appId].minimized = true;
    }
}

function maximizeWindow(appId) {
    const win = document.getElementById('window-' + appId);
    if (!win || !openWindows[appId]) return;

    if (openWindows[appId].maximized) {
        const prev = openWindows[appId].prevStyle;
        win.style.left = prev.left;
        win.style.top = prev.top;
        win.style.width = prev.width;
        win.style.height = prev.height;
        win.style.borderRadius = '12px';
        openWindows[appId].maximized = false;
    } else {
        openWindows[appId].prevStyle = {
            left: win.style.left,
            top: win.style.top,
            width: win.style.width,
            height: win.style.height
        };
        win.style.left = '0';
        win.style.top = '40px';
        win.style.width = '100%';
        win.style.height = 'calc(100% - 40px - 60px)';
        win.style.borderRadius = '0';
        openWindows[appId].maximized = true;
    }
}

function bringToFront(appId) {
    const win = document.getElementById('window-' + appId);
    if (win) {
        win.style.zIndex = ++windowZIndex;
        if (openWindows[appId]) openWindows[appId].minimized = false;
    }
}

function updateTaskbarWindows() {
    const container = document.getElementById('taskbarWindows');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(openWindows).forEach(appId => {
        const appConfig = getAppConfig(appId);
        if (!appConfig) return;
        const btn = document.createElement('button');
        btn.className = 'taskbar-window-btn' + (openWindows[appId].minimized ? ' minimized' : '');
        btn.innerHTML = `<span class="taskbar-window-icon">${appConfig.icon}</span><span>${appConfig.name}</span>`;
        btn.onclick = () => {
            const win = document.getElementById('window-' + appId);
            if (win && openWindows[appId].minimized) {
                win.style.display = 'flex';
                openWindows[appId].minimized = false;
                bringToFront(appId);
            } else if (win) {
                bringToFront(appId);
            }
        };
        container.appendChild(btn);
    });
}

// ===== 窗口拖拽 =====
let dragState = null;

function startDrag(e, appId) {
    if (e.target.closest('.window-titlebar-buttons')) return;
    const win = document.getElementById('window-' + appId);
    if (!win || (openWindows[appId] && openWindows[appId].maximized)) return;

    dragState = {
        appId: appId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: parseInt(win.style.left) || 0,
        origTop: parseInt(win.style.top) || 0
    };

    e.preventDefault();
}

document.addEventListener('mousemove', (e) => {
    if (!dragState) return;
    const win = document.getElementById('window-' + dragState.appId);
    if (!win) { dragState = null; return; }
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    win.style.left = (dragState.origLeft + dx) + 'px';
    win.style.top = (dragState.origTop + dy) + 'px';
});

document.addEventListener('mouseup', () => {
    dragState = null;
});

// ===== 应用配置 =====
function getAppConfig(appId) {
    const apps = {
        filemanager: { name: '文件管理器', icon: '&#128193;', width: '750px', height: '500px' },
        browser: { name: '青柠浏览器', icon: '&#127760;', width: '850px', height: '550px' },
        terminal: { name: '青柠终端', icon: '&#128187;', width: '650px', height: '450px' },
        settings: { name: '系统设置', icon: '&#9881;', width: '750px', height: '500px' },
        appstore: { name: '应用商店', icon: '&#128722;', width: '700px', height: '500px' },
        antivirus: { name: '青柠杀毒', icon: '&#128737;', width: '600px', height: '450px' },
        trash: { name: '回收站', icon: '&#128465;', width: '500px', height: '400px' }
    };
    return apps[appId] || null;
}

// ===== 应用内容生成 =====
function getAppContent(appId) {
    switch (appId) {
        case 'filemanager': return getFileManagerContent();
        case 'browser': return getBrowserContent();
        case 'terminal': return getTerminalContent();
        case 'settings': return getSettingsContent();
        case 'appstore': return getAppStoreContent();
        case 'antivirus': return getAntivirusContent();
        case 'trash': return getTrashContent();
        default: return '<div style="padding:20px;color:#94a3b8;">应用加载中...</div>';
    }
}

// ===== 文件管理器 =====
function getFileManagerContent() {
    return `
        <div class="filemanager-layout">
            <div class="filemanager-sidebar">
                <div class="fm-nav-item active" onclick="fmNavigate('桌面')">
                    <span>&#128193;</span> 桌面
                </div>
                <div class="fm-nav-item" onclick="fmNavigate('文档')">
                    <span>&#128196;</span> 文档
                </div>
                <div class="fm-nav-item" onclick="fmNavigate('下载')">
                    <span>&#11015;</span> 下载
                </div>
                <div class="fm-nav-item" onclick="fmNavigate('图片')">
                    <span>&#128247;</span> 图片
                </div>
            </div>
            <div class="filemanager-main">
                <div class="fm-header">
                    <span class="fm-path" id="fmPath">/home/user/桌面</span>
                </div>
                <div class="fm-filelist" id="fmFileList">
                </div>
            </div>
        </div>
    `;
}

function initFileManager() {
    fmNavigate('桌面');
}

function fmNavigate(folder) {
    const files = fileSystem['/home/user'][folder];
    if (!files) return;

    document.querySelectorAll('.fm-nav-item').forEach(el => el.classList.remove('active'));
    event.target.closest('.fm-nav-item').classList.add('active');

    const pathEl = document.getElementById('fmPath');
    if (pathEl) pathEl.textContent = '/home/user/' + folder;

    const listEl = document.getElementById('fmFileList');
    if (!listEl) return;

    let html = '<div class="fm-file-header"><span class="fm-col-name">名称</span><span class="fm-col-size">大小</span><span class="fm-col-date">修改日期</span></div>';
    Object.keys(files).forEach(name => {
        const f = files[name];
        html += `<div class="fm-file-row">
            <span class="fm-col-name"><span class="fm-file-icon">${f.type === 'file' ? '&#128196;' : '&#128193;'}</span> ${name}</span>
            <span class="fm-col-size">${f.size}</span>
            <span class="fm-col-date">${f.date}</span>
        </div>`;
    });
    listEl.innerHTML = html;
}

// ===== 青柠浏览器 =====
function getBrowserContent() {
    return `
        <div class="browser-layout">
            <div class="browser-toolbar">
                <button class="browser-nav-btn" onclick="browserBack()" title="后退">&#8592;</button>
                <button class="browser-nav-btn" onclick="browserForward()" title="前进">&#8594;</button>
                <button class="browser-nav-btn" onclick="browserRefresh()" title="刷新">&#8635;</button>
                <input type="text" class="browser-urlbar" id="browserUrlbar" value="https://www.example.com" placeholder="输入网址..." onkeydown="if(event.key==='Enter')browserGo()">
                <button class="browser-go-btn" onclick="browserGo()">前往</button>
            </div>
            <div class="browser-content" id="browserContent">
                <div class="browser-home">
                    <div style="font-size:48px;margin-bottom:16px;">&#127760;</div>
                    <h3 style="color:#e2e8f0;margin-bottom:8px;">青柠浏览器</h3>
                    <p style="color:#64748b;font-size:0.9rem;">在地址栏输入网址开始浏览</p>
                    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
                        <div class="browser-quick-link" onclick="browserQuickNav('https://www.baidu.com')">&#127760; 百度</div>
                        <div class="browser-quick-link" onclick="browserQuickNav('https://www.bilibili.com')">&#127909; B站</div>
                        <div class="browser-quick-link" onclick="browserQuickNav('https://github.com')">&#128187; GitHub</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function browserGo() {
    const urlbar = document.getElementById('browserUrlbar');
    const content = document.getElementById('browserContent');
    if (!urlbar || !content) return;
    let url = urlbar.value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
        urlbar.value = url;
    }
    content.innerHTML = `<div style="padding:20px;color:#94a3b8;text-align:center;margin-top:40px;">
        <div style="font-size:36px;margin-bottom:12px;">&#128274;</div>
        <p>安全限制：无法在此环境中加载外部网页</p>
        <p style="font-size:0.85rem;margin-top:8px;color:#64748b;">目标: ${url}</p>
    </div>`;
}

function browserBack() { showToast('浏览器：后退', 'info'); }
function browserForward() { showToast('浏览器：前进', 'info'); }
function browserRefresh() { showToast('浏览器：刷新', 'info'); }
function browserQuickNav(url) {
    const urlbar = document.getElementById('browserUrlbar');
    if (urlbar) urlbar.value = url;
    browserGo();
}

// ===== 青柠终端 =====
function getTerminalContent() {
    return `
        <div class="terminal-layout">
            <div class="terminal-output" id="terminalOutput">
                <div class="terminal-line terminal-welcome">
                    青柠终端 v1.0.0 - 输入 help 查看可用命令
                </div>
                <div class="terminal-line terminal-welcome">
                    当前用户: ${currentPermission ? currentPermission.name : '未知'} (${currentActivationCode || '未激活'})
                </div>
                <div class="terminal-line">&nbsp;</div>
            </div>
            <div class="terminal-input-line">
                <span class="terminal-prompt" id="terminalPrompt">user@qingning-os:~$</span>
                <input type="text" class="terminal-input" id="terminalInput" autofocus
                    onkeydown="handleTerminalKey(event)" autocomplete="off" spellcheck="false">
            </div>
        </div>
    `;
}

function initTerminal() {
    const input = document.getElementById('terminalInput');
    if (input) {
        input.focus();
        input.addEventListener('click', () => input.focus());
    }
}

function handleTerminalKey(e) {
    const input = document.getElementById('terminalInput');
    if (!input) return;

    if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (cmd) {
            terminalCommandHistory.push(cmd);
            terminalHistoryIndex = terminalCommandHistory.length;
            processTerminalCommand(cmd);
        }
        input.value = '';
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (terminalHistoryIndex > 0) {
            terminalHistoryIndex--;
            input.value = terminalCommandHistory[terminalHistoryIndex] || '';
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (terminalHistoryIndex < terminalCommandHistory.length - 1) {
            terminalHistoryIndex++;
            input.value = terminalCommandHistory[terminalHistoryIndex] || '';
        } else {
            terminalHistoryIndex = terminalCommandHistory.length;
            input.value = '';
        }
    }
}

function terminalPrint(text, className) {
    const output = document.getElementById('terminalOutput');
    if (!output) return;
    const line = document.createElement('div');
    line.className = 'terminal-line' + (className ? ' ' + className : '');
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function terminalPrintHTML(html) {
    const output = document.getElementById('terminalOutput');
    if (!output) return;
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = html;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function processTerminalCommand(cmd) {
    const output = document.getElementById('terminalOutput');
    if (!output) return;

    // 显示输入的命令
    const prompt = document.getElementById('terminalPrompt');
    const promptText = prompt ? prompt.textContent : 'user@qingning-os:~$';
    terminalPrint(promptText + ' ' + cmd, 'terminal-cmd');

    const parts = cmd.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case 'help':
            terminalPrint('可用命令:', 'terminal-info');
            terminalPrint('  help        - 显示此帮助信息');
            terminalPrint('  ls          - 列出当前目录文件');
            terminalPrint('  cd <dir>    - 切换目录');
            terminalPrint('  date        - 显示当前日期时间');
            terminalPrint('  whoami      - 显示当前用户信息');
            terminalPrint('  clear       - 清屏');
            terminalPrint('  neofetch    - 显示系统信息');
            terminalPrint('  permission  - 显示当前权限等级');
            terminalPrint('  update      - 检查更新');
            terminalPrint('  reset       - 重置所有设置（仅系统/站长）');
            terminalPrint('  exit        - 关闭终端');
            break;

        case 'ls':
            const cwdFiles = fileSystem['/home/user'];
            if (cwdFiles) {
                Object.keys(cwdFiles).forEach(name => {
                    const isDir = typeof cwdFiles[name] === 'object' && cwdFiles[name].type !== 'file';
                    terminalPrint((isDir ? '&#128193; ' : '&#128196; ') + name);
                });
            }
            break;

        case 'cd':
            if (args[0]) {
                const target = args[0];
                const parent = fileSystem['/home/user'];
                if (parent && parent[target]) {
                    terminalCwd = '/home/user/' + target;
                    updateTerminalPrompt();
                    terminalPrint('已切换到: ' + terminalCwd, 'terminal-info');
                } else if (target === '..' || target === '~') {
                    terminalCwd = '/home/user';
                    updateTerminalPrompt();
                    terminalPrint('已切换到: ' + terminalCwd, 'terminal-info');
                } else {
                    terminalPrint('cd: 目录不存在: ' + target, 'terminal-error');
                }
            } else {
                terminalCwd = '/home/user';
                updateTerminalPrompt();
            }
            break;

        case 'date':
            terminalPrint(new Date().toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }));
            break;

        case 'whoami':
            terminalPrint('用户: ' + (currentPermission ? currentPermission.name : '未知'));
            terminalPrint('激活码: ' + (currentActivationCode || '未激活'));
            terminalPrint('权限等级: ' + (currentPermission ? currentPermission.level : '无'));
            terminalPrint('目录: ' + terminalCwd);
            break;

        case 'clear':
            if (output) output.innerHTML = '';
            break;

        case 'neofetch':
            printNeofetch();
            break;

        case 'permission':
            if (currentPermission) {
                terminalPrint('权限等级: ' + currentPermission.level, 'terminal-info');
                terminalPrint('权限名称: ' + currentPermission.name, 'terminal-info');
                terminalPrint('激活码: ' + currentPermission.code, 'terminal-info');
                if (currentPermission.level === 'system') {
                    terminalPrint('权限说明: 最高权限，可修改/还原任何内容', 'terminal-success');
                } else if (currentPermission.level === 'admin') {
                    terminalPrint('权限说明: 高级权限，可修改大部分内容', 'terminal-success');
                } else {
                    terminalPrint('权限说明: 基础权限，使用系统功能', 'terminal-info');
                }
            } else {
                terminalPrint('未激活，无法获取权限信息', 'terminal-error');
            }
            break;

        case 'update':
            checkForUpdates(true);
            break;

        case 'reset':
            if (canResetSettings()) {
                resetAllSettings();
                terminalPrint('所有设置已重置为默认值', 'terminal-success');
            } else {
                terminalPrint('权限不足！仅系统(XT0000)和站长(xt0001)可执行此操作', 'terminal-error');
            }
            break;

        case 'exit':
            closeWindow('terminal');
            break;

        default:
            terminalPrint('命令未找到: ' + command + '  输入 help 查看可用命令', 'terminal-error');
    }
}

function updateTerminalPrompt() {
    const prompt = document.getElementById('terminalPrompt');
    if (prompt) {
        const shortDir = terminalCwd.replace('/home/user', '~');
        prompt.textContent = 'user@qingning-os:' + shortDir + '$';
    }
}

function printNeofetch() {
    const art = [
        '    &#9650;&#9650;&#9650;&#9650;&#9650;&#9650;&#9650;&#9650;&#9650;&#9650;&#9650;     ',
        '   &#9650;          &#9650;    ',
        '  &#9650;   QN OS   &#9650;   ',
        ' &#9650;            &#9650;  ',
        '  &#9660;          &#9660;    ',
        '   &#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;     ',
        '    &#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;&#9660;      '
    ];

    const info = [
        { label: 'OS', value: 'QingningOS ' + QNOS_VERSION },
        { label: '内核', value: QNOS_KERNEL + '-qn' },
        { label: '代号', value: QNOS_CODENAME },
        { label: '激活码', value: currentActivationCode || '未激活' },
        { label: '权限', value: currentPermission ? currentPermission.name : '未知' },
        { label: '分辨率', value: window.innerWidth + 'x' + window.innerHeight },
        { label: '终端', value: '青柠终端 v1.0' },
        { label: '模式', value: isMobileMode ? '手机模式' : '桌面模式' },
        { label: '运行时', value: navigator.userAgent.split(') ')[0].split(' (').pop() || 'Web' }
    ];

    const maxLines = Math.max(art.length, info.length);
    for (let i = 0; i < maxLines; i++) {
        const left = art[i] || '                       ';
        const right = info[i] ? `<span style="color:#22c55e;font-weight:bold;">${info[i].label}</span>: ${info[i].value}` : '';
        terminalPrintHTML(`<span style="color:#22c55e;">${left}</span>  ${right}`);
    }
}

// ===== 系统设置 =====
function getSettingsContent() {
    const currentWallpaper = localStorage.getItem('qn_os_wallpaper') || 'dark';
    return `
        <div class="settings-layout">
            <div class="settings-sidebar">
                <div class="settings-nav-item active" onclick="settingsSwitchTab('general', this)">
                    <span>&#9881;</span> 通用
                </div>
                <div class="settings-nav-item" onclick="settingsSwitchTab('display', this)">
                    <span>&#128247;</span> 显示
                </div>
                <div class="settings-nav-item" onclick="settingsSwitchTab('network', this)">
                    <span>&#128246;</span> 网络
                </div>
                <div class="settings-nav-item" onclick="settingsSwitchTab('about', this)">
                    <span>&#8505;</span> 关于
                </div>
            </div>
            <div class="settings-main" id="settingsMain">
                ${getSettingsGeneralContent(currentWallpaper)}
            </div>
        </div>
    `;
}

function getSettingsGeneralContent(currentWallpaper) {
    return `
        <div class="settings-section">
            <h3 class="settings-section-title">壁纸选择</h3>
            <div class="wallpaper-grid">
                <div class="wallpaper-option ${currentWallpaper === 'dark' ? 'active' : ''}" onclick="setWallpaper('dark')" style="background:linear-gradient(135deg, #0a0e1a, #0d1117, #0f1923, #0a1628);">
                    <span>深色渐变</span>
                </div>
                <div class="wallpaper-option ${currentWallpaper === 'starry' ? 'active' : ''}" onclick="setWallpaper('starry')" style="background:linear-gradient(135deg, #0a0e1a, #0d1117, #111827, #0f172a);">
                    <span>星空</span>
                </div>
                <div class="wallpaper-option ${currentWallpaper === 'abstract' ? 'active' : ''}" onclick="setWallpaper('abstract')" style="background:linear-gradient(135deg, #0a0e1a, #1a1a2e, #16213e, #0f3460);">
                    <span>抽象</span>
                </div>
            </div>
            <p class="settings-note" id="wallpaperNote">${canModifySettings() ? '点击更换壁纸' : '仅管理员及以上权限可更换壁纸'}</p>
        </div>
    `;
}

function initSettings() {
    // 初始化完成
}

function settingsSwitchTab(tab, el) {
    document.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');

    const main = document.getElementById('settingsMain');
    if (!main) return;

    switch (tab) {
        case 'general': {
            const wp = localStorage.getItem('qn_os_wallpaper') || 'dark';
            main.innerHTML = getSettingsGeneralContent(wp);
            break;
        }
        case 'display':
            main.innerHTML = `
                <div class="settings-section">
                    <h3 class="settings-section-title">显示信息</h3>
                    <div class="settings-info-row">
                        <span>分辨率</span>
                        <span>${window.innerWidth} x ${window.innerHeight}</span>
                    </div>
                    <div class="settings-info-row">
                        <span>像素比</span>
                        <span>${window.devicePixelRatio}x</span>
                    </div>
                    <div class="settings-info-row">
                        <span>色彩模式</span>
                        <span>深色主题</span>
                    </div>
                    <div class="settings-info-row">
                        <span>模式</span>
                        <span>${isMobileMode ? '手机模式' : '桌面模式'}</span>
                    </div>
                </div>
            `;
            break;
        case 'network':
            main.innerHTML = `
                <div class="settings-section">
                    <h3 class="settings-section-title">网络状态</h3>
                    <div class="network-status">
                        <div class="network-item connected">
                            <span class="network-icon">&#128246;</span>
                            <div>
                                <div class="network-name">QingningOS-WiFi</div>
                                <div class="network-detail">已连接 · 信号强度: 优秀</div>
                            </div>
                            <span class="network-badge connected">已连接</span>
                        </div>
                        <div class="network-item">
                            <span class="network-icon">&#128246;</span>
                            <div>
                                <div class="network-name">Guest-Network</div>
                                <div class="network-detail">信号强度: 良好</div>
                            </div>
                            <span class="network-badge">未连接</span>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'about':
            main.innerHTML = `
                <div class="settings-section">
                    <h3 class="settings-section-title">关于青柠OS</h3>
                    <div style="text-align:center;padding:20px 0;">
                        <div style="font-size:64px;margin-bottom:12px;">&#9729;</div>
                        <h2 style="color:#22c55e;font-size:1.5rem;">青柠OS</h2>
                        <p style="color:#94a3b8;margin-top:4px;">QingningOS Web Edition</p>
                    </div>
                    <div class="settings-info-row">
                        <span>版本号</span>
                        <span>v${QNOS_VERSION}</span>
                    </div>
                    <div class="settings-info-row">
                        <span>内核版本</span>
                        <span>${QNOS_KERNEL}</span>
                    </div>
                    <div class="settings-info-row">
                        <span>代号</span>
                        <span>${QNOS_CODENAME}</span>
                    </div>
                    <div class="settings-info-row">
                        <span>激活码</span>
                        <span>${currentActivationCode || '未激活'}</span>
                    </div>
                    <div class="settings-info-row">
                        <span>权限等级</span>
                        <span>${currentPermission ? currentPermission.name : '未知'}</span>
                    </div>
                    <div style="margin-top:20px;text-align:center;">
                        <button class="settings-btn" onclick="checkForUpdates(true)">检查更新</button>
                    </div>
                </div>
            `;
            break;
    }
}

function setWallpaper(wpId) {
    if (!canModifySettings()) {
        showToast('权限不足！仅管理员及以上权限可更换壁纸', 'error');
        return;
    }
    const wp = WALLPAPERS[wpId];
    if (!wp) return;

    localStorage.setItem('qn_os_wallpaper', wpId);

    const desktop = document.getElementById('desktopWallpaper');
    if (desktop) desktop.style.background = wp.style;

    const mobileHome = document.getElementById('mobileHomeScreen');
    if (mobileHome) mobileHome.style.background = wp.style;

    // 更新设置界面中的选中状态
    document.querySelectorAll('.wallpaper-option').forEach(el => el.classList.remove('active'));
    event.target.closest('.wallpaper-option').classList.add('active');

    showToast('壁纸已更换为: ' + wp.name, 'success');
}

// ===== 应用商店 =====
function getAppStoreContent() {
    let html = '<div class="appstore-layout">';
    html += '<div class="appstore-header"><h3>应用商店</h3><p style="color:#64748b;font-size:0.85rem;">发现优质应用</p></div>';
    html += '<div class="appstore-list">';
    appStoreApps.forEach(app => {
        html += `
            <div class="appstore-item">
                <div class="appstore-item-icon">&#128218;</div>
                <div class="appstore-item-info">
                    <div class="appstore-item-name">${app.name}</div>
                    <div class="appstore-item-desc">${app.desc}</div>
                    <div class="appstore-item-meta">v${app.version} · ${app.size}</div>
                </div>
                <button class="appstore-install-btn ${app.installed ? 'installed' : ''}" onclick="toggleAppInstall('${app.id}', this)">
                    ${app.installed ? '已安装' : '安装'}
                </button>
            </div>
        `;
    });
    html += '</div></div>';
    return html;
}

function toggleAppInstall(appId, btn) {
    const app = appStoreApps.find(a => a.id === appId);
    if (!app) return;

    if (app.installed) {
        app.installed = false;
        btn.textContent = '安装';
        btn.classList.remove('installed');
        showToast(app.name + ' 已卸载', 'info');
    } else {
        btn.textContent = '安装中...';
        btn.disabled = true;
        setTimeout(() => {
            app.installed = true;
            btn.textContent = '已安装';
            btn.classList.add('installed');
            btn.disabled = false;
            showToast(app.name + ' 安装成功', 'success');
        }, 1500);
    }
}

// ===== 青柠杀毒 =====
function getAntivirusContent() {
    return `
        <div class="antivirus-layout">
            <div class="antivirus-header">
                <div style="font-size:48px;margin-bottom:12px;">&#128737;</div>
                <h3 style="color:#22c55e;">青柠杀毒</h3>
                <p style="color:#64748b;font-size:0.85rem;">保护你的系统安全</p>
            </div>
            <div class="antivirus-status" id="antivirusStatus">
                <div class="av-status-icon safe">&#128737;</div>
                <div class="av-status-text">系统安全</div>
                <div class="av-status-detail">上次扫描: 从未</div>
            </div>
            <div class="antivirus-actions">
                <button class="av-scan-btn" id="avScanBtn" onclick="startAntivirusScan()">
                    &#128269; 开始扫描
                </button>
            </div>
            <div class="antivirus-progress" id="avProgress" style="display:none;">
                <div class="av-progress-bar">
                    <div class="av-progress-fill" id="avProgressFill"></div>
                </div>
                <div class="av-progress-text" id="avProgressText">准备扫描...</div>
            </div>
            <div class="antivirus-results" id="avResults" style="display:none;">
            </div>
        </div>
    `;
}

function initAntivirus() {
    // 初始化完成
}

function startAntivirusScan() {
    const btn = document.getElementById('avScanBtn');
    const progress = document.getElementById('avProgress');
    const results = document.getElementById('avResults');
    const fill = document.getElementById('avProgressFill');
    const text = document.getElementById('avProgressText');

    if (!btn || !progress || !fill || !text) return;

    btn.disabled = true;
    btn.textContent = '扫描中...';
    progress.style.display = 'block';
    if (results) results.style.display = 'none';

    const scanItems = [
        { path: '/home/user/桌面', desc: '正在扫描桌面...' },
        { path: '/home/user/文档', desc: '正在扫描文档...' },
        { path: '/home/user/下载', desc: '正在扫描下载...' },
        { path: '/home/user/图片', desc: '正在扫描图片...' },
        { path: '/system/bin', desc: '正在扫描系统文件...' },
        { path: '/usr/lib', desc: '正在扫描库文件...' }
    ];

    let progressVal = 0;
    let itemIndex = 0;

    const interval = setInterval(() => {
        progressVal += Math.random() * 15 + 5;
        if (progressVal > 100) progressVal = 100;

        if (itemIndex < scanItems.length && progressVal > (itemIndex + 1) * (100 / scanItems.length)) {
            itemIndex++;
        }

        fill.style.width = progressVal + '%';
        text.textContent = scanItems[Math.min(itemIndex, scanItems.length - 1)].desc;

        if (progressVal >= 100) {
            clearInterval(interval);
            fill.style.width = '100%';
            text.textContent = '扫描完成！';

            btn.disabled = false;
            btn.textContent = '&#128269; 开始扫描';

            // 显示结果
            const status = document.getElementById('antivirusStatus');
            if (status) {
                status.innerHTML = `
                    <div class="av-status-icon safe">&#9989;</div>
                    <div class="av-status-text">系统安全</div>
                    <div class="av-status-detail">扫描时间: ${new Date().toLocaleTimeString('zh-CN')}</div>
                `;
            }

            if (results) {
                results.style.display = 'block';
                results.innerHTML = `
                    <div class="av-result-header">扫描结果</div>
                    <div class="av-result-item safe">
                        <span>&#9989;</span> 扫描文件: 1,247 个
                    </div>
                    <div class="av-result-item safe">
                        <span>&#9989;</span> 威胁发现: 0 个
                    </div>
                    <div class="av-result-item safe">
                        <span>&#9989;</span> 系统状态: 安全
                    </div>
                `;
            }
            showToast('扫描完成，系统安全！', 'success');
        }
    }, 500);
}

// ===== 回收站 =====
function getTrashContent() {
    return `
        <div style="padding:30px;text-align:center;">
            <div style="font-size:64px;margin-bottom:16px;">&#128465;</div>
            <h3 style="color:#e2e8f0;margin-bottom:8px;">回收站</h3>
            <p style="color:#64748b;">回收站为空</p>
        </div>
    `;
}

// ===== 开始菜单 =====
function toggleStartMenu() {
    const menu = document.getElementById('startMenu');
    if (!menu) return;
    startMenuOpen = !startMenuOpen;
    menu.style.display = startMenuOpen ? 'block' : 'none';
}

function closeStartMenu() {
    const menu = document.getElementById('startMenu');
    if (menu) menu.style.display = 'none';
    startMenuOpen = false;
}

// ===== 手机模式应用 =====
function openMobileApp(appId) {
    const appConfig = getAppConfig(appId);
    if (!appConfig) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobileAppOverlay';
    overlay.className = 'mobile-app-overlay';
    overlay.innerHTML = `
        <div class="mobile-app-header">
            <button class="mobile-app-back" onclick="closeMobileApp()">&#8592;</button>
            <span class="mobile-app-title">${appConfig.name}</span>
            <div style="width:40px;"></div>
        </div>
        <div class="mobile-app-body" id="mobileAppBody">
            ${getAppContent(appId)}
        </div>
    `;
    document.getElementById('mobileUI').appendChild(overlay);

    if (appId === 'terminal') initTerminal();
    if (appId === 'settings') initSettings();
    if (appId === 'antivirus') initAntivirus();
    if (appId === 'filemanager') initFileManager();
}

function closeMobileApp() {
    const overlay = document.getElementById('mobileAppOverlay');
    if (overlay) overlay.remove();
}

// ===== 版本检测更新 =====
function checkForUpdates(manual) {
    const skippedVersion = localStorage.getItem('qn_os_skipped_version');

    fetch('os-version.json?t=' + Date.now())
        .then(resp => {
            if (!resp.ok) throw new Error('网络错误');
            return resp.json();
        })
        .then(data => {
            const remoteVersion = data.version || '0.0.0';
            if (compareVersions(remoteVersion, QNOS_VERSION) > 0) {
                if (skippedVersion === remoteVersion && !manual) return;
                showUpdateDialog(remoteVersion, data.changelog || '修复了一些问题');
            } else {
                if (manual) showToast('当前已是最新版本 v' + QNOS_VERSION, 'success');
            }
        })
        .catch(() => {
            if (manual) showToast('检查更新失败，请检查网络连接', 'error');
        });
}

function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return 1;
        if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
}

function showUpdateDialog(version, changelog) {
    const dialog = document.createElement('div');
    dialog.className = 'update-dialog-overlay';
    dialog.innerHTML = `
        <div class="update-dialog">
            <div class="update-dialog-header">
                <span style="font-size:32px;">&#128640;</span>
                <h3>发现新版本 v${version}</h3>
            </div>
            <div class="update-dialog-body">
                <p>更新日志:</p>
                <p style="color:#94a3b8;font-size:0.9rem;">${changelog}</p>
            </div>
            <div class="update-dialog-actions">
                <button class="settings-btn" onclick="doUpdate()">立即更新</button>
                <button class="settings-btn secondary" onclick="skipVersion('${version}')">跳过此版本</button>
                <button class="settings-btn secondary" onclick="this.closest('.update-dialog-overlay').remove()">稍后再说</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function doUpdate() {
    showToast('正在更新...', 'info');
    setTimeout(() => {
        localStorage.removeItem('qn_os_skipped_version');
        location.reload();
    }, 1500);
}

function skipVersion(version) {
    localStorage.setItem('qn_os_skipped_version', version);
    document.querySelector('.update-dialog-overlay')?.remove();
    showToast('已跳过 v' + version, 'info');
}

// ===== 重置所有设置 =====
function resetAllSettings() {
    localStorage.removeItem('qn_os_wallpaper');
    localStorage.removeItem('qn_os_theme_color');
    localStorage.removeItem('qn_os_skipped_version');

    // 重置壁纸
    const desktop = document.getElementById('desktopWallpaper');
    if (desktop) desktop.style.background = WALLPAPERS.dark.style;

    const mobileHome = document.getElementById('mobileHomeScreen');
    if (mobileHome) mobileHome.style.background = WALLPAPERS.dark.style;

    showToast('所有设置已重置为默认值', 'success');
}

// ===== 关机/重启 =====
function shutdownOS() {
    closeStartMenu();
    const overlay = document.createElement('div');
    overlay.className = 'shutdown-overlay';
    overlay.innerHTML = `
        <div class="shutdown-screen">
            <div style="font-size:48px;margin-bottom:20px;">&#9729;</div>
            <p style="font-size:1.2rem;color:#94a3b8;">正在关机...</p>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.querySelector('.shutdown-screen').innerHTML = `
            <div style="font-size:48px;margin-bottom:20px;">&#9729;</div>
            <p style="font-size:1rem;color:#64748b;">系统已关机</p>
            <button class="settings-btn" style="margin-top:20px;" onclick="this.closest('.shutdown-overlay').remove();">重新启动</button>
        `;
    }, 2000);
}

function restartOS() {
    closeStartMenu();
    const overlay = document.createElement('div');
    overlay.className = 'shutdown-overlay';
    overlay.innerHTML = `
        <div class="shutdown-screen">
            <div style="font-size:48px;margin-bottom:20px;">&#8635;</div>
            <p style="font-size:1.2rem;color:#94a3b8;">正在重启...</p>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        location.reload();
    }, 2000);
}

// ===== 初始化 =====
function initQingningOS() {
    // 检查是否有保存的激活码
    if (loadActivation()) {
        showOSDesktop();
    }

    // 激活按钮事件
    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) {
        activateBtn.addEventListener('click', () => {
            const input = document.getElementById('activationInput');
            if (!input) return;
            const code = input.value.trim();
            if (activate(code)) {
                showOSDesktop();
            }
        });
    }

    // 回车激活
    const activationInput = document.getElementById('activationInput');
    if (activationInput) {
        activationInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const code = activationInput.value.trim();
                if (activate(code)) {
                    showOSDesktop();
                }
            }
        });
    }

    // 响应式检测
    checkResponsive();
    window.addEventListener('resize', checkResponsive);

    // 点击空白关闭开始菜单
    document.addEventListener('click', (e) => {
        if (startMenuOpen && !e.target.closest('#startMenu') && !e.target.closest('#startMenuBtn')) {
            closeStartMenu();
        }
    });

    // 启动时钟
    startClock();

    // 检查更新
    setTimeout(() => checkForUpdates(false), 2000);
}

function showOSDesktop() {
    const activationScreen = document.getElementById('activationScreen');
    const osDesktop = document.getElementById('osDesktop');
    if (activationScreen) activationScreen.style.display = 'none';
    if (osDesktop) osDesktop.style.display = 'block';

    // 应用保存的壁纸
    const savedWallpaper = localStorage.getItem('qn_os_wallpaper') || 'dark';
    const wp = WALLPAPERS[savedWallpaper];
    if (wp) {
        const desktop = document.getElementById('desktopWallpaper');
        if (desktop) desktop.style.background = wp.style;
        const mobileHome = document.getElementById('mobileHomeScreen');
        if (mobileHome) mobileHome.style.background = wp.style;
    }

    // 更新激活码显示
    const codeDisplays = document.querySelectorAll('.activation-code-display');
    codeDisplays.forEach(el => el.textContent = currentActivationCode);

    // 更新用户名显示
    const usernameDisplays = document.querySelectorAll('.username-display');
    usernameDisplays.forEach(el => el.textContent = currentPermission ? currentPermission.name : '用户');

    // 更新权限显示
    const permDisplays = document.querySelectorAll('.permission-display');
    permDisplays.forEach(el => el.textContent = currentPermission ? currentPermission.name : '未知');

    checkResponsive();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initQingningOS);
