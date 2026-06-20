// ===== Supabase 配置 =====
const SUPABASE_URL = 'https://jbmymvpydycurynmxgbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibXltdnB5ZHljdXJ5bm14Z2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDA0NjYsImV4cCI6MjA5MzkxNjQ2Nn0.FpL-rWQHriqyuDA3l1vEiovZVcGhUbpOVCUS_X5h33E';

// CDN 加载保护（延迟检查 + 超时重试）
var supabaseClient;

function initSupabase(retries) {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else if (retries > 0) {
        // CDN 可能还在加载，延迟后重试
        setTimeout(function() { initSupabase(retries - 1); }, 500);
    } else {
        // 所有重试都失败，显示错误提示（不替换整个页面）
        document.addEventListener('DOMContentLoaded', function() {
            var errDiv = document.createElement('div');
            errDiv.style.cssText = 'text-align:center;padding:80px 20px;font-family:sans-serif;';
            errDiv.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">&#9888;&#65039;</div>' +
                '<h2 style="color:#1e293b;">加载失败</h2>' +
                '<p style="color:#64748b;margin-top:8px;">无法加载登录组件，请检查网络连接后刷新页面。</p>';
            document.body.prepend(errDiv);
        });
    }
}

// 在 DOMContentLoaded 后初始化，给 CDN 足够加载时间
document.addEventListener('DOMContentLoaded', function() {
    initSupabase(5); // 最多重试5次，每次间隔500ms
});

// 站长邮箱（管理员）
const ADMIN_EMAIL = '3862242786@qq.com';

// ===== 页面切换 =====
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const tokenForm = document.getElementById('tokenForm');
    const qrForm = document.getElementById('qrLoginForm');
    const header = document.querySelector('.auth-header p');

    // 隐藏所有表单
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (forgotForm) forgotForm.style.display = 'none';
    if (tokenForm) tokenForm.style.display = 'none';
    if (qrForm) qrForm.style.display = 'none';

    // 停止二维码轮询
    stopQRCheck();

    if (tab === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (header) header.textContent = '登录你的账户';
    } else if (tab === 'register') {
        if (registerForm) registerForm.style.display = 'block';
        if (header) header.textContent = '创建新账户';
    } else if (tab === 'forgot') {
        if (forgotForm) forgotForm.style.display = 'block';
        if (header) header.textContent = '找回密码';
    } else if (tab === 'token') {
        if (tokenForm) tokenForm.style.display = 'block';
        if (header) header.textContent = '令牌登录';
    } else if (tab === 'qrcode') {
        if (qrForm) qrForm.style.display = 'block';
        if (header) header.textContent = '扫码登录';
        startQRLogin();
    }
}

// ===== 显示消息 =====
function showMessage(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.style.color = isError ? '#ef4444' : '#16a34a';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ===== 注册 =====
async function handleRegister(e) {
    e.preventDefault();

    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (!email || !password) {
        showMessage('registerMessage', '请输入邮箱和密码！', true);
        return;
    }

    if (password !== confirmPassword) {
        showMessage('registerMessage', '两次输入的密码不一致！', true);
        return;
    }

    if (password.length < 6) {
        showMessage('registerMessage', '密码长度至少为6位！', true);
        return;
    }

    try {
        // 第一步：注册
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('already registered') || error.message.includes('already been registered')) {
                showMessage('registerMessage', '该邮箱已被注册，请直接登录', true);
            } else {
                showMessage('registerMessage', '注册失败：' + error.message, true);
            }
            return;
        }

        // 第二步：无论是否需要邮箱确认，都尝试直接登录
        showMessage('registerMessage', '注册成功，正在自动登录...');

        // 等待一下让 Supabase 处理注册
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (loginError) {
            showMessage('registerMessage', '注册成功！请返回登录页面手动登录', false);
            setTimeout(() => { switchTab('login'); }, 2000);
            return;
        }

        // 登录成功
        showMessage('registerMessage', '登录成功！正在跳转...');
        saveLoginState(email);

        // 初始化用户主页数据（localStorage）
        try {
            var profileKey = 'qn_profile_' + email;
            if (!localStorage.getItem(profileKey)) {
                localStorage.setItem(profileKey, JSON.stringify({
                    email: email,
                    username: email.split('@')[0],
                    bio: '',
                    avatar_url: '',
                    banner_url: '',
                    verified: false,
                    role: email === ADMIN_EMAIL ? 'admin' : 'user',
                    favorites_public: false,
                    created_at: new Date().toISOString()
                }));
            }
        } catch (pe) { console.warn('Profile init:', pe); }

        if (email === ADMIN_EMAIL) {
            setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
        } else {
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
    } catch (err) {
        showMessage('registerMessage', '注册失败，请稍后重试', true);
    }
}

