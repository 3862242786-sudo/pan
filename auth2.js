// ===== Supabase 配置 =====
const SUPABASE_URL = 'https://jbmymvpydycurynmxgbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibXltdnB5ZHljdXJ5bm14Z2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDA0NjYsImV4cCI6MjA5MzkxNjQ2Nn0.FpL-rWQHriqyuDA3l1vEiovZVcGhUbpOVCUS_X5h33E';

// CDN 加载保护（立即初始化 + 超时重试）
// 注意：必须在脚本加载时同步初始化，否则页面内联脚本（导航栏登录状态等）
// 会在 DOMContentLoaded 之前访问 supabaseClient，导致登录状态永远不更新。
var supabaseClient = null;

function initSupabase(retries) {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else if (retries > 0) {
        // CDN 可能还在加载，延迟后重试
        setTimeout(function() { initSupabase(retries - 1); }, 500);
    } else {
        // 所有重试都失败，显示错误提示（不替换整个页面）
        var showInitError = function() {
            var errDiv = document.createElement('div');
            errDiv.style.cssText = 'text-align:center;padding:80px 20px;font-family:sans-serif;';
            errDiv.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">&#9888;&#65039;</div>' +
                '<h2 style="color:#1e293b;">加载失败</h2>' +
                '<p style="color:#64748b;margin-top:8px;">无法加载登录组件，请检查网络连接后刷新页面。</p>';
            if (document.body) document.body.prepend(errDiv);
        };
        if (document.body) {
            showInitError();
        } else {
            document.addEventListener('DOMContentLoaded', showInitError);
        }
    }
}

// 立即初始化（此时 CDN 脚本已同步加载完成）
initSupabase(5);

// 站长邮箱（管理员）
const ADMIN_EMAIL = '3862242786@qq.com';

// ===== 本地账户兜底（Supabase 不可达时使用）=====
// 账户与令牌保存在本机 localStorage，仅同一浏览器有效，不做跨设备同步。
var LOCAL_ACCOUNTS_KEY = 'qn_local_accounts';
var LOCAL_SESSION_KEY = 'qn_local_session';
var LOCAL_TOKEN_SECRET = 'QINGNING_TOKEN_V2';

function qnNormalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function qnLocalHash(password, salt) {
    var str = String(salt) + '|' + String(password) + '|qn-local';
    var h1 = 2166136261;
    for (var i = 0; i < str.length; i++) {
        h1 = ((h1 ^ str.charCodeAt(i)) * 16777619) >>> 0;
    }
    var h2 = 5381;
    for (var j = str.length - 1; j >= 0; j--) {
        h2 = ((h2 * 33) ^ str.charCodeAt(j)) >>> 0;
    }
    return h1.toString(36) + '-' + h2.toString(36);
}

function qnReadLocalAccounts() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '{}') || {};
    } catch (e) {
        return {};
    }
}

function qnWriteLocalAccounts(accounts) {
    try { localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts)); } catch (e) {}
}

function qnRegisterLocal(email, password) {
    email = qnNormalizeEmail(email);
    if (!email || !password) return { ok: false, reason: '请输入邮箱和密码！' };
    if (password.length < 6) return { ok: false, reason: '密码长度至少为6位！' };
    var accounts = qnReadLocalAccounts();
    if (accounts[email]) return { ok: false, reason: '该邮箱已在本机注册，请直接登录' };
    var salt = 'qn' + Date.now() + Math.random().toString(36).slice(2, 8);
    accounts[email] = {
        salt: salt,
        hash: qnLocalHash(password, salt),
        username: email.split('@')[0],
        createdAt: Date.now()
    };
    qnWriteLocalAccounts(accounts);
    return { ok: true };
}

function qnLoginLocal(email, password) {
    email = qnNormalizeEmail(email);
    var accounts = qnReadLocalAccounts();
    var acc = accounts[email];
    if (!acc) return false;
    return acc.hash === qnLocalHash(password, acc.salt);
}

