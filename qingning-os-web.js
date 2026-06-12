// ===== 青柠OS 网页体验系统 - 核心逻辑 =====
// 版本: 1.0.0

const QNOS_VERSION = '1.0.0';
const QNOS_KERNEL = '6.1.0-qn';
const QNOS_CODENAME = 'Qingning Alex';

// ===== 状态管理 =====
let currentActivationCode = '';
let currentPermission = null;
let currentUsername = '';
let currentDevice = 'desktop';
let openWindows = {};
let windowZIndex = 100;
let isMobileMode = false;
let startMenuOpen = false;
let terminalHistory = [];
let terminalCwd = '/home/user';
let terminalCommandHistory = [];
let terminalHistoryIndex = -1;
let oobeStep = 0;
let oobeData = {};
let calcHistory = '';
let calcCurrent = '0';
let calcNewNumber = true;
let calendarEvents = {};
let calendarCurrentDate = new Date();
let antivirusRealTime = true;
let volumeLevel = 80;
let brightnessLevel = 100;
let screenResolution = '1920x1080';
let currentLanguage = 'zh-CN';
let currentWallpaperId = 'dark';
let installedApps = [];
let mobileCurrentPage = 0;
let mobileAppDrawerOpen = false;
let dragState = null;
let resizeState = null;

// ===== 壁纸定义 =====
const WALLPAPERS = {
    dark: { name: '深色渐变', style: 'linear-gradient(135deg, #0a0e1a 0%, #0d1117 30%, #0f1923 60%, #0a1628 100%)' },
    starry: { name: '星空', style: 'linear-gradient(135deg, #0a0e1a 0%, #0d1117 25%, #111827 50%, #0f172a 75%, #0a0e1a 100%)' },
    abstract: { name: '抽象', style: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #0a0e1a 100%)' }
};

// ===== 应用定义 =====
const ALL_APPS = [
    { id: 'filemanager', name: '文件管理器', icon: '&#128193;', desktop: true, dock: true, mobile: true },
    { id: 'browser', name: '青柠浏览器', icon: '&#127760;', desktop: true, dock: true, mobile: true },
    { id: 'terminal', name: '青柠终端', icon: '&#128187;', desktop: true, dock: true, mobile: true },
    { id: 'calculator', name: '计算器', icon: '&#128290;', desktop: true, dock: false, mobile: true },
    { id: 'notepad', name: '记事本', icon: '&#128221;', desktop: true, dock: false, mobile: true },
    { id: 'calendar', name: '日历', icon: '&#128197;', desktop: true, dock: false, mobile: true },
    { id: 'settings', name: '系统设置', icon: '&#9881;', desktop: true, dock: true, mobile: true },
    { id: 'appstore', name: '应用商店', icon: '&#128722;', desktop: true, dock: false, mobile: true },
    { id: 'antivirus', name: '青柠杀毒', icon: '&#128737;', desktop: true, dock: false, mobile: true },
    { id: 'taskmanager', name: '任务管理器', icon: '&#128202;', desktop: true, dock: false, mobile: true },
    { id: 'trash', name: '回收站', icon: '&#128465;', desktop: true, dock: false, mobile: false }
];

// ===== 模拟文件系统 =====
let fileSystem = {
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
        },
        '视频': {
            '介绍.mp4': { size: '15.2 MB', date: '2026-03-15', type: 'file' },
            '教程.mp4': { size: '28.6 MB', date: '2026-04-10', type: 'file' }
        }
    }
};

// ===== 模拟应用商店 =====
let appStoreApps = [
    { id: 'app-office', name: '青柠办公', version: '1.0.0', size: '25 MB', desc: '文档编辑工具', installed: false, format: '.qpk' },
    { id: 'app-music', name: '青柠音乐', version: '1.2.0', size: '18 MB', desc: '本地音乐播放器', installed: false, format: '.qpk' },
    { id: 'app-video', name: '青柠视频', version: '2.0.0', size: '35 MB', desc: '视频播放器', installed: false, format: '.qpk' },
    { id: 'app-notes', name: '青柠笔记', version: '1.1.0', size: '8 MB', desc: '轻量笔记工具', installed: false, format: '.qpk' },
    { id: 'app-weather', name: '青柠天气', version: '1.0.1', size: '5 MB', desc: '天气预报应用', installed: false, format: '.qpk' },
    { id: 'app-code', name: '青柠代码', version: '2.1.0', size: '45 MB', desc: '代码编辑器', installed: false, format: '.qpk' }
];

// ===== 模拟进程 =====
let processes = [
    { pid: 1, name: 'qingning-shell', cpu: 0.5, mem: 12 },
    { pid: 2, name: 'qingning-desktop', cpu: 2.1, mem: 45 },
    { pid: 3, name: 'qingning-antivirus', cpu: 0.8, mem: 28 },
    { pid: 4, name: 'qingning-network', cpu: 0.3, mem: 8 },
    { pid: 5, name: 'qingning-audio', cpu: 0.2, mem: 6 },
    { pid: 6, name: 'browser-engine', cpu: 1.5, mem: 68 },
    { pid: 7, name: 'filemanager-daemon', cpu: 0.4, mem: 15 }
];

