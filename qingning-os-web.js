// ===== QingningOS - MIUI 10 风格 - 核心逻辑 =====

const QNOS_VERSION = '2.0';
const QNOS_KERNEL = '6.1.0-qn';
const QNOS_CODENAME = 'QingningOS MIUI';

// ===== 状态管理 =====
let currentActivationCode = '';
let currentPermission = null;
let currentUsername = 'user';
let commandHistory = [];
let commandHistoryIndex = -1;
let currentPath = '/home/user';
let startTime = Date.now();
let antivirusRealTime = true;
let currentThemeColor = '#22c55e';
let currentThemeName = '绿色';
let currentMode = 'normal';
let systemAnnouncement = '';
let clockInterval = null;
let currentPage = 'home';
let terminalExpanded = false;
let activeTerminal = 'home'; // 'home' or 'full'

// ===== 模拟文件系统 =====
let fileSystem = {
    '/home/user': {
        '桌面': {
            '欢迎.txt': { size: '1.2 KB', date: '2026-01-15', type: 'file', content: '欢迎使用 QingningOS!\n这是一个基于 MIUI 10 设计的网页操作系统。\n输入 帮助 查看可用命令。' },
            '说明.md': { size: '0.8 KB', date: '2026-01-15', type: 'file', content: '# QingningOS\n\n版本: v2.0\n内核: 6.1.0-qn\n\n## 快速开始\n- 输入 帮助 查看所有命令\n- 输入 系统信息 查看系统状态\n- 输入 列表 查看当前目录文件' }
        },
        '文档': {
            '笔记.txt': { size: '2.1 KB', date: '2026-02-10', type: 'file', content: '这是一个笔记文件。\n你可以在终端中使用 写入 命令来编辑文件内容。' },
            '项目计划.md': { size: '3.5 KB', date: '2026-03-05', type: 'file', content: '# 项目计划\n\n## 阶段一\n- 完成 MIUI 10 风格界面设计\n- 实现基本命令系统\n\n## 阶段二\n- 添加文件管理功能\n- 集成应用商店' }
        },
        '下载': {
            '安装包.qpk': { size: '45.2 MB', date: '2026-05-01', type: 'file', content: '[二进制文件 - 无法显示内容]' }
        },
        '图片': {
            '壁纸.png': { size: '2.4 MB', date: '2026-01-20', type: 'file', content: '[图片文件 - 无法显示内容]' }
        },
        '视频': {
            '教程.mp4': { size: '28.6 MB', date: '2026-04-10', type: 'file', content: '[视频文件 - 无法显示内容]' }
        }
    }
};

// ===== 模拟应用商店 =====
let appStoreApps = [
    { id: 'app-office', name: '青柠办公', version: '1.0.0', size: '25 MB', desc: '文档编辑工具', installed: false, icon: 'green', emoji: '\u{1F4C4}' },
    { id: 'app-music', name: '青柠音乐', version: '1.2.0', size: '18 MB', desc: '本地音乐播放器', installed: false, icon: 'purple', emoji: '\u{1F3B5}' },
    { id: 'app-video', name: '青柠视频', version: '2.0.0', size: '35 MB', desc: '视频播放器', installed: false, icon: 'red', emoji: '\u{1F3AC}' },
    { id: 'app-notes', name: '青柠笔记', version: '1.1.0', size: '8 MB', desc: '轻量笔记工具', installed: false, icon: 'yellow', emoji: '\u{1F4DD}' },
    { id: 'app-weather', name: '青柠天气', version: '1.0.1', size: '5 MB', desc: '天气预报应用', installed: false, icon: 'blue', emoji: '\u{2600}' },
    { id: 'app-code', name: '青柠代码', version: '2.1.0', size: '45 MB', desc: '代码编辑器', installed: false, icon: 'cyan', emoji: '\u{1F4BB}' },
    { id: 'app-terminal-plus', name: '终端增强', version: '1.0.0', size: '3 MB', desc: '终端功能增强插件', installed: false, icon: 'orange', emoji: '\u{1F4AD}' },
    { id: 'app-themes', name: '主题包', version: '1.5.0', size: '12 MB', desc: '额外主题色方案', installed: false, icon: 'pink', emoji: '\u{1F3A8}' }
];

// ===== 模拟进程 =====
let processes = [
    { pid: 1, name: 'qn-shell', cpu: 0.5, mem: 12 },
    { pid: 2, name: 'qn-terminal', cpu: 2.1, mem: 45 },
    { pid: 3, name: 'qn-antivirus', cpu: 0.8, mem: 28 },
    { pid: 4, name: 'qn-network', cpu: 0.3, mem: 8 },
    { pid: 5, name: 'qn-audio', cpu: 0.2, mem: 6 },
    { pid: 6, name: 'qn-filesystem', cpu: 0.4, mem: 15 },
    { pid: 7, name: 'qn-scheduler', cpu: 0.1, mem: 4 }
];

// ===== 权限系统 =====
function getPermissionLevel(code) {
    if (!code) return null;
    const upperCode = code.toUpperCase();
    const numPart = parseInt(code.substring(2));
    if (upperCode === 'XT0000') {
        return { level: 'system', name: '系统(体验模式)', code: code };
    } else if (upperCode === 'XT0001') {
        return { level: 'admin', name: '站长', code: code };
    } else if (!isNaN(numPart) && numPart >= 2 && numPart <= 1999) {
        return { level: 'admin', name: '管理员', code: code };
    } else {
        return { level: 'user', name: '普通用户', code: code };
    }
}

function isAdmin() {
    return currentPermission && (currentPermission.level === 'admin' || currentPermission.level === 'system');
}

function isSystem() {
    return currentPermission && currentPermission.level === 'system';
}

function isTrialMode() {
    return currentMode === 'trial';
}

function trialPrefix() {
    return isTrialMode() ? '[体验模式] ' : '';
}

// ===== 激活码验证 =====
function validateActivationCode(code) {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    return /^xt\d{4,}$/i.test(trimmed);
}

// ===== Toast 通知 =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== 开机动画 =====
function startBoot() {
    setTimeout(() => {
        document.getElementById('bootScreen').style.display = 'none';
        showActivationScreen();
    }, 3200);
}

// ===== 激活码界面 =====
function showActivationScreen() {
    const savedCode = localStorage.getItem('qn_terminal_code');
    if (savedCode && validateActivationCode(savedCode)) {
        activateSystem(savedCode);
        return;
    }
    const screen = document.getElementById('activationScreen');
    screen.style.display = 'flex';
    bindActivationEvents();
}

function bindActivationEvents() {
    setTimeout(() => {
        const input = document.getElementById('activationInput');
        const btn = document.getElementById('activateBtn');
        if (input) {
            input.focus();
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') tryActivate();
            });
        }
        if (btn) btn.addEventListener('click', tryActivate);
    }, 100);
}