function qnSaveLocalSession(email) {
    try {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ email: qnNormalizeEmail(email), loginAt: Date.now() }));
    } catch (e) {}
}

function qnGetLocalSession() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || 'null');
    } catch (e) {
        return null;
    }
}

function qnClearLocalSession() {
    try { localStorage.removeItem(LOCAL_SESSION_KEY); } catch (e) {}
}

function qnIsNetworkError(err) {
    if (!err) return false;
    var msg = String(err.message || err.name || err.error_description || err || '');
    if (err.name === 'TypeError') return true;
    return /network|fetch|timeout|timed ?out|failed to|load failed|abort|econn|unreachable|connection/i.test(msg);
}

// 生成当日令牌（与令牌 APP 的算法一致：邮箱 + 日期 + 版本 + 密钥）
function qnGenerateLocalToken(email, version) {
    var now = new Date();
    var dateStr = '' + now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    var seed = qnNormalizeEmail(email) + dateStr + (version || 0) + LOCAL_TOKEN_SECRET;
    var primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
    var hash = 0;
    for (var i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i) * primes[i % primes.length]) % 10000000000;
    }
    return hash.toString().padStart(10, '0');
}

// 令牌对应本机哪个账户（只匹配本机已注册账户）
function qnFindLocalTokenEmail(token) {
    var accounts = qnReadLocalAccounts();
    for (var email in accounts) {
        if (qnGenerateLocalToken(email, 0) === token) return email;
    }
    return null;
}

// 统一的登录完成处理（云端 / 本机共用）
async function finishLogin(email, isLocal, method) {
    saveLoginState(email, isLocal);
    if (isLocal) {
        qnSaveLocalSession(email);
    } else {
        qnClearLocalSession();
    }
    if (method) localStorage.setItem('qn_login_method', method);

    // 初始化用户档案
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
        setTimeout(function() { window.location.href = 'admin.html'; }, 1000);
    } else {
        setTimeout(function() { window.location.href = 'index.html'; }, 1000);
    }
}

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

    var cloudError = null;
    var cloudRegistered = false;
    try {
        if (!supabaseClient) throw new Error('Failed to fetch');
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });
        if (error) {
            cloudError = error;
        } else {
            cloudRegistered = true;
        }
    } catch (err) {
        cloudError = err;
    }

    if (!cloudRegistered) {
        // 云端不可达 → 使用本机账户兜底
        if (qnIsNetworkError(cloudError) || !supabaseClient) {
            var localReg = qnRegisterLocal(email, password);
            if (!localReg.ok) {
                showMessage('registerMessage', localReg.reason, true);
                return;
            }
            showMessage('registerMessage', '云端暂不可用，已在本机注册并登录', false);
            await finishLogin(qnNormalizeEmail(email), true);
            return;
        }

        var errMsg = String((cloudError && cloudError.message) || '');
        if (errMsg.indexOf('already registered') !== -1 || errMsg.indexOf('already been registered') !== -1) {
            showMessage('registerMessage', '该邮箱已被注册，请直接登录', true);
        } else {
            showMessage('registerMessage', '注册失败：' + errMsg, true);
        }
        return;
    }

    // 云端注册成功，自动登录
    showMessage('registerMessage', '注册成功，正在自动登录...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (loginError) {
            showMessage('registerMessage', '注册成功！请返回登录页面手动登录', false);
            setTimeout(() => { switchTab('login'); }, 2000);
            return;
        }

        showMessage('registerMessage', '登录成功！正在跳转...');
        await finishLogin(email, false);
    } catch (err2) {
        showMessage('registerMessage', '注册成功！请返回登录页面手动登录', false);
        setTimeout(() => { switchTab('login'); }, 2000);
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

    var cloudError = null;
    var cloudSession = null;
    try {
        if (!supabaseClient) throw new Error('Failed to fetch');
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) {
            cloudError = error;
        } else {
            cloudSession = data;
        }
    } catch (err) {
        cloudError = err;
    }

    if (cloudSession) {
        showMessage('loginMessage', '登录成功！正在跳转...');
        await finishLogin(email, false);
        return;
    }

    // 云端不可达 → 本机账户兜底
    if (qnIsNetworkError(cloudError) || !supabaseClient) {
        if (qnLoginLocal(email, password)) {
            showMessage('loginMessage', '云端暂不可用，已使用本机账户登录', false);
            await finishLogin(qnNormalizeEmail(email), true);
        } else {
            showMessage('loginMessage', '云端暂不可用；本机没有该账户，请先注册本机账户或稍后重试', true);
        }
        return;
    }

    // 云端业务错误
    var errMsg = String((cloudError && cloudError.message) || '');
    if (errMsg.indexOf('Invalid login') !== -1 || errMsg.indexOf('Invalid credentials') !== -1) {
        showMessage('loginMessage', '邮箱或密码错误！', true);
    } else if (errMsg.indexOf('Email not confirmed') !== -1) {
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
    } else if (errMsg.indexOf('Too many requests') !== -1) {
        showMessage('loginMessage', '请求过于频繁，请稍后再试', true);
    } else {
        showMessage('loginMessage', '登录失败：' + errMsg, true);
    }
}