// ===== 登录 =====
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showMessage('loginMessage', '请输入邮箱和密码！', true);
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('Invalid login') || error.message.includes('Invalid credentials')) {
                showMessage('loginMessage', '邮箱或密码错误！', true);
            } else if (error.message.includes('Email not confirmed')) {
                showMessage('loginMessage', '邮箱未确认，正在重新发送确认邮件...', false);
                try {
                    await supabaseClient.auth.resend({
                        type: 'signup',
                        email: email,
                    });
                    showMessage('loginMessage', '确认邮件已发送，请查收邮箱', false);
                } catch (resendErr) {
                    showMessage('loginMessage', '邮箱未确认，请检查邮箱或联系站长', true);
                }
            } else if (error.message.includes('Too many requests')) {
                showMessage('loginMessage', '请求过于频繁，请稍后再试', true);
            } else if (error.message.includes('Network') || error.message.includes('fetch')) {
                showMessage('loginMessage', '网络连接失败，请检查网络后重试', true);
            } else {
                showMessage('loginMessage', '登录失败：' + error.message, true);
            }
            return;
        }

        showMessage('loginMessage', '登录成功！正在跳转...');
        saveLoginState(email);

        // 初始化用户主页数据（localStorage）
        try {
            var profileKey = 'qn_profile_' + email;
            if (!localStorage.getItem(profileKey)) {
                localStorage.setItem(profileKey, JSON.stringify({
                    email: email,
                    username: email.split('@')[0],
                    bio: '',
                    avatar_url: '',
                    banner_url: '',
                    verified: false,
                    role: email === ADMIN_EMAIL ? 'admin' : 'user',
                    favorites_public: false,
                    created_at: new Date().toISOString()
                }));
            }
        } catch (pe) { console.warn('Profile init:', pe); }

        // 管理员跳转到管理后台，普通用户跳转到首页
        if (email === ADMIN_EMAIL) {
            setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
        } else {
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
    } catch (err) {
        console.error('Login error:', err);
        showMessage('loginMessage', '登录失败，请检查网络后重试', true);
    }
}

// ===== 保存登录状态 =====
function saveLoginState(email) {
    const isAdmin = email === ADMIN_EMAIL;
    localStorage.setItem('qn_logged_in', 'true');
    localStorage.setItem('qn_user_email', email);
    localStorage.setItem('qn_is_admin', isAdmin ? 'true' : 'false');
    // 生成档案室访问密钥（仅管理员）
    if (isAdmin) {
        localStorage.setItem('qn_archive_key', 'QINGNING_ADMIN_' + Date.now());
    }
}

// ===== 找回密码 =====
function handleForgotPassword() {
    switchTab('forgot');
}

async function handleResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;

    try {
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/auth.html',
        });

        if (error) {
            showMessage('forgotMessage', '发送失败：' + error.message, true);
            return;
        }

        showMessage('forgotMessage', '重置链接已发送到你的邮箱！请查收。');
    } catch (err) {
        showMessage('forgotMessage', '发送失败，请稍后重试', true);
    }
}

// ===== 检查登录状态（已禁用自动跳转） =====
// checkAuth 暂时禁用，避免页面加载时被跳走

// ===== 退出登录 =====
async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
    } catch (e) {
        console.warn('Supabase signOut failed:', e);
    }
    localStorage.removeItem('qn_logged_in');
    localStorage.removeItem('qn_user_email');
    localStorage.removeItem('qn_is_admin');
    sessionStorage.removeItem('qn_logged_in');
    sessionStorage.removeItem('qn_user_email');
    sessionStorage.removeItem('qn_is_admin');
    window.location.href = 'auth.html';
}