function tryActivate() {
    const input = document.getElementById('activationInput');
    const errorDiv = document.getElementById('activationError');
    const code = input ? input.value.trim() : '';

    if (!code) {
        errorDiv.textContent = '请输入激活码';
        return;
    }
    if (!validateActivationCode(code)) {
        errorDiv.textContent = '激活码格式无效，格式: xt + 数字 (如 xt2024)';
        return;
    }
    errorDiv.textContent = '';
    activateSystem(code);
}

function activateSystem(code) {
    currentActivationCode = code;
    currentPermission = getPermissionLevel(code);
    currentUsername = currentPermission.level === 'system' ? 'system' :
                      currentPermission.level === 'admin' ? 'admin' : 'user';

    if (currentPermission.level === 'system') {
        currentMode = 'trial';
    } else {
        currentMode = 'normal';
    }

    localStorage.setItem('qn_terminal_code', code);
    document.getElementById('activationScreen').style.display = 'none';
    showMainScreen();
}

// ===== 主界面 =====
function showMainScreen() {
    const screen = document.getElementById('mainScreen');
    screen.style.display = 'flex';

    // 更新用户信息
    updateUserInfo();

    // 启动时钟
    updateClock();
    clockInterval = setInterval(updateClock, 1000);

    // 绑定导航
    bindNavigation();

    // 绑定快捷功能
    bindAppGrid();

    // 绑定终端卡片展开/收起
    bindTerminalCard();

    // 绑定设置项
    bindSettings();

    // 渲染应用列表
    renderAppList();

    // 显示欢迎信息到终端
    showWelcomeMessage();
    updatePrompt();

    // 绑定终端输入
    bindTerminalInput();
}

function updateUserInfo() {
    const nameEl = document.getElementById('userName');
    const metaEl = document.getElementById('userMeta');
    const badgeEl = document.getElementById('userBadge');
    const avatarEl = document.getElementById('userAvatar');
    const profileName = document.getElementById('profileName');
    const profileCode = document.getElementById('profileCode');
    const profileAvatar = document.getElementById('profileAvatar');

    const displayName = currentUsername === 'user' ? '用户' :
                        currentUsername === 'admin' ? '管理员' : '系统';
    const initial = displayName.charAt(0);

    if (nameEl) nameEl.textContent = displayName;
    if (metaEl) metaEl.textContent = `激活码: ${currentActivationCode} | 权限: ${currentPermission ? currentPermission.name : '--'}`;
    if (badgeEl) {
        badgeEl.textContent = currentPermission ? currentPermission.name : '--';
        badgeEl.className = 'user-badge ' + (currentPermission ? currentPermission.level : 'user');
    }
    if (avatarEl) avatarEl.textContent = initial;
    if (profileName) profileName.textContent = displayName;
    if (profileCode) profileCode.textContent = `激活码: ${currentActivationCode}`;
    if (profileAvatar) profileAvatar.textContent = initial;
}

function updateClock() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const clockEl = document.getElementById('statusClock');
    if (clockEl) clockEl.textContent = timeStr;
}

// ===== 底部导航切换 =====
function bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(page) {
    currentPage = page;

    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // 切换页面显示
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === 'page' + capitalize(page));
    });

    // 同步终端内容
    if (page === 'terminal') {
        syncTerminalToFull();
        setTimeout(() => {
            const input = document.getElementById('terminalInputFull');
            if (input) input.focus();
        }, 100);
    } else if (page === 'home') {
        syncTerminalToHome();
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== 快捷功能网格 =====
function bindAppGrid() {
    const items = document.querySelectorAll('.app-grid-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const app = item.dataset.app;
            handleAppClick(app);
        });
    });
}

function handleAppClick(app) {
    switch (app) {
        case '终端':
            switchPage('terminal');
            break;
        case '文件管理':
            switchPage('terminal');
            setTimeout(() => {
                executeCommand('列表');
                focusTerminalInput();
            }, 200);
            break;
        case '浏览器':
            showToast('浏览器: 请使用终端 浏览 命令', 'info');
            break;
        case '设置':
            switchPage('profile');
            break;
        case '商店':
            switchPage('terminal');
            setTimeout(() => {
                executeCommand('商店');
                focusTerminalInput();
            }, 200);
            break;
        case '杀毒':
            switchPage('terminal');
            setTimeout(() => {
                executeCommand('扫描');
                focusTerminalInput();
            }, 200);
            break;
        case '计算器':
            showToast('计算器功能开发中', 'info');
            break;
        case '日历':
            switchPage('terminal');
            setTimeout(() => {
                executeCommand('日期');
                focusTerminalInput();
            }, 200);
            break;
    }
}

// ===== 终端卡片展开/收起 =====
function bindTerminalCard() {
    const header = document.getElementById('terminalCardHeader');
    const card = document.getElementById('terminalCard');
    if (header && card) {
        header.addEventListener('click', () => {
            terminalExpanded = !terminalExpanded;
            card.classList.toggle('expanded', terminalExpanded);
            if (terminalExpanded) {
                setTimeout(() => {
                    const input = document.getElementById('terminalInput');
                    if (input) input.focus();
                }, 100);
            }
        });
    }
}

// ===== 终端输入绑定 =====
function bindTerminalInput() {
    const homeInput = document.getElementById('terminalInput');
    const fullInput = document.getElementById('terminalInputFull');

    if (homeInput) {
        homeInput.addEventListener('keydown', (e) => handleInput(e, 'home'));
    }
    if (fullInput) {
        fullInput.addEventListener('keydown', (e) => handleInput(e, 'full'));
    }
}

function focusTerminalInput() {
    if (currentPage === 'terminal') {
        const input = document.getElementById('terminalInputFull');
        if (input) input.focus();
    } else {
        const input = document.getElementById('terminalInput');
        if (input) input.focus();
    }
}

function getActiveContentId() {
    return currentPage === 'terminal' ? 'terminalContentFull' : 'terminalContent';
}

function getActiveInputId() {
    return currentPage === 'terminal' ? 'terminalInputFull' : 'terminalInput';
}

function getActivePromptId() {
    return currentPage === 'terminal' ? 'terminalPromptFull' : 'terminalPrompt';
}

// ===== 终端输出 =====
function printLine(text, className = '') {
    const content = document.getElementById(getActiveContentId());
    if (!content) return;
    const line = document.createElement('div');
    line.className = `term-line ${className}`;
    line.textContent = text;
    content.appendChild(line);
    scrollToBottom();
}

