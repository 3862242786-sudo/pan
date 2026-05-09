// ===== Supabase 配置 =====
const SUPABASE_URL = 'https://jbmymvpydycurynmxgbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibXltdnB5ZHljdXJ5bm14Z2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDA0NjYsImV4cCI6MjA5MzkxNjQ2Nn0.FpL-rWQHriqyuDA3l1vEiovZVcGhUbpOVCUS_X5h33E';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

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
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('Invalid login') || error.message.includes('Invalid credentials')) {
                showMessage('loginMessage', '邮箱或密码错误！', true);
            } else if (error.message.includes('Email not confirmed')) {
                showMessage('loginMessage', '邮箱未确认，正在尝试重新发送确认邮件...', false);
                // 尝试重新发送确认邮件
                await supabaseClient.auth.resend({
                    type: 'signup',
                    email: email,
                });
            } else {
                showMessage('loginMessage', '登录失败：' + error.message, true);
            }
            return;
        }

        showMessage('loginMessage', '登录成功！正在跳转...');
        saveLoginState(email);

        // 所有用户都跳转到首页
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } catch (err) {
        showMessage('loginMessage', '登录失败，请稍后重试', true);
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
    await supabaseClient.auth.signOut();
    localStorage.removeItem('qn_logged_in');
    localStorage.removeItem('qn_user_email');
    localStorage.removeItem('qn_is_admin');
    sessionStorage.removeItem('qn_logged_in');
    sessionStorage.removeItem('qn_user_email');
    sessionStorage.removeItem('qn_is_admin');
    window.location.href = 'auth.html';
}

// 页面加载时不再自动跳转
// checkAuth();
