/**
 * 青柠架构 - 安全层 (QNA-Security)
 * v1.5 新增 - HMAC 签名验证、输入消毒
 */
QNA.module.define('security', function(QNA) {

    var Security = {
        // 简易 HMAC-SHA256（浏览器端实现）
        hmacSHA256: function(message, secret) {
            var encoder = new TextEncoder();
            var keyData = encoder.encode(secret);
            var msgData = encoder.encode(message);
            // 使用 SubtleCrypto（异步）
            return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
                .then(function(key) {
                    return crypto.subtle.sign('HMAC', key, msgData);
                })
                .then(function(signature) {
                    return Array.from(new Uint8Array(signature)).map(function(b) {
                        return b.toString(16).padStart(2, '0');
                    }).join('');
                });
        },

        // 同步简化签名（用于非安全关键场景）
        simpleSign: function(data, secret) {
            var str = JSON.stringify(data) + secret;
            var hash = 0;
            for (var i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash = hash & hash;
            }
            return Math.abs(hash).toString(36);
        },

        // 验证签名
        verifySign: function(data, signature, secret) {
            return this.simpleSign(data, secret) === signature;
        },

        // HTML 转义（防 XSS）
        escapeHTML: function(str) {
            var div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        // 消毒输入（移除危险字符）
        sanitize: function(str) {
            if (typeof str !== 'string') return str;
            return str.replace(/[<>'"&]/g, function(c) {
                return { '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '&': '&amp;' }[c];
            });
        },

        // CSP 安全检查
        checkCSP: function() {
            var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            return !!meta;
        }
    };

    return Security;
});