function printHTML(html, className = '') {
    const content = document.getElementById(getActiveContentId());
    if (!content) return;
    const line = document.createElement('div');
    line.className = `term-line ${className}`;
    line.innerHTML = html;
    content.appendChild(line);
    scrollToBottom();
}

function printEmpty() {
    const content = document.getElementById(getActiveContentId());
    if (!content) return;
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = '&nbsp;';
    content.appendChild(line);
}

function scrollToBottom() {
    const content = document.getElementById(getActiveContentId());
    if (!content) return;
    setTimeout(() => {
        content.scrollTop = content.scrollHeight;
    }, 10);
}

// ===== 同步终端内容 =====
function syncTerminalToFull() {
    const homeContent = document.getElementById('terminalContent');
    const fullContent = document.getElementById('terminalContentFull');
    if (homeContent && fullContent) {
        fullContent.innerHTML = homeContent.innerHTML;
        fullContent.scrollTop = fullContent.scrollHeight;
    }
}

function syncTerminalToHome() {
    const homeContent = document.getElementById('terminalContent');
    const fullContent = document.getElementById('terminalContentFull');
    if (homeContent && fullContent) {
        homeContent.innerHTML = fullContent.innerHTML;
    }
}

// ===== 欢迎信息 =====
function showWelcomeMessage() {
    printEmpty();
    printLine('  QingningOS Terminal v2.0', 'highlight');
    printLine('  基于 MIUI 10 设计', 'dim');
    printLine('  内核: 6.1.0-qn', 'dim');
    printEmpty();

    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    printLine(`  登录时间: ${dateStr}`, 'dim');
    printLine(`  用户: ${currentUsername} | 激活码: ${currentActivationCode} | 权限: ${currentPermission.name}`, 'dim');

    if (isTrialMode()) {
        printEmpty();
        printLine('  [!] 当前为体验模式，部分功能受限', 'warn');
    }

    if (systemAnnouncement) {
        printEmpty();
        printLine(`  [公告] ${systemAnnouncement}`, 'warn');
    }

    printEmpty();
    printLine('  输入 "帮助" 查看所有可用命令', 'dim');
    printEmpty();
}

