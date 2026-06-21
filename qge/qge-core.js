/**
 * ============================================================================
 * 青柠游戏内核 (Qingning Game Engine) v1.0
 * ============================================================================
 * 一款轻量级 HTML5 Canvas 2D 游戏引擎，采用原生 JavaScript 编写，无外部依赖。
 * 提供游戏循环、场景管理、资源加载、输入处理、音频管理、精灵动画、
 * 碰撞检测、粒子系统、摄像机、瓦片地图、轻量物理及调试覆盖层等核心能力。
 *
 * 命名空间: QGE
 * 作者: Qingning Team
 * 许可: MIT
 * ============================================================================
 */

(function(global) {
    'use strict';

    // ========================================================================
    // 工具函数与常量
    // ========================================================================

    const Utils = {
        /**
         * 生成唯一标识符 (UUID v4 风格简化版)
         * @returns {string} 唯一字符串 ID
         */
        uid: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        /**
         * 深度克隆简单对象/数组（不支持函数、循环引用）
         * @param {*} obj 待克隆对象
         * @returns {*} 克隆结果
         */
        clone: function(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * 线性插值
         * @param {number} a 起始值
         * @param {number} b 结束值
         * @param {number} t 插值系数 [0,1]
         * @returns {number} 插值结果
         */
        lerp: function(a, b, t) {
            return a + (b - a) * t;
        },

        /**
         * 将数值限制在指定范围内
         * @param {number} val 输入值
         * @param {number} min 最小值
         * @param {number} max 最大值
         * @returns {number} 限制后的值
         */
        clamp: function(val, min, max) {
            return Math.max(min, Math.min(max, val));
        },

        /**
         * 角度转弧度
         * @param {number} deg 角度
         * @returns {number} 弧度
         */
        degToRad: function(deg) {
            return deg * Math.PI / 180;
        },

        /**
         * 弧度转角度
         * @param {number} rad 弧度
         * @returns {number} 角度
         */
        radToDeg: function(rad) {
            return rad * 180 / Math.PI;
        },

        /**
         * 检测点是否在矩形内
         * @param {number} px 点X
         * @param {number} py 点Y
         * @param {number} rx 矩形左上角X
         * @param {number} ry 矩形左上角Y
         * @param {number} rw 矩形宽
         * @param {number} rh 矩形高
         * @returns {boolean}
         */
        pointInRect: function(px, py, rx, ry, rw, rh) {
            return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
        },

        /**
         * 检测点是否在圆内
         * @param {number} px 点X
         * @param {number} py 点Y
         * @param {number} cx 圆心X
         * @param {number} cy 圆心Y
         * @param {number} cr 圆半径
         * @returns {boolean}
         */
        pointInCircle: function(px, py, cx, cy, cr) {
            const dx = px - cx;
            const dy = py - cy;
            return dx * dx + dy * dy <= cr * cr;
        }
    };

    // ========================================================================
    // 缓动函数 (Easing Functions)
    // ========================================================================

    const Easing = {
        linear: function(t) { return t; },
        easeInQuad: function(t) { return t * t; },
        easeOutQuad: function(t) { return t * (2 - t); },
        easeInOutQuad: function(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
        easeInCubic: function(t) { return t * t * t; },
        easeOutCubic: function(t) { return (--t) * t * t + 1; },
        easeInOutCubic: function(t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; },
        easeInSine: function(t) { return 1 - Math.cos(t * Math.PI / 2); },
        easeOutSine: function(t) { return Math.sin(t * Math.PI / 2); },
        easeInOutSine: function(t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
        easeInBack: function(t) { const c1 = 1.70158; const c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
        easeOutBack: function(t) { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
        easeOutBounce: function(t) {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) return n1 * t * t;
            else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
            else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
            else return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    };

    // ========================================================================
    // 核心引擎类 (QGE.Core)
    // ========================================================================

    class Core {
        /**
         * 创建游戏引擎实例
         * @param {HTMLCanvasElement} canvas 游戏画布元素
         * @param {Object} options 配置选项
         */
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.options = Object.assign({
                width: 800,
                height: 600,
                autoResize: true,
                pixelRatio: window.devicePixelRatio || 1,
                targetFPS: 60,
                debug: false,
                renderer: '2d' // '2d' | 'webgl' | 'none'
            }, options);

            // 根据渲染模式创建上下文
            if (this.options.renderer === '2d') {
                this.ctx = canvas.getContext('2d', { alpha: false });
            } else if (this.options.renderer === 'webgl') {
                this.ctx = null; // WebGL 由外部（如 Three.js）管理
            } else {
                this.ctx = canvas.getContext('2d', { alpha: false });
            }

            // 内部状态
            this._running = false;
            this._lastTime = 0;
            this._deltaTime = 0;
            this._fps = 0;
            this._fpsCounter = 0;
            this._fpsTimer = 0;
            this._frameCount = 0;

            // 子系统引用
            this.scenes = new SceneManager(this);
            this.assets = new AssetLoader();
            this.input = new InputManager(canvas);
            this.audio = new AudioManager();
            this.camera = new Camera(this.options.width, this.options.height);
            this.particles = new ParticleSystem();
            this.debugOverlay = new DebugOverlay(this);

            // 初始化画布尺寸
            this._resize();

            // 绑定窗口大小变化事件
            if (this.options.autoResize) {
                window.addEventListener('resize', () => this._resize());
            }

            // 绑定游戏循环
            this._boundLoop = this._loop.bind(this);
        }

        /**
         * 调整画布尺寸以适配设备像素比及容器大小
         * @private
         */
        _resize() {
            const dpr = this.options.pixelRatio;
            let width = this.options.width;
            let height = this.options.height;

            if (this.options.autoResize && this.canvas.parentElement) {
                const rect = this.canvas.parentElement.getBoundingClientRect();
                width = rect.width;
                height = rect.height;
            }

            this.canvas.width = Math.floor(width * dpr);
            this.canvas.height = Math.floor(height * dpr);
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            if (this.ctx) {
                this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }

            this.width = width;
            this.height = height;

            // 通知摄像机更新边界
            this.camera.setBounds(0, 0, width, height);
        }

        /**
         * 启动游戏主循环
         */
        start() {
            if (this._running) return;
            this._running = true;
            this._lastTime = performance.now();
            requestAnimationFrame(this._boundLoop);
        }

        /**
         * 暂停游戏主循环
         */
        pause() {
            this._running = false;
        }

        /**
         * 恢复游戏主循环
         */
        resume() {
            if (!this._running) {
                this._running = true;
                this._lastTime = performance.now();
                requestAnimationFrame(this._boundLoop);
            }
        }

        /**
         * 停止游戏主循环
         */
        stop() {
            this._running = false;
        }

        /**
         * 游戏主循环，处理时间增量、更新逻辑与渲染
         * @param {number} timestamp 当前时间戳
         * @private
         */
        _loop(timestamp) {
            if (!this._running) return;

            // 计算增量时间（秒）
            this._deltaTime = Math.min((timestamp - this._lastTime) / 1000, 0.1); // 限制最大增量防止跳帧
            this._lastTime = timestamp;
            this._frameCount++;

            // FPS 计算
            this._fpsCounter++;
            this._fpsTimer += this._deltaTime;
            if (this._fpsTimer >= 1.0) {
                this._fps = this._fpsCounter;
                this._fpsCounter = 0;
                this._fpsTimer -= 1.0;
            }

            // 更新输入状态
            this.input._update();

            // 更新当前场景
            const scene = this.scenes.current();
            if (scene) {
                scene.update(this._deltaTime);
            }

            // 更新粒子系统
            this.particles.update(this._deltaTime);

            // 更新摄像机
            this.camera.update(this._deltaTime);

            // 渲染
            this._render(scene);

            requestAnimationFrame(this._boundLoop);
        }

        /**
         * 执行一帧的渲染工作
         * @param {Scene} scene 当前场景
         * @private
         */
        _render(scene) {
            const ctx = this.ctx;

            // WebGL 模式下跳过 2D 渲染（由外部渲染器处理）
            if (!ctx) {
                // 如果场景有自己的渲染方法（如 3D 场景），调用它
                if (scene && scene.render3D) {
                    scene.render3D();
                }
                return;
            }

            // 清空画布
            ctx.clearRect(0, 0, this.width, this.height);

            // 应用摄像机变换
            ctx.save();
            this.camera.apply(ctx);

            // 渲染场景
            if (scene) {
                scene.render(ctx);
            }

            // 渲染粒子
            this.particles.render(ctx);

            ctx.restore();

            // 调试覆盖层（在屏幕空间渲染）
            if (this.options.debug) {
                this.debugOverlay.render(ctx);
            }
        }

        /**
         * 获取当前 FPS
         * @returns {number}
         */
        getFPS() {
            return this._fps;
        }

        /**
         * 获取上一帧的增量时间（秒）
         * @returns {number}
         */
        getDeltaTime() {
            return this._deltaTime;
        }

        /**
         * 获取已渲染的总帧数
         * @returns {number}
         */
        getFrameCount() {
            return this._frameCount;
        }
    }

    // ========================================================================
    // 场景管理器 (SceneManager)
    // ========================================================================

    class SceneManager {
        /**
         * 创建场景管理器
         * @param {Core} engine 引擎实例
         */
        constructor(engine) {
            this.engine = engine;
            this._scenes = new Map();   // 已注册的场景映射
            this._stack = [];           // 场景栈
            this._current = null;       // 当前活动场景
        }

        /**
         * 注册一个场景类
         * @param {string} name 场景名称
         * @param {Function} SceneClass 继承自 Scene 的类
         */
        register(name, SceneClass) {
            this._scenes.set(name, SceneClass);
        }

        /**
         * 切换到指定场景（替换当前场景）
         * @param {string} name 场景名称
         * @param {*} data 传递给场景 init 的数据
         */
        switch(name, data) {
            const SceneClass = this._scenes.get(name);
            if (!SceneClass) {
                console.error(`[QGE] 场景未注册: ${name}`);
                return;
            }

            // 销毁当前场景
            if (this._current) {
                this._current.destroy();
            }
            this._stack.length = 0;

            // 创建并初始化新场景
            const scene = new SceneClass(this.engine);
            this._current = scene;
            this._stack.push(scene);
            scene.init(data);
        }

        /**
         * 将新场景压入栈顶（覆盖在当前场景之上）
         * @param {string} name 场景名称
         * @param {*} data 初始化数据
         */
        push(name, data) {
            const SceneClass = this._scenes.get(name);
            if (!SceneClass) {
                console.error(`[QGE] 场景未注册: ${name}`);
                return;
            }

            // 暂停当前场景
            if (this._current) {
                this._current.pause();
            }

            const scene = new SceneClass(this.engine);
            this._current = scene;
            this._stack.push(scene);
            scene.init(data);
        }

        /**
         * 弹出栈顶场景，恢复上一个场景
         */
        pop() {
            if (this._stack.length <= 1) return;

            const scene = this._stack.pop();
            scene.destroy();

            this._current = this._stack[this._stack.length - 1];
            this._current.resume();
        }

        /**
         * 获取当前活动场景
         * @returns {Scene|null}
         */
        current() {
            return this._current;
        }
    }

    // ========================================================================
    // 场景基类 (Scene)
    // ========================================================================

    class Scene {
        /**
         * 创建场景实例
         * @param {Core} engine 引擎实例
         */
        constructor(engine) {
            this.engine = engine;
            this.entities = [];     // 场景中的实体列表
            this._initialized = false;
            this._paused = false;
        }

        /**
         * 场景初始化，子类应重写此方法
         * @param {*} data 初始化数据
         */
        init(data) {
            this._initialized = true;
        }

        /**
         * 每帧更新逻辑，子类应重写此方法
         * @param {number} dt 增量时间（秒）
         */
        update(dt) {
            if (this._paused) return;

            // 更新所有实体
            for (let i = 0; i < this.entities.length; i++) {
                const entity = this.entities[i];
                if (entity.active !== false) {
                    entity.update(dt);
                }
            }
        }

        /**
         * 每帧渲染逻辑，子类应重写此方法
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         */
        render(ctx) {
            // 渲染所有实体（按 zIndex 排序）
            const sorted = this.entities.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            for (let i = 0; i < sorted.length; i++) {
                const entity = sorted[i];
                if (entity.visible !== false) {
                    entity.render(ctx);
                }
            }
        }

        /**
         * 暂停场景更新
         */
        pause() {
            this._paused = true;
        }

        /**
         * 恢复场景更新
         */
        resume() {
            this._paused = false;
        }

        /**
         * 销毁场景，清理资源
         */
        destroy() {
            for (let i = 0; i < this.entities.length; i++) {
                if (this.entities[i].destroy) {
                    this.entities[i].destroy();
                }
            }
            this.entities.length = 0;
            this._initialized = false;
        }

        /**
         * 向场景添加实体
         * @param {Object} entity 实体对象
         */
        addEntity(entity) {
            this.entities.push(entity);
        }

        /**
         * 从场景移除实体
         * @param {Object} entity 实体对象
         */
        removeEntity(entity) {
            const idx = this.entities.indexOf(entity);
            if (idx !== -1) {
                this.entities.splice(idx, 1);
            }
        }
    }

    // ========================================================================
    // 资源加载器 (AssetLoader)
    // ========================================================================

    class AssetLoader {
        constructor() {
            this._images = new Map();
            this._audios = new Map();
            this._json = new Map();
            this._total = 0;
            this._loaded = 0;
        }

        /**
         * 加载图片资源
         * @param {string} key 资源标识键
         * @param {string} src 图片 URL
         * @returns {Promise<HTMLImageElement>}
         */
        loadImage(key, src) {
            this._total++;
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this._images.set(key, img);
                    this._loaded++;
                    resolve(img);
                };
                img.onerror = () => reject(new Error(`[QGE] 图片加载失败: ${src}`));
                img.src = src;
            });
        }

        /**
         * 加载音频资源
         * @param {string} key 资源标识键
         * @param {string} src 音频 URL
         * @returns {Promise<HTMLAudioElement>}
         */
        loadAudio(key, src) {
            this._total++;
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                audio.oncanplaythrough = () => {
                    this._audios.set(key, audio);
                    this._loaded++;
                    resolve(audio);
                };
                audio.onerror = () => reject(new Error(`[QGE] 音频加载失败: ${src}`));
                audio.src = src;
            });
        }

        /**
         * 加载 JSON 数据
         * @param {string} key 资源标识键
         * @param {string} src JSON URL
         * @returns {Promise<Object>}
         */
        loadJSON(key, src) {
            this._total++;
            return fetch(src)
                .then(r => {
                    if (!r.ok) throw new Error(`[QGE] JSON 加载失败: ${src}`);
                    return r.json();
                })
                .then(data => {
                    this._json.set(key, data);
                    this._loaded++;
                    return data;
                });
        }

        /**
         * 批量加载资源
         * @param {Array<Object>} list 资源列表，每项包含 {type, key, src}
         * @param {Function} onProgress 进度回调 (loaded, total, percent)
         * @returns {Promise<void>}
         */
        loadAll(list, onProgress) {
            const promises = list.map(item => {
                let p;
                switch (item.type) {
                    case 'image': p = this.loadImage(item.key, item.src); break;
                    case 'audio': p = this.loadAudio(item.key, item.src); break;
                    case 'json':  p = this.loadJSON(item.key, item.src); break;
                    default: p = Promise.resolve();
                }
                if (onProgress) {
                    p = p.then(() => onProgress(this._loaded, this._total, this._loaded / this._total));
                }
                return p;
            });
            return Promise.all(promises);
        }

        /**
         * 获取已加载的图片
         * @param {string} key 资源键
         * @returns {HTMLImageElement|undefined}
         */
        getImage(key) {
            return this._images.get(key);
        }

        /**
         * 获取已加载的音频
         * @param {string} key 资源键
         * @returns {HTMLAudioElement|undefined}
         */
        getAudio(key) {
            return this._audios.get(key);
        }

        /**
         * 获取已加载的 JSON 数据
         * @param {string} key 资源键
         * @returns {Object|undefined}
         */
        getJSON(key) {
            return this._json.get(key);
        }

        /**
         * 获取当前加载进度 [0, 1]
         * @returns {number}
         */
        getProgress() {
            return this._total === 0 ? 1 : this._loaded / this._total;
        }
    }

    // ========================================================================
    // 输入管理器 (InputManager)
    // ========================================================================

    class InputManager {
        /**
         * 创建输入管理器
         * @param {HTMLCanvasElement} canvas 游戏画布
         */
        constructor(canvas) {
            this.canvas = canvas;

            // 键盘状态
            this.keys = new Map();          // 当前是否按下
            this.keysDown = new Set();      // 本帧刚按下
            this.keysUp = new Set();        // 本帧刚释放

            // 鼠标状态
            this.mouse = { x: 0, y: 0, down: false, pressed: false, released: false };

            // 触摸状态
            this.touches = new Map();       // 当前活跃触点
            this.touchesStarted = [];       // 本帧开始的触点
            this.touchesEnded = [];         // 本帧结束的触点

            this._boundKeyDown = this._onKeyDown.bind(this);
            this._boundKeyUp = this._onKeyUp.bind(this);
            this._boundMouseDown = this._onMouseDown.bind(this);
            this._boundMouseUp = this._onMouseUp.bind(this);
            this._boundMouseMove = this._onMouseMove.bind(this);
            this._boundTouchStart = this._onTouchStart.bind(this);
            this._boundTouchEnd = this._onTouchEnd.bind(this);
            this._boundTouchMove = this._onTouchMove.bind(this);

            // 绑定事件
            window.addEventListener('keydown', this._boundKeyDown);
            window.addEventListener('keyup', this._boundKeyUp);
            canvas.addEventListener('mousedown', this._boundMouseDown);
            window.addEventListener('mouseup', this._boundMouseUp);
            canvas.addEventListener('mousemove', this._boundMouseMove);
            canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false });
            window.addEventListener('touchend', this._boundTouchEnd, { passive: false });
            window.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        }

        /**
         * 每帧调用，清理瞬时状态
         * @private
         */
        _update() {
            this.keysDown.clear();
            this.keysUp.clear();
            this.mouse.pressed = false;
            this.mouse.released = false;
            this.touchesStarted.length = 0;
            this.touchesEnded.length = 0;
        }

        /**
         * 将屏幕坐标转换为画布本地坐标
         * @private
         */
        _getLocalPos(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (clientX - rect.left) * (this.canvas.width / rect.width),
                y: (clientY - rect.top) * (this.canvas.height / rect.height)
            };
        }

        _onKeyDown(e) {
            if (!this.keys.get(e.code)) {
                this.keysDown.add(e.code);
            }
            this.keys.set(e.code, true);
        }

        _onKeyUp(e) {
            this.keys.set(e.code, false);
            this.keysUp.add(e.code);
        }

        _onMouseDown(e) {
            this.mouse.down = true;
            this.mouse.pressed = true;
            const pos = this._getLocalPos(e.clientX, e.clientY);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
        }

        _onMouseUp(e) {
            this.mouse.down = false;
            this.mouse.released = true;
        }

        _onMouseMove(e) {
            const pos = this._getLocalPos(e.clientX, e.clientY);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
        }

        _onTouchStart(e) {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const pos = this._getLocalPos(t.clientX, t.clientY);
                const touch = { id: t.identifier, x: pos.x, y: pos.y };
                this.touches.set(t.identifier, touch);
                this.touchesStarted.push(touch);
            }
        }

        _onTouchEnd(e) {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const touch = this.touches.get(t.identifier);
                if (touch) {
                    this.touchesEnded.push(touch);
                    this.touches.delete(t.identifier);
                }
            }
        }

        _onTouchMove(e) {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const touch = this.touches.get(t.identifier);
                if (touch) {
                    const pos = this._getLocalPos(t.clientX, t.clientY);
                    touch.x = pos.x;
                    touch.y = pos.y;
                }
            }
        }

        /**
         * 检测某键是否正被按住
         * @param {string} code 键码，如 'KeyA', 'ArrowUp', 'Space'
         * @returns {boolean}
         */
        isKeyDown(code) {
            return !!this.keys.get(code);
        }

        /**
         * 检测某键是否在本帧刚被按下
         * @param {string} code 键码
         * @returns {boolean}
         */
        isKeyPressed(code) {
            return this.keysDown.has(code);
        }

        /**
         * 检测某键是否在本帧刚被释放
         * @param {string} code 键码
         * @returns {boolean}
         */
        isKeyReleased(code) {
            return this.keysUp.has(code);
        }

        /**
         * 销毁输入管理器，移除事件监听
         */
        destroy() {
            window.removeEventListener('keydown', this._boundKeyDown);
            window.removeEventListener('keyup', this._boundKeyUp);
            this.canvas.removeEventListener('mousedown', this._boundMouseDown);
            window.removeEventListener('mouseup', this._boundMouseUp);
            this.canvas.removeEventListener('mousemove', this._boundMouseMove);
            this.canvas.removeEventListener('touchstart', this._boundTouchStart);
            window.removeEventListener('touchend', this._boundTouchEnd);
            window.removeEventListener('touchmove', this._boundTouchMove);
        }
    }

    // ========================================================================
    // 音频管理器 (AudioManager)
    // ========================================================================

    class AudioManager {
        constructor() {
            this.ctx = null;                // AudioContext 实例
            this._sounds = new Map();       // 音效缓冲区映射
            this._bgm = null;               // 当前背景音乐节点
            this._bgmSource = null;         // 当前背景音乐源
            this._bgmGain = null;           // 背景音乐增益节点
            this._sfxGain = null;           // 音效增益节点
            this._masterGain = null;        // 主增益节点
            this._pools = new Map();        // 音效对象池
            this._enabled = true;
            this._bgmVolume = 1.0;
            this._sfxVolume = 1.0;
            this._masterVolume = 1.0;
        }

        /**
         * 初始化 Web Audio API（必须在用户交互后调用）
         */
        init() {
            if (this.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('[QGE] 当前浏览器不支持 Web Audio API');
                return;
            }
            this.ctx = new AudioContext();
            this._masterGain = this.ctx.createGain();
            this._bgmGain = this.ctx.createGain();
            this._sfxGain = this.ctx.createGain();
            this._masterGain.connect(this.ctx.destination);
            this._bgmGain.connect(this._masterGain);
            this._sfxGain.connect(this._masterGain);
            this._updateVolumes();
        }

        /**
         * 加载音频文件为 AudioBuffer
         * @param {string} key 资源键
         * @param {string} src 音频 URL
         * @returns {Promise<AudioBuffer>}
         */
        load(key, src) {
            if (!this.ctx) this.init();
            return fetch(src)
                .then(r => r.arrayBuffer())
                .then(buf => this.ctx.decodeAudioData(buf))
                .then(buffer => {
                    this._sounds.set(key, buffer);
                    return buffer;
                });
        }

        /**
         * 播放音效
         * @param {string} key 音效键
         * @param {Object} options 选项 {volume, loop}
         */
        playSFX(key, options = {}) {
            if (!this.ctx || !this._enabled) return;
            const buffer = this._sounds.get(key);
            if (!buffer) return;

            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = !!options.loop;

            const gain = this.ctx.createGain();
            gain.gain.value = options.volume !== undefined ? options.volume : 1.0;

            source.connect(gain);
            gain.connect(this._sfxGain);
            source.start(0);

            // 对象池简单实现：保存引用以便停止
            if (!this._pools.has(key)) this._pools.set(key, []);
            this._pools.get(key).push({ source, gain });

            source.onended = () => {
                const arr = this._pools.get(key);
                const idx = arr.findIndex(p => p.source === source);
                if (idx !== -1) arr.splice(idx, 1);
            };
        }

        /**
         * 播放背景音乐
         * @param {string} key 音乐键
         * @param {Object} options 选项 {volume, loop}
         */
        playBGM(key, options = {}) {
            if (!this.ctx || !this._enabled) return;
            this.stopBGM();
            const buffer = this._sounds.get(key);
            if (!buffer) return;

            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = options.loop !== false;

            const gain = this.ctx.createGain();
            gain.gain.value = options.volume !== undefined ? options.volume : 1.0;

            source.connect(gain);
            gain.connect(this._bgmGain);
            source.start(0);

            this._bgmSource = source;
            this._bgm = gain;
        }

        /**
         * 停止背景音乐
         */
        stopBGM() {
            if (this._bgmSource) {
                try { this._bgmSource.stop(); } catch (e) {}
                this._bgmSource = null;
            }
            this._bgm = null;
        }

        /**
         * 设置主音量
         * @param {number} v 音量 [0, 1]
         */
        setMasterVolume(v) {
            this._masterVolume = Utils.clamp(v, 0, 1);
            this._updateVolumes();
        }

        /**
         * 设置背景音乐音量
         * @param {number} v 音量 [0, 1]
         */
        setBGMVolume(v) {
            this._bgmVolume = Utils.clamp(v, 0, 1);
            this._updateVolumes();
        }

        /**
         * 设置音效音量
         * @param {number} v 音量 [0, 1]
         */
        setSFXVolume(v) {
            this._sfxVolume = Utils.clamp(v, 0, 1);
            this._updateVolumes();
        }

        _updateVolumes() {
            if (!this.ctx) return;
            if (this._masterGain) this._masterGain.gain.value = this._masterVolume;
            if (this._bgmGain) this._bgmGain.gain.value = this._bgmVolume;
            if (this._sfxGain) this._sfxGain.gain.value = this._sfxVolume;
        }

        /**
         * 静音/取消静音
         * @param {boolean} mute 是否静音
         */
        mute(mute) {
            this._enabled = !mute;
            if (this._masterGain) {
                this._masterGain.gain.value = mute ? 0 : this._masterVolume;
            }
        }
    }

    // ========================================================================
    // 精灵类 (Sprite)
    // ========================================================================

    class Sprite {
        /**
         * 创建精灵
         * @param {Object} options 配置选项
         */
        constructor(options = {}) {
            this.id = Utils.uid();
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.rotation = options.rotation || 0;
            this.scaleX = options.scaleX !== undefined ? options.scaleX : 1;
            this.scaleY = options.scaleY !== undefined ? options.scaleY : 1;
            this.anchorX = options.anchorX || 0.5;   // 锚点X (0~1)
            this.anchorY = options.anchorY || 0.5;   // 锚点Y (0~1)
            this.texture = options.texture || null;  // HTMLImageElement 或 HTMLCanvasElement
            this.visible = options.visible !== false;
            this.alpha = options.alpha !== undefined ? options.alpha : 1.0;
            this.width = options.width || (this.texture ? this.texture.width : 0);
            this.height = options.height || (this.texture ? this.texture.height : 0);
            this.zIndex = options.zIndex || 0;
            this.active = true;
            this.flipX = false;
            this.flipY = false;

            // 动画相关
            this.animator = null;

            // 物理相关
            this.vx = 0;
            this.vy = 0;
            this.ax = 0;
            this.ay = 0;
            this.friction = options.friction !== undefined ? options.friction : 0;
            this.gravityScale = options.gravityScale !== undefined ? options.gravityScale : 1;
        }

        /**
         * 更新精灵状态
         * @param {number} dt 增量时间
         */
        update(dt) {
            // 应用轻量物理
            this.vx += this.ax * dt;
            this.vy += this.ay * dt;
            this.vx *= (1 - this.friction);
            this.vy *= (1 - this.friction);
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // 更新动画
            if (this.animator) {
                this.animator.update(dt);
            }
        }

        /**
         * 渲染精灵
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         */
        render(ctx) {
            if (!this.visible || this.alpha <= 0) return;
            if (!this.texture) return;

            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.scale(this.flipX ? -this.scaleX : this.scaleX, this.flipY ? -this.scaleY : this.scaleY);

            const w = this.width;
            const h = this.height;
            const drawX = -w * this.anchorX;
            const drawY = -h * this.anchorY;

            if (this.animator && this.animator.currentFrame) {
                // 使用动画帧裁剪绘制
                const frame = this.animator.currentFrame;
                ctx.drawImage(
                    this.texture,
                    frame.x, frame.y, frame.w, frame.h,
                    drawX, drawY, w, h
                );
            } else {
                ctx.drawImage(this.texture, drawX, drawY, w, h);
            }

            ctx.restore();
        }

        /**
         * 获取精灵的世界空间包围盒 (AABB)
         * @returns {{x:number, y:number, w:number, h:number}}
         */
        getBounds() {
            const w = this.width * Math.abs(this.scaleX);
            const h = this.height * Math.abs(this.scaleY);
            return {
                x: this.x - w * this.anchorX,
                y: this.y - h * this.anchorY,
                w: w,
                h: h
            };
        }

        /**
         * 销毁精灵
         */
        destroy() {
            this.texture = null;
            this.animator = null;
        }
    }

    // ========================================================================
    // 动画系统 (Animator & Tween)
    // ========================================================================

    class Animator {
        /**
         * 创建帧动画器
         * @param {Object} options 配置 {frames, fps, loop}
         */
        constructor(options = {}) {
            this.frames = options.frames || []; // 帧数据数组 [{x,y,w,h}, ...]
            this.fps = options.fps || 12;
            this.loop = options.loop !== false;
            this._current = 0;
            this._timer = 0;
            this.currentFrame = this.frames.length > 0 ? this.frames[0] : null;
            this.playing = true;
            this.onComplete = null;
        }

        update(dt) {
            if (!this.playing || this.frames.length === 0) return;
            this._timer += dt;
            const interval = 1 / this.fps;
            while (this._timer >= interval) {
                this._timer -= interval;
                this._current++;
                if (this._current >= this.frames.length) {
                    if (this.loop) {
                        this._current = 0;
                    } else {
                        this._current = this.frames.length - 1;
                        this.playing = false;
                        if (this.onComplete) this.onComplete();
                        break;
                    }
                }
            }
            this.currentFrame = this.frames[this._current];
        }

        play() { this.playing = true; }
        pause() { this.playing = false; }
        reset() { this._current = 0; this._timer = 0; this.currentFrame = this.frames[0]; }
    }

    class Tween {
        /**
         * 创建补间动画
         * @param {Object} target 目标对象
         * @param {Object} to 目标属性值
         * @param {number} duration 持续时间（秒）
         * @param {Object} options 选项 {easing, onComplete, onUpdate}
         */
        constructor(target, to, duration, options = {}) {
            this.target = target;
            this.to = to;
            this.duration = duration;
            this.easing = options.easing || Easing.linear;
            this.onComplete = options.onComplete || null;
            this.onUpdate = options.onUpdate || null;
            this.from = {};
            for (const key in to) {
                this.from[key] = target[key];
            }
            this.elapsed = 0;
            this.finished = false;
        }

        update(dt) {
            if (this.finished) return;
            this.elapsed += dt;
            let t = Math.min(this.elapsed / this.duration, 1);
            t = this.easing(t);
            for (const key in this.to) {
                this.target[key] = Utils.lerp(this.from[key], this.to[key], t);
            }
            if (this.onUpdate) this.onUpdate(this.target);
            if (t >= 1) {
                this.finished = true;
                if (this.onComplete) this.onComplete();
            }
        }
    }

    // ========================================================================
    // 碰撞检测 (Collision)
    // ========================================================================

    const Collision = {
        /**
         * AABB 矩形碰撞检测
         * @param {Object} a 矩形A {x,y,w,h}
         * @param {Object} b 矩形B {x,y,w,h}
         * @returns {boolean}
         */
        aabb: function(a, b) {
            return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        },

        /**
         * 圆形碰撞检测
         * @param {Object} a 圆A {x,y,r}
         * @param {Object} b 圆B {x,y,r}
         * @returns {boolean}
         */
        circle: function(a, b) {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = a.r + b.r;
            return dx * dx + dy * dy < dist * dist;
        },

        /**
         * 矩形与圆碰撞检测
         * @param {Object} rect 矩形 {x,y,w,h}
         * @param {Object} circle 圆 {x,y,r}
         * @returns {boolean}
         */
        rectCircle: function(rect, circle) {
            const closestX = Utils.clamp(circle.x, rect.x, rect.x + rect.w);
            const closestY = Utils.clamp(circle.y, rect.y, rect.y + rect.h);
            const dx = circle.x - closestX;
            const dy = circle.y - closestY;
            return dx * dx + dy * dy < circle.r * circle.r;
        },

        /**
         * 像素级精确碰撞检测（要求精灵具有离屏 canvas 数据）
         * @param {Sprite} spriteA 精灵A
         * @param {Sprite} spriteB 精灵B
         * @param {number} threshold 透明度阈值 0~255
         * @returns {boolean}
         */
        pixelPerfect: function(spriteA, spriteB, threshold = 128) {
            // 简化实现：依赖外部传入的 ImageData 或离屏 canvas
            // 实际使用时需先为精灵生成碰撞掩码数据
            // 此处提供接口占位，开发者可自行扩展
            console.warn('[QGE] pixelPerfect 需要外部掩码数据支持');
            return false;
        }
    };

    // ========================================================================
    // 粒子系统 (ParticleSystem)
    // ========================================================================

    class Particle {
        constructor() {
            this.x = 0; this.y = 0;
            this.vx = 0; this.vy = 0;
            this.life = 1; this.maxLife = 1;
            this.size = 4;
            this.color = '#fff';
            this.alpha = 1;
            this.gravity = 0;
            this.rotation = 0;
            this.rotSpeed = 0;
            this.active = false;
        }

        update(dt) {
            if (!this.active) return;
            this.vy += this.gravity * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.life -= dt;
            this.rotation += this.rotSpeed * dt;
            this.alpha = Math.max(0, this.life / this.maxLife);
            if (this.life <= 0) this.active = false;
        }

        render(ctx) {
            if (!this.active) return;
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        }
    }

    class ParticleEmitter {
        /**
         * 创建粒子发射器
         * @param {Object} options 配置
         */
        constructor(options = {}) {
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.rate = options.rate || 50;         // 每秒发射数量
            this.burst = options.burst || 0;        // 一次性爆发数量
            this.lifeMin = options.lifeMin || 0.5;
            this.lifeMax = options.lifeMax || 1.5;
            this.speedMin = options.speedMin || 20;
            this.speedMax = options.speedMax || 100;
            this.angleMin = options.angleMin || 0;
            this.angleMax = options.angleMax || Math.PI * 2;
            this.gravity = options.gravity || 200;
            this.sizeMin = options.sizeMin || 2;
            this.sizeMax = options.sizeMax || 6;
            this.colors = options.colors || ['#ffffff'];
            this._timer = 0;
            this._accumulator = 0;
            this.active = true;
        }

        emit(system, count) {
            for (let i = 0; i < count; i++) {
                const p = system._getParticle();
                p.x = this.x;
                p.y = this.y;
                const angle = Utils.lerp(this.angleMin, this.angleMax, Math.random());
                const speed = Utils.lerp(this.speedMin, this.speedMax, Math.random());
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.life = Utils.lerp(this.lifeMin, this.lifeMax, Math.random());
                p.maxLife = p.life;
                p.size = Utils.lerp(this.sizeMin, this.sizeMax, Math.random());
                p.color = this.colors[Math.floor(Math.random() * this.colors.length)];
                p.gravity = this.gravity;
                p.rotation = Math.random() * Math.PI * 2;
                p.rotSpeed = (Math.random() - 0.5) * 10;
                p.active = true;
            }
        }

        update(dt, system) {
            if (this.burst > 0) {
                this.emit(system, this.burst);
                this.burst = 0;
            }
            if (!this.active || this.rate <= 0) return;
            this._accumulator += dt;
            const interval = 1 / this.rate;
            while (this._accumulator >= interval) {
                this._accumulator -= interval;
                this.emit(system, 1);
            }
        }
    }

    class ParticleSystem {
        constructor() {
            this.particles = [];
            this.emitters = [];
            this._poolSize = 2000;
            this._poolIndex = 0;
            // 预分配粒子池
            for (let i = 0; i < this._poolSize; i++) {
                this.particles.push(new Particle());
            }
        }

        _getParticle() {
            // 环形缓冲区获取粒子
            let p = this.particles[this._poolIndex];
            this._poolIndex = (this._poolIndex + 1) % this._poolSize;
            p.active = true;
            return p;
        }

        /**
         * 添加发射器
         * @param {ParticleEmitter} emitter 发射器
         */
        addEmitter(emitter) {
            this.emitters.push(emitter);
        }

        /**
         * 移除发射器
         * @param {ParticleEmitter} emitter 发射器
         */
        removeEmitter(emitter) {
            const idx = this.emitters.indexOf(emitter);
            if (idx !== -1) this.emitters.splice(idx, 1);
        }

        update(dt) {
            for (let i = 0; i < this.emitters.length; i++) {
                this.emitters[i].update(dt, this);
            }
            for (let i = 0; i < this.particles.length; i++) {
                this.particles[i].update(dt);
            }
        }

        render(ctx) {
            for (let i = 0; i < this.particles.length; i++) {
                this.particles[i].render(ctx);
            }
        }

        /**
         * 清除所有粒子和发射器
         */
        clear() {
            for (let i = 0; i < this.particles.length; i++) {
                this.particles[i].active = false;
            }
            this.emitters.length = 0;
        }
    }

    // ========================================================================
    // 摄像机 (Camera)
    // ========================================================================

    class Camera {
        /**
         * 创建摄像机
         * @param {number} width 视口宽
         * @param {number} height 视口高
         */
        constructor(width, height) {
            this.x = 0;
            this.y = 0;
            this.zoom = 1.0;
            this.rotation = 0;
            this.width = width;
            this.height = height;
            this.bounds = null;         // 摄像机移动边界 {x,y,w,h}
            this.target = null;         // 跟随目标 {x,y}
            this.smooth = 0.1;          // 跟随平滑系数
            this._shakeDuration = 0;
            this._shakeIntensity = 0;
            this._shakeTimer = 0;
        }

        /**
         * 设置摄像机边界
         * @param {number} x 边界左上角X
         * @param {number} y 边界左上角Y
         * @param {number} w 边界宽
         * @param {number} h 边界高
         */
        setBounds(x, y, w, h) {
            this.bounds = { x, y, w, h };
        }

        /**
         * 设置跟随目标
         * @param {Object} target 目标对象，需有 x, y 属性
         */
        follow(target) {
            this.target = target;
        }

        /**
         * 触发屏幕震动
         * @param {number} intensity 震动强度（像素）
         * @param {number} duration 持续时间（秒）
         */
        shake(intensity, duration) {
            this._shakeIntensity = intensity;
            this._shakeDuration = duration;
            this._shakeTimer = 0;
        }

        update(dt) {
            // 跟随目标
            if (this.target) {
                const targetX = this.target.x - this.width / 2 / this.zoom;
                const targetY = this.target.y - this.height / 2 / this.zoom;
                this.x += (targetX - this.x) * this.smooth;
                this.y += (targetY - this.y) * this.smooth;
            }

            // 应用边界限制
            if (this.bounds) {
                const minX = this.bounds.x;
                const minY = this.bounds.y;
                const maxX = this.bounds.x + this.bounds.w - this.width / this.zoom;
                const maxY = this.bounds.y + this.bounds.h - this.height / this.zoom;
                this.x = Utils.clamp(this.x, minX, maxX);
                this.y = Utils.clamp(this.y, minY, maxY);
            }

            // 震动计时
            if (this._shakeTimer < this._shakeDuration) {
                this._shakeTimer += dt;
            }
        }

        /**
         * 将摄像机变换应用到画布上下文
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         */
        apply(ctx) {
            let sx = 0, sy = 0;
            if (this._shakeTimer < this._shakeDuration) {
                const progress = this._shakeTimer / this._shakeDuration;
                const intensity = this._shakeIntensity * (1 - progress);
                sx = (Math.random() - 0.5) * 2 * intensity;
                sy = (Math.random() - 0.5) * 2 * intensity;
            }

            ctx.translate(this.width / 2 + sx, this.height / 2 + sy);
            ctx.scale(this.zoom, this.zoom);
            ctx.rotate(this.rotation);
            ctx.translate(-this.x - this.width / 2 / this.zoom, -this.y - this.height / 2 / this.zoom);
        }

        /**
         * 将世界坐标转换为屏幕坐标
         * @param {number} wx 世界X
         * @param {number} wy 世界Y
         * @returns {{x:number, y:number}}
         */
        worldToScreen(wx, wy) {
            return {
                x: (wx - this.x) * this.zoom,
                y: (wy - this.y) * this.zoom
            };
        }

        /**
         * 将屏幕坐标转换为世界坐标
         * @param {number} sx 屏幕X
         * @param {number} sy 屏幕Y
         * @returns {{x:number, y:number}}
         */
        screenToWorld(sx, sy) {
            return {
                x: sx / this.zoom + this.x,
                y: sy / this.zoom + this.y
            };
        }
    }

    // ========================================================================
    // 瓦片地图 (Tilemap)
    // ========================================================================

    class Tilemap {
        /**
         * 创建正交瓦片地图
         * @param {Object} options 配置 {tileWidth, tileHeight, width, height}
         */
        constructor(options = {}) {
            this.tileWidth = options.tileWidth || 32;
            this.tileHeight = options.tileHeight || 32;
            this.mapWidth = options.width || 10;
            this.mapHeight = options.height || 10;
            this.layers = [];       // 瓦片图层数组
            this.objects = [];      // 对象层数组
            this.tileset = null;    // 图集纹理
            this.tilesetCols = 1;   // 图集每行瓦片数
        }

        /**
         * 设置图集
         * @param {HTMLImageElement} image 图集图片
         * @param {number} cols 每行瓦片数
         */
        setTileset(image, cols) {
            this.tileset = image;
            this.tilesetCols = cols || Math.floor(image.width / this.tileWidth);
        }

        /**
         * 添加瓦片图层
         * @param {Array<number>} data 一维瓦片索引数组，-1 表示空
         * @param {string} name 图层名称
         */
        addLayer(data, name) {
            this.layers.push({ name: name || `layer_${this.layers.length}`, data: data });
        }

        /**
         * 添加对象层
         * @param {Array<Object>} objects 对象数组 {x,y,w,h,properties}
         * @param {string} name 图层名称
         */
        addObjectLayer(objects, name) {
            this.objects.push({ name: name || `object_${this.objects.length}`, objects: objects || [] });
        }

        /**
         * 获取指定位置的瓦片索引
         * @param {number} layerIndex 图层索引
         * @param {number} tx 瓦片X坐标
         * @param {number} ty 瓦片Y坐标
         * @returns {number} 瓦片索引，-1 表示空
         */
        getTile(layerIndex, tx, ty) {
            if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return -1;
            const layer = this.layers[layerIndex];
            if (!layer) return -1;
            return layer.data[ty * this.mapWidth + tx];
        }

        /**
         * 设置指定位置的瓦片索引
         * @param {number} layerIndex 图层索引
         * @param {number} tx 瓦片X坐标
         * @param {number} ty 瓦片Y坐标
         * @param {number} tileIndex 瓦片索引
         */
        setTile(layerIndex, tx, ty, tileIndex) {
            if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return;
            const layer = this.layers[layerIndex];
            if (!layer) return;
            layer.data[ty * this.mapWidth + tx] = tileIndex;
        }

        /**
         * 渲染地图（仅渲染视口内可见区域）
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         * @param {Camera} camera 摄像机
         */
        render(ctx, camera) {
            if (!this.tileset) return;

            // 计算可见瓦片范围
            const startCol = Math.floor(camera.x / this.tileWidth);
            const startRow = Math.floor(camera.y / this.tileHeight);
            const endCol = Math.ceil((camera.x + camera.width / camera.zoom) / this.tileWidth);
            const endRow = Math.ceil((camera.y + camera.height / camera.zoom) / this.tileHeight);

            const minCol = Math.max(0, startCol);
            const minRow = Math.max(0, startRow);
            const maxCol = Math.min(this.mapWidth - 1, endCol);
            const maxRow = Math.min(this.mapHeight - 1, endRow);

            for (let l = 0; l < this.layers.length; l++) {
                const layer = this.layers[l];
                for (let row = minRow; row <= maxRow; row++) {
                    for (let col = minCol; col <= maxCol; col++) {
                        const idx = layer.data[row * this.mapWidth + col];
                        if (idx < 0) continue;
                        const tsx = (idx % this.tilesetCols) * this.tileWidth;
                        const tsy = Math.floor(idx / this.tilesetCols) * this.tileHeight;
                        const dx = col * this.tileWidth;
                        const dy = row * this.tileHeight;
                        ctx.drawImage(
                            this.tileset,
                            tsx, tsy, this.tileWidth, this.tileHeight,
                            dx, dy, this.tileWidth, this.tileHeight
                        );
                    }
                }
            }
        }

        /**
         * 从 JSON 数据加载地图（兼容 Tiled JSON 格式简化版）
         * @param {Object} json Tiled JSON 对象
         */
        fromJSON(json) {
            this.tileWidth = json.tilewidth || 32;
            this.tileHeight = json.tileheight || 32;
            this.mapWidth = json.width || 10;
            this.mapHeight = json.height || 10;
            this.layers = [];
            this.objects = [];

            if (json.layers) {
                for (let i = 0; i < json.layers.length; i++) {
                    const layer = json.layers[i];
                    if (layer.type === 'tilelayer') {
                        this.addLayer(layer.data, layer.name);
                    } else if (layer.type === 'objectgroup') {
                        this.addObjectLayer(layer.objects, layer.name);
                    }
                }
            }
        }
    }

    // ========================================================================
    // 调试覆盖层 (DebugOverlay)
    // ========================================================================

    class DebugOverlay {
        /**
         * 创建调试覆盖层
         * @param {Core} engine 引擎实例
         */
        constructor(engine) {
            this.engine = engine;
            this.showFPS = true;
            this.showEntityCount = true;
            this.showCollisionBoxes = false;
            this.font = '12px monospace';
            this.color = '#0f0';
        }

        render(ctx) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换到屏幕空间
            ctx.font = this.font;
            ctx.fillStyle = this.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            let y = 10;
            const lineHeight = 16;

            if (this.showFPS) {
                ctx.fillText(`FPS: ${this.engine.getFPS()}`, 10, y);
                y += lineHeight;
                ctx.fillText(`Delta: ${(this.engine.getDeltaTime() * 1000).toFixed(2)} ms`, 10, y);
                y += lineHeight;
            }

            if (this.showEntityCount) {
                const scene = this.engine.scenes.current();
                const count = scene ? scene.entities.length : 0;
                ctx.fillText(`Entities: ${count}`, 10, y);
                y += lineHeight;
                ctx.fillText(`Particles: ${this.engine.particles.particles.filter(p => p.active).length}`, 10, y);
                y += lineHeight;
            }

            // 绘制碰撞盒
            if (this.showCollisionBoxes) {
                const scene = this.engine.scenes.current();
                if (scene) {
                    ctx.strokeStyle = 'rgba(0,255,0,0.5)';
                    ctx.lineWidth = 1;
                    for (let i = 0; i < scene.entities.length; i++) {
                        const e = scene.entities[i];
                        if (e.getBounds) {
                            const b = e.getBounds();
                            ctx.strokeRect(b.x, b.y, b.w, b.h);
                        }
                    }
                }
            }

            ctx.restore();
        }
    }

    // ========================================================================
    // 导出命名空间
    // ========================================================================

    const QGE = {
        version: '1.0.0',
        Core: Core,
        Scene: Scene,
        SceneManager: SceneManager,
        AssetLoader: AssetLoader,
        InputManager: InputManager,
        AudioManager: AudioManager,
        Sprite: Sprite,
        Animator: Animator,
        Tween: Tween,
        ParticleSystem: ParticleSystem,
        ParticleEmitter: ParticleEmitter,
        Camera: Camera,
        Tilemap: Tilemap,
        DebugOverlay: DebugOverlay,
        Collision: Collision,
        Easing: Easing,
        Utils: Utils
    };

    // 兼容模块导出与全局挂载
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = QGE;
    }
    global.QGE = QGE;

})(typeof window !== 'undefined' ? window : this);