// ===== 验证登录状态（异步检查Session） =====
async function checkLoginState() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            // Session 已过期，清除本地状态
            localStorage.removeItem('qn_logged_in');
            localStorage.removeItem('qn_user_email');
            localStorage.removeItem('qn_is_admin');
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

// ===== 令牌登录 =====
async function handleTokenLogin(e) {
    e.preventDefault();
    const token = document.getElementById('tokenInput').value.trim();

    if (!token || token.length !== 10 || !/^\d{10}$/.test(token)) {
        showMessage('tokenMessage', '请输入10位数字令牌！', true);
        return;
    }

    try {
        // 1. 先检查令牌是否被禁用
        const disabledTokens = await loadDisabledTokens();
        if (disabledTokens.includes(token)) {
            showMessage('tokenMessage', '登录失败，此令牌已失效', true);
            return;
        }

        // 2. 验证令牌 - 需要知道是哪个用户的令牌
        // 令牌格式: 用户邮箱 + 日期 生成的 SHA256 前10位数字
        // 由于我们不知道用户邮箱，需要尝试所有已知用户的令牌
        const validUser = await validateTokenAgainstUsers(token);

        if (!validUser) {
            showMessage('tokenMessage', '登录失败，此令牌已失效', true);
            return;
        }

        // 3. 令牌有效，执行登录
        showMessage('tokenMessage', '令牌验证成功！正在登录...', false);

        // 保存登录状态
        saveLoginState(validUser.email);
        localStorage.setItem('qn_login_method', 'token');
        localStorage.setItem('qn_token_used', token);

        // 初始化用户档案
        try {
            var profileKey = 'qn_profile_' + validUser.email;
            if (!localStorage.getItem(profileKey)) {
                localStorage.setItem(profileKey, JSON.stringify({
                    email: validUser.email,
                    username: validUser.email.split('@')[0],
                    bio: '',
                    avatar_url: '',
                    banner_url: '',
                    verified: false,
                    role: validUser.email === ADMIN_EMAIL ? 'admin' : 'user',
                    favorites_public: false,
                    created_at: new Date().toISOString()
                }));
            }
        } catch (pe) { console.warn('Profile init:', pe); }

        // 跳转
        if (validUser.email === ADMIN_EMAIL) {
            setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
        } else {
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
    } catch (err) {
        console.error('Token login error:', err);
        showMessage('tokenMessage', '登录失败，请稍后重试', true);
    }
}

// 加载被禁用的令牌列表（从云端）
async function loadDisabledTokens() {
    try {
        const { data, error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .download('disabled_tokens.json');
        if (error || !data) return [];
        const text = await data.text();
        const obj = JSON.parse(text);
        return obj.tokens || [];
    } catch (e) {
        return [];
    }
}

// 验证令牌是否匹配某个用户
async function validateTokenAgainstUsers(token) {
    const today = new Date();
    const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');

    // 尝试从 localStorage 获取已知用户
    const knownEmails = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('qn_profile_')) {
            try {
                const profile = JSON.parse(localStorage.getItem(key));
                if (profile && profile.email) knownEmails.push(profile.email);
            } catch (e) {}
        }
    }

    // 也尝试从当前 Supabase session 获取（如果已登录）
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user && session.user.email) {
            if (!knownEmails.includes(session.user.email)) {
                knownEmails.push(session.user.email);
            }
        }
    } catch (e) {}

    // 对每个已知邮箱验证令牌
    for (const email of knownEmails) {
        const expectedToken = generateExpectedToken(email, dateStr);
        if (expectedToken === token) {
            return { email: email };
        }
    }

    // 如果没有匹配，返回 null（令牌无效）
    return null;
}

// 生成预期令牌（与 APK 使用完全相同的跨平台算法）
function generateExpectedToken(email, dateStr) {
    const seed = email + dateStr + 'QINGNING_TOKEN_V2';
    // 使用质数混合算法，确保 JS 和 Python 结果完全一致
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const c = seed.charCodeAt(i);
        hash = (hash * 31 + c * primes[i % primes.length]) % 10000000000;
    }
    // 确保10位，不足前面补0
    return hash.toString().padStart(10, '0');
}