// ===== 输入处理 =====
function handleInput(e, source) {
    const input = document.getElementById(source === 'full' ? 'terminalInputFull' : 'terminalInput');
    if (!input) return;

    if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (cmd) {
            commandHistory.push(cmd);
            commandHistoryIndex = commandHistory.length;
            const displayPath = currentPath === '/home/user' ? '~' : currentPath.replace('/home/user', '~');
            printHTML(`<span style="color:var(--primary)">[${currentUsername}@青柠OS ${displayPath}]</span><span style="color:var(--primary)"> > </span><span style="color:var(--text-title)">${escapeHtml(cmd)}</span>`, 'cmd');
            executeCommand(cmd);
            // 同步到另一个终端
            if (source === 'home') syncTerminalToFull();
            else syncTerminalToHome();
        }
        input.value = '';
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistoryIndex > 0) {
            commandHistoryIndex--;
            input.value = commandHistory[commandHistoryIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (commandHistoryIndex < commandHistory.length - 1) {
            commandHistoryIndex++;
            input.value = commandHistory[commandHistoryIndex];
        } else {
            commandHistoryIndex = commandHistory.length;
            input.value = '';
        }
    } else if (e.key === 'Tab') {
        e.preventDefault();
        tabComplete(input);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Tab 自动补全 =====
function tabComplete(input) {
    const val = input.value.trim();
    if (!val) return;

    const parts = val.split(/\s+/);
    const first = parts[0];

    const allCommands = getAllCommandNames();
    if (parts.length === 1) {
        const matches = allCommands.filter(c => c.startsWith(first));
        if (matches.length === 1) {
            input.value = matches[0] + ' ';
        } else if (matches.length > 1) {
            printHTML(`<span style="color:var(--primary)">[${currentUsername}@青柠OS]</span><span style="color:var(--primary)"> > </span><span style="color:var(--text-title)">${escapeHtml(val)}</span>`, 'cmd');
            printLine('  ' + matches.join('  '), 'dim');
        }
    } else {
        const partial = parts[parts.length - 1];
        const currentDir = getCurrentDir();
        if (currentDir) {
            const names = Object.keys(currentDir);
            const matches = names.filter(n => n.startsWith(partial));
            if (matches.length === 1) {
                parts[parts.length - 1] = matches[0];
                input.value = parts.join(' ');
            } else if (matches.length > 1) {
                printHTML(`<span style="color:var(--primary)">[${currentUsername}@青柠OS]</span><span style="color:var(--primary)"> > </span><span style="color:var(--text-title)">${escapeHtml(val)}</span>`, 'cmd');
                printLine('  ' + matches.join('  '), 'dim');
            }
        }
    }
}

function getAllCommandNames() {
    return [
        '帮助', '清屏', '列表', '进入', '返回', '查看', '创建', '新建', '删除',
        '重命名', '复制', '移动', '写入', '日期', '我是谁', '权限', '路径',
        '系统信息', '进程', '结束', '内存', '网络', '磁盘',
        '浏览', '商店', '安装', '卸载', '扫描', '防护', '更新', '壁纸', '主题',
        '用户', '授权', '公告', '重启', '关机',
        '重置', '还原', '清除', '模式',
        'help', 'ls', 'cd', 'cat', 'mkdir', 'rm', 'touch', 'clear', 'pwd',
        'whoami', 'neofetch', 'ps', 'kill', 'reboot', 'shutdown'
    ];
}

function updatePrompt() {
    const promptHome = document.getElementById('terminalPrompt');
    const promptFull = document.getElementById('terminalPromptFull');
    const displayPath = currentPath === '/home/user' ? '~' : currentPath.replace('/home/user', '~');
    const html = `<span style="color:var(--primary)">[${currentUsername}@青柠OS ${displayPath}]</span><span style="color:var(--primary)"> > </span>`;
    if (promptHome) promptHome.innerHTML = html;
    if (promptFull) promptFull.innerHTML = html;
}

// ===== 获取当前目录 =====
function getCurrentDir() {
    let dir = fileSystem;
    if (currentPath === '/home/user') return dir['/home/user'];
    const parts = currentPath.replace('/home/user/', '').split('/');
    let current = dir['/home/user'];
    for (const part of parts) {
        if (part && current && current[part] && typeof current[part] === 'object' && current[part].type !== 'file') {
            current = current[part];
        } else {
            return null;
        }
    }
    return current;
}

function getDirByPath(path) {
    if (path === '/home/user') return fileSystem['/home/user'];
    const parts = path.replace('/home/user/', '').split('/').filter(Boolean);
    let current = fileSystem['/home/user'];
    for (const part of parts) {
        if (current && current[part] && typeof current[part] === 'object' && current[part].type !== 'file') {
            current = current[part];
        } else {
            return null;
        }
    }
    return current;
}

function resolvePath(path) {
    if (!path) return currentPath;
    if (path === '~') return '/home/user';
    if (path.startsWith('~/')) return '/home/user/' + path.substring(2);
    if (path.startsWith('/')) return path;
    let base = currentPath === '/home/user' ? '/home/user' : currentPath;
    if (!base.endsWith('/')) base += '/';
    return base + path;
}

// ===== 命令执行 =====
function executeCommand(cmdLine) {
    const parts = cmdLine.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const cmd = parts[0];
    const args = parts.slice(1).map(a => a.replace(/^"|"$/g, ''));

    const aliasMap = {
        'help': '帮助', 'ls': '列表', 'cd': '进入', 'cat': '查看',
        'mkdir': '新建', 'rm': '删除', 'touch': '创建', 'clear': '清屏',
        'pwd': '路径', 'whoami': '我是谁', 'neofetch': '系统信息',
        'ps': '进程', 'kill': '结束', 'reboot': '重启', 'shutdown': '关机'
    };

    const mappedCmd = aliasMap[cmd] || cmd;

    switch (mappedCmd) {
        case '帮助': cmdHelp(); break;
        case '清屏': cmdClear(); break;
        case '列表': cmdList(args[0]); break;
        case '进入': cmdCd(args[0]); break;
        case '返回': cmdBack(); break;
        case '查看': cmdCat(args[0]); break;
        case '创建': cmdTouch(args[0]); break;
        case '新建': cmdMkdir(args[0]); break;
        case '删除': cmdRm(args[0]); break;
        case '重命名': cmdRename(args[0], args[1]); break;
        case '复制': cmdCopy(args[0], args[1]); break;
        case '移动': cmdMove(args[0], args[1]); break;
        case '写入': cmdWrite(args[0], args.slice(1).join(' ')); break;
        case '日期': cmdDate(); break;
        case '我是谁': cmdWhoami(); break;
        case '权限': cmdPerm(); break;
        case '路径': cmdPwd(); break;
        case '系统信息': cmdNeofetch(); break;
        case '进程': cmdPs(); break;
        case '结束': cmdKill(args[0]); break;
        case '内存': cmdMemory(); break;
        case '网络': cmdNetwork(); break;
        case '磁盘': cmdDisk(); break;
        case '浏览': cmdBrowse(args[0]); break;
        case '商店': cmdStore(); break;
        case '安装': cmdInstall(args[0]); break;
        case '卸载': cmdUninstall(args[0]); break;
        case '扫描': cmdScan(); break;
        case '防护': cmdGuard(args[0]); break;
        case '更新': cmdUpdate(); break;
        case '壁纸': cmdWallpaper(args[0]); break;
        case '主题': cmdTheme(args[0]); break;
        case '用户': cmdUser(args); break;
        case '授权': cmdAuth(args); break;
        case '公告': cmdAnnounce(args.join(' ')); break;
        case '重启': cmdReboot(); break;
        case '关机': cmdShutdown(); break;
        case '重置': cmdReset(); break;
        case '还原': cmdRestore(); break;
        case '清除': cmdPurge(); break;
        case '模式': cmdMode(args[0]); break;
        default:
            printLine(`  未知命令: "${cmd}"，输入 帮助 查看可用命令`, 'error');
    }
    updatePrompt();
}

// ===== 基本命令 =====

function cmdHelp() {
    printEmpty();
    printLine('  ══════════════════════════════════════════════════', 'info');
    printLine('                    可用命令列表', 'info');
    printLine('  ══════════════════════════════════════════════════', 'info');
    printEmpty();
    printLine('  基本命令', 'highlight');
    printLine('  帮助        显示此帮助信息', 'dim');
    printLine('  清屏        清除终端屏幕', 'dim');
    printLine('  列表 [路径]  列出当前目录文件', 'dim');
    printLine('  进入 <目录>  进入指定目录', 'dim');
    printLine('  返回        返回上级目录', 'dim');
    printLine('  查看 <文件>  查看文件内容', 'dim');
    printLine('  创建 <文件>  创建新文件', 'dim');
    printLine('  新建 <目录>  新建文件夹', 'dim');
    printLine('  删除 <名称>  删除文件/文件夹', 'dim');
    printLine('  重命名 <旧> <新>  重命名文件', 'dim');
    printLine('  复制 <源> <目标>  复制文件', 'dim');
    printLine('  移动 <源> <目标>  移动文件', 'dim');
    printLine('  写入 <文件> "内容"  写入内容到文件', 'dim');
    printLine('  日期        显示当前日期时间', 'dim');
    printLine('  我是谁      显示当前用户信息', 'dim');
    printLine('  权限        显示当前权限等级', 'dim');
    printLine('  路径        显示当前路径', 'dim');
    printEmpty();
    printLine('  系统命令', 'highlight');
    printLine('  系统信息    显示系统信息', 'dim');
    printLine('  进程        显示运行中的进程', 'dim');
    printLine('  结束 <PID>  结束指定进程', 'dim');
    printLine('  内存        显示内存使用情况', 'dim');
    printLine('  网络        显示网络状态', 'dim');
    printLine('  磁盘        显示磁盘使用情况', 'dim');
    printEmpty();
    printLine('  青柠命令', 'highlight');
    printLine('  浏览 <网址>  打开浏览器访问网址', 'dim');
    printLine('  商店        打开应用商店', 'dim');
    printLine('  安装 <应用>  安装应用', 'dim');
    printLine('  卸载 <应用>  卸载应用', 'dim');
    printLine('  扫描        运行杀毒扫描', 'dim');
    printLine('  防护 <状态>  查看/切换实时防护', 'dim');
    printLine('  更新        检查系统更新', 'dim');
    printLine('  壁纸 <编号>  更换壁纸 (1/2/3)', 'dim');
    printLine('  主题 <颜色>  切换主题色', 'dim');
    printEmpty();
    printLine('  管理员命令 (需要管理员权限)', 'warn');
    printLine('  用户        管理用户', 'dim');
    printLine('  授权        授权激活码', 'dim');
    printLine('  公告        发布系统公告', 'dim');
    printLine('  重启        重启终端', 'dim');
    printLine('  关机        关闭终端', 'dim');
    printEmpty();
    printLine('  系统命令 (需要系统权限)', 'warn');
    printLine('  重置        重置整个系统', 'dim');
    printLine('  还原        还原系统设置', 'dim');
    printLine('  清除        清除所有数据', 'dim');
    printLine('  模式        切换体验/正常模式', 'dim');
    printEmpty();
}

function cmdClear() {
    const content = document.getElementById(getActiveContentId());
    if (content) content.innerHTML = '';
}

function cmdList(targetPath) {
    const dir = targetPath ? getDirByPath(resolvePath(targetPath)) : getCurrentDir();
    if (!dir) {
        printLine(`  列表: 无法访问路径 "${targetPath || currentPath}"`, 'error');
        return;
    }
    const entries = Object.keys(dir);
    if (entries.length === 0) {
        printLine('  (空目录)', 'dim');
        return;
    }
    printEmpty();
    for (const name of entries) {
        const item = dir[name];
        if (item && typeof item === 'object' && item.type === 'file') {
            printLine(`  \u{1F4C4} ${name.padEnd(20)} ${item.size.padStart(10)}  ${item.date}`, 'white');
        } else {
            printLine(`  \u{1F4C1} ${name}/`, 'info');
        }
    }
    printEmpty();
}

function cmdCd(target) {
    if (!target) {
        currentPath = '/home/user';
        updatePrompt();
        return;
    }
    if (target === '~' || target === '/') {
        currentPath = target === '~' ? '/home/user' : '/';
        updatePrompt();
        return;
    }

    const newPath = resolvePath(target);
    const dir = getDirByPath(newPath);
    if (dir && typeof dir === 'object' && !dir.type) {
        currentPath = newPath;
        updatePrompt();
    } else {
        printLine(`  进入: 目录 "${target}" 不存在`, 'error');
    }
}

function cmdBack() {
    if (currentPath === '/home/user') {
        printLine('  返回: 已在根目录', 'warn');
        return;
    }
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    currentPath = '/' + parts.join('/') || '/home/user';
    updatePrompt();
}

function cmdCat(filename) {
    if (!filename) {
        printLine('  查看: 请指定文件名', 'error');
        return;
    }
    const dir = getCurrentDir();
    if (!dir || !dir[filename]) {
        printLine(`  查看: 文件 "${filename}" 不存在`, 'error');
        return;
    }
    const file = dir[filename];
    if (typeof file === 'object' && file.type === 'file') {
        printEmpty();
        const lines = (file.content || '').split('\n');
        for (const line of lines) {
            printLine(`  ${line}`, 'white');
        }
        printEmpty();
    } else {
        printLine(`  查看: "${filename}" 不是文件`, 'error');
    }
}

function cmdTouch(filename) {
    if (!filename) {
        printLine('  创建: 请指定文件名', 'error');
        return;
    }
    const dir = getCurrentDir();
    if (!dir) return;
    if (dir[filename]) {
        printLine(`  创建: "${filename}" 已存在`, 'warn');
        return;
    }
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    dir[filename] = { size: '0 B', date: dateStr, type: 'file', content: '' };
    printLine(`  ${trialPrefix()}已创建文件: ${filename}`, 'success');
}

function cmdMkdir(dirname) {
    if (!dirname) {
        printLine('  新建: 请指定文件夹名', 'error');
        return;
    }
    const dir = getCurrentDir();
    if (!dir) return;
    if (dir[dirname]) {
        printLine(`  新建: "${dirname}" 已存在`, 'warn');
        return;
    }
    dir[dirname] = {};
    printLine(`  ${trialPrefix()}已创建文件夹: ${dirname}`, 'success');
}

function cmdRm(name) {
    if (!name) {
        printLine('  删除: 请指定文件/文件夹名', 'error');
        return;
    }
    const dir = getCurrentDir();
    if (!dir || !dir[name]) {
        printLine(`  删除: "${name}" 不存在`, 'error');
        return;
    }
    delete dir[name];
    printLine(`  ${trialPrefix()}已删除: ${name}`, 'success');
}

function cmdRename(oldName, newName) {
    if (!oldName || !newName) {
        printLine('  重命名: 用法: 重命名 旧名 新名', 'error');
        return;
    }
    const dir = getCurrentDir();
    if (!dir || !dir[oldName]) {
        printLine(`  重命名: "${oldName}" 不存在`, 'error');
        return;
    }
    if (dir[newName]) {
        printLine(`  重命名: "${newName}" 已存在`, 'error');
        return;
    }
    dir[newName] = dir[oldName];
    delete dir[oldName];
    printLine(`  ${trialPrefix()}已重命名: ${oldName} -> ${newName}`, 'success');
}

function cmdCopy(src, dest) {
    if (!src || !dest) {
        printLine('  复制: 用法: 复制 源文件 目标', 'error');
        return;
    }
    const dir = getCurrentDir();
    if (!dir || !dir[src]) {
        printLine(`  复制: "${src}" 不存在`, 'error');
        return;
    }
    if (dir[dest]) {
        printLine(`  复制: "${dest}" 已存在`, 'error');
        return;
    }
    dir[dest] = JSON.parse(JSON.stringify(dir[src]));
    printLine(`  ${trialPrefix()}已复制: ${src} -> ${dest}`, 'success');
}

function cmdMove(src, dest) {
    if (!src || !dest) {
        printLine('  移动: 用法: 移动 源文件 目标', 'error');
        return;
    }
    const dir = getCurrentDir();
    if (!dir || !dir[src]) {
        printLine(`  移动: "${src}" 不存在`, 'error');
        return;
    }
    if (dir[dest]) {
        printLine(`  移动: "${dest}" 已存在`, 'error');
        return;
    }
    dir[dest] = dir[src];
    delete dir[src];
    printLine(`  ${trialPrefix()}已移动: ${src} -> ${dest}`, 'success');
}

function cmdWrite(filename, content) {
    if (!filename) {
        printLine('  写入: 请指定文件名', 'error');
        return;
    }
    if (!content) {
        printLine('  写入: 请指定写入内容，格式: 写入 文件名 "内容"', 'error');
        return;
    }
    const dir = getCurrentDir();
    if (!dir) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const blobSize = new Blob([content]).size;
    const sizeStr = blobSize < 1024 ? blobSize + ' B' : (blobSize / 1024).toFixed(1) + ' KB';
    if (dir[filename] && typeof dir[filename] === 'object' && dir[filename].type === 'file') {
        dir[filename].content = content;
        dir[filename].size = sizeStr;
        dir[filename].date = dateStr;
    } else {
        dir[filename] = { size: sizeStr, date: dateStr, type: 'file', content: content };
    }
    printLine(`  ${trialPrefix()}已写入内容到: ${filename}`, 'success');
}

function cmdDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    printLine(`  ${now.toLocaleDateString('zh-CN', options)}`, 'info');
}

function cmdWhoami() {
    printLine(`  用户名: ${currentUsername}`, 'info');
    printLine(`  激活码: ${currentActivationCode}`, 'info');
    printLine(`  权限: ${currentPermission.name}`, 'info');
    printLine(`  模式: ${isTrialMode() ? '体验模式' : '正常模式'}`, isTrialMode() ? 'warn' : 'info');
}

function cmdPerm() {
    printLine(`  当前权限等级: ${currentPermission.name}`, 'info');
    printLine(`  激活码: ${currentActivationCode}`, 'info');
    if (currentPermission.level === 'system') {
        printLine('  权限说明: 系统级权限 (体验模式，部分功能受限)', 'warn');
    } else if (currentPermission.level === 'admin') {
        printLine('  权限说明: 管理员权限 (可执行管理命令)', 'info');
    } else {
        printLine('  权限说明: 普通用户权限 (基础功能)', 'dim');
    }
}

function cmdPwd() {
    printLine(`  ${currentPath}`, 'info');
}

// ===== 系统命令 =====

function cmdNeofetch() {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const mins = Math.floor((uptime % 3600000) / 60000);
    const installedCount = appStoreApps.filter(a => a.installed).length;

    printEmpty();
    printLine('  ══════════════════════════════════════════', 'info');
    printLine('           QingningOS Terminal v2.0', 'info');
    printLine('  ══════════════════════════════════════════', 'info');
    printLine(`  用户:     ${currentUsername}`, 'white');
    printLine(`  激活码:   ${currentActivationCode}`, 'white');
    printLine(`  权限:     ${currentPermission.name}`, 'white');
    printLine(`  内核:     ${QNOS_KERNEL}`, 'dim');
    printLine(`  终端:     QingningOS Terminal v${QNOS_VERSION}`, 'dim');
    printLine(`  运行时间: ${days}天 ${hours}小时 ${mins}分`, 'dim');
    printLine(`  内存:     256MB / 1024MB`, 'dim');
    printLine(`  CPU:      Qingning vCPU @ 3.2GHz`, 'dim');
    printLine(`  网络:     已连接 (QingningOS-WiFi)`, 'info');
    printLine(`  杀毒:     实时防护${antivirusRealTime ? '已开启' : '已关闭'}`, antivirusRealTime ? 'info' : 'warn');
    printLine(`  已安装:   ${installedCount} 个应用`, 'dim');
    printLine('  ══════════════════════════════════════════', 'info');
    printEmpty();
}

function cmdPs() {
    printEmpty();
    printLine('  PID    进程名                  CPU%    内存(MB)', 'dim');
    printLine('  ───────────────────────────────────────────────', 'dim');
    for (const p of processes) {
        const cpuFluc = (Math.random() * 2 - 1).toFixed(1);
        const cpuVal = (p.cpu + parseFloat(cpuFluc)).toFixed(1);
        printLine(`  ${String(p.pid).padStart(4)}   ${p.name.padEnd(22)} ${cpuVal.padStart(5)}    ${p.mem}`, 'white');
    }
    printEmpty();
}

function cmdKill(pid) {
    if (!pid) {
        printLine('  结束: 请指定进程ID', 'error');
        return;
    }
    const pidNum = parseInt(pid);
    const idx = processes.findIndex(p => p.pid === pidNum);
    if (idx === -1) {
        printLine(`  结束: 进程 PID ${pid} 不存在`, 'error');
        return;
    }
    if (pidNum <= 2) {
        printLine(`  结束: 无法结束系统关键进程 (PID ${pid})`, 'error');
        return;
    }
    const name = processes[idx].name;
    processes.splice(idx, 1);
    printLine(`  ${trialPrefix()}已结束进程: ${name} (PID ${pid})`, 'success');
}

function cmdMemory() {
    const usedMem = 256 + Math.floor(Math.random() * 50);
    const totalMem = 1024;
    const percent = ((usedMem / totalMem) * 100).toFixed(1);
    const barLen = 30;
    const filled = Math.round((usedMem / totalMem) * barLen);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLen - filled);

    printEmpty();
    printLine('  内存使用情况', 'info');
    printLine('  ──────────────────────────────────────', 'dim');
    printLine(`  总内存:   ${totalMem} MB`, 'white');
    printLine(`  已使用:   ${usedMem} MB (${percent}%)`, 'white');
    printLine(`  可用:     ${totalMem - usedMem} MB`, 'white');
    printLine(`  [${bar}] ${percent}%`, 'info');
    printEmpty();
}

