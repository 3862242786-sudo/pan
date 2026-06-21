/**
 * ============================================================================
 * 青柠游戏内核 UI 组件模块 (QGE.UI) v1.0
 * ============================================================================
 * 提供游戏开发中常用的 UI 控件：按钮、标签、进度条、面板、对话框及虚拟摇杆。
 * 所有组件均基于 HTML5 Canvas 渲染，无外部依赖，与 QGE 核心引擎协同工作。
 *
 * 命名空间: QGE.UI
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

    function isPointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }

    // ========================================================================
    // UI 组件基类 (UIElement)
    // ========================================================================

    class UIElement {
        /**
         * 创建 UI 元素基类
         * @param {Object} options 配置选项
         */
        constructor(options = {}) {
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.width = options.width || 100;
            this.height = options.height || 40;
            this.visible = options.visible !== false;
            this.alpha = options.alpha !== undefined ? options.alpha : 1.0;
            this.zIndex = options.zIndex || 0;
            this.enabled = options.enabled !== false;
            this.parent = null;         // 父容器引用
            this.children = [];         // 子元素列表
        }

        /**
         * 添加子元素
         * @param {UIElement} child 子元素
         */
        addChild(child) {
            if (child.parent) child.parent.removeChild(child);
            child.parent = this;
            this.children.push(child);
            this.children.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        }

        /**
         * 移除子元素
         * @param {UIElement} child 子元素
         */
        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx !== -1) {
                this.children.splice(idx, 1);
                child.parent = null;
            }
        }

        /**
         * 获取元素在世界空间中的绝对坐标
         * @returns {{x:number, y:number}}
         */
        getGlobalPosition() {
            let x = this.x;
            let y = this.y;
            let p = this.parent;
            while (p) {
                x += p.x;
                y += p.y;
                p = p.parent;
            }
            return { x, y };
        }

        /**
         * 检测点是否命中本元素
         * @param {number} x 点X
         * @param {number} y 点Y
         * @returns {boolean}
         */
        hitTest(x, y) {
            if (!this.visible || !this.enabled) return false;
            const pos = this.getGlobalPosition();
            return isPointInRect(x, y, pos.x, pos.y, this.width, this.height);
        }

        /**
         * 每帧更新逻辑，子类可重写
         * @param {number} dt 增量时间（秒）
         */
        update(dt) {
            for (let i = 0; i < this.children.length; i++) {
                if (this.children[i].update) this.children[i].update(dt);
            }
        }

        /**
         * 渲染元素，子类必须重写
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         */
        render(ctx) {
            if (!this.visible || this.alpha <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.alpha;
            this._renderSelf(ctx);
            // 渲染子元素
            for (let i = 0; i < this.children.length; i++) {
                this.children[i].render(ctx);
            }
            ctx.restore();
        }

        /**
         * 子类重写此方法实现自身渲染
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         * @protected
         */
        _renderSelf(ctx) {
            // 基类默认无渲染内容
        }

        /**
         * 销毁元素，清理资源
         */
        destroy() {
            for (let i = this.children.length - 1; i >= 0; i--) {
                this.children[i].destroy();
            }
            this.children.length = 0;
            if (this.parent) this.parent.removeChild(this);
        }
    }

    // ========================================================================
    // 按钮组件 (Button)
    // ========================================================================

    class Button extends UIElement {
        /**
         * 创建按钮
         * @param {Object} options 配置
         *   - text: 按钮文本
         *   - font: 字体样式，默认 '16px sans-serif'
         *   - textColor: 文本颜色
         *   - bgColor: 背景颜色
         *   - hoverColor: 悬停背景色
         *   - pressColor: 按下背景色
         *   - borderColor: 边框颜色
         *   - borderWidth: 边框宽度
         *   - radius: 圆角半径
         *   - image: 背景图片 (HTMLImageElement)
         *   - hoverImage: 悬停背景图
         *   - pressImage: 按下背景图
         *   - onClick: 点击回调函数
         */
        constructor(options = {}) {
            super(options);
            this.text = options.text || '';
            this.font = options.font || '16px sans-serif';
            this.textColor = options.textColor || '#ffffff';
            this.bgColor = options.bgColor || '#4a90d9';
            this.hoverColor = options.hoverColor || '#357abd';
            this.pressColor = options.pressColor || '#2a5f9e';
            this.borderColor = options.borderColor || '#ffffff';
            this.borderWidth = options.borderWidth || 0;
            this.radius = options.radius || 4;
            this.image = options.image || null;
            this.hoverImage = options.hoverImage || null;
            this.pressImage = options.pressImage || null;
            this.onClick = options.onClick || null;

            this._state = 'normal';     // normal / hover / pressed
            this._pressed = false;
        }

        /**
         * 处理指针按下事件
         * @param {number} x 指针X
         * @param {number} y 指针Y
         */
        onPointerDown(x, y) {
            if (!this.enabled) return;
            if (this.hitTest(x, y)) {
                this._pressed = true;
                this._state = 'pressed';
            }
        }

        /**
         * 处理指针释放事件
         * @param {number} x 指针X
         * @param {number} y 指针Y
         */
        onPointerUp(x, y) {
            if (!this.enabled) return;
            if (this._pressed && this.hitTest(x, y)) {
                if (this.onClick) this.onClick();
            }
            this._pressed = false;
            this._state = this.hitTest(x, y) ? 'hover' : 'normal';
        }

        /**
         * 处理指针移动事件
         * @param {number} x 指针X
         * @param {number} y 指针Y
         */
        onPointerMove(x, y) {
            if (!this.enabled) return;
            if (this._pressed) {
                this._state = this.hitTest(x, y) ? 'pressed' : 'normal';
            } else {
                this._state = this.hitTest(x, y) ? 'hover' : 'normal';
            }
        }

        _renderSelf(ctx) {
            const pos = this.getGlobalPosition();
            const x = pos.x;
            const y = pos.y;

            // 选择当前状态对应的图片或颜色
            let img = null;
            let bg = this.bgColor;
            if (this._state === 'hover') {
                bg = this.hoverColor;
                img = this.hoverImage;
            } else if (this._state === 'pressed') {
                bg = this.pressColor;
                img = this.pressImage;
            } else {
                img = this.image;
            }

            ctx.save();

            // 绘制背景
            if (img) {
                ctx.drawImage(img, x, y, this.width, this.height);
            } else {
                ctx.fillStyle = bg;
                if (this.radius > 0) {
                    ctx.beginPath();
                    ctx.moveTo(x + this.radius, y);
                    ctx.lineTo(x + this.width - this.radius, y);
                    ctx.quadraticCurveTo(x + this.width, y, x + this.width, y + this.radius);
                    ctx.lineTo(x + this.width, y + this.height - this.radius);
                    ctx.quadraticCurveTo(x + this.width, y + this.height, x + this.width - this.radius, y + this.height);
                    ctx.lineTo(x + this.radius, y + this.height);
                    ctx.quadraticCurveTo(x, y + this.height, x, y + this.height - this.radius);
                    ctx.lineTo(x, y + this.radius);
                    ctx.quadraticCurveTo(x, y, x + this.radius, y);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, this.width, this.height);
                }
            }

            // 绘制边框
            if (this.borderWidth > 0) {
                ctx.strokeStyle = this.borderColor;
                ctx.lineWidth = this.borderWidth;
                if (this.radius > 0) {
                    ctx.stroke();
                } else {
                    ctx.strokeRect(x, y, this.width, this.height);
                }
            }

            // 绘制文本
            if (this.text) {
                ctx.fillStyle = this.textColor;
                ctx.font = this.font;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const textY = this._state === 'pressed' ? y + this.height / 2 + 1 : y + this.height / 2;
                ctx.fillText(this.text, x + this.width / 2, textY);
            }

            ctx.restore();
        }
    }

    // ========================================================================
    // 标签组件 (Label)
    // ========================================================================

    class Label extends UIElement {
        /**
         * 创建文本标签
         * @param {Object} options 配置
         *   - text: 显示文本
         *   - font: 字体样式
         *   - color: 文本颜色
         *   - align: 水平对齐 'left'|'center'|'right'
         *   - baseline: 垂直对齐 'top'|'middle'|'bottom'
         *   - outlineColor: 描边颜色
         *   - outlineWidth: 描边宽度
         *   - shadowColor: 阴影颜色
         *   - shadowBlur: 阴影模糊度
         *   - shadowOffsetX: 阴影X偏移
         *   - shadowOffsetY: 阴影Y偏移
         *   - lineHeight: 多行文本行高
         *   - maxWidth: 最大宽度，超出自动换行
         */
        constructor(options = {}) {
            super(options);
            this.text = options.text || '';
            this.font = options.font || '16px sans-serif';
            this.color = options.color || '#ffffff';
            this.align = options.align || 'left';
            this.baseline = options.baseline || 'top';
            this.outlineColor = options.outlineColor || null;
            this.outlineWidth = options.outlineWidth || 0;
            this.shadowColor = options.shadowColor || null;
            this.shadowBlur = options.shadowBlur || 0;
            this.shadowOffsetX = options.shadowOffsetX || 0;
            this.shadowOffsetY = options.shadowOffsetY || 0;
            this.lineHeight = options.lineHeight || 20;
            this.maxWidth = options.maxWidth || null;
        }

        /**
         * 计算文本在给定宽度下应如何换行
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         * @param {string} text 原始文本
         * @param {number} maxWidth 最大宽度
         * @returns {Array<string>} 分行后的文本数组
         */
        _wrapText(ctx, text, maxWidth) {
            const words = text.split('');
            const lines = [];
            let currentLine = '';
            for (let i = 0; i < words.length; i++) {
                const testLine = currentLine + words[i];
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine);
            return lines;
        }

        _renderSelf(ctx) {
            const pos = this.getGlobalPosition();
            const x = pos.x;
            const y = pos.y;

            ctx.save();
            ctx.font = this.font;
            ctx.textAlign = this.align;
            ctx.textBaseline = this.baseline;
            ctx.fillStyle = this.color;

            if (this.shadowColor) {
                ctx.shadowColor = this.shadowColor;
                ctx.shadowBlur = this.shadowBlur;
                ctx.shadowOffsetX = this.shadowOffsetX;
                ctx.shadowOffsetY = this.shadowOffsetY;
            }

            let lines = [this.text];
            if (this.maxWidth && this.maxWidth > 0) {
                lines = this._wrapText(ctx, this.text, this.maxWidth);
            }

            for (let i = 0; i < lines.length; i++) {
                const lineY = y + i * this.lineHeight;
                if (this.outlineWidth > 0 && this.outlineColor) {
                    ctx.lineWidth = this.outlineWidth;
                    ctx.strokeStyle = this.outlineColor;
                    ctx.strokeText(lines[i], x, lineY);
                }
                ctx.fillText(lines[i], x, lineY);
            }

            ctx.restore();
        }
    }

    // ========================================================================
    // 进度条组件 (ProgressBar)
    // ========================================================================

    class ProgressBar extends UIElement {
        /**
         * 创建进度条
         * @param {Object} options 配置
         *   - value: 当前值
         *   - max: 最大值
         *   - min: 最小值，默认 0
         *   - bgColor: 背景条颜色
         *   - fillColor: 填充颜色
         *   - borderColor: 边框颜色
         *   - borderWidth: 边框宽度
         *   - radius: 圆角半径
         *   - showText: 是否显示百分比文本
         *   - textColor: 文本颜色
         *   - font: 文本字体
         *   - vertical: 是否为垂直进度条
         */
        constructor(options = {}) {
            super(options);
            this.value = options.value !== undefined ? options.value : 50;
            this.max = options.max !== undefined ? options.max : 100;
            this.min = options.min !== undefined ? options.min : 0;
            this.bgColor = options.bgColor || '#333333';
            this.fillColor = options.fillColor || '#4caf50';
            this.borderColor = options.borderColor || '#555555';
            this.borderWidth = options.borderWidth || 1;
            this.radius = options.radius || 0;
            this.showText = options.showText !== false;
            this.textColor = options.textColor || '#ffffff';
            this.font = options.font || '12px sans-serif';
            this.vertical = options.vertical || false;
        }

        /**
         * 设置进度值
         * @param {number} val 新值
         */
        setValue(val) {
            this.value = clamp(val, this.min, this.max);
        }

        /**
         * 获取当前百分比 [0, 1]
         * @returns {number}
         */
        getPercent() {
            if (this.max === this.min) return 0;
            return (this.value - this.min) / (this.max - this.min);
        }

        _renderSelf(ctx) {
            const pos = this.getGlobalPosition();
            const x = pos.x;
            const y = pos.y;
            const percent = this.getPercent();

            ctx.save();

            // 绘制背景槽
            ctx.fillStyle = this.bgColor;
            if (this.radius > 0) {
                ctx.beginPath();
                roundRectPath(ctx, x, y, this.width, this.height, this.radius);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, this.width, this.height);
            }

            // 绘制填充条
            ctx.fillStyle = this.fillColor;
            if (this.vertical) {
                const fillH = this.height * percent;
                if (this.radius > 0) {
                    ctx.beginPath();
                    roundRectPath(ctx, x, y + this.height - fillH, this.width, fillH, this.radius);
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y + this.height - fillH, this.width, fillH);
                }
            } else {
                const fillW = this.width * percent;
                if (this.radius > 0) {
                    ctx.beginPath();
                    roundRectPath(ctx, x, y, fillW, this.height, this.radius);
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, fillW, this.height);
                }
            }

            // 绘制边框
            if (this.borderWidth > 0) {
                ctx.strokeStyle = this.borderColor;
                ctx.lineWidth = this.borderWidth;
                if (this.radius > 0) {
                    ctx.beginPath();
                    roundRectPath(ctx, x, y, this.width, this.height, this.radius);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(x, y, this.width, this.height);
                }
            }

            // 绘制百分比文本
            if (this.showText) {
                ctx.fillStyle = this.textColor;
                ctx.font = this.font;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const text = Math.round(percent * 100) + '%';
                ctx.fillText(text, x + this.width / 2, y + this.height / 2);
            }

            ctx.restore();
        }
    }

    // ========================================================================
    // 面板组件 (Panel)
    // ========================================================================

    class Panel extends UIElement {
        /**
         * 创建容器面板
         * @param {Object} options 配置
         *   - bgColor: 背景颜色
         *   - borderColor: 边框颜色
         *   - borderWidth: 边框宽度
         *   - radius: 圆角半径
         *   - padding: 内边距 {top,right,bottom,left} 或统一数值
         *   - image: 背景图片
         *   - imageMode: 图片绘制模式 'stretch'|'repeat'|'fit'
         */
        constructor(options = {}) {
            super(options);
            this.bgColor = options.bgColor || 'rgba(0,0,0,0.5)';
            this.borderColor = options.borderColor || '#ffffff';
            this.borderWidth = options.borderWidth || 0;
            this.radius = options.radius || 0;
            this.image = options.image || null;
            this.imageMode = options.imageMode || 'stretch';

            const p = options.padding;
            if (typeof p === 'number') {
                this.padding = { top: p, right: p, bottom: p, left: p };
            } else {
                this.padding = {
                    top: p?.top || 0,
                    right: p?.right || 0,
                    bottom: p?.bottom || 0,
                    left: p?.left || 0
                };
            }
        }

        _renderSelf(ctx) {
            const pos = this.getGlobalPosition();
            const x = pos.x;
            const y = pos.y;

            ctx.save();

            if (this.image) {
                if (this.imageMode === 'stretch') {
                    ctx.drawImage(this.image, x, y, this.width, this.height);
                } else if (this.imageMode === 'repeat') {
                    ctx.fillStyle = ctx.createPattern(this.image, 'repeat');
                    ctx.fillRect(x, y, this.width, this.height);
                } else if (this.imageMode === 'fit') {
                    const scale = Math.min(this.width / this.image.width, this.height / this.image.height);
                    const dw = this.image.width * scale;
                    const dh = this.image.height * scale;
                    const dx = x + (this.width - dw) / 2;
                    const dy = y + (this.height - dh) / 2;
                    ctx.drawImage(this.image, dx, dy, dw, dh);
                }
            } else if (this.bgColor) {
                ctx.fillStyle = this.bgColor;
                if (this.radius > 0) {
                    ctx.beginPath();
                    roundRectPath(ctx, x, y, this.width, this.height, this.radius);
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, this.width, this.height);
                }
            }

            if (this.borderWidth > 0 && this.borderColor) {
                ctx.strokeStyle = this.borderColor;
                ctx.lineWidth = this.borderWidth;
                if (this.radius > 0) {
                    ctx.beginPath();
                    roundRectPath(ctx, x, y, this.width, this.height, this.radius);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(x, y, this.width, this.height);
                }
            }

            ctx.restore();
        }
    }

    // ========================================================================
    // 对话框组件 (Dialog)
    // ========================================================================

    class Dialog extends Panel {
        /**
         * 创建模态对话框
         * @param {Object} options 配置
         *   - title: 对话框标题
         *   - message: 正文消息
         *   - titleFont: 标题字体
         *   - titleColor: 标题颜色
         *   - messageFont: 正文字体
         *   - messageColor: 正文颜色
         *   - buttonWidth: 按钮宽度
         *   - buttonHeight: 按钮高度
         *   - buttons: 按钮定义数组 [{text, onClick}]
         *   - modalColor: 模态遮罩颜色
         *   - autoSize: 是否根据内容自动调整尺寸
         */
        constructor(options = {}) {
            super(options);
            this.title = options.title || '';
            this.message = options.message || '';
            this.titleFont = options.titleFont || 'bold 18px sans-serif';
            this.titleColor = options.titleColor || '#ffffff';
            this.messageFont = options.messageFont || '14px sans-serif';
            this.messageColor = options.messageColor || '#dddddd';
            this.buttonWidth = options.buttonWidth || 80;
            this.buttonHeight = options.buttonHeight || 32;
            this.modalColor = options.modalColor || 'rgba(0,0,0,0.6)';
            this.autoSize = options.autoSize !== false;

            this._buttons = [];
            this._buildButtons(options.buttons || []);
        }

        _buildButtons(defs) {
            // 清除旧按钮
            for (let i = this._buttons.length - 1; i >= 0; i--) {
                this.removeChild(this._buttons[i]);
            }
            this._buttons.length = 0;

            const count = defs.length;
            if (count === 0) return;

            const totalBtnWidth = count * this.buttonWidth + (count - 1) * 10;
            const startX = (this.width - totalBtnWidth) / 2;
            const btnY = this.height - this.buttonHeight - 20;

            for (let i = 0; i < count; i++) {
                const def = defs[i];
                const btn = new Button({
                    x: startX + i * (this.buttonWidth + 10),
                    y: btnY,
                    width: this.buttonWidth,
                    height: this.buttonHeight,
                    text: def.text || 'OK',
                    onClick: () => {
                        if (def.onClick) def.onClick();
                        this.hide();
                    }
                });
                this.addChild(btn);
                this._buttons.push(btn);
            }
        }

        /**
         * 显示对话框
         */
        show() {
            this.visible = true;
            this.enabled = true;
        }

        /**
         * 隐藏对话框
         */
        hide() {
            this.visible = false;
            this.enabled = false;
        }

        /**
         * 设置对话框内容
         * @param {string} title 标题
         * @param {string} message 正文
         * @param {Array<Object>} buttons 按钮定义
         */
        setContent(title, message, buttons) {
            this.title = title || '';
            this.message = message || '';
            if (buttons) this._buildButtons(buttons);
        }

        _renderSelf(ctx) {
            // 绘制模态遮罩（全屏）
            if (this.modalColor) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.fillStyle = this.modalColor;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.restore();
            }

            // 绘制面板背景
            super._renderSelf(ctx);

            const pos = this.getGlobalPosition();
            const x = pos.x;
            const y = pos.y;
            const pad = this.padding;

            ctx.save();

            // 绘制标题
            if (this.title) {
                ctx.fillStyle = this.titleColor;
                ctx.font = this.titleFont;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(this.title, x + this.width / 2, y + pad.top);
            }

            // 绘制正文
            if (this.message) {
                ctx.fillStyle = this.messageColor;
                ctx.font = this.messageFont;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                const textX = x + pad.left;
                const textY = y + pad.top + (this.title ? 30 : 0);
                const maxTextWidth = this.width - pad.left - pad.right;
                const lines = wrapLines(ctx, this.message, maxTextWidth);
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i], textX, textY + i * 20);
                }
            }

            ctx.restore();
        }
    }

    // ========================================================================
    // 虚拟摇杆组件 (VirtualJoystick)
    // ========================================================================

    class VirtualJoystick extends UIElement {
        /**
         * 创建虚拟摇杆（适用于移动端触摸控制）
         * @param {Object} options 配置
         *   - radius: 摇杆底座半径
         *   - stickRadius: 摇杆头半径
         *   - baseColor: 底座颜色
         *   - stickColor: 摇杆头颜色
         *   - baseAlpha: 底座透明度
         *   - stickAlpha: 摇杆头透明度
         *   - maxDistance: 摇杆头最大偏移距离
         *   - onChange: 方向变化回调 (dx, dy) 归一化向量
         *   - onEnd: 释放回调
         */
        constructor(options = {}) {
            super(options);
            this.radius = options.radius || 60;
            this.stickRadius = options.stickRadius || 25;
            this.baseColor = options.baseColor || 'rgba(255,255,255,0.3)';
            this.stickColor = options.stickColor || 'rgba(255,255,255,0.6)';
            this.baseAlpha = options.baseAlpha !== undefined ? options.baseAlpha : 1;
            this.stickAlpha = options.stickAlpha !== undefined ? options.stickAlpha : 1;
            this.maxDistance = options.maxDistance || this.radius;
            this.onChange = options.onChange || null;
            this.onEnd = options.onEnd || null;

            // 内部状态
            this._active = false;
            this._touchId = null;
            this._stickX = 0;   // 摇杆头相对中心的偏移
            this._stickY = 0;
            this._dirX = 0;     // 归一化方向
            this._dirY = 0;

            // 设置默认宽高为底座直径
            this.width = this.radius * 2;
            this.height = this.radius * 2;
        }

        /**
         * 处理触摸开始
         * @param {number} id 触摸标识
         * @param {number} x 触摸X
         * @param {number} y 触摸Y
         */
        onTouchStart(id, x, y) {
            if (!this.enabled) return;
            const center = this._getCenter();
            const dx = x - center.x;
            const dy = y - center.y;
            if (dx * dx + dy * dy <= this.radius * this.radius) {
                this._active = true;
                this._touchId = id;
                this._updateStick(x, y);
            }
        }

        /**
         * 处理触摸移动
         * @param {number} id 触摸标识
         * @param {number} x 触摸X
         * @param {number} y 触摸Y
         */
        onTouchMove(id, x, y) {
            if (!this.enabled || !this._active || this._touchId !== id) return;
            this._updateStick(x, y);
        }

        /**
         * 处理触摸结束
         * @param {number} id 触摸标识
         */
        onTouchEnd(id) {
            if (!this.enabled || !this._active || this._touchId !== id) return;
            this._active = false;
            this._touchId = null;
            this._stickX = 0;
            this._stickY = 0;
            this._dirX = 0;
            this._dirY = 0;
            if (this.onEnd) this.onEnd();
        }

        /**
         * 获取摇杆底座中心的世界坐标
         * @returns {{x:number, y:number}}
         * @private
         */
        _getCenter() {
            const pos = this.getGlobalPosition();
            return {
                x: pos.x + this.radius,
                y: pos.y + this.radius
            };
        }

        /**
         * 更新摇杆头位置并计算方向
         * @param {number} x 触摸X
         * @param {number} y 触摸Y
         * @private
         */
        _updateStick(x, y) {
            const center = this._getCenter();
            let dx = x - center.x;
            let dy = y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > this.maxDistance) {
                const ratio = this.maxDistance / dist;
                dx *= ratio;
                dy *= ratio;
            }
            this._stickX = dx;
            this._stickY = dy;

            // 计算归一化方向
            if (dist > 0) {
                this._dirX = dx / this.maxDistance;
                this._dirY = dy / this.maxDistance;
            } else {
                this._dirX = 0;
                this._dirY = 0;
            }

            if (this.onChange) {
                this.onChange(this._dirX, this._dirY);
            }
        }

        /**
         * 获取当前方向向量
         * @returns {{x:number, y:number}}
         */
        getDirection() {
            return { x: this._dirX, y: this._dirY };
        }

        /**
         * 获取当前方向角度（弧度）
         * @returns {number}
         */
        getAngle() {
            return Math.atan2(this._dirY, this._dirX);
        }

        /**
         * 摇杆是否正被操作
         * @returns {boolean}
         */
        isActive() {
            return this._active;
        }

        _renderSelf(ctx) {
            const center = this._getCenter();
            const baseX = center.x;
            const baseY = center.y;

            ctx.save();
            ctx.globalAlpha = this.baseAlpha;

            // 绘制底座
            ctx.fillStyle = this.baseColor;
            ctx.beginPath();
            ctx.arc(baseX, baseY, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // 绘制摇杆头
            ctx.globalAlpha = this.stickAlpha;
            ctx.fillStyle = this.stickColor;
            ctx.beginPath();
            ctx.arc(baseX + this._stickX, baseY + this._stickY, this.stickRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // ========================================================================
    // 辅助函数
    // ========================================================================

    /**
     * 在 Canvas 上下文中绘制圆角矩形路径
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} r 圆角半径
     */
    function roundRectPath(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /**
     * 将长文本按最大宽度换行
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} maxWidth
     * @returns {Array<string>}
     */
    function wrapLines(ctx, text, maxWidth) {
        const chars = text.split('');
        const lines = [];
        let current = '';
        for (let i = 0; i < chars.length; i++) {
            const test = current + chars[i];
            if (ctx.measureText(test).width > maxWidth && current.length > 0) {
                lines.push(current);
                current = chars[i];
            } else {
                current = test;
            }
        }
        lines.push(current);
        return lines;
    }

    // ========================================================================
    // UI 管理器 (UIManager)
    // ========================================================================

    class UIManager {
        /**
         * 创建 UI 管理器，统一处理输入事件与 UI 渲染
         * @param {QGE.Core} engine 游戏引擎实例
         */
        constructor(engine) {
            this.engine = engine;
            this.root = new UIElement({ x: 0, y: 0, width: engine.width, height: engine.height });
            this._hoverTarget = null;

            // 绑定输入事件
            engine.input.canvas.addEventListener('mousedown', e => this._onPointerDown(e.clientX, e.clientY));
            window.addEventListener('mouseup', e => this._onPointerUp(e.clientX, e.clientY));
            engine.input.canvas.addEventListener('mousemove', e => this._onPointerMove(e.clientX, e.clientY));
            engine.input.canvas.addEventListener('touchstart', e => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    this._onPointerDown(t.clientX, t.clientY, t.identifier);
                }
            }, { passive: false });
            window.addEventListener('touchend', e => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    this._onPointerUp(t.clientX, t.clientY, t.identifier);
                }
            }, { passive: false });
            window.addEventListener('touchmove', e => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    this._onPointerMove(t.clientX, t.clientY, t.identifier);
                }
            }, { passive: false });
        }

        /**
         * 将客户端坐标转换为画布本地坐标
         * @private
         */
        _getLocalPos(clientX, clientY) {
            const canvas = this.engine.input.canvas;
            const rect = canvas.getBoundingClientRect();
            return {
                x: (clientX - rect.left) * (canvas.width / rect.width),
                y: (clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        _onPointerDown(cx, cy, id) {
            const pos = this._getLocalPos(cx, cy);
            const target = this._findTarget(this.root, pos.x, pos.y);
            if (target) {
                if (target.onPointerDown) target.onPointerDown(pos.x, pos.y);
                if (target.onTouchStart) target.onTouchStart(id, pos.x, pos.y);
            }
        }

        _onPointerUp(cx, cy, id) {
            const pos = this._getLocalPos(cx, cy);
            const target = this._findTarget(this.root, pos.x, pos.y);
            if (target) {
                if (target.onPointerUp) target.onPointerUp(pos.x, pos.y);
                if (target.onTouchEnd) target.onTouchEnd(id);
            }
            // 对之前按下的按钮也触发 up（可能指针已移出）
            this._propagateUp(this.root, pos.x, pos.y);
        }

        _onPointerMove(cx, cy, id) {
            const pos = this._getLocalPos(cx, cy);
            const target = this._findTarget(this.root, pos.x, pos.y);
            if (target) {
                if (target.onPointerMove) target.onPointerMove(pos.x, pos.y);
                if (target.onTouchMove) target.onTouchMove(id, pos.x, pos.y);
            }
            // 处理 hover 状态
            if (this._hoverTarget && this._hoverTarget !== target) {
                if (this._hoverTarget.onPointerMove) this._hoverTarget.onPointerMove(-9999, -9999); // 移出
            }
            this._hoverTarget = target;
        }

        /**
         * 递归查找命中的最顶层 UI 元素
         * @private
         */
        _findTarget(element, x, y) {
            if (!element.visible || !element.enabled) return null;
            // 优先查找子元素（后渲染的在顶层）
            for (let i = element.children.length - 1; i >= 0; i--) {
                const found = this._findTarget(element.children[i], x, y);
                if (found) return found;
            }
            if (element.hitTest && element.hitTest(x, y)) return element;
            return null;
        }

        /**
         * 向上传播指针释放事件
         * @private
         */
        _propagateUp(element, x, y) {
            for (let i = 0; i < element.children.length; i++) {
                this._propagateUp(element.children[i], x, y);
            }
            if (element.onPointerUp) element.onPointerUp(x, y);
        }

        /**
         * 添加顶层 UI 元素
         * @param {UIElement} element UI 元素
         */
        add(element) {
            this.root.addChild(element);
        }

        /**
         * 移除顶层 UI 元素
         * @param {UIElement} element UI 元素
         */
        remove(element) {
            this.root.removeChild(element);
        }

        /**
         * 更新所有 UI 元素
         * @param {number} dt 增量时间
         */
        update(dt) {
            this.root.update(dt);
        }

        /**
         * 渲染所有 UI 元素（应在场景渲染之后调用，以覆盖在画面上层）
         * @param {CanvasRenderingContext2D} ctx 画布上下文
         */
        render(ctx) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // 屏幕空间
            this.root.render(ctx);
            ctx.restore();
        }

        /**
         * 调整根容器尺寸以匹配画布
         */
        resize() {
            this.root.width = this.engine.width;
            this.root.height = this.engine.height;
        }
    }

    // ========================================================================
    // 导出命名空间
    // ========================================================================

    const UI = {
        UIElement: UIElement,
        Button: Button,
        Label: Label,
        ProgressBar: ProgressBar,
        Panel: Panel,
        Dialog: Dialog,
        VirtualJoystick: VirtualJoystick,
        UIManager: UIManager
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = UI;
    }
    global.QGE = global.QGE || {};
    global.QGE.UI = UI;

})(typeof window !== 'undefined' ? window : this);
