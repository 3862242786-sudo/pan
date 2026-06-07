// ===== Supabase 配置 =====
const SUPABASE_URL = 'https://jbmymvpydycurynmxgbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibXltdnB5ZHljdXJ5bm14Z2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDA0NjYsImV4cCI6MjA5MzkxNjQ2Nn0.FpL-rWQHriqyuDA3l1vEiovZVcGhUbpOVCUS_X5h33E';

// CDN 加载保护
if (typeof window.supabase === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = '<div style="text-align:center;padding:80px 20px;font-family:sans-serif;"><div style="font-size:48px;margin-bottom:16px;">⚠️</div><h2 style="color:#1e293b;">加载失败</h2><p style="color:#64748b;margin-top:8px;">无法加载登录组件，请检查网络连接后刷新页面。</p></div>';
    });
} else {
    var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// 站长邮箱（管理员）
const ADMIN_EMAIL = '3862242786@qq.com';

// ===== 页面切换 =====
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const header = document.querySelector('.auth-header p');

    // 隐藏所有表单
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';

    if (tab === 'login') {
        loginForm.style.display = 'block';
        header.textContent = '登录你的账户';
    } else if (tab === 'register') {
        registerForm.style.display = 'block';
        header.textContent = '创建新账户';
    } else if (tab === 'forgot') {
        forgotForm.style.display = 'block';
        header.textContent = '找回密码';
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

    // 从云端检查是否开放注册
    try {
        const { data } = supabaseClient.storage.from('files').getPublicUrl('site_settings.json');
        const resp = await fetch(data.publicUrl + '?t=' + Date.now());
        if (resp.ok) {
            const settings = await resp.json();
            if (settings.allowRegister === 'false') {
                showMessage('registerMessage', '注册功能已关闭，请联系站长', true);
                return;
            }
        }
    } catch (err) {
        // 读取失败时默认允许注册
    }

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

        // 自动创建用户主页数据（如果不存在）
        try {
            const { data: existingProfile } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('id', loginData.user.id)
                .single();
            if (!existingProfile) {
                await supabaseClient.from('profiles').insert({
                    id: loginData.user.id,
                    email: email,
                    username: email.split('@')[0],
                    bio: '',
                    avatar_url: '',
                    bg_url: '',
                    verified: false,
                    role: email === ADMIN_EMAIL ? 'admin' : 'user',
                    favorites_public: false
                });
            }
        } catch (pe) { console.warn('Profile creation:', pe); }

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

        // 确保用户主页数据存在
        try {
            const { data: existingProfile } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .single();
            if (!existingProfile) {
                await supabaseClient.from('profiles').insert({
                    id: data.user.id,
                    email: email,
                    username: email.split('@')[0],
                    bio: '',
                    avatar_url: '',
                    bg_url: '',
                    verified: false,
                    role: email === ADMIN_EMAIL ? 'admin' : 'user',
                    favorites_public: false
                });
            }
        } catch (pe) { console.warn('Profile check:', pe); }

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

// 页面加载时异步验证Session
checkLoginState();