function cmdNetwork() {
    printEmpty();
    printLine('  网络状态', 'info');
    printLine('  ──────────────────────────────────────', 'dim');
    printLine('  连接状态: 已连接', 'success');
    printLine('  网络名称: QingningOS-WiFi', 'white');
    printLine('  信号强度: 优秀', 'info');
    printLine('  IP 地址:  192.168.1.' + Math.floor(Math.random() * 254 + 1), 'white');
    printLine('  网关:     192.168.1.1', 'white');
    printLine('  DNS:      8.8.8.8', 'white');
    printLine('  下载速度: ' + (Math.random() * 50 + 50).toFixed(1) + ' Mbps', 'white');
    printLine('  上传速度: ' + (Math.random() * 20 + 10).toFixed(1) + ' Mbps', 'white');
    printEmpty();
}

function cmdDisk() {
    const used = 12.8 + Math.random() * 5;
    const total = 64;
    const percent = ((used / total) * 100).toFixed(1);
    const barLen = 30;
    const filled = Math.round((used / total) * barLen);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLen - filled);

    printEmpty();
    printLine('  磁盘使用情况', 'info');
    printLine('  ──────────────────────────────────────', 'dim');
    printLine(`  总容量:   ${total.toFixed(1)} GB`, 'white');
    printLine(`  已使用:   ${used.toFixed(1)} GB (${percent}%)`, 'white');
    printLine(`  可用:     ${(total - used).toFixed(1)} GB`, 'white');
    printLine(`  [${bar}] ${percent}%`, 'info');
    printLine(`  文件系统: QNFS (QingningOS File System)`, 'dim');
    printEmpty();
}