// ===== 保存登录状态 =====
function saveLoginState(email, isLocal) {
    const isAdmin = email === ADMIN_EMAIL;
    localStorage.setItem('qn_logged_in', 'true');
    localStorage.setItem('qn_user_email', email);
    localStorage.setItem('qn_is_admin', isAdmin ? 'true' : 'false');
    localStorage.setItem('qn_login_source', isLocal ? 'local' : 'cloud');
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
    localStorage.removeItem('qn_login_source');
    qnClearLocalSession();
    sessionStorage.removeItem('qn_logged_in');
    sessionStorage.removeItem('qn_user_email');
    sessionStorage.removeItem('qn_is_admin');
    window.location.href = 'auth.html';
}

// ===== 验证登录状态（异步检查Session，支持本机离线会话） =====
async function checkLoginState() {
    var localSession = qnGetLocalSession();
    try {
        if (!supabaseClient) throw new Error('offline');
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            if (localSession && localSession.email) {
                return true;
            }
            // Session 已过期且无本机会话，清除本地状态
            localStorage.removeItem('qn_logged_in');
            localStorage.removeItem('qn_user_email');
            localStorage.removeItem('qn_is_admin');
            localStorage.removeItem('qn_login_source');
            return false;
        }
        return true;
    } catch (e) {
        // 云端不可达时，只要存在本机会话就视为已登录
        return !!(localSession && localSession.email);
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

    // 1. 本机账户的当日令牌（云端不可达时也能登录）
    var localEmail = qnFindLocalTokenEmail(token);
    if (localEmail) {
        showMessage('tokenMessage', '令牌验证成功（本机账户）！正在登录...', false);
        await finishLogin(localEmail, true, 'token');
        return;
    }

    try {
        // 2. 再检查云端禁用列表
        const disabledTokens = await loadDisabledTokens();
        if (disabledTokens.includes(token)) {
            showMessage('tokenMessage', '登录失败，此令牌已失效', true);
            return;
        }

        // 3. 从 Supabase 下载活跃令牌列表验证
        const validUser = await validateTokenFromCloud(token);

        if (!validUser) {
            showMessage('tokenMessage', '登录失败，此令牌已失效', true);
            return;
        }

        // 4. 令牌有效，执行登录
        showMessage('tokenMessage', '令牌验证成功！正在登录...', false);
        await finishLogin(validUser.email, false, 'token');
    } catch (err) {
        console.error('Token login error:', err);
        showMessage('tokenMessage', '登录失败，请稍后重试', true);
    }
}

