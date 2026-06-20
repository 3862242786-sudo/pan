/**
 * 青柠架构 - 认证模块 (QNA-Auth)
 * 统一处理登录、注册、权限、激活码
 * v1.5: 新增 store 同步、token 登录、跨标签页同步
 */

QNA.module.define('auth', function(QNA) {
    'use strict';

    var Utils = QNA.utils;
    var EventBus = QNA.event;

    // v1.5: 获取 store 模块（可能未加载）
    function getStore() {
        try { return QNA.module.use('store'); } catch(e) { return null; }
    }

    // Supabase 客户端（懒加载）
    var supabaseClient = null;
    function getSupabase() {
        if (!supabaseClient && window.supabase) {
            supabaseClient = window.supabase.createClient(
                QNA.config.supabaseUrl,
                QNA.config.supabaseKey
            );
        }
        return supabaseClient;
    }

    // v1.5: 同步用户状态到 store
    function syncToStore() {
        var store = getStore();
        if (!store) return;
        var user = Auth.getUser();
        store.set('user', user);
        store.set('auth', { loggedIn: user.loggedIn, isAdmin: user.isAdmin });
    }

    // ============ 用户状态 ============
    var Auth = {
        // 获取当前用户
        getUser: function() {
            return {
                loggedIn: localStorage.getItem('qn_logged_in') === 'true',
                isAdmin: localStorage.getItem('qn_is_admin') === 'true',
                email: localStorage.getItem('qn_user_email') || '',
                name: localStorage.getItem('qn_user_name') || '',
                avatar: localStorage.getItem('qn_user_avatar') || ''
            };
        },

        // 检查是否登录
        isLoggedIn: function() {
            return localStorage.getItem('qn_logged_in') === 'true';
        },

        // 检查是否站长
        isAdmin: function() {
            return localStorage.getItem('qn_is_admin') === 'true';
        },

        // 检查激活码
        checkActivation: function(code) {
            return code && code.startsWith('xt');
        },

        // 登录
        login: async function(email, password) {
            var supabase = getSupabase();
            if (!supabase) return { success: false, error: 'Supabase 未加载' };

            try {
                var { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });
                if (error) return { success: false, error: error.message };

                var isAdmin = (email === QNA.config.adminEmail);
                localStorage.setItem('qn_logged_in', 'true');
                localStorage.setItem('qn_is_admin', isAdmin ? 'true' : 'false');
                localStorage.setItem('qn_user_email', email);
                localStorage.setItem('qn_user_name', data.user.user_metadata?.name || email.split('@')[0]);

                // 生成档案室密钥（如果是站长）
                if (isAdmin) {
                    localStorage.setItem('qn_archive_key', 'QINGNING_ADMIN_' + Date.now());
                }

                EventBus.emit('auth:login', { email: email, isAdmin: isAdmin });
                // v1.5: 同步到 store + 跨标签页
                syncToStore();
                return { success: true, user: data.user };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        // 注册
        register: async function(email, password, name) {
            var supabase = getSupabase();
            if (!supabase) return { success: false, error: 'Supabase 未加载' };

            try {
                var { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: { data: { name: name || email.split('@')[0] } }
                });
                if (error) return { success: false, error: error.message };
                return { success: true, user: data.user };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        // 找回密码
        resetPassword: async function(email) {
            var supabase = getSupabase();
            if (!supabase) return { success: false, error: 'Supabase 未加载' };

            try {
                var { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/auth.html'
                });
                if (error) return { success: false, error: error.message };
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        // 登出
        logout: async function() {
            var supabase = getSupabase();
            if (supabase) {
                try { await supabase.auth.signOut(); } catch(e) {}
            }

            // 清除所有登录状态
            var keys = ['qn_logged_in', 'qn_is_admin', 'qn_user_email', 'qn_user_name',
                        'qn_user_avatar', 'qn_archive_key', 'qn_os_activation_code'];
            keys.forEach(function(k) { localStorage.removeItem(k); });

            EventBus.emit('auth:logout', {});
            // v1.5: 同步到 store + 跨标签页
            syncToStore();
        },

        // 更新导航栏用户状态
        updateNav: function() {
            var user = this.getUser();
            var loginLink = document.querySelector('.nav-login a');
            var loginLi = document.querySelector('.nav-login');

            if (!loginLink || !loginLi) return;

            if (user.loggedIn) {
                loginLink.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' + (user.name || '用户');
                loginLink.href = 'profile.html';

                // 如果是站长，添加管理入口
                if (user.isAdmin && !document.querySelector('.nav-admin')) {
                    var adminLi = document.createElement('li');
                    adminLi.className = 'nav-admin';
                    adminLi.innerHTML = '<a href="admin.html"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>管理</a>';
                    loginLi.parentNode.insertBefore(adminLi, loginLi.nextSibling);
                }
            } else {
                loginLink.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>登录';
                loginLink.href = 'auth.html';

                // 移除管理入口
                var adminLi = document.querySelector('.nav-admin');
                if (adminLi) adminLi.remove();
            }
        },

        // v1.5: Token 登录（验证 Supabase active_tokens.json）
        loginByToken: async function(token) {
            if (!token) return { success: false, error: '缺少 token' };

            try {
                var tokensUrl = QNA.config.supabaseUrl + '/storage/v1/object/public/files/active_tokens.json';
                var resp = await fetch(tokensUrl + '?t=' + Date.now());
                if (!resp.ok) return { success: false, error: '无法获取 token 列表' };

                var tokens = await resp.json();
                var tokenEntry = null;

                // 查找匹配的 token
                if (Array.isArray(tokens)) {
                    tokenEntry = tokens.find(function(t) {
                        return t.token === token && t.active === true;
                    });
                } else if (tokens.tokens && Array.isArray(tokens.tokens)) {
                    tokenEntry = tokens.tokens.find(function(t) {
                        return t.token === token && t.active === true;
                    });
                }

                if (!tokenEntry) {
                    return { success: false, error: 'Token 无效或已过期' };
                }

                // 模拟登录状态
                var email = tokenEntry.email || '';
                var isAdmin = (email === QNA.config.adminEmail);
                var name = tokenEntry.name || email.split('@')[0] || 'Token用户';

                localStorage.setItem('qn_logged_in', 'true');
                localStorage.setItem('qn_is_admin', isAdmin ? 'true' : 'false');
                localStorage.setItem('qn_user_email', email);
                localStorage.setItem('qn_user_name', name);
                localStorage.setItem('qn_user_avatar', tokenEntry.avatar || '');

                if (isAdmin) {
                    localStorage.setItem('qn_archive_key', 'QINGNING_ADMIN_' + Date.now());
                }

                EventBus.emit('auth:login', { email: email, isAdmin: isAdmin, viaToken: true });
                // v1.5: 同步到 store + 跨标签页
                syncToStore();

                return { success: true, user: { email: email, name: name, isAdmin: isAdmin } };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        // 权限守卫
        guard: function(options) {
            options = options || {};
            var user = this.getUser();

            if (options.requireLogin && !user.loggedIn) {
                if (options.redirect !== false) {
                    window.location.href = 'auth.html?redirect=' + encodeURIComponent(window.location.href);
                }
                return false;
            }

            if (options.requireAdmin && !user.isAdmin) {
                alert('需要站长权限');
                if (options.redirect !== false) {
                    window.location.href = 'index.html';
                }
                return false;
            }

            return true;
        }
    };

    // 监听登录状态变化，自动更新导航
    EventBus.on('auth:login', function() { Auth.updateNav(); });
    EventBus.on('auth:logout', function() { Auth.updateNav(); });

    // DOM就绪后更新导航
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { Auth.updateNav(); });
    } else {
        Auth.updateNav();
    }

    return Auth;
});