// ===== 青柠命令 =====

function cmdBrowse(url) {
    if (!url) {
        printLine('  浏览: 请指定网址，用法: 浏览 <网址>', 'error');
        return;
    }
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }
    printLine(`  ${trialPrefix()}正在打开: ${targetUrl}`, 'info');
    window.open(targetUrl, '_blank');
}

function cmdStore() {
    printEmpty();
    printLine('  ══════════════════════════════════════════════════════════', 'info');
    printLine('                    青柠应用商店', 'info');
    printLine('  ══════════════════════════════════════════════════════════', 'info');
    for (const app of appStoreApps) {
        const status = app.installed ? '[已安装]' : '[安装]';
        const statusClass = app.installed ? 'dim' : 'info';
        printLine(`  ${app.name.padEnd(12)} v${app.version.padEnd(8)} ${app.size.padEnd(8)} ${app.desc}`, 'white');
        printHTML(`  ${' '.repeat(14)}<span class="${statusClass}">${status}</span>`, 'dim');
    }
    printLine('  ══════════════════════════════════════════════════════════', 'info');
    printEmpty();
    printLine('  使用 "安装 <应用名>" 安装应用', 'dim');
    printLine('  使用 "卸载 <应用名>" 卸载应用', 'dim');
    printEmpty();
}

