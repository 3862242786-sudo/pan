/**
 * 青柠架构加载器 (QNA-Loader)
 * 按需加载核心和模块，减少初始加载量
 * v1.5: 新增自动依赖解析、v1.5 核心模块支持
 */

(function() {
    'use strict';

    var BASE_PATH = document.currentScript ? document.currentScript.src.replace(/qna-loader\.js$/, '') : './qna/';

    // 已加载的模块
    var loaded = {};

    // 模块路径映射（含 v1.5 新增模块）
    var MODULE_MAP = {
        'auth':     'modules/qna-auth.js',
        'site':     'modules/qna-site.js',
        'store':    'core/qna-store.js',
        'monitor':  'core/qna-monitor.js',
        'plugin':   'core/qna-plugin.js',
        'security': 'core/qna-security.js'
    };

    // 模块依赖声明（v1.5 自动依赖解析）
    var DEPENDENCIES = {
        'auth':     ['store'],
        'site':     ['store'],
        'monitor':  [],
        'plugin':   [],
        'security': [],
        'store':    []
    };

    // 加载单个脚本
    function loadScript(src) {
        return new Promise(function(resolve, reject) {
            if (loaded[src]) { resolve(); return; }

            var script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.onload = function() { loaded[src] = true; resolve(); };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // 加载单个样式
    function loadStyle(href) {
        return new Promise(function(resolve, reject) {
            if (loaded[href]) { resolve(); return; }

            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = function() { loaded[href] = true; resolve(); };
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    // 解析依赖（拓扑排序，避免重复加载）
    function resolveDependencies(modules) {
        var resolved = [];
        var visited = {};

        function visit(modName) {
            if (visited[modName]) return;
            visited[modName] = true;

            var deps = DEPENDENCIES[modName] || [];
            deps.forEach(function(dep) {
                visit(dep);
            });

            resolved.push(modName);
        }

        modules.forEach(function(mod) { visit(mod); });
        return resolved;
    }

    // 青柠架构入口
    window.QNA = window.QNA || {};

    window.QNA.load = function(modules) {
        modules = modules || [];

        var promises = [
            // 核心必须加载
            loadStyle(BASE_PATH + 'ui/qna-ui.css'),
            loadScript(BASE_PATH + 'core/qna-core.js')
        ];

        // 解析依赖顺序
        var ordered = resolveDependencies(modules);

        // 按依赖顺序加载模块
        ordered.forEach(function(mod) {
            var path = MODULE_MAP[mod];
            if (path) {
                promises.push(loadScript(BASE_PATH + path));
            }
        });

        return Promise.all(promises);
    };

    // 简写：加载全部常用模块
    window.QNA.init = function() {
        return window.QNA.load(['auth', 'site']);
    };

})();
