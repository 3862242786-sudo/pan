/**
 * 青柠架构加载器 (QNA-Loader)
 * 按需加载核心和模块，减少初始加载量
 */

(function() {
    'use strict';

    var BASE_PATH = document.currentScript ? document.currentScript.src.replace(/qna-loader\.js$/, '') : './qna/';

    // 已加载的模块
    var loaded = {};

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

    // 青柠架构入口
    window.QNA = window.QNA || {};

    window.QNA.load = function(modules) {
        modules = modules || [];

        var promises = [
            // 核心必须加载
            loadStyle(BASE_PATH + 'ui/qna-ui.css'),
            loadScript(BASE_PATH + 'core/qna-core.js')
        ];

        // 按需加载模块
        modules.forEach(function(mod) {
            switch(mod) {
                case 'auth':
                    promises.push(loadScript(BASE_PATH + 'modules/qna-auth.js'));
                    break;
                case 'site':
                    promises.push(loadScript(BASE_PATH + 'modules/qna-site.js'));
                    break;
            }
        });

        return Promise.all(promises);
    };

    // 简写：加载全部常用模块
    window.QNA.init = function() {
        return window.QNA.load(['auth', 'site']);
    };

})();
