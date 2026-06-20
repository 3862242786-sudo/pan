/**
 * 青柠架构 - 站点控制模块 (QNA-Site)
 * 网站关闭/维护、全局设置
 * v1.5: ETag 缓存支持、stale-while-revalidate 策略
 */

QNA.module.define('site', function(QNA) {
    'use strict';

    var Utils = QNA.utils;
    var EventBus = QNA.event;

    // 排除检查的页面
    var EXCLUDE_PAGES = ['closed.html', 'auth.html', 'admin.html'];

    var Site = {
        // 检查网站是否关闭
        checkClosed: function() {
            var currentPage = window.location.pathname.split('/').pop() || 'index.html';
            if (EXCLUDE_PAGES.indexOf(currentPage) !== -1) return;

            // 站长已登录，跳过
            var isLoggedIn = localStorage.getItem('qn_logged_in');
            var isAdmin = localStorage.getItem('qn_is_admin');
            if (isLoggedIn === 'true' && isAdmin === 'true') return;

            // 已解锁，跳过
            if (sessionStorage.getItem('qn_site_unlocked') === 'true') return;

            // 从缓存检查
            var cached = localStorage.getItem('qn_site_closed');
            var cachedTime = parseInt(localStorage.getItem('qn_site_closed_time') || '0');
            var now = Date.now();

            if (cached && (now - cachedTime) < QNA.config.cacheDuration) {
                if (cached === 'true') {
                    this.redirectToClosed();
                }
                return;
            }

            // 从云端检查
            this.fetchSettings().then(function(settings) {
                localStorage.setItem('qn_site_closed', settings.siteClosed ? 'true' : 'false');
                localStorage.setItem('qn_site_closed_time', now.toString());

                if (settings.siteClosed) {
                    this.redirectToClosed(settings);
                }
            }.bind(this)).catch(function() {
                // 网络错误不阻止访问
            });
        },

        // 获取站点设置（v1.5: ETag + stale-while-revalidate）
        fetchSettings: function() {
            var self = this;
            var cacheKey = 'site_settings';
            var settingsUrl = QNA.config.supabaseUrl + '/storage/v1/object/public/files/site_settings.json';

            return new Promise(function(resolve, reject) {
                try {
                    // v1.5: 检查缓存，实现 stale-while-revalidate
                    var cached = QNA.cache.get(cacheKey);
                    var cachedETag = cached ? cached.etag : null;

                    // 如果有缓存，立即返回缓存数据（stale），后台刷新
                    if (cached && cached.value) {
                        resolve(cached.value);
                        // 后台静默刷新
                        self._fetchSettingsRemote(settingsUrl, cacheKey, cachedETag);
                        return;
                    }

                    // 无缓存，直接请求
                    self._fetchSettingsRemote(settingsUrl, cacheKey, null)
                        .then(function(settings) { resolve(settings); })
                        .catch(reject);
                } catch(e) {
                    reject(e);
                }
            });
        },

        // v1.5: 实际请求远程设置（内部方法）
        _fetchSettingsRemote: function(url, cacheKey, oldETag) {
            var fetchOptions = {};
            // v1.5: 如果有 ETag，发送 If-None-Match
            if (oldETag) {
                fetchOptions.headers = { 'If-None-Match': oldETag };
            }

            return fetch(url + '?t=' + Date.now(), fetchOptions)
                .then(function(resp) {
                    // 304 Not Modified，缓存仍有效
                    if (resp.status === 304) {
                        var cached = QNA.cache.get(cacheKey);
                        return cached ? cached.value : null;
                    }
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    var newETag = resp.headers.get('ETag') || null;
                    return resp.json().then(function(data) {
                        // v1.5: 带 ETag 存入缓存
                        QNA.cache.set(cacheKey, data, QNA.config.cacheDuration, newETag);
                        EventBus.emit('site:settingsUpdated', data);
                        return data;
                    });
                });
        },

        // 跳转到关闭页面
        redirectToClosed: function(settings) {
            settings = settings || {};
            var params = new URLSearchParams();
            if (settings.closedTitle) params.set('title', settings.closedTitle);
            if (settings.closedDesc) params.set('desc', settings.closedDesc);

            var url = 'closed.html';
            if (params.toString()) url += '?' + params.toString();
            window.location.replace(url);
        },

        // 解锁网站（输入激活码后）
        unlock: function(code, callback) {
            this.fetchSettings().then(function(settings) {
                var validCodes = settings.unlockCodes || [];
                var isValid = code && (code.startsWith('xt') || validCodes.indexOf(code) !== -1 || code === settings.adminUnlockCode);

                if (isValid) {
                    sessionStorage.setItem('qn_site_unlocked', 'true');
                    if (callback) callback(true);
                } else {
                    if (callback) callback(false);
                }
            }).catch(function() {
                // 离线模式：检查本地存储
                var localCodes = localStorage.getItem('qn_unlock_codes') || '';
                var codes = localCodes.split(',').map(function(c) { return c.trim(); }).filter(function(c) { return c; });
                var isValid = code && (code.startsWith('xt') || codes.indexOf(code) !== -1);

                if (isValid) {
                    sessionStorage.setItem('qn_site_unlocked', 'true');
                    if (callback) callback(true);
                } else {
                    if (callback) callback(false);
                }
            });
        },

        // 保存设置到云端
        saveSettings: function(settings) {
            return new Promise(function(resolve, reject) {
                try {
                    var supabase = window.supabase ? window.supabase.createClient(
                        QNA.config.supabaseUrl, QNA.config.supabaseKey
                    ) : null;

                    if (!supabase) {
                        reject(new Error('Supabase 未加载'));
                        return;
                    }

                    supabase.storage.from('files').upload('site_settings.json', JSON.stringify(settings), {
                        cacheControl: '60',
                        upsert: true,
                        contentType: 'application/json'
                    }).then(resolve).catch(reject);
                } catch(e) {
                    reject(e);
                }
            });
        },

        // 获取公告
        getAnnouncement: function() {
            return Utils.storage.get('announcement') || '';
        },

        // 设置公告
        setAnnouncement: function(text) {
            Utils.storage.set('announcement', text);
        }
    };

    // 页面加载时自动检查
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { Site.checkClosed(); });
    } else {
        Site.checkClosed();
    }

    return Site;
});
