// ===== Supabase 配置 =====
const SUPABASE_URL = 'https://jbmymvpydycurynmxgbr.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== 页面切换 =====
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const tabs = document.querySelectorAll('.auth-tab');
    const header = document.querySelector('.auth-header p');

    // 隐藏所有表单
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';

    // 重置标签状态
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
            showMessage('registerMessage', error.message, true);
            return;
        }

        showMessage('registerMessage', '注册成功！请检查邮箱确认账户（可能需要配置邮箱服务）');
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
            showMessage('loginMessage', '登录失败：' + error.message, true);
            return;
        }

        // 登录成功
        showMessage('loginMessage', '登录成功！正在跳转...');

        // 保存登录状态
        if (document.getElementById('rememberMe').checked) {
            localStorage.setItem('qn_logged_in', 'true');
            localStorage.setItem('qn_user_email', email);
        } else {
            sessionStorage.setItem('qn_logged_in', 'true');
            sessionStorage.setItem('qn_user_email', email);
        }

        // 跳转到首页
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (err) {
        showMessage('loginMessage', '登录失败，请稍后重试', true);
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
            // 已登录，可以更新UI
            console.log('用户已登录:', session.user.email);
        }
    } catch (err) {
        console.log('未登录');
    }
}

// 页面加载时检查
checkAuth();