// ===== 模拟 WiFi 列表 =====
const WIFI_LIST = [
    { name: 'QingningOS-WiFi', signal: '优秀', locked: false, connected: true },
    { name: 'Guest-Network', signal: '良好', locked: true, connected: false },
    { name: 'Home-5G', signal: '优秀', locked: true, connected: false },
    { name: 'Office-Net', signal: '一般', locked: true, connected: false },
    { name: 'CoffeeShop-Free', signal: '良好', locked: false, connected: false }
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

function canControlAntivirus() {
    return currentPermission && (currentPermission.level === 'system' || currentPermission.level === 'admin');
}

// ===== 激活码验证 =====
function validateActivationCode(code) {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    return /^xt\d{4,}$/i.test(trimmed);
}

function getPermInfoClass(code) {
    const perm = getPermissionLevel(code);
    if (!perm) return '';
    if (perm.level === 'system') return 'system';
    if (perm.level === 'admin') return 'admin';
    return 'user';
}

function getPermInfoText(code) {
    const perm = getPermissionLevel(code);
    if (!perm) return '';
    if (perm.level === 'system') return '系统级权限 - 仅管理用，普通用户无法直接使用';
    if (perm.level === 'admin') return '管理员权限 - 可修改系统设置';
    return '普通用户权限 - 基础功能使用';
}

// ===== 开机动画 =====
function startBoot() {
    const bootScreen = document.getElementById('bootScreen');
    bootScreen.style.display = 'flex';
    setTimeout(() => {
        bootScreen.style.display = 'none';
        showNextScreen();
    }, 3000);
}

function showNextScreen() {
    const device = localStorage.getItem('qn_os_device');
    if (!device) {
        document.getElementById('deviceSelectScreen').style.display = 'flex';
    } else {
        currentDevice = device;
        showActivationScreen();
    }
}

// ===== 设备选择 =====
function selectDevice(device) {
    currentDevice = device;
    localStorage.setItem('qn_os_device', device);
    document.getElementById('deviceSelectScreen').style.display = 'none';
    showActivationScreen();
}

function showActivationScreen() {
    const savedCode = localStorage.getItem('qn_os_activation_code');
    if (savedCode && validateActivationCode(savedCode)) {
        currentActivationCode = savedCode;
        currentPermission = getPermissionLevel(savedCode);
        showOOBEOrDesktop();
    } else {
        document.getElementById('activationScreen').style.display = 'flex';
    }
}

// ===== 激活码处理 =====
function activate(code) {
    const trimmed = code.trim();
    if (!validateActivationCode(trimmed)) {
        showToast('激活码格式错误！格式为 xt + 4位以上数字', 'error');
        return false;
    }
    const perm = getPermissionLevel(trimmed);
    if (perm.level === 'system') {
        showToast('XT0000 为系统级激活码，普通用户无法直接使用', 'error');
        return false;
    }

    // 检查是否绑定了其他账户
    const savedCode = localStorage.getItem('qn_os_activation_code');
    const savedUsername = localStorage.getItem('qn_os_username');
    if (savedCode && savedCode.toLowerCase() !== trimmed.toLowerCase() && savedUsername) {
        // 需要验证其他账户
        showAuthVerify(trimmed);
        return false;
    }

    currentActivationCode = trimmed;
    currentPermission = perm;
    localStorage.setItem('qn_os_activation_code', trimmed);
    showToast('激活成功！权限等级：' + perm.name, 'success');
    showOOBEOrDesktop();
    return true;
}

function showAuthVerify(newCode) {
    const container = document.getElementById('authVerifyContainer');
    container.innerHTML = `
        <div class="auth-verify-overlay" id="authVerifyOverlay">
            <div class="auth-verify-card">
                <h3>账户验证</h3>
                <p>此激活码可能绑定其他账户，请验证用户名和密码</p>
                <input type="text" id="authVerifyUsername" placeholder="用户名">
                <input type="password" id="authVerifyPassword" placeholder="密码">
                <button class="activation-btn" onclick="verifyAuthAndActivate('${newCode}')">验证并激活</button>
                <button class="settings-btn secondary" style="margin-top:8px;width:100%;" onclick="closeAuthVerify()">取消</button>
            </div>
        </div>
    `;
}

function closeAuthVerify() {
    document.getElementById('authVerifyContainer').innerHTML = '';
}

function verifyAuthAndActivate(newCode) {
    const username = document.getElementById('authVerifyUsername').value.trim();
    const password = document.getElementById('authVerifyPassword').value.trim();
    const savedUsername = localStorage.getItem('qn_os_username');
    const savedPassword = localStorage.getItem('qn_os_password');

    if (username === savedUsername && password === savedPassword) {
        currentActivationCode = newCode;
        currentPermission = getPermissionLevel(newCode);
        localStorage.setItem('qn_os_activation_code', newCode);
        closeAuthVerify();
        showToast('验证成功！已切换激活码', 'success');
        showOOBEOrDesktop();
    } else {
        showToast('用户名或密码错误', 'error');
    }
}

function showOOBEOrDesktop() {
    document.getElementById('activationScreen').style.display = 'none';
    const oobeComplete = localStorage.getItem('qn_os_oobe_complete');
    if (!oobeComplete) {
        startOOBE();
    } else {
        loadUserData();
        showOSDesktop();
    }
}

// ===== OOBE 流程 =====
function startOOBE() {
    oobeStep = 0;
    oobeData = {};
    document.getElementById('oobeScreen').style.display = 'flex';
    renderOOBEStep();
}

function renderOOBEStep() {
    const container = document.getElementById('oobeContainer');
    const isDesktop = currentDevice === 'desktop';
    const totalSteps = isDesktop ? 6 : 6;

    let dots = '';
    for (let i = 0; i < totalSteps; i++) {
        dots += `<div class="oobe-step-dot ${i === oobeStep ? 'active' : ''}"></div>`;
    }

    let content = '';
    switch (oobeStep) {
        case 0:
            content = `
                <div style="font-size:64px;margin-bottom:20px;">&#9729;</div>
                <div class="oobe-title">欢迎使用 QingningOS</div>
                <div class="oobe-desc">让我们开始设置您的设备</div>
                <div class="oobe-buttons">
                    <button class="oobe-btn primary" onclick="nextOOBE()">下一步</button>
                </div>
            `;
            break;
        case 1:
            const regions = isDesktop
                ? [{name:'中国',icon:'&#127464;&#127475;'},{name:'美国',icon:'&#127482;&#127480;'},{name:'日本',icon:'&#127471;&#127477;'},{name:'英国',icon:'&#127468;&#127463;'},{name:'德国',icon:'&#127465;&#127466;'},{name:'法国',icon:'&#127467;&#127479;'}]
                : [{name:'简体中文',icon:'&#127464;&#127475;'},{name:'English',icon:'&#127482;&#127480;'},{name:'日本語',icon:'&#127471;&#127477;'}];
            content = `
                <div class="oobe-title">${isDesktop ? '选择您的地区' : '选择语言'}</div>
                <div class="oobe-desc">${isDesktop ? '这将影响日期、时间和语言设置' : '选择您偏好的显示语言'}</div>
                <div class="oobe-options">
                    ${regions.map(r => `<div class="oobe-option ${oobeData.region === r.name ? 'selected' : ''}" onclick="selectOOBEOption('region','${r.name}')">
                        <span class="oobe-option-icon">${r.icon}</span>
                        <div class="oobe-option-text">
                            <div class="oobe-option-name">${r.name}</div>
                        </div>
                    </div>`).join('')}
                </div>
                <div class="oobe-buttons">
                    <button class="oobe-btn secondary" onclick="prevOOBE()">上一步</button>
                    <button class="oobe-btn primary" onclick="nextOOBE()">下一步</button>
                </div>
            `;
            break;
        case 2:
            content = `
                <div class="oobe-title">连接到网络</div>
                <div class="oobe-desc">选择要连接的 WiFi 网络</div>
                <div class="oobe-options">
                    ${WIFI_LIST.map(w => `<div class="oobe-option ${oobeData.wifi === w.name ? 'selected' : ''}" onclick="selectOOBEOption('wifi','${w.name}')">
                        <span class="oobe-option-icon">&#128246;</span>
                        <div class="oobe-option-text">
                            <div class="oobe-option-name">${w.name}</div>
                            <div class="oobe-option-detail">${w.locked ? '&#128274; 需要密码' : '开放网络'}</div>
                        </div>
                        <span class="oobe-wifi-signal">${w.signal}</span>
                    </div>`).join('')}
                </div>
                <div class="oobe-buttons">
                    <button class="oobe-btn secondary" onclick="prevOOBE()">上一步</button>
                    <button class="oobe-btn primary" onclick="nextOOBE()">下一步</button>
                </div>
            `;
            break;
        case 3:
            const defaultUsername = currentActivationCode ? 'user_' + currentActivationCode.substring(2) : 'user';
            content = `
                <div class="oobe-title">${isDesktop ? '账户设置' : '账户登录'}</div>
                <div class="oobe-desc">设置您的用户名</div>
                <div style="margin-bottom:24px;">
                    <div style="width:64px;height:64px;background:rgba(34,197,94,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;">&#128100;</div>
                    <input type="text" class="oobe-input" id="oobeUsername" value="${oobeData.username || defaultUsername}" placeholder="输入用户名">
                </div>
                <div class="oobe-buttons">
                    <button class="oobe-btn secondary" onclick="prevOOBE()">上一步</button>
                    <button class="oobe-btn primary" onclick="saveOobeUsername()">下一步</button>
                </div>
            `;
            break;
        case 4:
            if (isDesktop) {
                content = `
                    <div class="oobe-title">隐私设置</div>
                    <div class="oobe-desc">选择您要启用的功能</div>
                    <div style="margin-bottom:24px;">
                        <div class="oobe-toggle-row">
                            <div>
                                <div class="oobe-toggle-label">位置服务</div>
                                <div class="oobe-toggle-desc">允许应用访问您的位置</div>
                            </div>
                            <div class="oobe-toggle-switch ${oobeData.location !== false ? 'on' : ''}" onclick="toggleOOBESwitch('location')"></div>
                        </div>
                        <div class="oobe-toggle-row">
                            <div>
                                <div class="oobe-toggle-label">诊断数据</div>
                                <div class="oobe-toggle-desc">发送匿名使用数据以改进系统</div>
                            </div>
                            <div class="oobe-toggle-switch ${oobeData.diagnostic !== false ? 'on' : ''}" onclick="toggleOOBESwitch('diagnostic')"></div>
                        </div>
                    </div>
                    <div class="oobe-buttons">
                        <button class="oobe-btn secondary" onclick="prevOOBE()">上一步</button>
                        <button class="oobe-btn primary" onclick="nextOOBE()">下一步</button>
                    </div>
                `;
            } else {
                content = `
                    <div class="oobe-title">安全设置</div>
                    <div class="oobe-desc">设置屏幕锁定方式</div>
                    <div class="oobe-options">
                        <div class="oobe-option ${oobeData.security === 'pin' ? 'selected' : ''}" onclick="selectOOBEOption('security','pin')">
                            <span class="oobe-option-icon">&#128290;</span>
                            <div class="oobe-option-text">
                                <div class="oobe-option-name">数字密码</div>
                                <div class="oobe-option-detail">使用 4 位数字密码</div>
                            </div>
                        </div>
                        <div class="oobe-option ${oobeData.security === 'pattern' ? 'selected' : ''}" onclick="selectOOBEOption('security','pattern')">
                            <span class="oobe-option-icon">&#128272;</span>
                            <div class="oobe-option-text">
                                <div class="oobe-option-name">图案解锁</div>
                                <div class="oobe-option-detail">绘制解锁图案</div>
                            </div>
                        </div>
                        <div class="oobe-option ${oobeData.security === 'none' ? 'selected' : ''}" onclick="selectOOBEOption('security','none')">
                            <span class="oobe-option-icon">&#128275;</span>
                            <div class="oobe-option-text">
                                <div class="oobe-option-name">暂不设置</div>
                                <div class="oobe-option-detail">跳过安全设置</div>
                            </div>
                        </div>
                    </div>
                    <div class="oobe-buttons">
                        <button class="oobe-btn secondary" onclick="prevOOBE()">上一步</button>
                        <button class="oobe-btn primary" onclick="nextOOBE()">下一步</button>
                    </div>
                `;
            }
            break;
        case 5:
            content = `
                <div style="font-size:64px;margin-bottom:20px;">&#9989;</div>
                <div class="oobe-title">一切就绪！</div>
                <div class="oobe-desc">您的 QingningOS 已准备就绪</div>
                <div style="margin:20px 0;color:#64748b;font-size:0.85rem;">
                    <p>设备: ${currentDevice === 'desktop' ? '电脑端' : '手机端'}</p>
                    <p>用户: ${oobeData.username || 'user'}</p>
                    <p>激活码: ${currentActivationCode}</p>
                </div>
                <div class="oobe-buttons">
                    <button class="oobe-btn primary" onclick="finishOOBE()">进入桌面</button>
                </div>
            `;
            break;
    }

    container.innerHTML = `<div class="oobe-step-indicator">${dots}</div>${content}`;
}

function selectOOBEOption(key, value) {
    oobeData[key] = value;
    renderOOBEStep();
}

function toggleOOBESwitch(key) {
    oobeData[key] = oobeData[key] === false ? true : false;
    renderOOBEStep();
}

function saveOobeUsername() {
    const username = document.getElementById('oobeUsername').value.trim();
    if (!username) {
        showToast('请输入用户名', 'error');
        return;
    }
    oobeData.username = username;
    nextOOBE();
}

function nextOOBE() {
    oobeStep++;
    if (oobeStep >= 6) {
        finishOOBE();
    } else {
        renderOOBEStep();
    }
}

function prevOOBE() {
    if (oobeStep > 0) {
        oobeStep--;
        renderOOBEStep();
    }
}

function finishOOBE() {
    localStorage.setItem('qn_os_oobe_complete', 'true');
    localStorage.setItem('qn_os_username', oobeData.username || 'user');
    localStorage.setItem('qn_os_password', '123456'); // 默认密码
    localStorage.setItem('qn_os_location', oobeData.location !== false ? 'true' : 'false');
    localStorage.setItem('qn_os_diagnostic', oobeData.diagnostic !== false ? 'true' : 'false');
    if (oobeData.wifi) localStorage.setItem('qn_os_wifi', oobeData.wifi);
    document.getElementById('oobeScreen').style.display = 'none';
    loadUserData();
    showOSDesktop();
}

function loadUserData() {
    currentUsername = localStorage.getItem('qn_os_username') || 'user';
    currentWallpaperId = localStorage.getItem('qn_os_wallpaper') || 'dark';
    const savedApps = localStorage.getItem('qn_os_installed_apps');
    if (savedApps) {
        try {
            installedApps = JSON.parse(savedApps);
            appStoreApps.forEach(app => {
                app.installed = installedApps.includes(app.id);
            });
        } catch (e) {}
    }
    const savedVolume = localStorage.getItem('qn_os_volume');
    if (savedVolume !== null) volumeLevel = parseInt(savedVolume);
    const savedBrightness = localStorage.getItem('qn_os_brightness');
    if (savedBrightness !== null) brightnessLevel = parseInt(savedBrightness);
    const savedCalendar = localStorage.getItem('qn_os_calendar_events');
    if (savedCalendar) {
        try { calendarEvents = JSON.parse(savedCalendar); } catch (e) {}
    }
    const savedAntivirus = localStorage.getItem('qn_os_antivirus');
    if (savedAntivirus !== null) antivirusRealTime = savedAntivirus === 'true';
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
        const timeShort = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const el1 = document.getElementById('taskbarClock');
        if (el1) el1.textContent = timeStr;
        const el2 = document.getElementById('mobileClock');
        if (el2) el2.textContent = timeShort;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// ===== 响应式检测 =====
function checkResponsive() {
    const wasMobile = isMobileMode;
    isMobileMode = window.innerWidth < 768 || currentDevice === 'mobile';
    const desktopUI = document.getElementById('desktopUI');
    const mobileUI = document.getElementById('mobileUI');
    if (desktopUI) desktopUI.style.display = isMobileMode ? 'none' : 'flex';
    if (mobileUI) mobileUI.style.display = isMobileMode ? 'flex' : 'none';
}

// ===== 渲染桌面 =====
function renderDesktop() {
    // 桌面图标
    const iconsContainer = document.getElementById('desktopIcons');
    if (iconsContainer) {
        iconsContainer.innerHTML = ALL_APPS.filter(a => a.desktop).map(app => `
            <div class="desktop-icon" onclick="openWindow('${app.id}')" oncontextmenu="showIconContextMenu(event,'${app.id}')">
                <span class="desktop-icon-img">${app.icon}</span>
                <span class="desktop-icon-label">${app.name}</span>
            </div>
        `).join('');
    }

    // Dock
    const dockContainer = document.getElementById('desktopDock');
    if (dockContainer) {
        dockContainer.innerHTML = ALL_APPS.filter(a => a.dock).map(app => `
            <div class="dock-item" onclick="openWindow('${app.id}')" title="${app.name}">${app.icon}</div>
        `).join('');
    }

    // 开始菜单应用网格
    const startMenuApps = document.getElementById('startMenuApps');
    if (startMenuApps) {
        startMenuApps.innerHTML = ALL_APPS.filter(a => a.id !== 'trash').map(app => `
            <div class="start-menu-app-tile" onclick="openWindow('${app.id}'); closeStartMenu();">
                <span class="start-menu-app-tile-icon">${app.icon}</span>
                <span class="start-menu-app-tile-name">${app.name}</span>
            </div>
        `).join('');
    }
}

function renderMobile() {
    const grid = document.getElementById('mobileIconsGrid');
    if (grid) {
        const mobileApps = ALL_APPS.filter(a => a.mobile);
        grid.innerHTML = mobileApps.map(app => `
            <div class="mobile-icon" onclick="openWindow('${app.id}')" oncontextmenu="showMobileIconMenu(event,'${app.id}')">
                <span class="mobile-icon-img">${app.icon}</span>
                <span class="mobile-icon-label">${app.name}</span>
            </div>
        `).join('');
    }

    const dock = document.getElementById('mobileDock');
    if (dock) {
        const dockApps = ALL_APPS.filter(a => a.dock && a.mobile);
        dock.innerHTML = dockApps.map(app => `
            <div class="mobile-dock-item" onclick="openWindow('${app.id}')" title="${app.name}">${app.icon}</div>
        `).join('');
    }
}

// ===== 右键菜单 =====
function showIconContextMenu(e, appId) {
    e.preventDefault();
    e.stopPropagation();
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.innerHTML = `
        <div class="context-menu-item" onclick="openWindow('${appId}'); removeContextMenu();">打开</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="removeContextMenu();">属性</div>
    `;
    document.body.appendChild(menu);
    document.addEventListener('click', removeContextMenu, { once: true });
}

function showDesktopContextMenu(e) {
    e.preventDefault();
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.innerHTML = `
        <div class="context-menu-item" onclick="location.reload(); removeContextMenu();">&#128260; 刷新</div>
        <div class="context-menu-item" onclick="openWindow('settings'); removeContextMenu();">&#127912; 更换壁纸</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="fmCreateFolder(); removeContextMenu();">&#128193; 新建文件夹</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="removeContextMenu();">&#8505; 属性</div>
    `;
    document.body.appendChild(menu);
    document.addEventListener('click', removeContextMenu, { once: true });
}

function removeContextMenu() {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

// ===== 手机图标长按菜单 =====
function showMobileIconMenu(e, appId) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.mobile-icon-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'mobile-icon-menu';
    menu.style.left = (e.pageX - 70) + 'px';
    menu.style.top = e.pageY + 'px';
    menu.innerHTML = `
        <div class="mobile-icon-menu-item" onclick="openWindow('${appId}'); document.querySelectorAll('.mobile-icon-menu').forEach(m=>m.remove());">打开</div>
        <div class="mobile-icon-menu-item danger" onclick="uninstallMobileApp('${appId}'); document.querySelectorAll('.mobile-icon-menu').forEach(m=>m.remove());">卸载</div>
        <div class="mobile-icon-menu-item" onclick="document.querySelectorAll('.mobile-icon-menu').forEach(m=>m.remove());">应用信息</div>
    `;
    document.body.appendChild(menu);
    document.addEventListener('click', () => document.querySelectorAll('.mobile-icon-menu').forEach(m => m.remove()), { once: true });
}

function uninstallMobileApp(appId) {
    const app = ALL_APPS.find(a => a.id === appId);
    if (!app) return;
    showToast(app.name + ' 已卸载', 'info');
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
        <div class="window-resize-handle" onmousedown="startResize(event, '${appId}')"></div>
    `;

    win.addEventListener('mousedown', () => bringToFront(appId));
    document.getElementById('desktopArea').appendChild(win);
    openWindows[appId] = { maximized: false, minimized: false, prevStyle: {} };
    updateTaskbarWindows();
    bringToFront(appId);

    if (appId === 'terminal') initTerminal();
    if (appId === 'settings') initSettings();
    if (appId === 'antivirus') initAntivirus();
    if (appId === 'filemanager') initFileManager();
    if (appId === 'calculator') initCalculator();
    if (appId === 'calendar') initCalendar();
    if (appId === 'taskmanager') initTaskManager();
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
    updateTaskbarWindows();
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
            left: win.style.left, top: win.style.top,
            width: win.style.width, height: win.style.height
        };
        win.style.left = '0';
        win.style.top = '40px';
        win.style.width = '100%';
        win.style.height = 'calc(100% - 40px)';
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
        btn.innerHTML = `<span style="margin-right:4px;">${appConfig.icon}</span><span>${appConfig.name}</span>`;
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
function startDrag(e, appId) {
    if (e.target.closest('.window-titlebar-buttons')) return;
    const win = document.getElementById('window-' + appId);
    if (!win || (openWindows[appId] && openWindows[appId].maximized)) return;
    dragState = {
        appId: appId,
        startX: e.clientX, startY: e.clientY,
        origLeft: parseInt(win.style.left) || 0,
        origTop: parseInt(win.style.top) || 0
    };
    e.preventDefault();
}

// ===== 窗口调整大小 =====
function startResize(e, appId) {
    const win = document.getElementById('window-' + appId);
    if (!win || (openWindows[appId] && openWindows[appId].maximized)) return;
    resizeState = {
        appId: appId,
        startX: e.clientX, startY: e.clientY,
        origWidth: win.offsetWidth, origHeight: win.offsetHeight
    };
    e.preventDefault();
    e.stopPropagation();
}

document.addEventListener('mousemove', (e) => {
    if (dragState) {
        const win = document.getElementById('window-' + dragState.appId);
        if (!win) { dragState = null; return; }
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        win.style.left = (dragState.origLeft + dx) + 'px';
        win.style.top = (dragState.origTop + dy) + 'px';
    }
    if (resizeState) {
        const win = document.getElementById('window-' + resizeState.appId);
        if (!win) { resizeState = null; return; }
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        win.style.width = Math.max(300, resizeState.origWidth + dx) + 'px';
        win.style.height = Math.max(200, resizeState.origHeight + dy) + 'px';
    }
});

document.addEventListener('mouseup', () => {
    dragState = null;
    resizeState = null;
});

// ===== 应用配置 =====
function getAppConfig(appId) {
    const apps = {
        filemanager: { name: '文件管理器', icon: '&#128193;', width: '750px', height: '500px' },
        browser: { name: '青柠浏览器', icon: '&#127760;', width: '850px', height: '550px' },
        terminal: { name: '青柠终端', icon: '&#128187;', width: '650px', height: '450px' },
        calculator: { name: '计算器', icon: '&#128290;', width: '320px', height: '450px' },
        notepad: { name: '记事本', icon: '&#128221;', width: '600px', height: '450px' },
        calendar: { name: '日历', icon: '&#128197;', width: '450px', height: '520px' },
        settings: { name: '系统设置', icon: '&#9881;', width: '750px', height: '500px' },
        appstore: { name: '应用商店', icon: '&#128722;', width: '700px', height: '500px' },
        antivirus: { name: '青柠杀毒', icon: '&#128737;', width: '600px', height: '480px' },
        taskmanager: { name: '任务管理器', icon: '&#128202;', width: '650px', height: '480px' },
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
        case 'calculator': return getCalculatorContent();
        case 'notepad': return getNotepadContent();
        case 'calendar': return getCalendarContent();
        case 'settings': return getSettingsContent();
        case 'appstore': return getAppStoreContent();
        case 'antivirus': return getAntivirusContent();
        case 'taskmanager': return getTaskManagerContent();
        case 'trash': return getTrashContent();
        default: return '<div style="padding:20px;color:#94a3b8;">应用加载中...</div>';
    }
}

// ===== 文件管理器 =====
let currentFMFolder = '桌面';
let fmSelectedFile = null;

function getFileManagerContent() {
    return `
        <div class="filemanager-layout">
            <div class="filemanager-sidebar">
                <div class="fm-nav-item active" onclick="fmNavigate('桌面')">&#128193; 桌面</div>
                <div class="fm-nav-item" onclick="fmNavigate('文档')">&#128196; 文档</div>
                <div class="fm-nav-item" onclick="fmNavigate('下载')">&#11015; 下载</div>
                <div class="fm-nav-item" onclick="fmNavigate('图片')">&#128247; 图片</div>
                <div class="fm-nav-item" onclick="fmNavigate('视频')">&#127909; 视频</div>
            </div>
            <div class="filemanager-main">
                <div class="fm-header">
                    <span class="fm-path" id="fmPath">/home/user/桌面</span>
                    <button class="fm-btn" onclick="fmCreateFolder()">新建文件夹</button>
                </div>
                <div class="fm-filelist" id="fmFileList"></div>
            </div>
        </div>
    `;
}

function initFileManager() {
    fmNavigate('桌面');
}

function fmNavigate(folder) {
    currentFMFolder = folder;
    const files = fileSystem['/home/user'][folder];
    if (!files) return;
    document.querySelectorAll('.fm-nav-item').forEach(el => el.classList.remove('active'));
    const navItems = document.querySelectorAll('.fm-nav-item');
    const folderMap = { '桌面': 0, '文档': 1, '下载': 2, '图片': 3, '视频': 4 };
    if (navItems[folderMap[folder]]) navItems[folderMap[folder]].classList.add('active');

    const pathEl = document.getElementById('fmPath');
    if (pathEl) pathEl.textContent = '/home/user/' + folder;
    const listEl = document.getElementById('fmFileList');
    if (!listEl) return;

    let html = '<div class="fm-file-header"><span class="fm-col-name">名称</span><span class="fm-col-size">大小</span><span class="fm-col-date">修改日期</span></div>';
    Object.keys(files).forEach(name => {
        const f = files[name];
        html += `<div class="fm-file-row" onclick="fmSelectFile(this,'${name}')" ondblclick="fmOpenFile('${name}')">
            <span class="fm-col-name"><span class="fm-file-icon">${f.type === 'file' ? '&#128196;' : '&#128193;'}</span> ${name}</span>
            <span class="fm-col-size">${f.size}</span>
            <span class="fm-col-date">${f.date}</span>
        </div>`;
    });
    listEl.innerHTML = html;
}

function fmSelectFile(el, name) {
    document.querySelectorAll('.fm-file-row').forEach(r => r.classList.remove('selected'));
    el.classList.add('selected');
    fmSelectedFile = name;
}

function fmOpenFile(name) {
    showToast('打开文件: ' + name, 'info');
}

function fmCreateFolder() {
    const folderName = prompt('请输入文件夹名称:');
    if (folderName && folderName.trim()) {
        fileSystem['/home/user'][currentFMFolder][folderName.trim()] = { size: '-', date: new Date().toISOString().split('T')[0], type: 'folder' };
        fmNavigate(currentFMFolder);
        showToast('文件夹创建成功', 'success');
    }
}

// ===== 浏览器 =====
function getBrowserContent() {
    return `
        <div class="browser-layout">
            <div class="browser-toolbar">
                <button class="browser-nav-btn" onclick="browserBack()">&#8592;</button>
                <button class="browser-nav-btn" onclick="browserForward()">&#8594;</button>
                <button class="browser-nav-btn" onclick="browserRefresh()">&#8635;</button>
                <input type="text" class="browser-urlbar" id="browserUrlbar" value="qingning://home" placeholder="输入网址..." onkeydown="if(event.key==='Enter')browserGo()">
                <button class="browser-go-btn" onclick="browserGo()">前往</button>
            </div>
            <div class="browser-bookmarks">
                <span class="browser-bookmark" onclick="browserQuickNav('https://www.baidu.com')">百度</span>
                <span class="browser-bookmark" onclick="browserQuickNav('https://www.bilibili.com')">B站</span>
                <span class="browser-bookmark" onclick="browserQuickNav('https://github.com')">GitHub</span>
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
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('qingning://')) {
        url = 'https://' + url;
        urlbar.value = url;
    }
    if (url.startsWith('qingning://')) {
        content.innerHTML = `
            <div class="browser-home">
                <div style="font-size:48px;margin-bottom:16px;">&#127760;</div>
                <h3 style="color:#e2e8f0;margin-bottom:8px;">青柠浏览器</h3>
                <p style="color:#64748b;font-size:0.9rem;">青柠OS 内置浏览器</p>
            </div>
        `;
        return;
    }
    content.innerHTML = `<div style="padding:20px;color:#94a3b8;text-align:center;margin-top:40px;">
        <div style="font-size:36px;margin-bottom:12px;">&#128274;</div>
        <p>安全限制：无法在此环境中加载外部网页</p>
        <p style="font-size:0.85rem;margin-top:8px;color:#64748b;">目标: ${url}</p>
    </div>`;
}

function browserBack() { showToast('浏览器：后退', 'info'); }
function browserForward() { showToast('浏览器：前进', 'info'); }
function browserRefresh() { browserGo(); }
function browserQuickNav(url) {
    const urlbar = document.getElementById('browserUrlbar');
    if (urlbar) urlbar.value = url;
    browserGo();
}

// ===== 终端 =====
function getTerminalContent() {
    return `
        <div class="terminal-layout">
            <div class="terminal-output" id="terminalOutput">
                <div class="terminal-line terminal-welcome">青柠终端 v1.0.0 - 输入 help 查看可用命令</div>
                <div class="terminal-line terminal-welcome">当前用户: ${currentPermission ? currentPermission.name : '未知'} (${currentActivationCode || '未激活'})</div>
                <div class="terminal-line">&nbsp;</div>
            </div>
            <div class="terminal-input-line">
                <span class="terminal-prompt" id="terminalPrompt">user@qingning-os:~$</span>
                <input type="text" class="terminal-input" id="terminalInput" autofocus onkeydown="handleTerminalKey(event)" autocomplete="off" spellcheck="false">
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
    const prompt = document.getElementById('terminalPrompt');
    const promptText = prompt ? prompt.textContent : 'user@qingning-os:~$';
    terminalPrint(promptText + ' ' + cmd, 'terminal-cmd');

    const parts = cmd.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case 'help':
            terminalPrint('可用命令:', 'terminal-info');
            terminalPrint('  help        - 显示帮助');
            terminalPrint('  ls          - 列出文件');
            terminalPrint('  cd <dir>    - 切换目录');
            terminalPrint('  pwd         - 显示当前路径');
            terminalPrint('  date        - 显示日期时间');
            terminalPrint('  whoami      - 显示用户信息');
            terminalPrint('  clear       - 清屏');
            terminalPrint('  neofetch    - 系统信息');
            terminalPrint('  permission  - 权限等级');
            terminalPrint('  update      - 检查更新');
            terminalPrint('  reset       - 重置设置');
            terminalPrint('  calc <expr> - 计算表达式');
            terminalPrint('  echo <text> - 输出文本');
            terminalPrint('  cat <file>  - 查看文件');
            terminalPrint('  mkdir <dir> - 创建目录');
            terminalPrint('  rm <file>   - 删除文件');
            terminalPrint('  reboot      - 重启系统');
            terminalPrint('  shutdown    - 关闭系统');
            break;
        case 'ls':
            const cwdFiles = fileSystem['/home/user'];
            if (cwdFiles) {
                Object.keys(cwdFiles).forEach(name => {
                    terminalPrint('&#128193; ' + name + '/');
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
        case 'pwd':
            terminalPrint(terminalCwd);
            break;
        case 'date':
            terminalPrint(new Date().toLocaleString('zh-CN'));
            break;
        case 'whoami':
            terminalPrint('用户: ' + (currentPermission ? currentPermission.name : '未知'));
            terminalPrint('激活码: ' + (currentActivationCode || '未激活'));
            terminalPrint('权限: ' + (currentPermission ? currentPermission.level : '无'));
            terminalPrint('目录: ' + terminalCwd);
            break;
        case 'clear':
            output.innerHTML = '';
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
                    terminalPrint('说明: 最高权限，可修改/还原任何内容', 'terminal-success');
                } else if (currentPermission.level === 'admin') {
                    terminalPrint('说明: 高级权限，可修改大部分内容', 'terminal-success');
                } else {
                    terminalPrint('说明: 基础权限，使用系统功能', 'terminal-info');
                }
            } else {
                terminalPrint('未激活', 'terminal-error');
            }
            break;
        case 'update':
            checkForUpdates(true);
            break;
        case 'reset':
            if (canModifySettings()) {
                resetAllSettings();
                terminalPrint('所有设置已重置', 'terminal-success');
            } else {
                terminalPrint('权限不足！仅系统/站长可执行', 'terminal-error');
            }
            break;
        case 'calc':
            if (args.length > 0) {
                try {
                    const expr = args.join(' ').replace(/[^0-9+\-*/().\s]/g, '');
                    const result = Function('"use strict"; return (' + expr + ')')();
                    terminalPrint(expr + ' = ' + result, 'terminal-info');
                } catch (err) {
                    terminalPrint('计算错误', 'terminal-error');
                }
            } else {
                terminalPrint('用法: calc <表达式>', 'terminal-error');
            }
            break;
        case 'echo':
            terminalPrint(args.join(' '));
            break;
        case 'cat':
            if (args[0]) {
                terminalPrint('文件 ' + args[0] + ' 的内容:', 'terminal-info');
                terminalPrint('这是一个模拟文件内容...');
            } else {
                terminalPrint('用法: cat <文件名>', 'terminal-error');
            }
            break;
        case 'mkdir':
            if (args[0]) {
                terminalPrint('创建目录: ' + args[0], 'terminal-success');
            } else {
                terminalPrint('用法: mkdir <目录名>', 'terminal-error');
            }
            break;
        case 'rm':
            if (args[0]) {
                terminalPrint('删除: ' + args[0], 'terminal-success');
            } else {
                terminalPrint('用法: rm <文件名>', 'terminal-error');
            }
            break;
        case 'reboot':
            terminalPrint('正在重启...', 'terminal-info');
            setTimeout(() => location.reload(), 1500);
            break;
        case 'shutdown':
            terminalPrint('正在关机...', 'terminal-info');
            setTimeout(() => shutdownOS(), 1500);
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
        { label: '内核', value: QNOS_KERNEL },
        { label: '代号', value: QNOS_CODENAME },
        { label: '激活码', value: currentActivationCode || '未激活' },
        { label: '权限', value: currentPermission ? currentPermission.name : '未知' },
        { label: '分辨率', value: window.innerWidth + 'x' + window.innerHeight },
        { label: '终端', value: '青柠终端 v1.0' },
        { label: '模式', value: isMobileMode ? '手机模式' : '桌面模式' }
    ];
    const maxLines = Math.max(art.length, info.length);
    for (let i = 0; i < maxLines; i++) {
        const left = art[i] || '                       ';
        const right = info[i] ? `<span style="color:#22c55e;font-weight:bold;">${info[i].label}</span>: ${info[i].value}` : '';
        terminalPrintHTML(`<span style="color:#22c55e;">${left}</span>  ${right}`);
    }
}

// ===== 计算器 =====
function getCalculatorContent() {
    return `
        <div class="calc-layout">
            <div class="calc-display">
                <div class="calc-history" id="calcHistory"></div>
                <div class="calc-result" id="calcResult">0</div>
            </div>
            <div class="calc-buttons">
                <button class="calc-btn op" onclick="calcClear()">C</button>
                <button class="calc-btn op" onclick="calcInput('(')">(</button>
                <button class="calc-btn op" onclick="calcInput(')')">)</button>
                <button class="calc-btn op" onclick="calcOp('/')">&divide;</button>
                <button class="calc-btn" onclick="calcInput('7')">7</button>
                <button class="calc-btn" onclick="calcInput('8')">8</button>
                <button class="calc-btn" onclick="calcInput('9')">9</button>
                <button class="calc-btn op" onclick="calcOp('*')">&times;</button>
                <button class="calc-btn" onclick="calcInput('4')">4</button>
                <button class="calc-btn" onclick="calcInput('5')">5</button>
                <button class="calc-btn" onclick="calcInput('6')">6</button>
                <button class="calc-btn op" onclick="calcOp('-')">-</button>
                <button class="calc-btn" onclick="calcInput('1')">1</button>
                <button class="calc-btn" onclick="calcInput('2')">2</button>
                <button class="calc-btn" onclick="calcInput('3')">3</button>
                <button class="calc-btn op" onclick="calcOp('+')">+</button>
                <button class="calc-btn" onclick="calcInput('0')">0</button>
                <button class="calc-btn" onclick="calcInput('.')">.</button>
                <button class="calc-btn" onclick="calcBackspace()">&#9003;</button>
                <button class="calc-btn eq" onclick="calcEquals()">=</button>
            </div>
        </div>
    `;
}

function initCalculator() {}

function calcInput(val) {
    const resultEl = document.getElementById('calcResult');
    if (!resultEl) return;
    if (calcNewNumber) {
        calcCurrent = val;
        calcNewNumber = false;
    } else {
        calcCurrent += val;
    }
    resultEl.textContent = calcCurrent;
}

function calcOp(op) {
    const resultEl = document.getElementById('calcResult');
    if (!resultEl) return;
    calcHistory = calcCurrent + ' ' + op + ' ';
    calcCurrent += op;
    calcNewNumber = false;
    const histEl = document.getElementById('calcHistory');
    if (histEl) histEl.textContent = calcHistory;
    resultEl.textContent = calcCurrent;
}

function calcEquals() {
    const resultEl = document.getElementById('calcResult');
    const histEl = document.getElementById('calcHistory');
    if (!resultEl) return;
    try {
        const expr = calcCurrent.replace(/[^0-9+\-*/().]/g, '');
        const result = Function('"use strict"; return (' + expr + ')')();
        if (histEl) histEl.textContent = calcCurrent + ' =';
        calcCurrent = String(result);
        resultEl.textContent = calcCurrent;
        calcNewNumber = true;
    } catch (e) {
        resultEl.textContent = 'Error';
        calcNewNumber = true;
    }
}

function calcClear() {
    calcCurrent = '0';
    calcHistory = '';
    calcNewNumber = true;
    const resultEl = document.getElementById('calcResult');
    const histEl = document.getElementById('calcHistory');
    if (resultEl) resultEl.textContent = '0';
    if (histEl) histEl.textContent = '';
}

function calcBackspace() {
    if (calcCurrent.length > 1) {
        calcCurrent = calcCurrent.slice(0, -1);
    } else {
        calcCurrent = '0';
        calcNewNumber = true;
    }
    const resultEl = document.getElementById('calcResult');
    if (resultEl) resultEl.textContent = calcCurrent;
}

// ===== 记事本 =====
function getNotepadContent() {
    return `
        <div class="notepad-layout">
            <div class="notepad-toolbar">
                <button class="fm-btn" onclick="notepadNew()">新建</button>
                <button class="fm-btn" onclick="notepadOpen()">打开</button>
                <button class="fm-btn" onclick="notepadSave()">保存</button>
                <button class="fm-btn" onclick="notepadFontSize(1)">A+</button>
                <button class="fm-btn" onclick="notepadFontSize(-1)">A-</button>
            </div>
            <textarea class="notepad-textarea" id="notepadText" placeholder="在此输入文本..."></textarea>
        </div>
    `;
}

function notepadNew() {
    const el = document.getElementById('notepadText');
    if (el) el.value = '';
}

function notepadOpen() {
    showToast('打开文件功能（模拟）', 'info');
}

function notepadSave() {
    showToast('文件已保存', 'success');
}

function notepadFontSize(delta) {
    const el = document.getElementById('notepadText');
    if (!el) return;
    const current = parseInt(window.getComputedStyle(el).fontSize) || 14;
    el.style.fontSize = Math.max(10, Math.min(24, current + delta)) + 'px';
}

// ===== 日历 =====
function getCalendarContent() {
    return `
        <div class="calendar-layout">
            <div class="calendar-header">
                <button class="calendar-nav-btn" onclick="calendarPrevMonth()">&#9664;</button>
                <span class="calendar-month-year" id="calendarMonthYear"></span>
                <button class="calendar-nav-btn" onclick="calendarNextMonth()">&#9654;</button>
            </div>
            <div class="calendar-grid" id="calendarGrid"></div>
            <div class="calendar-events" id="calendarEvents"></div>
        </div>
    `;
}

function initCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    const monthYearEl = document.getElementById('calendarMonthYear');
    if (monthYearEl) monthYearEl.textContent = year + '年 ' + monthNames[month];

    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    const days = ['日','一','二','三','四','五','六'];
    let html = days.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`;
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
        const hasEvent = calendarEvents[`${year}-${month}-${d}`];
        html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" onclick="calendarClickDay(${d})">${d}</div>`;
    }

    const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
        html += `<div class="calendar-day other-month">${d}</div>`;
    }

    grid.innerHTML = html;
    renderCalendarEvents();
}

