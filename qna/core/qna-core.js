/**
 * 青柠架构核心 (Qingning Architecture Core)
 * 版本: 1.5.0 (代号: 勇往直前)
 * 所有青柠系网站共享的统一底层框架
 */

(function(global) {
    'use strict';

    // ============ 配置 ============
    var CONFIG = {
        version: '1.5.0',
        codename: '勇往直前',
        name: 'Qingning Architecture',
        supabaseUrl: 'https://qljnyepwofqcrfjwjlhv.supabase.co',
        supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsam55ZXB3b2ZxY3JmandsbGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Mzg0ODUsImV4cCI6MjA2MjIxNDQ4NX0.K4gOwMzc0L3T3qL3IbykC5v1qM8fS6x6RjEeH4u8kXg',
        adminEmail: '3862242786@qq.com',
        cacheDuration: 60000, // 缓存有效期 60秒
        debug: false
    };

    // ============ 工具函数 ============
    var Utils = {
        // 安全的DOM选择
        $: function(selector) { return document.querySelector(selector); },
        $$: function(selector) { return document.querySelectorAll(selector); },

        // 事件委托（性能优化：减少事件监听器数量）
        delegate: function(parent, event, selector, handler) {
            parent.addEventListener(event, function(e) {
                var target = e.target.closest(selector);
                if (target && parent.contains(target)) {
                    handler.call(target, e);
                }
            });
        },

        // 节流
        throttle: function(fn, delay) {
            var last = 0;
            return function() {
                var now = Date.now();
                if (now - last >= delay) {
                    last = now;
                    fn.apply(this, arguments);
                }
            };
        },

        // 防抖
        debounce: function(fn, delay) {
            var timer;
            return function() {
                clearTimeout(timer);
                timer = setTimeout(fn.bind(this, arguments), delay);
            };
        },

        // 格式化文件大小
        formatSize: function(bytes) {
            if (!bytes) return '0 B';
            var k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            var i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // 格式化日期
        formatDate: function(date) {
            if (typeof date === 'string') date = new Date(date);
            return date.toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        },

        // 深拷贝
        deepClone: function(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        // 合并对象
        extend: function(target, source) {
            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    target[key] = source[key];
                }
            }
            return target;
        },

        // 深度合并对象 (v1.5 新增)
        merge: function(target, source) {
            var result = QNA.utils.deepClone(target);
            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
                        result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                        result[key] = QNA.utils.merge(result[key], source[key]);
                    } else {
                        result[key] = source[key];
                    }
                }
            }
            return result;
        },

        // 重试异步操作，带退避策略 (v1.5 新增)
        retry: function(fn, options) {
            options = options || {};
            var maxRetries = options.maxRetries || 3;
            var delay = options.delay || 1000;
            var backoff = options.backoff || 2;
            var retries = 0;

            function attempt() {
                return fn().catch(function(err) {
                    retries++;
                    if (retries >= maxRetries) throw err;
                    var waitTime = delay * Math.pow(backoff, retries - 1);
                    return new Promise(function(resolve) { setTimeout(resolve, waitTime); })
                        .then(attempt);
                });
            }
            return attempt();
        },

        // 生成唯一ID
        uuid: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        },

        // 本地存储封装（带过期时间）
        storage: {
            set: function(key, value, ttl) {
                var item = { value: value, time: Date.now() };
                if (ttl) item.ttl = ttl;
                localStorage.setItem('qna_' + key, JSON.stringify(item));
            },
            get: function(key) {
                var item = localStorage.getItem('qna_' + key);
                if (!item) return null;
                try {
                    item = JSON.parse(item);
                    if (item.ttl && Date.now() - item.time > item.ttl) {
                        localStorage.removeItem('qna_' + key);
                        return null;
                    }
                    return item.value;
                } catch(e) { return null; }
            },
            remove: function(key) {
                localStorage.removeItem('qna_' + key);
            },
            clear: function() {
                var keys = Object.keys(localStorage);
                keys.forEach(function(k) {
                    if (k.startsWith('qna_')) localStorage.removeItem(k);
                });
            }
        },

        // 日志（生产环境可关闭）
        log: function() {
            if (CONFIG.debug) console.log.apply(console, ['[QNA]'].concat(Array.prototype.slice.call(arguments)));
        },
        error: function() {
            if (CONFIG.debug) console.error.apply(console, ['[QNA]'].concat(Array.prototype.slice.call(arguments)));
        }
    };

    // ============ 缓存系统 ============
    var Cache = {
        _data: {},
        _maxSize: 100,

        get: function(key) {
            var item = this._data[key];
            if (!item) return null;
            if (item.expire && Date.now() > item.expire) {
                delete this._data[key];
                return null;
            }
            item.hits = (item.hits || 0) + 1;
            // v1.5: 返回包含 etag 的完整缓存项
            return { value: item.value, etag: item.etag || null };
        },

        // 获取纯值（向后兼容）
        getValue: function(key) {
            var result = this.get(key);
            return result ? result.value : null;
        },

        set: function(key, value, ttl, etag) {
            // LRU清理
            var keys = Object.keys(this._data);
            if (keys.length >= this._maxSize) {
                var minHits = Infinity, minKey;
                keys.forEach(function(k) {
                    if (this._data[k].hits < minHits) {
                        minHits = this._data[k].hits;
                        minKey = k;
                    }
                }.bind(this));
                delete this._data[minKey];
            }

            this._data[key] = {
                value: value,
                expire: ttl ? Date.now() + ttl : null,
                hits: 0,
                time: Date.now(),
                etag: etag || null  // v1.5: ETag 支持
            };
        },

        clear: function() {
            this._data = {};
        },

        remove: function(key) {
            delete this._data[key];
        },

        // v1.5: 检查 ETag 是否变化
        checkETag: function(key, newETag) {
            var item = this._data[key];
            if (!item || !item.etag) return false; // 无旧 ETag，视为已变化
            return item.etag === newETag; // 返回 true 表示未变化
        }
    };

    // ============ 事件总线（组件间通信） ============
    var EventBus = {
        _events: {},

        on: function(event, handler) {
            if (!this._events[event]) this._events[event] = [];
            this._events[event].push(handler);
        },

        off: function(event, handler) {
            if (!this._events[event]) return;
            var idx = this._events[event].indexOf(handler);
            if (idx > -1) this._events[event].splice(idx, 1);
        },

        emit: function(event, data) {
            if (!this._events[event]) return;
            this._events[event].forEach(function(handler) {
                try { handler(data); } catch(e) {}
            });
        },

        once: function(event, handler) {
            var self = this;
            var wrapper = function(data) {
                self.off(event, wrapper);
                handler(data);
            };
            this.on(event, wrapper);
        },

        // v1.5: 等待事件触发（返回 Promise）
        waitFor: function(event, timeout) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var timer;
                if (timeout) {
                    timer = setTimeout(function() {
                        self.off(event, handler);
                        reject(new Error('waitFor timeout: ' + event));
                    }, timeout);
                }
                var handler = function(data) {
                    if (timer) clearTimeout(timer);
                    self.off(event, handler);
                    resolve(data);
                };
                self.on(event, handler);
            });
        }
    };

    // ============ 模块系统 ============
    var Modules = {};
    var Module = {
        define: function(name, factory) {
            if (Modules[name]) {
                Utils.error('模块已存在:', name);
                return;
            }
            Modules[name] = { factory: factory, instance: null };
        },

        use: function(name) {
            var mod = Modules[name];
            if (!mod) {
                Utils.error('模块不存在:', name);
                return null;
            }
            if (!mod.instance) {
                mod.instance = mod.factory(QNA);
            }
            return mod.instance;
        },

        list: function() {
            return Object.keys(Modules);
        }
    };

    // ============ 初始化 ============
    function init() {
        Utils.log('初始化中...', CONFIG.version);

        // 检测环境
        var ua = navigator.userAgent;
        var isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
        var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        Utils.storage.set('env', {
            isMobile: isMobile,
            isDark: isDark,
            language: navigator.language,
            screen: { width: screen.width, height: screen.height }
        });

        // 发布初始化完成事件
        EventBus.emit('qna:ready', { config: CONFIG, utils: Utils });
    }

    // ============ 暴露全局对象 ============
    var QNA = {
        version: CONFIG.version,
        config: CONFIG,
        utils: Utils,
        cache: Cache,
        event: EventBus,
        module: Module,
        init: init
    };

    global.QNA = QNA;

    // DOM就绪后自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