// 从云端验证令牌（APP上传的令牌列表）
async function validateTokenFromCloud(token) {
    try {
        const { data, error } = await supabaseClient.storage
            .from('files')
            .download('active_tokens.json');

        if (error || !data) return null;

        const text = await data.text();
        const obj = JSON.parse(text);
        const tokens = obj.tokens || [];

        // 查找匹配的令牌
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.token === token) {
                // 检查是否过期
                if (t.expires && Date.now() > t.expires) {
                    return null; // 已过期
                }
                return { email: t.email };
            }
        }

        return null;
    } catch (e) {
        console.error('Cloud token validation error:', e);
        return null;
    }
}

// 加载被禁用的令牌列表（从云端）
async function loadDisabledTokens() {
    try {
        const { data, error } = await supabaseClient.storage
            .from('files')
            .download('disabled_tokens.json');
        if (error || !data) return [];
        const text = await data.text();
        const obj = JSON.parse(text);
        return obj.tokens || [];
    } catch (e) {
        return [];
    }
}

// ===== 页面加载时异步验证Session =====
checkLoginState();
let qrCheckInterval = null;
let currentQRSessionId = null;

function startQRLogin() {
    generateQRCode();
    // 每3秒从 Supabase 检查是否被扫描
    qrCheckInterval = setInterval(checkQRScannedFromCloud, 3000);
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

async function generateQRCode() {
    const container = document.getElementById('qrcodeContainer');
    if (!container) return;

    // 生成唯一的会话ID
    currentQRSessionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 将会话写入 Supabase（状态：等待扫描）
    try {
        let sessions = {};
        try {
            const { data } = await supabaseClient.storage.from('files').download('qr_sessions.json');
            if (data) {
                const text = await data.text();
                sessions = JSON.parse(text);
            }
        } catch (e) {}

        // 清理超过5分钟的旧会话
        const now = Date.now();
        for (const key in sessions) {
            if (now - (sessions[key].createdAt || 0) > 300000) {
                delete sessions[key];
            }
        }

        sessions[currentQRSessionId] = {
            status: 'waiting',
            createdAt: now,
            email: null
        };

        await supabaseClient.storage
            .from('files')
            .upload('qr_sessions.json', JSON.stringify(sessions), {
                cacheControl: '5',
                upsert: true,
                contentType: 'application/json'
            });
    } catch (e) {
        console.error('Failed to create QR session:', e);
    }

    // 生成二维码
    const qrData = JSON.stringify({
        type: 'qingning_qr_login',
        sessionId: currentQRSessionId,
        timestamp: Date.now()
    });

    container.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(container, {
            text: qrData,
            width: 180,
            height: 180,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } else {
        container.innerHTML = '<div style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:12px;text-align:center;padding:10px;">二维码加载失败<br>请刷新页面</div>';
    }
}

// 从 Supabase 检查扫码状态
async function checkQRScannedFromCloud() {
    if (!currentQRSessionId) return;

    try {
        const { data, error } = await supabaseClient.storage
            .from('files')
            .download('qr_sessions.json');

        if (error || !data) return;

        const text = await data.text();
        const sessions = JSON.parse(text);
        const session = sessions[currentQRSessionId];

        if (session && session.status === 'scanned' && session.email) {
            // 扫码成功，执行登录
            stopQRCheck();
            showMessage('qrMessage', '扫码成功！正在登录...', false);

            saveLoginState(session.email, false);
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
            delete sessions[currentQRSessionId];
            try {
                await supabaseClient.storage
                    .from('files')
                    .upload('qr_sessions.json', JSON.stringify(sessions), {
                        cacheControl: '5',
                        upsert: true,
                        contentType: 'application/json'
                    });
            } catch (e) {}

            // 跳转
            setTimeout(function() {
                if (session.email === ADMIN_EMAIL) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1000);
        }
    } catch (e) {
        // 静默失败，下次轮询重试
    }
}

// 页面加载时异步验证Session
checkLoginState();