function cmdInstall(appName) {
    if (!appName) {
        printLine('  安装: 请指定应用名', 'error');
        return;
    }
    const app = appStoreApps.find(a => a.name === appName);
    if (!app) {
        printLine(`  安装: 应用 "${appName}" 不存在`, 'error');
        return;
    }
    if (app.installed) {
        printLine(`  安装: "${appName}" 已安装`, 'warn');
        return;
    }
    printLine(`  ${trialPrefix()}正在安装 ${appName}...`, 'info');
    setTimeout(() => {
        app.installed = true;
        printLine(`  ${trialPrefix()}安装完成: ${appName} v${app.version}`, 'success');
        showToast(`${appName} 安装完成`, 'success');
        renderAppList();
    }, 800);
}

function cmdUninstall(appName) {
    if (!appName) {
        printLine('  卸载: 请指定应用名', 'error');
        return;
    }
    const app = appStoreApps.find(a => a.name === appName);
    if (!app) {
        printLine(`  卸载: 应用 "${appName}" 不存在`, 'error');
        return;
    }
    if (!app.installed) {
        printLine(`  卸载: "${appName}" 未安装`, 'warn');
        return;
    }
    app.installed = false;
    printLine(`  ${trialPrefix()}已卸载: ${appName}`, 'success');
    renderAppList();
}

function cmdScan() {
    printLine(`  ${trialPrefix()}正在启动杀毒扫描...`, 'info');
    printLine('  扫描系统文件...', 'dim');
    setTimeout(() => {
        printLine('  扫描用户文件...', 'dim');
    }, 500);
    setTimeout(() => {
        printLine('  扫描网络模块...', 'dim');
    }, 1000);
    setTimeout(() => {
        printLine('  扫描注册表...', 'dim');
    }, 1500);
    setTimeout(() => {
        printEmpty();
        printLine('  ══════════════════════════════════════════', 'info');
        printLine('           扫描结果 - 安全', 'success');
        printLine('  ══════════════════════════════════════════', 'info');
        printLine('  扫描文件数: 1,247', 'white');
        printLine('  威胁发现:   0', 'success');
        printLine('  扫描耗时:   3.2秒', 'dim');
        printLine('  状态:       系统安全', 'success');
        printLine('  ══════════════════════════════════════════', 'info');
        printEmpty();
    }, 2200);
}

function cmdGuard(status) {
    if (!status) {
        printLine(`  实时防护: ${antivirusRealTime ? '已开启' : '已关闭'}`, antivirusRealTime ? 'info' : 'warn');
        return;
    }
    if (status === '开启' || status === 'on') {
        antivirusRealTime = true;
        printLine(`  ${trialPrefix()}实时防护已开启`, 'success');
    } else if (status === '关闭' || status === 'off') {
        antivirusRealTime = false;
        printLine(`  ${trialPrefix()}实时防护已关闭`, 'warn');
    } else {
        printLine('  防护: 用法: 防护 开启/关闭', 'error');
    }
}

function cmdUpdate() {
    printLine('  正在检查更新...', 'info');
    setTimeout(() => {
        printEmpty();
        printLine('  ══════════════════════════════════════════', 'info');
        printLine('           系统更新检查', 'info');
        printLine('  ══════════════════════════════════════════', 'info');
        printLine('  当前版本: v2.0', 'white');
        printLine('  最新版本: v2.0', 'white');
        printLine('  状态:     已是最新版本', 'success');
        printLine('  ══════════════════════════════════════════', 'info');
        printEmpty();
    }, 1200);
}

