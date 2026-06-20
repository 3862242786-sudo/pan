/**
 * 青柠架构 - 统一状态层 (QNA-Store)
 * v1.5 新增 - 轻量状态管理 + 跨标签页同步
 */
QNA.module.define('store', function(QNA) {
    var state = {};
    var subscribers = {};
    var channel = null;

    // 初始化 BroadcastChannel（跨标签页同步）
    try {
        channel = new BroadcastChannel('qna_state_sync');
        channel.onmessage = function(e) {
            if (e.data && e.data.type === 'state_update') {
                state[e.data.key] = e.data.value;
                _notify(e.data.key, e.data.value);
            }
        };
    } catch(e) {}

    function _notify(key, value) {
        if (subscribers[key]) {
            subscribers[key].forEach(function(fn) {
                try { fn(value, key); } catch(e) {}
            });
        }
        QNA.event.emit('store:' + key, value);
    }

    var Store = {
        get: function(key) { return state[key]; },
        set: function(key, value) {
            state[key] = value;
            _notify(key, value);
            // 持久化关键状态
            if (key === 'user' || key === 'auth') {
                QNA.utils.storage.set('store_' + key, value, 3600000);
            }
            // 跨标签页同步
            if (channel) {
                try { channel.postMessage({ type: 'state_update', key: key, value: value }); } catch(e) {}
            }
        },
        remove: function(key) {
            delete state[key];
            _notify(key, null);
        },
        subscribe: function(key, callback) {
            if (!subscribers[key]) subscribers[key] = [];
            subscribers[key].push(callback);
            // 返回取消订阅函数
            return function() {
                var idx = subscribers[key].indexOf(callback);
                if (idx > -1) subscribers[key].splice(idx, 1);
            };
        },
        // 从 localStorage 恢复状态
        restore: function() {
            var keys = ['user', 'auth'];
            keys.forEach(function(key) {
                var saved = QNA.utils.storage.get('store_' + key);
                if (saved) state[key] = saved;
            });
        },
        // 获取所有状态快照
        snapshot: function() { return JSON.parse(JSON.stringify(state)); }
    };

    return Store;
});
