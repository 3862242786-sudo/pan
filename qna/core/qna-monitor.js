/**
 * 青柠架构 - 性能监控 (QNA-Monitor)
 * v1.5 新增 - 页面性能采集、错误上报
 */
QNA.module.define('monitor', function(QNA) {
    var metrics = [];
    var errors = [];

    // 采集页面加载性能
    function collectPerformance() {
        if (window.performance && performance.getEntriesByType) {
            var nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
                metrics.push({
                    page: location.pathname,
                    fcp: nav.responseStart,
                    lcp: nav.loadEventEnd,
                    domReady: nav.domContentLoadedEventEnd,
                    timestamp: Date.now()
                });
            }
        }
    }

    // 自动捕获 JS 错误
    function captureErrors() {
        window.addEventListener('error', function(e) {
            errors.push({
                message: e.message,
                file: e.filename,
                line: e.lineno,
                timestamp: Date.now()
            });
        });
        window.addEventListener('unhandledrejection', function(e) {
            errors.push({
                message: 'Promise: ' + (e.reason ? e.reason.message || e.reason : 'Unknown'),
                timestamp: Date.now()
            });
        });
    }

    // API 请求计时
    function wrapFetch() {
        var originalFetch = window.fetch;
        window.fetch = function() {
            var start = Date.now();
            return originalFetch.apply(this, arguments).then(function(resp) {
                metrics.push({
                    type: 'api',
                    url: arguments[0],
                    status: resp.status,
                    duration: Date.now() - start,
                    timestamp: Date.now()
                });
                return resp;
            }).catch(function(err) {
                metrics.push({
                    type: 'api',
                    url: arguments[0],
                    error: err.message,
                    duration: Date.now() - start,
                    timestamp: Date.now()
                });
                throw err;
            });
        };
    }

    var Monitor = {
        init: function() {
            captureErrors();
            wrapFetch();
            if (document.readyState === 'complete') {
                collectPerformance();
            } else {
                window.addEventListener('load', collectPerformance);
            }
        },
        getMetrics: function() { return metrics.slice(); },
        getErrors: function() { return errors.slice(); },
        getReport: function() {
            return { metrics: metrics.slice(), errors: errors.slice(), version: QNA.version };
        },
        // 上报到 Supabase
        report: function() {
            // 留空，由站长按需配置上报地址
        }
    };

    return Monitor;
});