function cmdWallpaper(id) {
    const wallpapers = {
        '1': { name: '浅色渐变', style: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 50%, #f0f0f0 100%)' },
        '2': { name: '青柠', style: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #ecfdf5 100%)' },
        '3': { name: '天空', style: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0f9ff 100%)' }
    };
    if (!id || !wallpapers[id]) {
        printLine('  壁纸: 用法: 壁纸 1/2/3', 'error');
        printLine('  可用壁纸:', 'dim');
        for (const [k, v] of Object.entries(wallpapers)) {
            printLine(`    ${k}. ${v.name}`, 'dim');
        }
        return;
    }
    const wp = wallpapers[id];
    document.getElementById('mainScreen').style.background = wp.style;
    document.body.style.background = wp.style;
    printLine(`  ${trialPrefix()}壁纸已更换为: ${wp.name}`, 'success');
}

function cmdTheme(color) {
    const themes = {
        '绿色': '#22c55e', '蓝色': '#3b82f6', '紫色': '#a855f7', '红色': '#ef4444'
    };
    if (!color || !themes[color]) {
        printLine('  主题: 用法: 主题 绿色/蓝色/紫色/红色', 'error');
        return;
    }
    currentThemeColor = themes[color];
    currentThemeName = color;
    document.documentElement.style.setProperty('--primary', currentThemeColor);
    printLine(`  ${trialPrefix()}主题色已切换为: ${color}`, 'success');
    showToast(`主题已切换: ${color}`, 'info');
    updateThemeValue();
}

// ===== 管理员命令 =====

function requireAdmin() {
    if (!isAdmin()) {
        printLine('  权限不足，需要管理员及以上权限', 'error');
        return false;
    }
    return true;
}

function requireSystem() {
    if (!isSystem() && !(currentPermission && currentPermission.level === 'admin' && currentPermission.code.toUpperCase() === 'XT0001')) {
        printLine('  权限不足，需要站长权限', 'error');
        return false;
    }
    return true;
}

function cmdUser(args) {
    if (!requireAdmin()) return;
    const action = args[0];
    if (!action || action === '列表') {
        printEmpty();
        printLine('  系统用户列表:', 'info');
        printLine('  ──────────────────────────────────────', 'dim');
        printLine('  用户名      激活码       权限', 'dim');
        printLine('  system      XT0000       系统(体验)', 'warn');
        printLine('  admin       xt0001       站长', 'info');
        printLine('  manager01   xt0002       管理员', 'white');
        printLine('  manager02   xt0003       管理员', 'white');
        printLine('  user01      xt2001       普通用户', 'dim');
        printEmpty();
    } else if (action === '添加') {
        printLine(`  ${trialPrefix()}用户添加功能需要通过 授权 命令完成`, 'info');
    } else if (action === '删除') {
        if (!args[1]) {
            printLine('  用户 删除: 请指定用户名', 'error');
            return;
        }
        printLine(`  ${trialPrefix()}已删除用户: ${args[1]}`, 'success');
    } else {
        printLine('  用户: 用法: 用户 列表/添加/删除', 'error');
    }
}

function cmdAuth(args) {
    if (!requireAdmin()) return;
    if (args.length < 3) {
        printLine('  授权: 用法: 授权 邮箱 激活码 权限', 'error');
        return;
    }
    const [email, code, perm] = args;
    printLine(`  ${trialPrefix()}授权成功:`, 'success');
    printLine(`    邮箱: ${email}`, 'white');
    printLine(`    激活码: ${code}`, 'white');
    printLine(`    权限: ${perm}`, 'white');
}

function cmdAnnounce(content) {
    if (!requireAdmin()) return;
    if (!content) {
        printLine('  公告: 用法: 公告 "内容"', 'error');
        return;
    }
    systemAnnouncement = content;
    printLine(`  ${trialPrefix()}公告已发布: ${content}`, 'success');
    showToast('新公告已发布', 'info');
}

function cmdReboot() {
    if (!requireAdmin()) return;
    printLine('  正在重启终端...', 'warn');
    setTimeout(() => {
        const contentHome = document.getElementById('terminalContent');
        const contentFull = document.getElementById('terminalContentFull');
        if (contentHome) contentHome.innerHTML = '';
        if (contentFull) contentFull.innerHTML = '';
        commandHistory = [];
        commandHistoryIndex = -1;
        currentPath = '/home/user';
        startTime = Date.now();
        showWelcomeMessage();
        updatePrompt();
        printLine('  系统已重启完成', 'success');
        showToast('系统已重启', 'success');
    }, 1500);
}

function cmdShutdown() {
    if (!requireAdmin()) return;
    printLine('  正在关闭系统...', 'warn');
    setTimeout(() => {
        document.getElementById('mainScreen').style.display = 'none';
        const shutdownScreen = document.getElementById('shutdownScreen');
        shutdownScreen.style.display = 'flex';
        document.getElementById('shutdownText').textContent = '系统已关闭 - 刷新页面以重新启动';
    }, 1500);
}

// ===== 系统命令 (XT0000/xt0001) =====

function cmdReset() {
    if (!requireSystem()) return;
    printLine('  [警告] 此操作将重置整个系统!', 'error');
    printLine('  正在重置...', 'warn');
    setTimeout(() => {
        localStorage.removeItem('qn_terminal_code');
        location.reload();
    }, 2000);
}

function cmdRestore() {
    if (!requireSystem()) return;
    printLine('  正在还原系统设置...', 'warn');
    setTimeout(() => {
        currentPath = '/home/user';
        currentThemeColor = '#22c55e';
        currentThemeName = '绿色';
        antivirusRealTime = true;
        systemAnnouncement = '';
        document.getElementById('mainScreen').style.background = '';
        document.body.style.background = '';
        document.documentElement.style.setProperty('--primary', '#22c55e');
        updatePrompt();
        updateThemeValue();
        printLine('  系统设置已还原为默认值', 'success');
        showToast('系统已还原', 'success');
    }, 1000);
}

function cmdPurge() {
    if (!requireSystem()) return;
    printLine('  [警告] 此操作将清除所有数据!', 'error');
    printLine('  正在清除...', 'warn');
    setTimeout(() => {
        fileSystem = {
            '/home/user': {
                '桌面': {},
                '文档': {},
                '下载': {},
                '图片': {},
                '视频': {}
            }
        };
        appStoreApps.forEach(a => a.installed = false);
        processes = [
            { pid: 1, name: 'qn-shell', cpu: 0.5, mem: 12 },
            { pid: 2, name: 'qn-terminal', cpu: 2.1, mem: 45 }
        ];
        printLine('  所有数据已清除', 'success');
        renderAppList();
    }, 1000);
}

function cmdMode(mode) {
    if (!requireSystem()) return;
    if (!mode) {
        printLine(`  当前模式: ${isTrialMode() ? '体验模式' : '正常模式'}`, 'info');
        printLine('  用法: 模式 正常/体验', 'dim');
        return;
    }
    if (mode === '正常') {
        currentMode = 'normal';
        printLine('  已切换到正常模式', 'success');
    } else if (mode === '体验') {
        currentMode = 'trial';
        printLine('  已切换到体验模式', 'warn');
    } else {
        printLine('  模式: 用法: 模式 正常/体验', 'error');
    }
}

// ===== 应用列表渲染 =====
function renderAppList() {
    const list = document.getElementById('appList');
    if (!list) return;
    list.innerHTML = '';
    for (const app of appStoreApps) {
        const item = document.createElement('div');
        item.className = 'app-list-item';
        item.innerHTML = `
            <div class="app-list-icon ${app.icon}">${app.emoji}</div>
            <div class="app-list-info">
                <div class="app-list-name">${app.name}</div>
                <div class="app-list-desc">${app.desc} &middot; v${app.version} &middot; ${app.size}</div>
            </div>
            <button class="app-list-action ${app.installed ? 'installed' : ''}" data-app="${app.name}">
                ${app.installed ? '已安装' : '安装'}
            </button>
        `;
        list.appendChild(item);
    }

    // 绑定安装/卸载按钮
    list.querySelectorAll('.app-list-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const appName = btn.dataset.app;
            const app = appStoreApps.find(a => a.name === appName);
            if (app.installed) {
                executeCommand(`卸载 ${appName}`);
            } else {
                executeCommand(`安装 ${appName}`);
            }
        });
    });
}

// ===== 设置项绑定 =====
function bindSettings() {
    const themeItem = document.getElementById('settingTheme');
    const aboutItem = document.getElementById('settingAbout');
    const rebootItem = document.getElementById('settingReboot');
    const shutdownItem = document.getElementById('settingShutdown');

    if (themeItem) {
        themeItem.addEventListener('click', () => {
            const themes = ['绿色', '蓝色', '紫色', '红色'];
            const idx = themes.indexOf(currentThemeName);
            const next = themes[(idx + 1) % themes.length];
            executeCommand(`主题 ${next}`);
        });
    }

    if (aboutItem) {
        aboutItem.addEventListener('click', () => {
            switchPage('terminal');
            setTimeout(() => {
                executeCommand('系统信息');
                focusTerminalInput();
            }, 200);
        });
    }

    if (rebootItem) {
        rebootItem.addEventListener('click', () => {
            executeCommand('重启');
        });
    }

    if (shutdownItem) {
        shutdownItem.addEventListener('click', () => {
            executeCommand('关机');
        });
    }
}

function updateThemeValue() {
    const el = document.getElementById('settingThemeValue');
    if (el) el.textContent = currentThemeName;
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    startBoot();
});
