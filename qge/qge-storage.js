/**
 * ============================================================================
 * 青柠游戏内核 存储模块 (QGE.Storage) v1.0
 * ============================================================================
 * 提供游戏存档系统：localStorage 封装、可选 XOR 加密、多存档槽位、
 * 自动保存、存档导入/导出功能。所有数据以 JSON 格式存储。
 *
 * 命名空间: QGE.Storage
 * 作者: Qingning Team
 * 许可: MIT
 * ============================================================================
 */

(function(global) {
    'use strict';

    // ========================================================================
    // 工具函数
    // ========================================================================

    /**
     * 将字符串转换为 UTF-8 字节数组
     * @param {string} str 输入字符串
     * @returns {Uint8Array}
     */
    function stringToBytes(str) {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }

    /**
     * 将 UTF-8 字节数组转换为字符串
     * @param {Uint8Array} bytes 字节数组
     * @returns {string}
     */
    function bytesToString(bytes) {
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    }

    /**
     * 使用 XOR 对字节数组进行加解密（对称操作）
     * @param {Uint8Array} data 原始字节数据
     * @param {string} key 密钥字符串
     * @returns {Uint8Array} 加解密后的字节数据
     */
    function xorEncrypt(data, key) {
        if (!key || key.length === 0) return data;
        const keyBytes = stringToBytes(key);
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i] ^ keyBytes[i % keyBytes.length];
        }
        return result;
    }

    /**
     * 将 Uint8Array 编码为 Base64 字符串
     * @param {Uint8Array} bytes 字节数组
     * @returns {string}
     */
    function bytesToBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return global.btoa(binary);
    }

    /**
     * 将 Base64 字符串解码为 Uint8Array
     * @param {string} base64 Base64 字符串
     * @returns {Uint8Array}
     */
    function base64ToBytes(base64) {
        const binary = global.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // ========================================================================
    // 存档槽位 (SaveSlot)
    // ========================================================================

    class SaveSlot {
        /**
         * 创建存档槽位
         * @param {string} id 槽位唯一标识
         * @param {string} name 槽位显示名称
         */
        constructor(id, name) {
            this.id = id;
            this.name = name || id;
            this.data = {};             // 存档数据对象
            this.timestamp = 0;         // 最后保存时间戳
            this.version = '1.0';       // 存档格式版本
            this.checksum = '';         // 数据校验和（可选）
        }

        /**
         * 获取存档的元信息
         * @returns {Object} {id, name, timestamp, version}
         */
        getMeta() {
            return {
                id: this.id,
                name: this.name,
                timestamp: this.timestamp,
                version: this.version
            };
        }
    }

    // ========================================================================
    // 存储管理器 (StorageManager)
    // ========================================================================

    class StorageManager {
        /**
         * 创建存储管理器
         * @param {Object} options 配置选项
         *   - prefix: localStorage 键名前缀，默认 'QGE_Save_'
         *   - encryptKey: 加密密钥字符串，为空则不加密
         *   - autoSaveInterval: 自动保存间隔（毫秒），0 表示禁用
         *   - maxSlots: 最大存档槽位数，默认 10
         *   - defaultSlot: 默认使用的槽位 ID，默认 'slot0'
         */
        constructor(options = {}) {
            this.prefix = options.prefix || 'QGE_Save_';
            this.encryptKey = options.encryptKey || '';
            this.autoSaveInterval = options.autoSaveInterval || 0;
            this.maxSlots = options.maxSlots || 10;
            this.defaultSlot = options.defaultSlot || 'slot0';

            this._slots = new Map();    // 已加载的存档槽位
            this._currentSlotId = this.defaultSlot;
            this._autoSaveTimer = null;
            this._dirty = false;        // 当前槽位是否有未保存的修改

            // 加载所有已存在的存档槽位
            this._loadAllSlots();

            // 启动自动保存
            if (this.autoSaveInterval > 0) {
                this._startAutoSave();
            }

            // 监听页面卸载前自动保存
            if (typeof window !== 'undefined') {
                window.addEventListener('beforeunload', () => {
                    if (this._dirty) this.save(this._currentSlotId);
                });
            }
        }

        // ========================================================================
        // 槽位管理
        // ========================================================================

        /**
         * 获取当前活动槽位 ID
         * @returns {string}
         */
        getCurrentSlotId() {
            return this._currentSlotId;
        }

        /**
         * 切换当前活动槽位
         * @param {string} slotId 槽位 ID
         */
        setCurrentSlot(slotId) {
            if (this._dirty) {
                // 切换前自动保存当前槽位
                this.save(this._currentSlotId);
            }
            this._currentSlotId = slotId;
            if (!this._slots.has(slotId)) {
                this._slots.set(slotId, new SaveSlot(slotId, slotId));
            }
        }

        /**
         * 获取指定槽位的存档数据
         * @param {string} slotId 槽位 ID，默认当前槽位
         * @returns {Object|null}
         */
        getSlotData(slotId) {
            slotId = slotId || this._currentSlotId;
            const slot = this._slots.get(slotId);
            return slot ? slot.data : null;
        }

        /**
         * 获取所有槽位的元信息列表
         * @returns {Array<Object>}
         */
        listSlots() {
            const result = [];
            for (const slot of this._slots.values()) {
                result.push(slot.getMeta());
            }
            return result.sort((a, b) => a.id.localeCompare(b.id));
        }

        /**
         * 检查指定槽位是否存在存档
         * @param {string} slotId 槽位 ID
         * @returns {boolean}
         */
        hasSlot(slotId) {
            return this._slots.has(slotId);
        }

        /**
         * 删除指定槽位的存档
         * @param {string} slotId 槽位 ID
         */
        deleteSlot(slotId) {
            this._slots.delete(slotId);
            const key = this._makeKey(slotId);
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error('[QGE.Storage] 删除存档失败:', e);
            }
            if (this._currentSlotId === slotId) {
                this._currentSlotId = this.defaultSlot;
                this._dirty = false;
            }
        }

        /**
         * 清空所有存档
         */
        clearAll() {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keys.push(key);
                }
            }
            for (let i = 0; i < keys.length; i++) {
                localStorage.removeItem(keys[i]);
            }
            this._slots.clear();
            this._currentSlotId = this.defaultSlot;
            this._dirty = false;
        }

        // ========================================================================
        // 数据读写
        // ========================================================================

        /**
         * 在当前活动槽位中设置键值对
         * @param {string} key 数据键
         * @param {*} value 数据值（需可 JSON 序列化）
         */
        set(key, value) {
            const slot = this._getOrCreateCurrentSlot();
            slot.data[key] = value;
            this._dirty = true;
        }

        /**
         * 从当前活动槽位中获取值
         * @param {string} key 数据键
         * @param {*} defaultValue 默认值
         * @returns {*}
         */
        get(key, defaultValue) {
            const slot = this._slots.get(this._currentSlotId);
            if (!slot || !(key in slot.data)) return defaultValue;
            return slot.data[key];
        }

        /**
         * 从当前活动槽位中移除键
         * @param {string} key 数据键
         */
        remove(key) {
            const slot = this._slots.get(this._currentSlotId);
            if (slot && key in slot.data) {
                delete slot.data[key];
                this._dirty = true;
            }
        }

        /**
         * 检查当前活动槽位是否包含指定键
         * @param {string} key 数据键
         * @returns {boolean}
         */
        has(key) {
            const slot = this._slots.get(this._currentSlotId);
            return slot ? (key in slot.data) : false;
        }

        // ========================================================================
        // 保存与加载
        // ========================================================================

        /**
         * 将指定槽位的数据持久化到 localStorage
         * @param {string} slotId 槽位 ID，默认当前槽位
         * @returns {boolean} 是否保存成功
         */
        save(slotId) {
            slotId = slotId || this._currentSlotId;
            const slot = this._slots.get(slotId);
            if (!slot) return false;

            slot.timestamp = Date.now();
            const payload = {
                id: slot.id,
                name: slot.name,
                data: slot.data,
                timestamp: slot.timestamp,
                version: slot.version
            };

            let raw;
            try {
                raw = JSON.stringify(payload);
            } catch (e) {
                console.error('[QGE.Storage] JSON 序列化失败:', e);
                return false;
            }

            // 加密处理
            if (this.encryptKey) {
                const bytes = stringToBytes(raw);
                const encrypted = xorEncrypt(bytes, this.encryptKey);
                raw = 'ENC:' + bytesToBase64(encrypted);
            }

            try {
                localStorage.setItem(this._makeKey(slotId), raw);
                if (slotId === this._currentSlotId) {
                    this._dirty = false;
                }
                return true;
            } catch (e) {
                console.error('[QGE.Storage] localStorage 写入失败:', e);
                return false;
            }
        }

        /**
         * 从 localStorage 加载指定槽位的数据
         * @param {string} slotId 槽位 ID，默认当前槽位
         * @returns {boolean} 是否加载成功
         */
        load(slotId) {
            slotId = slotId || this._currentSlotId;
            const key = this._makeKey(slotId);
            let raw;
            try {
                raw = localStorage.getItem(key);
            } catch (e) {
                console.error('[QGE.Storage] localStorage 读取失败:', e);
                return false;
            }
            if (!raw) return false;

            // 解密处理
            if (raw.startsWith('ENC:')) {
                if (!this.encryptKey) {
                    console.warn('[QGE.Storage] 存档已加密但未提供解密密钥');
                    return false;
                }
                try {
                    const base64 = raw.substring(4);
                    const encrypted = base64ToBytes(base64);
                    const decrypted = xorEncrypt(encrypted, this.encryptKey);
                    raw = bytesToString(decrypted);
                } catch (e) {
                    console.error('[QGE.Storage] 解密失败:', e);
                    return false;
                }
            }

            let payload;
            try {
                payload = JSON.parse(raw);
            } catch (e) {
                console.error('[QGE.Storage] JSON 解析失败:', e);
                return false;
            }

            const slot = new SaveSlot(payload.id, payload.name);
            slot.data = payload.data || {};
            slot.timestamp = payload.timestamp || 0;
            slot.version = payload.version || '1.0';
            this._slots.set(slotId, slot);

            if (slotId === this._currentSlotId) {
                this._dirty = false;
            }
            return true;
        }

        // ========================================================================
        // 导入与导出
        // ========================================================================

        /**
         * 将指定槽位的存档导出为 JSON 字符串（可用于分享或备份）
         * @param {string} slotId 槽位 ID，默认当前槽位
         * @param {boolean} encrypt 是否使用当前密钥加密导出内容
         * @returns {string|null} 导出的字符串，失败返回 null
         */
        exportSlot(slotId, encrypt) {
            slotId = slotId || this._currentSlotId;
            const slot = this._slots.get(slotId);
            if (!slot) return null;

            const payload = {
                id: slot.id,
                name: slot.name,
                data: slot.data,
                timestamp: slot.timestamp,
                version: slot.version,
                exportedAt: Date.now()
            };

            let raw = JSON.stringify(payload);
            if (encrypt && this.encryptKey) {
                const bytes = stringToBytes(raw);
                const encrypted = xorEncrypt(bytes, this.encryptKey);
                raw = 'ENC:' + bytesToBase64(encrypted);
            }
            return raw;
        }

        /**
         * 从字符串导入存档到指定槽位
         * @param {string} raw 导入的字符串
         * @param {string} slotId 目标槽位 ID，默认当前槽位
         * @param {boolean} overwrite 是否覆盖已存在的槽位
         * @returns {boolean} 是否导入成功
         */
        importSlot(raw, slotId, overwrite) {
            slotId = slotId || this._currentSlotId;
            if (!overwrite && this._slots.has(slotId)) {
                console.warn('[QGE.Storage] 槽位已存在且不允许覆盖');
                return false;
            }

            if (!raw) return false;

            // 解密处理
            if (raw.startsWith('ENC:')) {
                if (!this.encryptKey) {
                    console.warn('[QGE.Storage] 导入数据已加密但未提供解密密钥');
                    return false;
                }
                try {
                    const base64 = raw.substring(4);
                    const encrypted = base64ToBytes(base64);
                    const decrypted = xorEncrypt(encrypted, this.encryptKey);
                    raw = bytesToString(decrypted);
                } catch (e) {
                    console.error('[QGE.Storage] 导入解密失败:', e);
                    return false;
                }
            }

            let payload;
            try {
                payload = JSON.parse(raw);
            } catch (e) {
                console.error('[QGE.Storage] 导入 JSON 解析失败:', e);
                return false;
            }

            const slot = new SaveSlot(payload.id || slotId, payload.name || slotId);
            slot.data = payload.data || {};
            slot.timestamp = payload.timestamp || Date.now();
            slot.version = payload.version || '1.0';
            this._slots.set(slotId, slot);
            return this.save(slotId);
        }

        /**
         * 导出所有存档为单个 JSON 字符串
         * @param {boolean} encrypt 是否加密
         * @returns {string|null}
         */
        exportAll(encrypt) {
            const allSlots = [];
            for (const slot of this._slots.values()) {
                allSlots.push({
                    id: slot.id,
                    name: slot.name,
                    data: slot.data,
                    timestamp: slot.timestamp,
                    version: slot.version
                });
            }
            const payload = { slots: allSlots, exportedAt: Date.now() };
            let raw = JSON.stringify(payload);
            if (encrypt && this.encryptKey) {
                const bytes = stringToBytes(raw);
                const encrypted = xorEncrypt(bytes, this.encryptKey);
                raw = 'ENC:' + bytesToBase64(encrypted);
            }
            return raw;
        }

        /**
         * 从字符串导入所有存档
         * @param {string} raw 导入的字符串
         * @param {boolean} overwrite 是否覆盖已有槽位
         * @returns {boolean}
         */
        importAll(raw, overwrite) {
            if (!raw) return false;

            if (raw.startsWith('ENC:')) {
                if (!this.encryptKey) {
                    console.warn('[QGE.Storage] 导入数据已加密但未提供解密密钥');
                    return false;
                }
                try {
                    const base64 = raw.substring(4);
                    const encrypted = base64ToBytes(base64);
                    const decrypted = xorEncrypt(encrypted, this.encryptKey);
                    raw = bytesToString(decrypted);
                } catch (e) {
                    console.error('[QGE.Storage] 导入解密失败:', e);
                    return false;
                }
            }

            let payload;
            try {
                payload = JSON.parse(raw);
            } catch (e) {
                console.error('[QGE.Storage] 导入 JSON 解析失败:', e);
                return false;
            }

            if (!payload.slots || !Array.isArray(payload.slots)) return false;

            for (let i = 0; i < payload.slots.length; i++) {
                const s = payload.slots[i];
                const slotId = s.id || `imported_${i}`;
                if (!overwrite && this._slots.has(slotId)) continue;
                const slot = new SaveSlot(slotId, s.name || slotId);
                slot.data = s.data || {};
                slot.timestamp = s.timestamp || Date.now();
                slot.version = s.version || '1.0';
                this._slots.set(slotId, slot);
                this.save(slotId);
            }
            return true;
        }

        // ========================================================================
        // 自动保存
        // ========================================================================

        /**
         * 启动自动保存定时器
         * @private
         */
        _startAutoSave() {
            this._stopAutoSave();
            if (this.autoSaveInterval <= 0) return;
            this._autoSaveTimer = setInterval(() => {
                if (this._dirty) {
                    this.save(this._currentSlotId);
                }
            }, this.autoSaveInterval);
        }

        /**
         * 停止自动保存定时器
         * @private
         */
        _stopAutoSave() {
            if (this._autoSaveTimer) {
                clearInterval(this._autoSaveTimer);
                this._autoSaveTimer = null;
            }
        }

        /**
         * 重新设置自动保存间隔
         * @param {number} interval 间隔毫秒数，0 表示禁用
         */
        setAutoSaveInterval(interval) {
            this.autoSaveInterval = interval;
            this._stopAutoSave();
            if (interval > 0) {
                this._startAutoSave();
            }
        }

        // ========================================================================
        // 内部辅助方法
        // ========================================================================

        /**
         * 获取或创建当前槽位
         * @returns {SaveSlot}
         * @private
         */
        _getOrCreateCurrentSlot() {
            if (!this._slots.has(this._currentSlotId)) {
                this._slots.set(this._currentSlotId, new SaveSlot(this._currentSlotId, this._currentSlotId));
            }
            return this._slots.get(this._currentSlotId);
        }

        /**
         * 构造 localStorage 键名
         * @param {string} slotId 槽位 ID
         * @returns {string}
         * @private
         */
        _makeKey(slotId) {
            return this.prefix + slotId;
        }

        /**
         * 加载所有已存在的存档槽位
         * @private
         */
        _loadAllSlots() {
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        const slotId = key.substring(this.prefix.length);
                        this.load(slotId);
                    }
                }
            } catch (e) {
                console.error('[QGE.Storage] 加载存档列表失败:', e);
            }
        }
    }

    // ========================================================================
    // 快速存取助手 (QuickStorage)
    // ========================================================================

    class QuickStorage {
        /**
         * 创建快速存取助手，用于不依赖槽位的简单键值存储
         * @param {string} namespace 命名空间前缀
         * @param {string} encryptKey 可选加密密钥
         */
        constructor(namespace, encryptKey) {
            this.namespace = namespace || 'QGE_Quick_';
            this.encryptKey = encryptKey || '';
        }

        /**
         * 存储键值对
         * @param {string} key 键
         * @param {*} value 值（需可 JSON 序列化）
         */
        set(key, value) {
            let raw = JSON.stringify({ v: value, t: Date.now() });
            if (this.encryptKey) {
                const bytes = stringToBytes(raw);
                const encrypted = xorEncrypt(bytes, this.encryptKey);
                raw = 'ENC:' + bytesToBase64(encrypted);
            }
            localStorage.setItem(this.namespace + key, raw);
        }

        /**
         * 读取键值对
         * @param {string} key 键
         * @param {*} defaultValue 默认值
         * @returns {*}
         */
        get(key, defaultValue) {
            let raw = localStorage.getItem(this.namespace + key);
            if (!raw) return defaultValue;

            if (raw.startsWith('ENC:')) {
                if (!this.encryptKey) return defaultValue;
                try {
                    const encrypted = base64ToBytes(raw.substring(4));
                    const decrypted = xorEncrypt(encrypted, this.encryptKey);
                    raw = bytesToString(decrypted);
                } catch (e) {
                    return defaultValue;
                }
            }

            try {
                const parsed = JSON.parse(raw);
                return parsed.v;
            } catch (e) {
                return defaultValue;
            }
        }

        /**
         * 移除键值对
         * @param {string} key 键
         */
        remove(key) {
            localStorage.removeItem(this.namespace + key);
        }

        /**
         * 清空该命名空间下的所有数据
         */
        clear() {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(this.namespace)) {
                    keys.push(k);
                }
            }
            for (let i = 0; i < keys.length; i++) {
                localStorage.removeItem(keys[i]);
            }
        }
    }

    // ========================================================================
    // 导出命名空间
    // ========================================================================

    const Storage = {
        SaveSlot: SaveSlot,
        StorageManager: StorageManager,
        QuickStorage: QuickStorage
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Storage;
    }
    global.QGE = global.QGE || {};
    global.QGE.Storage = Storage;

})(typeof window !== 'undefined' ? window : this);
