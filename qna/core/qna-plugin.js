/**
 * 青柠架构 - 插件系统 (QNA-Plugin)
 * v1.5 新增 - 可扩展的插件注册机制
 */
QNA.module.define('plugin', function(QNA) {
    var plugins = {};

    var Plugin = {
        register: function(name, definition) {
            if (plugins[name]) {
                QNA.utils.error('插件已存在:', name);
                return;
            }
            plugins[name] = {
                name: name,
                definition: definition,
                instance: null,
                enabled: false
            };
        },
        enable: function(name) {
            var plugin = plugins[name];
            if (!plugin) { QNA.utils.error('插件不存在:', name); return; }
            if (!plugin.instance) {
                plugin.instance = plugin.definition(QNA);
            }
            if (plugin.instance.init) plugin.instance.init();
            plugin.enabled = true;
            QNA.event.emit('plugin:enabled', { name: name });
        },
        disable: function(name) {
            var plugin = plugins[name];
            if (!plugin) return;
            if (plugin.instance && plugin.instance.destroy) plugin.instance.destroy();
            plugin.enabled = false;
            QNA.event.emit('plugin:disabled', { name: name });
        },
        get: function(name) {
            return plugins[name] ? plugins[name].instance : null;
        },
        list: function() {
            return Object.keys(plugins).map(function(name) {
                return { name: name, enabled: plugins[name].enabled };
            });
        }
    };

    return Plugin;
});