// ===== 扫码登录 =====
let qrCheckInterval = null;
let currentQRToken = null;

function startQRLogin() {
    generateQRCode();
    // 每3秒检查一次是否被扫描
    qrCheckInterval = setInterval(checkQRScanned, 3000);
    // 每60秒刷新二维码
    setTimeout(function() {
        if (document.getElementById('qrLoginForm') && document.getElementById('qrLoginForm').style.display !== 'none') {
            generateQRCode();
        }
    }, 60000);
}

function stopQRCheck() {
    if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
        qrCheckInterval = null;
    }
}

function generateQRCode() {
    const container = document.getElementById('qrcodeContainer');
    if (!container) return;

    // 生成一个随机的扫码会话ID
    currentQRToken = 'qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 将会话ID存入 localStorage（模拟服务端存储）
    const qrSessions = JSON.parse(localStorage.getItem('qn_qr_sessions') || '{}');
    qrSessions[currentQRToken] = {
        status: 'waiting',
        createdAt: Date.now(),
        email: null
    };
    localStorage.setItem('qn_qr_sessions', JSON.stringify(qrSessions));

    // 生成二维码内容：包含扫码会话ID和网站URL
    const qrData = JSON.stringify({
        type: 'qingning_qr_login',
        sessionId: currentQRToken,
        url: window.location.origin + window.location.pathname,
        timestamp: Date.now()
    });

    // 使用简单的二维码生成（基于 canvas）
    container.innerHTML = '';
    drawSimpleQR(container, qrData, 180);
}

// 简单的二维码绘制（基于 canvas 的 QR 模式）
function drawSimpleQR(container, text, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 使用一个确定性算法将文本转为二维码图案
    // 实际项目中应使用 qrcode.js 库，这里为了独立运行用简化版
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f172a';

    const cells = 25;
    const cellSize = size / cells;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }

    // 绘制定位图案（三个角）
    drawPositionPattern(ctx, 1, 1, cellSize);
    drawPositionPattern(ctx, cells - 8, 1, cellSize);
    drawPositionPattern(ctx, 1, cells - 8, cellSize);

    // 绘制数据图案
    for (let row = 0; row < cells; row++) {
        for (let col = 0; col < cells; col++) {
            // 跳过定位图案区域
            if ((row < 9 && col < 9) || (row < 9 && col > cells - 10) || (row > cells - 10 && col < 9)) continue;
            const val = Math.abs((hash + row * 31 + col * 17) % 100);
            if (val < 50) {
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
    }

    container.appendChild(canvas);
}

function drawPositionPattern(ctx, x, y, cellSize) {
    // 外框 7x7
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
                ctx.fillRect((x + j) * cellSize, (y + i) * cellSize, cellSize, cellSize);
            }
        }
    }
}

// 检查二维码是否被扫描（轮询 localStorage）
function checkQRScanned() {
    if (!currentQRToken) return;

    const qrSessions = JSON.parse(localStorage.getItem('qn_qr_sessions') || '{}');
    const session = qrSessions[currentQRToken];

    if (!session) return;

    if (session.status === 'scanned' && session.email) {
        // 扫码成功，执行登录
        stopQRCheck();
        showMessage('qrMessage', '扫码成功！正在登录...', false);

        saveLoginState(session.email);
        localStorage.setItem('qn_login_method', 'qr');

        // 初始化用户档案
        try {
            var profileKey = 'qn_profile_' + session.email;
            if (!localStorage.getItem(profileKey)) {
                localStorage.setItem(profileKey, JSON.stringify({
                    email: session.email,
                    username: session.email.split('@')[0],
                    bio: '',
                    avatar_url: '',
                    banner_url: '',
                    verified: false,
                    role: session.email === ADMIN_EMAIL ? 'admin' : 'user',
                    favorites_public: false,
                    created_at: new Date().toISOString()
                }));
            }
        } catch (pe) { console.warn('Profile init:', pe); }

        // 清理会话
        delete qrSessions[currentQRToken];
        localStorage.setItem('qn_qr_sessions', JSON.stringify(qrSessions));

        // 跳转
        setTimeout(function() {
            if (session.email === ADMIN_EMAIL) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);
    }
}

// 页面加载时异步验证Session
checkLoginState();