function renderCalendarEvents() {
    const container = document.getElementById('calendarEvents');
    if (!container) return;
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    const today = new Date();
    const key = `${year}-${month}-${today.getDate()}`;
    const events = calendarEvents[key];
    if (events && events.length > 0) {
        container.innerHTML = '<div style="font-size:0.85rem;color:#94a3b8;margin-bottom:8px;">今日事件:</div>' +
            events.map(e => `<div class="calendar-event-item">${e}</div>`).join('');
    } else {
        container.innerHTML = '<div style="font-size:0.85rem;color:#475569;text-align:center;padding:10px;">点击日期添加事件</div>';
    }
}

function calendarClickDay(day) {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    const eventText = prompt(`为 ${year}-${month + 1}-${day} 添加事件:`);
    if (eventText && eventText.trim()) {
        const key = `${year}-${month}-${day}`;
        if (!calendarEvents[key]) calendarEvents[key] = [];
        calendarEvents[key].push(eventText.trim());
        localStorage.setItem('qn_os_calendar_events', JSON.stringify(calendarEvents));
        renderCalendar();
        showToast('事件已添加', 'success');
    }
}

function calendarPrevMonth() {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
    renderCalendar();
}

function calendarNextMonth() {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
    renderCalendar();
}

// ===== 系统设置 =====
function getSettingsContent() {
    return `
        <div class="settings-layout">
            <div class="settings-sidebar">
                <div class="settings-nav-item active" onclick="settingsSwitchTab('general',this)">&#9881; 通用</div>
                <div class="settings-nav-item" onclick="settingsSwitchTab('display',this)">&#128247; 显示</div>
                <div class="settings-nav-item" onclick="settingsSwitchTab('network',this)">&#128246; 网络</div>
                <div class="settings-nav-item" onclick="settingsSwitchTab('sound',this)">&#128266; 声音</div>
                <div class="settings-nav-item" onclick="settingsSwitchTab('about',this)">&#8505; 关于</div>
                <div class="settings-nav-item" onclick="settingsSwitchTab('security',this)">&#128737; 安全</div>
            </div>
            <div class="settings-main" id="settingsMain">${getSettingsGeneralContent()}</div>
        </div>
    `;
}

