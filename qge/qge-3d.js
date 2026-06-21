/**
 * ============================================================================
 * 青柠游戏引擎 3D 扩展模块 (Qingning Game Engine 3D Module) v2.0
 * ============================================================================
 * 基于 Three.js 的可选 3D 渲染后端，为 QGE 提供 3D 场景、模型、光照、
 * 摄像机及输入拾取等能力。Three.js 采用按需动态导入，不影响 2D 游戏运行。
 *
 * 命名空间: QGE
 * 依赖: three@0.160.0 (ES Module CDN)
 * 作者: Qingning Team
 * 许可: MIT
 * ============================================================================
 */

(function(global) {
    'use strict';

    // ========================================================================
    // Three.js 动态导入与模块缓存
    // ========================================================================

    /** @type {Object|null} Three.js 模块缓存 */
    let _THREE = null;

    /**
     * 动态导入 Three.js 模块（仅首次调用时加载）
     * @returns {Promise<Object>} Three.js 命名空间对象
     */
    async function loadThree() {
        if (_THREE) return _THREE;
        const mod = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
        _THREE = mod;
        return _THREE;
    }

    /**
     * 确保 Three.js 已加载，否则抛出错误
     * @private
     */
    function ensureThree() {
        if (!_THREE) {
            throw new Error('[QGE-3D] Three.js 尚未加载，请先调用 loadThree() 或相关初始化方法');
        }
    }

    // ========================================================================
    // 3D 渲染器 (Renderer3D)
    // ========================================================================

    class Renderer3D {
        /**
         * 创建 3D 渲染器，封装 Three.js WebGLRenderer
         * @param {HTMLCanvasElement} canvas 渲染目标画布
         * @param {Object} options 配置选项
         */
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.options = Object.assign({
                antialias: true,
                alpha: false,
                pixelRatio: window.devicePixelRatio || 1,
                shadowMapEnabled: true,
                shadowMapType: 'PCFSoftShadowMap',
                autoResize: true,
                postProcessing: false
            }, options);

            /** @type {THREE.WebGLRenderer|null} */
            this.renderer = null;
            /** @type {boolean} 是否已初始化 */
            this._initialized = false;
            /** @type {Array<Function>} 后处理通道占位 */
            this._postPasses = [];
        }

        /**
         * 异步初始化 WebGL 渲染器
         * @returns {Promise<Renderer3D>}
         */
        async init() {
            if (this._initialized) return this;
            const THREE = await loadThree();

            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: this.options.antialias,
                alpha: this.options.alpha
            });
            this.renderer.setPixelRatio(this.options.pixelRatio);
            this.renderer.setSize(this.canvas.clientWidth || this.canvas.width, this.canvas.clientHeight || this.canvas.height);

            // 阴影配置
            this.renderer.shadowMap.enabled = this.options.shadowMapEnabled;
            const shadowTypeMap = {
                'BasicShadowMap': THREE.BasicShadowMap,
                'PCFShadowMap': THREE.PCFShadowMap,
                'PCFSoftShadowMap': THREE.PCFSoftShadowMap,
                'VSMShadowMap': THREE.VSMShadowMap
            };
            this.renderer.shadowMap.type = shadowTypeMap[this.options.shadowMapType] || THREE.PCFSoftShadowMap;

            // 色调映射与色彩空间
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;

            this._initialized = true;

            if (this.options.autoResize) {
                window.addEventListener('resize', () => this._onResize());
            }

            return this;
        }

        /**
         * 响应式调整渲染尺寸
         * @private
         */
        _onResize() {
            if (!this.renderer) return;
            const width = this.canvas.clientWidth || this.canvas.width;
            const height = this.canvas.clientHeight || this.canvas.height;
            this.renderer.setSize(width, height, false);
        }

        /**
         * 手动设置渲染尺寸
         * @param {number} width 宽度（像素）
         * @param {number} height 高度（像素）
         */
        setSize(width, height) {
            if (this.renderer) {
                this.renderer.setSize(width, height, false);
            }
        }

        /**
         * 执行一帧渲染
         * @param {THREE.Scene} scene Three.js 场景
         * @param {THREE.Camera} camera Three.js 摄像机
         */
        render(scene, camera) {
            if (!this.renderer) return;
            if (this.options.postProcessing && this._postPasses.length > 0) {
                // 后处理占位：未来可接入 EffectComposer
                console.warn('[QGE-3D] 后处理尚未实现，直接渲染');
            }
            this.renderer.render(scene, camera);
        }

        /**
         * 添加后处理通道占位
         * @param {Function} pass 后处理通道构造函数
         */
        addPostPass(pass) {
            this._postPasses.push(pass);
        }

        /**
         * 清除后处理通道
         */
        clearPostPasses() {
            this._postPasses.length = 0;
        }

        /**
         * 销毁渲染器，释放 WebGL 上下文
         */
        destroy() {
            if (this.renderer) {
                this.renderer.dispose();
                this.renderer.forceContextLoss();
                this.renderer = null;
            }
            this._initialized = false;
        }

        /**
         * 获取渲染器内部尺寸
         * @returns {{width:number, height:number}}
         */
        getSize() {
            if (!this.renderer) return { width: 0, height: 0 };
            const vec2 = new _THREE.Vector2();
            this.renderer.getSize(vec2);
            return { width: vec2.x, height: vec2.y };
        }
    }

    // ========================================================================
    // 3D 场景 (Scene3D)
    // ========================================================================

    class Scene3D extends QGE.Scene {
        /**
         * 创建 3D 场景，继承自 QGE.Scene
         * @param {QGE.Core} engine 引擎实例
         */
        constructor(engine) {
            super(engine);
            /** @type {THREE.Scene|null} */
            this.threeScene = null;
            /** @type {QGE.Renderer3D|null} */
            this.renderer3D = null;
            /** @type {QGE.Camera3D|null} */
            this.camera3D = null;
            this._threeReady = false;
        }

        /**
         * 初始化 3D 场景与渲染器
         * @param {Object} options 渲染器配置
         */
        async init3D(options = {}) {
            await loadThree();
            this.threeScene = new _THREE.Scene();
            this.renderer3D = new Renderer3D(this.engine.canvas, options);
            await this.renderer3D.init();
            this.camera3D = new Camera3D(this.engine.canvas.clientWidth || this.engine.options.width, this.engine.canvas.clientHeight || this.engine.options.height);
            this._threeReady = true;
        }

        /**
         * 向场景添加 Three.js 对象
         * @param {THREE.Object3D} object Three.js 对象
         */
        add(object) {
            if (!this.threeScene) {
                console.warn('[QGE-3D] 场景尚未初始化，无法添加对象');
                return;
            }
            this.threeScene.add(object);
        }

        /**
         * 从场景移除 Three.js 对象
         * @param {THREE.Object3D} object Three.js 对象
         */
        remove(object) {
            if (!this.threeScene) return;
            this.threeScene.remove(object);
        }

        /**
         * 设置场景背景
         * @param {string|number|THREE.Color|THREE.Texture} color 颜色或纹理
         */
        setBackground(color) {
            if (!this.threeScene) return;
            if (typeof color === 'string' || typeof color === 'number') {
                this.threeScene.background = new _THREE.Color(color);
            } else {
                this.threeScene.background = color;
            }
        }

        /**
         * 设置场景雾效
         * @param {number} near 雾起始距离
         * @param {number} far 雾结束距离
         * @param {string|number|THREE.Color} color 雾颜色
         */
        setFog(near, far, color) {
            if (!this.threeScene) return;
            this.threeScene.fog = new _THREE.Fog(new _THREE.Color(color), near, far);
        }

        /**
         * 每帧更新（覆盖父类）
         * @param {number} dt 增量时间（秒）
         */
        update(dt) {
            super.update(dt);
            if (this.camera3D) {
                this.camera3D.update(dt);
            }
        }

        /**
         * 每帧渲染（覆盖父类）
         * @param {CanvasRenderingContext2D} ctx 2D 上下文（3D 模式下不使用）
         */
        render(ctx) {
            if (!this._threeReady || !this.renderer3D || !this.camera3D) {
                // 未就绪时回退到 2D 渲染
                super.render(ctx);
                return;
            }
            this.renderer3D.render(this.threeScene, this.camera3D.camera);
        }

        /**
         * 销毁场景并释放 3D 资源
         */
        destroy() {
            if (this.renderer3D) {
                this.renderer3D.destroy();
                this.renderer3D = null;
            }
            if (this.threeScene) {
                // 递归释放几何体与材质
                this.threeScene.traverse((obj) => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(m => m.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                });
                this.threeScene = null;
            }
            this.camera3D = null;
            this._threeReady = false;
            super.destroy();
        }
    }

    // ========================================================================
    // 3D 摄像机 (Camera3D)
    // ========================================================================

    class Camera3D {
        /**
         * 创建 3D 摄像机
         * @param {number} width 视口宽度
         * @param {number} height 视口高度
         * @param {Object} options 配置 {fov, near, far, orthographic}
         */
        constructor(width, height, options = {}) {
            ensureThree();
            this.width = width;
            this.height = height;
            this.options = Object.assign({
                fov: 75,
                near: 0.1,
                far: 1000,
                orthographic: false,
                orthoSize: 10
            }, options);

            /** @type {THREE.PerspectiveCamera|THREE.OrthographicCamera} */
            this.camera = null;
            this._buildCamera();

            // 跟随参数
            /** @type {THREE.Object3D|null} */
            this._followTarget = null;
            this._followOffset = new _THREE.Vector3(0, 5, 10);
            this._followLerp = 0.1;

            // 震动参数
            this._shakeIntensity = 0;
            this._shakeDuration = 0;
            this._shakeTimer = 0;
            this._shakeOffset = new _THREE.Vector3();
        }

        /**
         * 构建摄像机实例
         * @private
         */
        _buildCamera() {
            const aspect = this.width / this.height || 1;
            if (this.options.orthographic) {
                const s = this.options.orthoSize;
                this.camera = new _THREE.OrthographicCamera(-s * aspect, s * aspect, s, -s, this.options.near, this.options.far);
            } else {
                this.camera = new _THREE.PerspectiveCamera(this.options.fov, aspect, this.options.near, this.options.far);
            }
        }

        /**
         * 调整视口尺寸
         * @param {number} width 新宽度
         * @param {number} height 新高度
         */
        resize(width, height) {
            this.width = width;
            this.height = height;
            const aspect = width / height || 1;
            if (this.camera.isPerspectiveCamera) {
                this.camera.aspect = aspect;
            } else {
                const s = this.options.orthoSize;
                this.camera.left = -s * aspect;
                this.camera.right = s * aspect;
                this.camera.top = s;
                this.camera.bottom = -s;
            }
            this.camera.updateProjectionMatrix();
        }

        /**
         * 设置摄像机看向目标
         * @param {THREE.Vector3|{x:number,y:number,z:number}} target 目标位置
         */
        lookAt(target) {
            if (!this.camera) return;
            const t = target instanceof _THREE.Vector3 ? target : new _THREE.Vector3(target.x || 0, target.y || 0, target.z || 0);
            this.camera.lookAt(t);
        }

        /**
         * 设置平滑跟随目标
         * @param {THREE.Object3D|{x:number,y:number,z:number}} target 跟随目标
         * @param {{x:number,y:number,z:number}} offset 相对偏移
         * @param {number} lerp 平滑系数 [0,1]
         */
        follow(target, offset = { x: 0, y: 5, z: 10 }, lerp = 0.1) {
            this._followTarget = target;
            this._followOffset.set(offset.x || 0, offset.y || 0, offset.z || 0);
            this._followLerp = lerp;
        }

        /**
         * 取消跟随
         */
        unfollow() {
            this._followTarget = null;
        }

        /**
         * 触发屏幕震动
         * @param {number} intensity 震动强度
         * @param {number} duration 持续时间（秒）
         */
        shake(intensity, duration) {
            this._shakeIntensity = intensity;
            this._shakeDuration = duration;
            this._shakeTimer = 0;
        }

        /**
         * 每帧更新摄像机位置与震动
         * @param {number} dt 增量时间（秒）
         */
        update(dt) {
            if (!this.camera) return;

            // 平滑跟随
            if (this._followTarget) {
                const targetPos = this._followTarget.position
                    ? this._followTarget.position.clone()
                    : new _THREE.Vector3(this._followTarget.x || 0, this._followTarget.y || 0, this._followTarget.z || 0);
                const desiredPos = targetPos.add(this._followOffset);
                this.camera.position.lerp(desiredPos, this._followLerp);
            }

            // 震动计算
            if (this._shakeTimer < this._shakeDuration) {
                this._shakeTimer += dt;
                const progress = this._shakeTimer / this._shakeDuration;
                const intensity = this._shakeIntensity * (1 - progress);
                this._shakeOffset.set(
                    (Math.random() - 0.5) * 2 * intensity,
                    (Math.random() - 0.5) * 2 * intensity,
                    (Math.random() - 0.5) * 2 * intensity
                );
                this.camera.position.add(this._shakeOffset);
            } else {
                this._shakeOffset.set(0, 0, 0);
            }
        }

        /**
         * 获取摄像机当前位置副本
         * @returns {THREE.Vector3}
         */
        getPosition() {
            return this.camera.position.clone();
        }

        /**
         * 设置摄像机位置
         * @param {number} x
         * @param {number} y
         * @param {number} z
         */
        setPosition(x, y, z) {
            this.camera.position.set(x, y, z);
        }

        /**
         * 设置摄像机旋转（欧拉角，角度制）
         * @param {number} x
         * @param {number} y
         * @param {number} z
         */
        setRotation(x, y, z) {
            this.camera.rotation.set(
                _THREE.MathUtils.degToRad(x),
                _THREE.MathUtils.degToRad(y),
                _THREE.MathUtils.degToRad(z)
            );
        }
    }

    // ========================================================================
    // 3D 网格工厂 (Mesh3D)
    // ========================================================================

    class Mesh3D {
        /**
         * 创建 Box 网格
         * @param {Object} options 配置 {width, height, depth, material}
         * @returns {THREE.Mesh}
         */
        static createBox(options = {}) {
            ensureThree();
            const w = options.width || 1;
            const h = options.height || 1;
            const d = options.depth || 1;
            const geometry = new _THREE.BoxGeometry(w, h, d);
            const material = Mesh3D._createMaterial(options.material);
            const mesh = new _THREE.Mesh(geometry, material);
            Mesh3D._applyTransform(mesh, options);
            return mesh;
        }

        /**
         * 创建 Sphere 网格
         * @param {Object} options 配置 {radius, widthSegments, heightSegments, material}
         * @returns {THREE.Mesh}
         */
        static createSphere(options = {}) {
            ensureThree();
            const r = options.radius || 1;
            const ws = options.widthSegments || 32;
            const hs = options.heightSegments || 16;
            const geometry = new _THREE.SphereGeometry(r, ws, hs);
            const material = Mesh3D._createMaterial(options.material);
            const mesh = new _THREE.Mesh(geometry, material);
            Mesh3D._applyTransform(mesh, options);
            return mesh;
        }

        /**
         * 创建 Plane 网格
         * @param {Object} options 配置 {width, height, material}
         * @returns {THREE.Mesh}
         */
        static createPlane(options = {}) {
            ensureThree();
            const w = options.width || 1;
            const h = options.height || 1;
            const geometry = new _THREE.PlaneGeometry(w, h);
            const material = Mesh3D._createMaterial(options.material);
            const mesh = new _THREE.Mesh(geometry, material);
            Mesh3D._applyTransform(mesh, options);
            return mesh;
        }

        /**
         * 创建 Cylinder 网格
         * @param {Object} options 配置 {radiusTop, radiusBottom, height, radialSegments, material}
         * @returns {THREE.Mesh}
         */
        static createCylinder(options = {}) {
            ensureThree();
            const rt = options.radiusTop !== undefined ? options.radiusTop : 1;
            const rb = options.radiusBottom !== undefined ? options.radiusBottom : 1;
            const h = options.height || 1;
            const rs = options.radialSegments || 32;
            const geometry = new _THREE.CylinderGeometry(rt, rb, h, rs);
            const material = Mesh3D._createMaterial(options.material);
            const mesh = new _THREE.Mesh(geometry, material);
            Mesh3D._applyTransform(mesh, options);
            return mesh;
        }

        /**
         * 创建 Cone 网格
         * @param {Object} options 配置 {radius, height, radialSegments, material}
         * @returns {THREE.Mesh}
         */
        static createCone(options = {}) {
            ensureThree();
            const r = options.radius || 1;
            const h = options.height || 1;
            const rs = options.radialSegments || 32;
            const geometry = new _THREE.ConeGeometry(r, h, rs);
            const material = Mesh3D._createMaterial(options.material);
            const mesh = new _THREE.Mesh(geometry, material);
            Mesh3D._applyTransform(mesh, options);
            return mesh;
        }

        /**
         * 根据配置创建材质
         * @param {Object|string} config 材质配置或类型字符串
         * @returns {THREE.Material}
         * @private
         */
        static _createMaterial(config) {
            if (config instanceof _THREE.Material) return config;
            const type = (typeof config === 'string' ? config : (config && config.type)) || 'standard';
            const params = typeof config === 'object' && config !== null ? config : {};
            const color = params.color !== undefined ? new _THREE.Color(params.color) : new _THREE.Color(0xffffff);
            switch (type) {
                case 'basic':
                    return new _THREE.MeshBasicMaterial({ color, ...params });
                case 'lambert':
                    return new _THREE.MeshLambertMaterial({ color, ...params });
                case 'phong':
                    return new _THREE.MeshPhongMaterial({ color, ...params });
                case 'standard':
                default:
                    return new _THREE.MeshStandardMaterial({ color, ...params });
            }
        }

        /**
         * 应用变换到网格
         * @param {THREE.Mesh} mesh 目标网格
         * @param {Object} options 配置
         * @private
         */
        static _applyTransform(mesh, options) {
            if (options.position) mesh.position.set(options.position.x || 0, options.position.y || 0, options.position.z || 0);
            if (options.rotation) mesh.rotation.set(options.rotation.x || 0, options.rotation.y || 0, options.rotation.z || 0);
            if (options.scale) mesh.scale.set(options.scale.x !== undefined ? options.scale.x : 1, options.scale.y !== undefined ? options.scale.y : 1, options.scale.z !== undefined ? options.scale.z : 1);
        }

        /**
         * 设置网格位置
         * @param {THREE.Mesh} mesh 目标网格
         * @param {number} x
         * @param {number} y
         * @param {number} z
         */
        static setPosition(mesh, x, y, z) {
            mesh.position.set(x, y, z);
        }

        /**
         * 设置网格旋转（欧拉角，弧度制）
         * @param {THREE.Mesh} mesh 目标网格
         * @param {number} x
         * @param {number} y
         * @param {number} z
         */
        static setRotation(mesh, x, y, z) {
            mesh.rotation.set(x, y, z);
        }

        /**
         * 设置网格缩放
         * @param {THREE.Mesh} mesh 目标网格
         * @param {number} x
         * @param {number} y
         * @param {number} z
         */
        static setScale(mesh, x, y, z) {
            mesh.scale.set(x, y, z);
        }
    }

    // ========================================================================
    // 3D 灯光 (Lights)
    // ========================================================================

    class Lights {
        /**
         * 创建环境光
         * @param {Object} options 配置 {color, intensity}
         * @returns {THREE.AmbientLight}
         */
        static createAmbient(options = {}) {
            ensureThree();
            const color = options.color !== undefined ? new _THREE.Color(options.color) : new _THREE.Color(0xffffff);
            const intensity = options.intensity !== undefined ? options.intensity : 1;
            return new _THREE.AmbientLight(color, intensity);
        }

        /**
         * 创建平行光（支持阴影）
         * @param {Object} options 配置 {color, intensity, position, target, shadow}
         * @returns {THREE.DirectionalLight}
         */
        static createDirectional(options = {}) {
            ensureThree();
            const color = options.color !== undefined ? new _THREE.Color(options.color) : new _THREE.Color(0xffffff);
            const intensity = options.intensity !== undefined ? options.intensity : 1;
            const light = new _THREE.DirectionalLight(color, intensity);
            if (options.position) {
                light.position.set(options.position.x || 0, options.position.y || 1, options.position.z || 0);
            }
            if (options.target) {
                light.target.position.set(options.target.x || 0, options.target.y || 0, options.target.z || 0);
            }
            Lights._configShadow(light, options.shadow);
            return light;
        }

        /**
         * 创建点光源（支持阴影）
         * @param {Object} options 配置 {color, intensity, distance, decay, position, shadow}
         * @returns {THREE.PointLight}
         */
        static createPoint(options = {}) {
            ensureThree();
            const color = options.color !== undefined ? new _THREE.Color(options.color) : new _THREE.Color(0xffffff);
            const intensity = options.intensity !== undefined ? options.intensity : 1;
            const distance = options.distance !== undefined ? options.distance : 0;
            const decay = options.decay !== undefined ? options.decay : 2;
            const light = new _THREE.PointLight(color, intensity, distance, decay);
            if (options.position) {
                light.position.set(options.position.x || 0, options.position.y || 0, options.position.z || 0);
            }
            Lights._configShadow(light, options.shadow);
            return light;
        }

        /**
         * 创建聚光灯（支持阴影）
         * @param {Object} options 配置 {color, intensity, distance, angle, penumbra, decay, position, target, shadow}
         * @returns {THREE.SpotLight}
         */
        static createSpot(options = {}) {
            ensureThree();
            const color = options.color !== undefined ? new _THREE.Color(options.color) : new _THREE.Color(0xffffff);
            const intensity = options.intensity !== undefined ? options.intensity : 1;
            const distance = options.distance !== undefined ? options.distance : 0;
            const angle = options.angle !== undefined ? options.angle : Math.PI / 6;
            const penumbra = options.penumbra !== undefined ? options.penumbra : 0;
            const decay = options.decay !== undefined ? options.decay : 2;
            const light = new _THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
            if (options.position) {
                light.position.set(options.position.x || 0, options.position.y || 1, options.position.z || 0);
            }
            if (options.target) {
                light.target.position.set(options.target.x || 0, options.target.y || 0, options.target.z || 0);
            }
            Lights._configShadow(light, options.shadow);
            return light;
        }

        /**
         * 配置灯光阴影参数
         * @param {THREE.Light} light 灯光对象
         * @param {Object|boolean} shadow 阴影配置
         * @private
         */
        static _configShadow(light, shadow) {
            if (!shadow) return;
            light.castShadow = true;
            if (typeof shadow === 'object') {
                light.shadow.mapSize.width = shadow.mapSizeWidth || 1024;
                light.shadow.mapSize.height = shadow.mapSizeHeight || 1024;
                light.shadow.camera.near = shadow.cameraNear !== undefined ? shadow.cameraNear : 0.5;
                light.shadow.camera.far = shadow.cameraFar !== undefined ? shadow.cameraFar : 500;
                if (shadow.cameraSize !== undefined && light.shadow.camera.left !== undefined) {
                    const s = shadow.cameraSize;
                    light.shadow.camera.left = -s;
                    light.shadow.camera.right = s;
                    light.shadow.camera.top = s;
                    light.shadow.camera.bottom = -s;
                }
                light.shadow.bias = shadow.bias !== undefined ? shadow.bias : -0.001;
            }
        }
    }

    // ========================================================================
    // 3D 资源加载器 (Loader3D)
    // ========================================================================

    class Loader3D {
        /**
         * 创建 3D 资源加载器
         */
        constructor() {
            /** @type {Map<string, THREE.Texture>} */
            this._textures = new Map();
            /** @type {Map<string, THREE.Group|THREE.Object3D>} */
            this._models = new Map();
            this._loadingManager = null;
        }

        /**
         * 获取或创建加载管理器
         * @returns {THREE.LoadingManager}
         * @private
         */
        _getManager(onProgress) {
            ensureThree();
            if (!this._loadingManager) {
                this._loadingManager = new _THREE.LoadingManager();
            }
            if (onProgress) {
                this._loadingManager.onProgress = (url, loaded, total) => {
                    onProgress(loaded, total, loaded / total);
                };
            }
            return this._loadingManager;
        }

        /**
         * 加载纹理
         * @param {string} url 纹理 URL
         * @param {Function} onProgress 进度回调 (loaded, total, percent)
         * @returns {Promise<THREE.Texture>}
         */
        async loadTexture(url, onProgress) {
            ensureThree();
            if (this._textures.has(url)) return this._textures.get(url);
            const manager = this._getManager(onProgress);
            return new Promise((resolve, reject) => {
                const loader = new _THREE.TextureLoader(manager);
                loader.load(url, (texture) => {
                    texture.colorSpace = _THREE.SRGBColorSpace;
                    this._textures.set(url, texture);
                    resolve(texture);
                }, undefined, (err) => {
                    reject(new Error(`[QGE-3D] 纹理加载失败: ${url}`));
                });
            });
        }

        /**
         * 加载 OBJ 模型
         * @param {string} url OBJ 文件 URL
         * @param {Function} onProgress 进度回调
         * @returns {Promise<THREE.Group>}
         */
        async loadOBJ(url, onProgress) {
            ensureThree();
            if (this._models.has(url)) return this._models.get(url);
            // 动态导入 OBJLoader
            const mod = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js');
            const OBJLoader = mod.OBJLoader;
            const manager = this._getManager(onProgress);
            return new Promise((resolve, reject) => {
                const loader = new OBJLoader(manager);
                loader.load(url, (group) => {
                    this._models.set(url, group);
                    resolve(group);
                }, undefined, (err) => {
                    reject(new Error(`[QGE-3D] OBJ 加载失败: ${url}`));
                });
            });
        }

        /**
         * 加载 GLTF/GLB 模型
         * @param {string} url GLTF/GLB 文件 URL
         * @param {Function} onProgress 进度回调
         * @returns {Promise<THREE.Group>}
         */
        async loadGLTF(url, onProgress) {
            ensureThree();
            if (this._models.has(url)) return this._models.get(url);
            // 动态导入 GLTFLoader
            const mod = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
            const GLTFLoader = mod.GLTFLoader;
            const manager = this._getManager(onProgress);
            return new Promise((resolve, reject) => {
                const loader = new GLTFLoader(manager);
                loader.load(url, (gltf) => {
                    const scene = gltf.scene;
                    this._models.set(url, scene);
                    resolve(scene);
                }, undefined, (err) => {
                    reject(new Error(`[QGE-3D] GLTF 加载失败: ${url}`));
                });
            });
        }

        /**
         * 获取已加载的纹理
         * @param {string} url 纹理 URL
         * @returns {THREE.Texture|undefined}
         */
        getTexture(url) {
            return this._textures.get(url);
        }

        /**
         * 获取已加载的模型
         * @param {string} url 模型 URL
         * @returns {THREE.Group|undefined}
         */
        getModel(url) {
            return this._models.get(url);
        }

        /**
         * 释放已加载的资源
         * @param {string} [url] 指定 URL，不传则全部释放
         */
        dispose(url) {
            if (url) {
                const tex = this._textures.get(url);
                if (tex) { tex.dispose(); this._textures.delete(url); }
                const model = this._models.get(url);
                if (model) {
                    model.traverse((obj) => {
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                            else obj.material.dispose();
                        }
                    });
                    this._models.delete(url);
                }
            } else {
                this._textures.forEach(t => t.dispose());
                this._textures.clear();
                this._models.forEach(m => {
                    m.traverse((obj) => {
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) obj.material.forEach(mat => mat.dispose());
                            else obj.material.dispose();
                        }
                    });
                });
                this._models.clear();
            }
        }
    }

    // ========================================================================
    // 3D 输入扩展 (Input3D)
    // ========================================================================

    class Input3D extends QGE.InputManager {
        /**
         * 创建 3D 输入管理器，继承自 QGE.InputManager
         * @param {HTMLCanvasElement} canvas 游戏画布
         * @param {QGE.Camera3D} camera3D 3D 摄像机实例
         */
        constructor(canvas, camera3D) {
            super(canvas);
            this.camera3D = camera3D;
            /** @type {THREE.Raycaster|null} */
            this._raycaster = null;
            /** @type {THREE.Vector2|null} */
            this._mouseNDC = null;
        }

        /**
         * 初始化 Raycaster（延迟到首次使用时创建）
         * @private
         */
        _initRaycaster() {
            if (!this._raycaster) {
                ensureThree();
                this._raycaster = new _THREE.Raycaster();
                this._mouseNDC = new _THREE.Vector2();
            }
        }

        /**
         * 将屏幕坐标转换为归一化设备坐标 (NDC)
         * @param {number} x 屏幕 X（像素）
         * @param {number} y 屏幕 Y（像素）
         * @returns {THREE.Vector2}
         * @private
         */
        _toNDC(x, y) {
            const rect = this.canvas.getBoundingClientRect();
            const ndcX = ((x - rect.left) / rect.width) * 2 - 1;
            const ndcY = -((y - rect.top) / rect.height) * 2 + 1;
            return new _THREE.Vector2(ndcX, ndcY);
        }

        /**
         * 获取鼠标/触摸位置与指定对象的射线检测交集
         * @param {number} x 屏幕 X 坐标（像素，可选，默认使用当前鼠标位置）
         * @param {number} y 屏幕 Y 坐标（像素，可选，默认使用当前鼠标位置）
         * @param {Array<THREE.Object3D>} objects 待检测对象数组
         * @param {boolean} recursive 是否递归检测子对象
         * @returns {Array<THREE.Intersection>} 交集数组，按距离排序
         */
        getIntersectedObjects(x, y, objects, recursive = true) {
            this._initRaycaster();
            if (!this.camera3D || !this.camera3D.camera) return [];

            const ndc = (x !== undefined && y !== undefined) ? this._toNDC(x, y) : this._toNDC(this.mouse.x, this.mouse.y);
            this._raycaster.setFromCamera(ndc, this.camera3D.camera);
            return this._raycaster.intersectObjects(objects, recursive);
        }

        /**
         * 检测鼠标当前是否悬停在某个对象上
         * @param {Array<THREE.Object3D>} objects 待检测对象数组
         * @param {boolean} recursive 是否递归检测子对象
         * @returns {THREE.Object3D|null} 首个命中的对象，无则返回 null
         */
        getHoveredObject(objects, recursive = true) {
            const hits = this.getIntersectedObjects(undefined, undefined, objects, recursive);
            return hits.length > 0 ? hits[0].object : null;
        }

        /**
         * 检测鼠标点击时是否命中某个对象
         * @param {Array<THREE.Object3D>} objects 待检测对象数组
         * @param {boolean} recursive 是否递归检测子对象
         * @returns {THREE.Object3D|null} 首个命中的对象，无则返回 null
         */
        getClickedObject(objects, recursive = true) {
            if (!this.mouse.pressed) return null;
            const hits = this.getIntersectedObjects(undefined, undefined, objects, recursive);
            return hits.length > 0 ? hits[0].object : null;
        }
    }

    // ========================================================================
    // 导出 3D 模块到 QGE 命名空间
    // ========================================================================

    const QGE3D = {
        version: '2.0.0-3d',
        loadThree: loadThree,
        Renderer3D: Renderer3D,
        Scene3D: Scene3D,
        Camera3D: Camera3D,
        Mesh3D: Mesh3D,
        Lights: Lights,
        Loader3D: Loader3D,
        Input3D: Input3D
    };

    // 挂载到全局 QGE 命名空间（若已存在则合并）
    if (typeof global.QGE !== 'undefined') {
        Object.assign(global.QGE, QGE3D);
    } else {
        global.QGE = QGE3D;
    }

    // 兼容模块导出
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = QGE3D;
    }

})(typeof window !== 'undefined' ? window : this);
