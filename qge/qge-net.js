/**
 * ============================================================================
 * 青柠游戏内核 网络模块 (QGE.Net) v1.0
 * ============================================================================
 * 为多人联机游戏提供轻量级网络支持：WebSocket 封装、自动重连、房间管理、
 * 状态同步（含客户端预测与服务端和解占位）、延迟测量等。
 *
 * 命名空间: QGE.Net
 * 作者: Qingning Team
 * 许可: MIT
 * ============================================================================
 */

(function(global) {
    'use strict';

    // ========================================================================
    // 工具函数
    // ========================================================================

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // ========================================================================
    // WebSocket 封装器 (Socket)
    // ========================================================================

    class Socket {
        /**
         * 创建 WebSocket 连接封装
         * @param {string} url WebSocket 服务器地址，如 ws://localhost:8080/game
         * @param {Object} options 配置选项
         */
        constructor(url, options = {}) {
            this.url = url;
            this.options = Object.assign({
                autoReconnect: true,        // 是否自动重连
                reconnectInterval: 3000,    // 重连间隔（毫秒）
                maxReconnectAttempts: 10,   // 最大重连次数
                heartbeatInterval: 15000,   // 心跳间隔（毫秒）
                heartbeatMsg: JSON.stringify({ type: 'ping' })
            }, options);

            this.ws = null;                 // 原生 WebSocket 实例
            this.ready = false;             // 连接是否就绪
            this._reconnectAttempts = 0;    // 当前已尝试重连次数
            this._reconnectTimer = null;    // 重连定时器
            this._heartbeatTimer = null;    // 心跳定时器
            this._listeners = new Map();    // 消息类型 -> 回调数组
            this._binaryListeners = [];     // 二进制消息回调数组
            this._openCallbacks = [];       // 连接打开回调
            this._closeCallbacks = [];      // 连接关闭回调
            this._errorCallbacks = [];      // 错误回调
        }

        /**
         * 建立 WebSocket 连接
         */
        connect() {
            if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
                return;
            }

            try {
                this.ws = new WebSocket(this.url);
            } catch (e) {
                console.error('[QGE.Net] 创建 WebSocket 失败:', e);
                this._scheduleReconnect();
                return;
            }

            this.ws.onopen = () => {
                console.log('[QGE.Net] WebSocket 连接已建立');
                this.ready = true;
                this._reconnectAttempts = 0;
                this._startHeartbeat();
                for (let i = 0; i < this._openCallbacks.length; i++) {
                    this._openCallbacks[i]();
                }
            };

            this.ws.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    this._handleTextMessage(event.data);
                } else {
                    this._handleBinaryMessage(event.data);
                }
            };

            this.ws.onclose = () => {
                console.warn('[QGE.Net] WebSocket 连接已关闭');
                this.ready = false;
                this._stopHeartbeat();
                for (let i = 0; i < this._closeCallbacks.length; i++) {
                    this._closeCallbacks[i]();
                }
                if (this.options.autoReconnect) {
                    this._scheduleReconnect();
                }
            };

            this.ws.onerror = (err) => {
                console.error('[QGE.Net] WebSocket 发生错误');
                for (let i = 0; i < this._errorCallbacks.length; i++) {
                    this._errorCallbacks[i](err);
                }
            };
        }

        /**
         * 关闭连接
         * @param {boolean} autoReconnect 关闭后是否允许自动重连，默认 false
         */
        disconnect(autoReconnect = false) {
            this.options.autoReconnect = autoReconnect;
            this._clearReconnect();
            this._stopHeartbeat();
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            this.ready = false;
        }

        /**
         * 发送文本消息（JSON 对象或字符串）
         * @param {Object|string} data 消息数据
         */
        send(data) {
            if (!this.ready || !this.ws) return;
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws.send(payload);
        }

        /**
         * 发送二进制消息
         * @param {ArrayBuffer|Blob|TypedArray} data 二进制数据
         */
        sendBinary(data) {
            if (!this.ready || !this.ws) return;
            this.ws.send(data);
        }

        /**
         * 注册消息类型监听器
         * @param {string} type 消息类型字段（要求消息 JSON 包含 type 字段）
         * @param {Function} callback 回调函数 (data) => void
         */
        on(type, callback) {
            if (!this._listeners.has(type)) {
                this._listeners.set(type, []);
            }
            this._listeners.get(type).push(callback);
        }

        /**
         * 移除消息类型监听器
         * @param {string} type 消息类型
         * @param {Function} callback 回调函数
         */
        off(type, callback) {
            if (!this._listeners.has(type)) return;
            const arr = this._listeners.get(type);
            const idx = arr.indexOf(callback);
            if (idx !== -1) arr.splice(idx, 1);
        }

        /**
         * 注册二进制消息监听器
         * @param {Function} callback 回调函数 (ArrayBuffer) => void
         */
        onBinary(callback) {
            this._binaryListeners.push(callback);
        }

        /**
         * 注册连接打开事件
         * @param {Function} callback 回调函数 () => void
         */
        onOpen(callback) {
            this._openCallbacks.push(callback);
        }

        /**
         * 注册连接关闭事件
         * @param {Function} callback 回调函数 () => void
         */
        onClose(callback) {
            this._closeCallbacks.push(callback);
        }

        /**
         * 注册错误事件
         * @param {Function} callback 回调函数 (error) => void
         */
        onError(callback) {
            this._errorCallbacks.push(callback);
        }

        /**
         * 处理文本消息，按 type 字段分发
         * @param {string} text 收到的文本
         * @private
         */
        _handleTextMessage(text) {
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.warn('[QGE.Net] 收到非 JSON 文本消息:', text);
                return;
            }
            const type = data.type;
            if (!type) return;
            const callbacks = this._listeners.get(type);
            if (callbacks) {
                for (let i = 0; i < callbacks.length; i++) {
                    callbacks[i](data);
                }
            }
        }

        /**
         * 处理二进制消息
         * @param {Blob|ArrayBuffer} data 二进制数据
         * @private
         */
        _handleBinaryMessage(data) {
            for (let i = 0; i < this._binaryListeners.length; i++) {
                this._binaryListeners[i](data);
            }
        }

        /**
         * 安排自动重连
         * @private
         */
        _scheduleReconnect() {
            if (this._reconnectTimer) return;
            if (this._reconnectAttempts >= this.options.maxReconnectAttempts) {
                console.error('[QGE.Net] 已达到最大重连次数，停止重连');
                return;
            }
            this._reconnectAttempts++;
            console.log(`[QGE.Net] ${this.options.reconnectInterval}ms 后尝试第 ${this._reconnectAttempts} 次重连...`);
            this._reconnectTimer = setTimeout(() => {
                this._reconnectTimer = null;
                this.connect();
            }, this.options.reconnectInterval);
        }

        /**
         * 清除重连定时器
         * @private
         */
        _clearReconnect() {
            if (this._reconnectTimer) {
                clearTimeout(this._reconnectTimer);
                this._reconnectTimer = null;
            }
        }

        /**
         * 启动心跳包
         * @private
         */
        _startHeartbeat() {
            this._stopHeartbeat();
            if (this.options.heartbeatInterval <= 0) return;
            this._heartbeatTimer = setInterval(() => {
                if (this.ready) {
                    this.send(this.options.heartbeatMsg);
                }
            }, this.options.heartbeatInterval);
        }

        /**
         * 停止心跳包
         * @private
         */
        _stopHeartbeat() {
            if (this._heartbeatTimer) {
                clearInterval(this._heartbeatTimer);
                this._heartbeatTimer = null;
            }
        }
    }

    // ========================================================================
    // 房间管理器 (RoomManager)
    // ========================================================================

    class RoomManager {
        /**
         * 创建房间管理器
         * @param {Socket} socket WebSocket 封装实例
         */
        constructor(socket) {
            this.socket = socket;
            this.roomId = null;         // 当前房间 ID
            this.playerId = null;       // 本机玩家 ID
            this.players = new Map();   // 房间内其他玩家信息
            this._roomListeners = new Map(); // 房间事件监听器

            // 绑定服务器房间事件
            this.socket.on('room.joined', (data) => this._onRoomJoined(data));
            this.socket.on('room.left', (data) => this._onRoomLeft(data));
            this.socket.on('room.playerJoined', (data) => this._onPlayerJoined(data));
            this.socket.on('room.playerLeft', (data) => this._onPlayerLeft(data));
            this.socket.on('room.broadcast', (data) => this._onBroadcast(data));
        }

        /**
         * 加入房间
         * @param {string} roomId 房间标识
         * @param {Object} playerInfo 玩家信息 {name, ...}
         */
        join(roomId, playerInfo = {}) {
            this.roomId = roomId;
            this.socket.send({
                type: 'room.join',
                roomId: roomId,
                playerInfo: playerInfo
            });
        }

        /**
         * 离开当前房间
         */
        leave() {
            if (!this.roomId) return;
            this.socket.send({
                type: 'room.leave',
                roomId: this.roomId
            });
            this.roomId = null;
            this.players.clear();
        }

        /**
         * 向房间内广播自定义消息
         * @param {Object} data 消息数据（将自动附加 type='room.broadcast'）
         */
        broadcast(data) {
            if (!this.roomId) return;
            this.socket.send({
                type: 'room.broadcast',
                roomId: this.roomId,
                payload: data
            });
        }

        /**
         * 注册房间事件监听器
         * @param {string} event 事件名: 'joined'|'left'|'playerJoined'|'playerLeft'|'broadcast'
         * @param {Function} callback 回调函数
         */
        on(event, callback) {
            if (!this._roomListeners.has(event)) {
                this._roomListeners.set(event, []);
            }
            this._roomListeners.get(event).push(callback);
        }

        /**
         * 移除房间事件监听器
         * @param {string} event 事件名
         * @param {Function} callback 回调函数
         */
        off(event, callback) {
            if (!this._roomListeners.has(event)) return;
            const arr = this._roomListeners.get(event);
            const idx = arr.indexOf(callback);
            if (idx !== -1) arr.splice(idx, 1);
        }

        _emit(event, data) {
            const callbacks = this._roomListeners.get(event);
            if (callbacks) {
                for (let i = 0; i < callbacks.length; i++) {
                    callbacks[i](data);
                }
            }
        }

        _onRoomJoined(data) {
            this.playerId = data.playerId;
            this.roomId = data.roomId;
            if (data.players) {
                this.players.clear();
                for (let i = 0; i < data.players.length; i++) {
                    const p = data.players[i];
                    this.players.set(p.id, p);
                }
            }
            this._emit('joined', data);
        }

        _onRoomLeft(data) {
            this.roomId = null;
            this.players.clear();
            this._emit('left', data);
        }

        _onPlayerJoined(data) {
            this.players.set(data.playerId, data.playerInfo);
            this._emit('playerJoined', data);
        }

        _onPlayerLeft(data) {
            this.players.delete(data.playerId);
            this._emit('playerLeft', data);
        }

        _onBroadcast(data) {
            this._emit('broadcast', data.payload);
        }
    }

    // ========================================================================
    // 状态同步器 (StateSync)
    // ========================================================================

    class StateSync {
        /**
         * 创建状态同步器，用于处理客户端预测与服务端和解
         * @param {Socket} socket WebSocket 封装实例
         * @param {Object} options 配置
         */
        constructor(socket, options = {}) {
            this.socket = socket;
            this.options = Object.assign({
                interpolationDelay: 0.1,    // 插值延迟（秒）
                maxReconcileDistance: 5,    // 最大和解距离阈值
                snapshotRate: 20            // 服务端快照发送频率（Hz）
            }, options);

            this._localPlayerId = null;
            this._serverSnapshots = [];     // 服务端状态快照队列
            this._pendingInputs = [];       // 待确认的本地输入队列
            this._lastProcessedInput = 0;   // 服务端最后确认的输入序号
            this._inputSequence = 0;        // 本地输入序号计数器
            this._entityStates = new Map(); // 实体当前渲染状态 {x,y,...}
            this._onSnapshotCallbacks = [];

            this.socket.on('state.snapshot', (data) => this._onServerSnapshot(data));
        }

        /**
         * 设置本地玩家 ID
         * @param {string} id 玩家 ID
         */
        setLocalPlayer(id) {
            this._localPlayerId = id;
        }

        /**
         * 发送本地玩家输入到服务端（附带预测序号）
         * @param {Object} input 输入数据 {dx, dy, action, ...}
         */
        sendInput(input) {
            this._inputSequence++;
            const payload = {
                type: 'player.input',
                seq: this._inputSequence,
                input: input,
                timestamp: performance.now()
            };
            this._pendingInputs.push(payload);
            this.socket.send(payload);
            return payload.seq;
        }

        /**
         * 应用本地预测（在收到服务端确认前立即更新本地状态）
         * @param {string} entityId 实体 ID
         * @param {Object} state 预测后的状态 {x, y, ...}
         */
        predict(entityId, state) {
            this._entityStates.set(entityId, state);
        }

        /**
         * 每帧更新插值与和解逻辑
         * @param {number} dt 增量时间（秒）
         * @param {Function} applyState 应用状态到游戏实体的回调 (entityId, state) => void
         */
        update(dt, applyState) {
            // 清理过期的待确认输入（超过 2 秒视为丢失）
            const now = performance.now();
            this._pendingInputs = this._pendingInputs.filter(p => now - p.timestamp < 2000);

            // 如果快照不足，直接返回
            if (this._serverSnapshots.length < 2) return;

            // 计算渲染目标时间 = 当前时间 - 插值延迟
            const renderTime = now / 1000 - this.options.interpolationDelay;

            // 找到 renderTime 所在的两帧快照
            let from = this._serverSnapshots[0];
            let to = this._serverSnapshots[1];
            for (let i = 1; i < this._serverSnapshots.length; i++) {
                if (this._serverSnapshots[i].time >= renderTime) {
                    from = this._serverSnapshots[i - 1];
                    to = this._serverSnapshots[i];
                    break;
                }
            }

            if (!from || !to) return;

            // 计算插值系数
            let t = (renderTime - from.time) / (to.time - from.time);
            t = clamp(t, 0, 1);

            // 对其他玩家实体进行插值渲染
            for (const [entityId, toState] of to.states) {
                if (entityId === this._localPlayerId) continue; // 本地玩家单独处理和解
                const fromState = from.states.get(entityId);
                if (fromState) {
                    const interpolated = this._interpolateState(fromState, toState, t);
                    this._entityStates.set(entityId, interpolated);
                    if (applyState) applyState(entityId, interpolated);
                } else {
                    this._entityStates.set(entityId, toState);
                    if (applyState) applyState(entityId, toState);
                }
            }

            // 本地玩家服务端和解
            if (this._localPlayerId && to.states.has(this._localPlayerId)) {
                const serverState = to.states.get(this._localPlayerId);
                this._reconcile(serverState, to.lastInputSeq, applyState);
            }

            // 限制快照队列长度
            while (this._serverSnapshots.length > 20) {
                this._serverSnapshots.shift();
            }
        }

        /**
         * 注册快照接收回调
         * @param {Function} callback 回调函数 (snapshot) => void
         */
        onSnapshot(callback) {
            this._onSnapshotCallbacks.push(callback);
        }

        /**
         * 处理服务端快照
         * @param {Object} data 快照数据
         * @private
         */
        _onServerSnapshot(data) {
            const snapshot = {
                time: data.time || performance.now() / 1000,
                lastInputSeq: data.lastInputSeq || 0,
                states: new Map()
            };
            if (data.states) {
                for (const id in data.states) {
                    snapshot.states.set(id, data.states[id]);
                }
            }
            this._serverSnapshots.push(snapshot);
            for (let i = 0; i < this._onSnapshotCallbacks.length; i++) {
                this._onSnapshotCallbacks[i](snapshot);
            }
        }

        /**
         * 对两个状态进行线性插值
         * @param {Object} a 起始状态
         * @param {Object} b 结束状态
         * @param {number} t 插值系数 [0,1]
         * @returns {Object} 插值后的状态
         * @private
         */
        _interpolateState(a, b, t) {
            const result = {};
            for (const key in b) {
                if (typeof a[key] === 'number' && typeof b[key] === 'number') {
                    result[key] = a[key] + (b[key] - a[key]) * t;
                } else {
                    result[key] = b[key];
                }
            }
            return result;
        }

        /**
         * 服务端和解：将本地状态回滚到服务端确认状态，并重放未确认的输入
         * @param {Object} serverState 服务端权威状态
         * @param {number} lastSeq 服务端最后处理的输入序号
         * @param {Function} applyState 应用状态回调
         * @private
         */
        _reconcile(serverState, lastSeq, applyState) {
            // 移除已确认的输入
            const unconfirmed = this._pendingInputs.filter(p => p.seq > lastSeq);

            // 如果差距过大，直接强制同步（防止漂移累积）
            const localState = this._entityStates.get(this._localPlayerId);
            if (localState) {
                const dx = (localState.x || 0) - (serverState.x || 0);
                const dy = (localState.y || 0) - (serverState.y || 0);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > this.options.maxReconcileDistance) {
                    // 强制同步
                    this._entityStates.set(this._localPlayerId, serverState);
                    if (applyState) applyState(this._localPlayerId, serverState);
                } else {
                    // 平滑插值修正
                    const corrected = {
                        x: serverState.x + (localState.x - serverState.x) * 0.3,
                        y: serverState.y + (localState.y - serverState.y) * 0.3
                    };
                    // 保留其他字段
                    Object.assign(corrected, serverState, corrected);
                    this._entityStates.set(this._localPlayerId, corrected);
                    if (applyState) applyState(this._localPlayerId, corrected);
                }
            }

            // 重放未确认的输入（此处为占位，实际应由游戏逻辑处理）
            // 开发者可在收到快照后根据 unconfirmed 队列重新模拟本地输入
            if (unconfirmed.length > 0) {
                // placeholder: 触发外部重放逻辑
            }
        }
    }

    // ========================================================================
    // 延迟测量器 (LatencyMonitor)
    // ========================================================================

    class LatencyMonitor {
        /**
         * 创建网络延迟测量器
         * @param {Socket} socket WebSocket 封装实例
         * @param {Object} options 配置
         */
        constructor(socket, options = {}) {
            this.socket = socket;
            this.options = Object.assign({
                interval: 2000,     // 测量间隔（毫秒）
                samples: 10         // 保留样本数量
            }, options);

            this._samples = [];     // 延迟样本数组（毫秒）
            this._timer = null;     // 测量定时器
            this._pendingPings = new Map(); // seq -> sendTime
            this._seq = 0;
            this.latency = 0;       // 当前平均延迟（毫秒）
            this.jitter = 0;        // 当前抖动（毫秒）

            this.socket.on('pong', (data) => this._onPong(data));
        }

        /**
         * 开始周期性测量延迟
         */
        start() {
            this.stop();
            this._timer = setInterval(() => this._ping(), this.options.interval);
        }

        /**
         * 停止测量
         */
        stop() {
            if (this._timer) {
                clearInterval(this._timer);
                this._timer = null;
            }
        }

        /**
         * 获取当前平均延迟
         * @returns {number} 毫秒
         */
        getLatency() {
            return this.latency;
        }

        /**
         * 获取当前网络抖动（样本标准差）
         * @returns {number} 毫秒
         */
        getJitter() {
            return this.jitter;
        }

        /**
         * 发送 Ping 包
         * @private
         */
        _ping() {
            if (!this.socket.ready) return;
            this._seq++;
            const seq = this._seq;
            this._pendingPings.set(seq, performance.now());
            this.socket.send({ type: 'ping', seq: seq, clientTime: performance.now() });
        }

        /**
         * 处理 Pong 响应
         * @param {Object} data 响应数据
         * @private
         */
        _onPong(data) {
            const seq = data.seq;
            if (!this._pendingPings.has(seq)) return;
            const sendTime = this._pendingPings.get(seq);
            this._pendingPings.delete(seq);
            const rtt = performance.now() - sendTime;
            const sample = rtt / 2; // 粗略估计单向延迟

            this._samples.push(sample);
            if (this._samples.length > this.options.samples) {
                this._samples.shift();
            }

            this._calculateStats();
        }

        /**
         * 计算延迟与抖动统计值
         * @private
         */
        _calculateStats() {
            if (this._samples.length === 0) return;
            const sum = this._samples.reduce((a, b) => a + b, 0);
            this.latency = sum / this._samples.length;

            // 计算标准差作为抖动指标
            const mean = this.latency;
            const variance = this._samples.reduce((acc, val) => acc + (val - mean) * (val - mean), 0) / this._samples.length;
            this.jitter = Math.sqrt(variance);
        }
    }

    // ========================================================================
    // 网络管理器 (NetManager) - 统一入口
    // ========================================================================

    class NetManager {
        /**
         * 创建网络管理器，整合 Socket、Room、StateSync、LatencyMonitor
         * @param {string} url WebSocket 服务器地址
         * @param {Object} options 配置选项
         */
        constructor(url, options = {}) {
            this.socket = new Socket(url, options.socket);
            this.room = new RoomManager(this.socket);
            this.sync = new StateSync(this.socket, options.sync);
            this.latency = new LatencyMonitor(this.socket, options.latency);
        }

        /**
         * 连接到服务器
         */
        connect() {
            this.socket.connect();
            this.latency.start();
        }

        /**
         * 断开连接
         */
        disconnect() {
            this.latency.stop();
            this.socket.disconnect(false);
        }

        /**
         * 每帧更新状态同步与插值
         * @param {number} dt 增量时间（秒）
         * @param {Function} applyState 应用状态回调
         */
        update(dt, applyState) {
            this.sync.update(dt, applyState);
        }
    }

    // ========================================================================
    // 导出命名空间
    // ========================================================================

    const Net = {
        Socket: Socket,
        RoomManager: RoomManager,
        StateSync: StateSync,
        LatencyMonitor: LatencyMonitor,
        NetManager: NetManager
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Net;
    }
    global.QGE = global.QGE || {};
    global.QGE.Net = Net;

})(typeof window !== 'undefined' ? window : this);