function getSettingsGeneralContent() {
    return `
        <div class="settings-section">
            <h3 class="settings-section-title">壁纸选择</h3>
            <div class="wallpaper-grid">
                <div class="wallpaper-option ${currentWallpaperId === 'dark' ? 'active' : ''}" onclick="setWallpaper('dark')" style="background:${WALLPAPERS.dark.style};"><span>深色渐变</span></div>
                <div class="wallpaper-option ${currentWallpaperId === 'starry' ? 'active' : ''}" onclick="setWallpaper('starry')" style="background:${WALLPAPERS.starry.style};"><span>星空</span></div>
                <div class="wallpaper-option ${currentWallpaperId === 'abstract' ? 'active' : ''}" onclick="setWallpaper('abstract')" style="background:${WALLPAPERS.abstract.style};"><span>抽象</span></div>
            </div>
        </div>
        <div class="settings-section">
            <h3 class="settings-section-title">语言</h3>
            <div class="oobe-option" style="margin-bottom:8px;">
                <span class="oobe-option-icon">&#127464;&#127475;</span>
                <div class="oobe-option-text"><div class="oobe-option-name">简体中文</div></div>
            </div>
        </div>
    `;
}

function initSettings() {}

function settingsSwitchTab(tab, el) {
    document.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    const main = document.getElementById('settingsMain');
    if (!main) return;
    switch (tab) {
        case 'general':
            main.innerHTML = getSettingsGeneralContent();
            break;
        case 'display':
            main.innerHTML = `
                <div class="settings-section">
                    <h3 class="settings-section-title">显示设置</h3>
                    <div class="settings-info-row"><span>分辨率</span><span>${screenResolution}</span></div>
                    <div class="settings-info-row"><span>像素比</span><span>${window.devicePixelRatio}x</span></div>
                    <div class="settings-info-row"><span>色彩模式</span><span>深色主题</span></div>
                    <div style="margin-top:16px;">
                        <div style="color:#94a3b8;font-size:0.85rem;margin-bottom:8px;">亮度 (${brightnessLevel}%)</div>
                        <input type="range" class="settings-slider" min="20" max="100" value="${brightnessLevel}" oninput="setBrightness(this.value)">
                    </div>
                </div>
            `;
            break;
        case 'network':
            main.innerHTML = `
                <div class="settings-section">
                    <h3 class="settings-section-title">网络状态</h3>
                    <div class="network-status">
                        ${WIFI_LIST.map(w => `
                            <div class="network-item ${w.connected ? 'connected' : ''}">
                                <span class="network-icon">&#128246;</span>
                                <div><div class="network-name">${w.name}</div><div class="network-detail">${w.connected ? '已连接' : '未连接'} · 信号: ${w.signal}</div></div>
                                <span class="network-badge ${w.connected ? 'connected' : ''}">${w.connected ? '已连接' : '未连接'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
        case 'sound':
            main.innerHTML = `
                <div class="settings-section">
                    <h3 class="settings-section-title">声音设置</h3>
                    <div style="margin-bottom:16px;">
                        <div style="color:#94a3b8;font-size:0.85rem;margin-bottom:8px;">系统音量 (${volumeLevel}%)</div>
                        <input type="range" class="settings-slider" min="0" max="100" value="${volumeLevel}" oninput="setVolume(this.value)">
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
                    <div class="settings-info-row"><span>版本号</span><span>v${QNOS_VERSION}</span></div>
                    <div class="settings-info-row"><span>内核版本</span><span>${QNOS_KERNEL}</span></div>
                    <div class="settings-info-row"><span>代号</span><span>${QNOS_CODENAME}</span></div>
                    <div class="settings-info-row"><span>激活码</span><span>${currentActivationCode || '未激活'}</span></div>
                    <div class="settings-info-row"><span>权限等级</span><span>${currentPermission ? currentPermission.name : '未知'}</span></div>
                    <div style="margin-top:20px;text-align:center;">
                        <button class="settings-btn" onclick="checkForUpdates(true)">检查更新</button>
                    </div>
                </div>
            `;
            break;
        case 'security':
            main.innerHTML = `
                <div class="settings-section">
                    <h3 class="settings-section-title">安全设置</h3>
                    <div class="settings-info-row"><span>青柠杀毒</span><span style="color:#22c55e;">${antivirusRealTime ? '实时保护开启' : '已关闭'}</span></div>
                    <div class="settings-info-row"><span>上次扫描</span><span>${localStorage.getItem('qn_os_last_scan') || '从未'}</span></div>
                    <div style="margin-top:20px;text-align:center;">
                        <button class="settings-btn" onclick="openWindow('antivirus')">打开杀毒</button>
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
    currentWallpaperId = wpId;
    localStorage.setItem('qn_os_wallpaper', wpId);
    const desktop = document.getElementById('desktopWallpaper');
    if (desktop) desktop.style.background = wp.style;
    const mobileHome = document.getElementById('mobileHomeScreen');
    if (mobileHome) mobileHome.style.background = wp.style;
    document.querySelectorAll('.wallpaper-option').forEach(el => el.classList.remove('active'));
    if (event && event.target) event.target.closest('.wallpaper-option').classList.add('active');
    showToast('壁纸已更换为: ' + wp.name, 'success');
}

function setVolume(val) {
    volumeLevel = parseInt(val);
    localStorage.setItem('qn_os_volume', volumeLevel);
    const volIcon = document.getElementById('taskbarVolume');
    if (volIcon) volIcon.textContent = volumeLevel === 0 ? '&#128263;' : volumeLevel < 50 ? '&#128264;' : '&#128266;';
}

function setBrightness(val) {
    brightnessLevel = parseInt(val);
    localStorage.setItem('qn_os_brightness', brightnessLevel);
    document.body.style.filter = `brightness(${brightnessLevel}%)`;
}

// ===== 应用商店 =====
function getAppStoreContent() {
    let html = '<div class="appstore-layout">';
    html += '<div class="appstore-header"><h3>应用商店</h3><p style="color:#64748b;font-size:0.85rem;">发现优质 .qpk 应用</p></div>';
    html += '<div class="appstore-list">';
    appStoreApps.forEach(app => {
        html += `
            <div class="appstore-item">
                <div class="appstore-item-icon">&#128218;</div>
                <div class="appstore-item-info">
                    <div class="appstore-item-name">${app.name}</div>
                    <div class="appstore-item-desc">${app.desc}</div>
                    <div class="appstore-item-meta">v${app.version} · ${app.size} · ${app.format}</div>
                </div>
                <button class="appstore-install-btn ${app.installed ? 'installed' : ''}" onclick="toggleAppInstall('${app.id}',this)">${app.installed ? '已安装' : '安装'}</button>
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
            installedApps = appStoreApps.filter(a => a.installed).map(a => a.id);
            localStorage.setItem('qn_os_installed_apps', JSON.stringify(installedApps));
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
                <p style="color:#64748b;font-size:0.85rem;">保护您的系统安全</p>
            </div>
            <div class="av-toggle-row">
                <div>
                    <div class="av-toggle-label">实时保护</div>
                    <div class="av-toggle-desc">${canControlAntivirus() ? '监控系统安全状态' : '仅系统/站长/管理员可关闭'}</div>
                </div>
                <div class="av-toggle-switch ${antivirusRealTime ? 'on' : ''}" id="avToggleSwitch" onclick="toggleAntivirus()"></div>
            </div>
            <div class="antivirus-status" id="antivirusStatus">
                <div class="av-status-icon">&#128737;</div>
                <div class="av-status-text">${antivirusRealTime ? '系统安全' : '实时保护已关闭'}</div>
                <div class="av-status-detail">上次扫描: ${localStorage.getItem('qn_os_last_scan') || '从未'}</div>
            </div>
            <div class="antivirus-actions">
                <button class="av-scan-btn" id="avScanBtn" onclick="startAntivirusScan()">&#128269; 开始扫描</button>
            </div>
            <div class="antivirus-progress" id="avProgress" style="display:none;">
                <div class="av-progress-bar"><div class="av-progress-fill" id="avProgressFill"></div></div>
                <div class="av-progress-text" id="avProgressText">准备扫描...</div>
            </div>
            <div class="antivirus-results" id="avResults" style="display:none;"></div>
        </div>
    `;
}

function initAntivirus() {}

function toggleAntivirus() {
    if (!canControlAntivirus()) {
        showWarningThenReset();
        return;
    }
    antivirusRealTime = !antivirusRealTime;
    localStorage.setItem('qn_os_antivirus', antivirusRealTime ? 'true' : 'false');
    const toggle = document.getElementById('avToggleSwitch');
    if (toggle) toggle.classList.toggle('on', antivirusRealTime);
    const status = document.getElementById('antivirusStatus');
    if (status) {
        status.innerHTML = `
            <div class="av-status-icon">${antivirusRealTime ? '&#128737;' : '&#9888;'}</div>
            <div class="av-status-text" style="color:${antivirusRealTime ? '#22c55e' : '#ef4444'}">${antivirusRealTime ? '系统安全' : '实时保护已关闭'}</div>
            <div class="av-status-detail">上次扫描: ${localStorage.getItem('qn_os_last_scan') || '从未'}</div>
        `;
    }
    showToast(antivirusRealTime ? '实时保护已开启' : '实时保护已关闭', antivirusRealTime ? 'success' : 'info');
}

function showWarningThenReset() {
    const overlay = document.createElement('div');
    overlay.className = 'warning-overlay';
    overlay.innerHTML = `
        <div class="warning-card">
            <div class="warning-icon">&#9888;</div>
            <h3>无权操作</h3>
            <p>普通用户无法关闭实时保护。系统将重置所有设置。</p>
            <button class="settings-btn danger" onclick="this.closest('.warning-overlay').remove(); doSystemReset();">确定</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function doSystemReset() {
    resetAllSettings();
    showToast('系统已重置', 'error');
    setTimeout(() => location.reload(), 1500);
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
            btn.innerHTML = '&#128269; 开始扫描';
            const now = new Date().toLocaleString('zh-CN');
            localStorage.setItem('qn_os_last_scan', now);
            const status = document.getElementById('antivirusStatus');
            if (status) {
                status.innerHTML = `
                    <div class="av-status-icon safe">&#9989;</div>
                    <div class="av-status-text">系统安全</div>
                    <div class="av-status-detail">扫描时间: ${now}</div>
                `;
            }
            if (results) {
                results.style.display = 'block';
                results.innerHTML = `
                    <div class="av-result-header">扫描结果</div>
                    <div class="av-result-item safe"><span>&#9989;</span> 扫描文件: 1,247 个</div>
                    <div class="av-result-item safe"><span>&#9989;</span> 威胁发现: 0 个</div>
                    <div class="av-result-item safe"><span>&#9989;</span> 系统状态: 安全</div>
                `;
            }
            showToast('扫描完成，系统安全！', 'success');
        }
    }, 500);
}

