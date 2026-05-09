// ===== Supabase 配置 =====
const SUPABASE_URL = 'https://jbmymvpydycurynmxgbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibXltdnB5ZHljdXJ5bm14Z2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDA0NjYsImV4cCI6MjA5MzkxNjQ2Nn0.FpL-rWQHriqyuDA3l1vEiovZVcGhUbpOVCUS_X5h33E';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 站长邮箱（管理员）
const ADMIN_EMAIL = 'admin@qingningpan.com';

// ===== 页面切换 =====
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const tabs = document.querySelectorAll('.auth-tab');
    const header = document.querySelector('.auth-header p');

    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'login') {
        loginForm.style.display = 'block';
        tabs[0].classList.add('active');
        header.textContent = '登录你的账户';
    } else if (tab === 'register') {
        registerForm.style.display = 'block';
        tabs[1].classList.add('active');
        header.textContent = '创建新账户';
    } else if (tab === 'forgot') {
        forgotForm.style.display = 'block';
        tabs.forEach(t => t.classList.remove('active'));
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
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('already registered')) {
                showMessage('registerMessage', '该邮箱已被注册，请直接登录', true);
            } else {
                showMessage('registerMessage', '注册失败：' + error.message, true);
            }
            return;
        }

        // 注册后自动登录
        if (data.user && !data.session) {
            // 需要邮箱确认的情况 - 自动尝试登录
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (loginError) {
                showMessage('registerMessage', '注册成功！但需要邮箱确认，或请直接登录');
                return;
            }

            showMessage('registerMessage', '注册成功！正在跳转...');
            saveLoginState(email);
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } else if (data.session) {
            // 直接获得了session，注册即登录
            showMessage('registerMessage', '注册成功！正在跳转...');
            saveLoginState(email);
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } else {
            showMessage('registerMessage', '注册成功！请使用账号密码登录');
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
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('Invalid login')) {
                showMessage('loginMessage', '邮箱或密码错误！', true);
            } else if (error.message.includes('Email not confirmed')) {
                showMessage('loginMessage', '请先确认邮箱后再登录', true);
            } else {
                showMessage('loginMessage', '登录失败：' + error.message, true);
            }
            return;
        }

        showMessage('loginMessage', '登录成功！正在跳转...');
        saveLoginState(email);

        // 站长跳转到管理后台
        if (email === ADMIN_EMAIL) {
            setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
        } else {
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
    } catch (err) {
        showMessage('loginMessage', '登录失败，请稍后重试', true);
    }
}

// ===== 保存登录状态 =====
function saveLoginState(email) {
    const isAdmin = email === ADMIN_EMAIL;
    const storage = document.getElementById('rememberMe')?.checked ? localStorage : sessionStorage;
    storage.setItem('qn_logged_in', 'true');
    storage.setItem('qn_user_email', email);
    storage.setItem('qn_is_admin', isAdmin ? 'true' : 'false');
}

// ===== 找回密码 =====
function handleForgotPassword() {
    switchTab('forgot');
}

async function handleResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;

    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
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

// ===== 检查登录状态 =====
async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            console.log('用户已登录:', session.user.email);
            // 如果已登录且在auth页面，跳转走
            const currentPath = window.location.pathname;
            if (currentPath.includes('auth.html')) {
                if (session.user.email === ADMIN_EMAIL) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            }
        }
    } catch (err) {
        console.log('未登录');
    }
}

// ===== 退出登录 =====
async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('qn_logged_in');
    localStorage.removeItem('qn_user_email');
    localStorage.removeItem('qn_is_admin');
    sessionStorage.removeItem('qn_logged_in');
    sessionStorage.removeItem('qn_user_email');
    sessionStorage.removeItem('qn_is_admin');
    window.location.href = 'auth.html';
}

// 页面加载时检查
checkAuth();