// ===== 任务管理器 =====
function getTaskManagerContent() {
    return `
        <div class="taskmgr-layout">
            <div class="taskmgr-tabs">
                <div class="taskmgr-tab active" onclick="taskmgrSwitchTab('processes',this)">进程</div>
                <div class="taskmgr-tab" onclick="taskmgrSwitchTab('performance',this)">性能</div>
            </div>
            <div class="taskmgr-content" id="taskmgrContent"></div>
        </div>
    `;
}

function initTaskManager() {
    taskmgrSwitchTab('processes');
    taskmgrUpdateInterval = setInterval(() => {
        if (document.getElementById('taskmgrContent')) {
            taskmgrUpdateData();
        } else {
            clearInterval(taskmgrUpdateInterval);
        }
    }, 2000);
}

let taskmgrUpdateInterval = null;

function taskmgrSwitchTab(tab, el) {
    if (el) {
        document.querySelectorAll('.taskmgr-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
    }
    const content = document.getElementById('taskmgrContent');
    if (!content) return;
    if (tab === 'processes') {
        content.innerHTML = '<div id="taskmgrProcessList"></div>';
        renderProcessList();
    } else {
        content.innerHTML = `
            <div class="taskmgr-chart"><div class="taskmgr-chart-label">CPU 使用率</div><div class="taskmgr-chart-value" id="cpuValue">0%</div></div>
            <div class="taskmgr-chart"><div class="taskmgr-chart-label">内存使用率</div><div class="taskmgr-chart-value" id="memValue">0%</div></div>
        `;
        updatePerformanceCharts();
    }
}

function renderProcessList() {
    const list = document.getElementById('taskmgrProcessList');
    if (!list) return;
    list.innerHTML = processes.map(p => `
        <div class="taskmgr-process-row">
            <span class="taskmgr-process-name">${p.name}</span>
            <span class="taskmgr-process-cpu">${p.cpu.toFixed(1)}%</span>
            <span class="taskmgr-process-mem">${p.mem} MB</span>
            <button class="taskmgr-process-end" onclick="endProcess(${p.pid})">结束</button>
        </div>
    `).join('');
}

function taskmgrUpdateData() {
    processes.forEach(p => {
        p.cpu = Math.max(0.1, Math.random() * 3);
        p.mem = Math.max(4, p.mem + Math.floor(Math.random() * 6) - 3);
    });
    if (document.getElementById('taskmgrProcessList')) {
        renderProcessList();
    }
    updatePerformanceCharts();
}

function updatePerformanceCharts() {
    const totalCpu = processes.reduce((s, p) => s + p.cpu, 0);
    const totalMem = processes.reduce((s, p) => s + p.mem, 0);
    const cpuVal = document.getElementById('cpuValue');
    const memVal = document.getElementById('memValue');
    if (cpuVal) cpuVal.textContent = totalCpu.toFixed(1) + '%';
    if (memVal) memVal.textContent = totalMem + ' MB';

    document.querySelectorAll('.taskmgr-chart').forEach((chart, idx) => {
        const val = idx === 0 ? totalCpu : (totalMem / 1024 * 100);
        const bar = chart.querySelector('.taskmgr-chart-bar');
        if (!bar) {
            const b = document.createElement('div');
            b.className = 'taskmgr-chart-bar';
            b.style.left = (Math.random() * 90) + '%';
            b.style.height = Math.min(100, val * 2) + '%';
            chart.appendChild(b);
        } else {
            bar.style.height = Math.min(100, val * 2) + '%';
        }
    });
}

function endProcess(pid) {
    const idx = processes.findIndex(p => p.pid === pid);
    if (idx > -1) {
        processes.splice(idx, 1);
        renderProcessList();
        showToast('进程已结束', 'info');
    }
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
        <div class="mobile-app-body" id="mobileAppBody">${getAppContent(appId)}</div>
    `;
    document.getElementById('mobileUI').appendChild(overlay);
    if (appId === 'terminal') initTerminal();
    if (appId === 'settings') initSettings();
    if (appId === 'antivirus') initAntivirus();
    if (appId === 'filemanager') initFileManager();
    if (appId === 'calculator') initCalculator();
    if (appId === 'calendar') initCalendar();
    if (appId === 'taskmanager') initTaskManager();
}

function closeMobileApp() {
    const overlay = document.getElementById('mobileAppOverlay');
    if (overlay) overlay.remove();
}

// ===== 版本检测更新 =====
function checkForUpdates(manual) {
    const skippedVersion = localStorage.getItem('qn_os_skipped_version');
    fetch('os-version.json?t=' + Date.now())
        .then(resp => { if (!resp.ok) throw new Error('网络错误'); return resp.json(); })
        .then(data => {
            const remoteVersion = data.version || '0.0.0';
            if (compareVersions(remoteVersion, QNOS_VERSION) > 0) {
                if (skippedVersion === remoteVersion && !manual) return;
                showUpdateDialog(remoteVersion, data.changelog || ['修复了一些问题']);
            } else {
                if (manual) showToast('当前已是最新版本 v' + QNOS_VERSION, 'success');
            }
        })
        .catch(() => { if (manual) showToast('检查更新失败', 'error'); });
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
    const changes = Array.isArray(changelog) ? changelog.join('<br>') : changelog;
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
                <p style="color:#94a3b8;font-size:0.9rem;">${changes}</p>
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
    setTimeout(() => { localStorage.removeItem('qn_os_skipped_version'); location.reload(); }, 1500);
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
    localStorage.removeItem('qn_os_volume');
    localStorage.removeItem('qn_os_brightness');
    localStorage.removeItem('qn_os_calendar_events');
    localStorage.removeItem('qn_os_antivirus');
    localStorage.removeItem('qn_os_installed_apps');
    const desktop = document.getElementById('desktopWallpaper');
    if (desktop) desktop.style.background = WALLPAPERS.dark.style;
    const mobileHome = document.getElementById('mobileHomeScreen');
    if (mobileHome) mobileHome.style.background = WALLPAPERS.dark.style;
    document.body.style.filter = 'none';
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
            <button class="settings-btn" style="margin-top:20px;" onclick="location.reload()">重新启动</button>
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
    setTimeout(() => location.reload(), 2000);
}

// ===== 显示桌面 =====
function showOSDesktop() {
    const activationScreen = document.getElementById('activationScreen');
    const osDesktop = document.getElementById('osDesktop');
    if (activationScreen) activationScreen.style.display = 'none';
    if (osDesktop) osDesktop.style.display = 'block';

    const wp = WALLPAPERS[currentWallpaperId];
    if (wp) {
        const desktop = document.getElementById('desktopWallpaper');
        if (desktop) desktop.style.background = wp.style;
        const mobileHome = document.getElementById('mobileHomeScreen');
        if (mobileHome) mobileHome.style.background = wp.style;
    }

    document.querySelectorAll('.activation-code-display').forEach(el => el.textContent = currentActivationCode);
    document.querySelectorAll('.username-display').forEach(el => el.textContent = currentUsername || (currentPermission ? currentPermission.name : '用户'));

    renderDesktop();
    renderMobile();
    checkResponsive();
}

// ===== 初始化 =====
function initQingningOS() {
    startBoot();

    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) {
        activateBtn.addEventListener('click', () => {
            const input = document.getElementById('activationInput');
            if (!input) return;
            activate(input.value.trim());
        });
    }

    const activationInput = document.getElementById('activationInput');
    if (activationInput) {
        activationInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') activate(activationInput.value.trim());
        });
        activationInput.addEventListener('input', (e) => {
            const permInfo = document.getElementById('activationPermInfo');
            if (permInfo) {
                const code = e.target.value.trim();
                if (validateActivationCode(code)) {
                    permInfo.className = 'activation-perm-info ' + getPermInfoClass(code);
                    permInfo.textContent = getPermInfoText(code);
                    permInfo.style.display = 'block';
                } else {
                    permInfo.style.display = 'none';
                }
            }
        });
    }

    checkResponsive();
    window.addEventListener('resize', checkResponsive);

    document.addEventListener('click', (e) => {
        if (startMenuOpen && !e.target.closest('#startMenu') && !e.target.closest('#startMenuBtn')) {
            closeStartMenu();
        }
    });

    const desktopArea = document.getElementById('desktopArea');
    if (desktopArea) {
        desktopArea.addEventListener('contextmenu', showDesktopContextMenu);
    }

    startClock();
    setTimeout(() => checkForUpdates(false), 3000);
}

document.addEventListener('DOMContentLoaded', initQingningOS);
