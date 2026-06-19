# 🏗️ 青柠架构 (Qingning Architecture)

青柠系网站的统一底层框架，减少重复代码，提升性能，统一视觉风格。

## 目录结构

```
qna/
├── core/
│   └── qna-core.js          # 核心：配置、工具函数、缓存、事件总线、模块系统
├── modules/
│   ├── qna-auth.js          # 认证模块：登录、注册、权限、导航栏更新
│   └── qna-site.js          # 站点模块：关闭/维护、全局设置、解锁
├── ui/
│   └── qna-ui.css           # UI基础样式：CSS变量、组件、动画、布局工具
├── qna-loader.js            # 加载器：按需加载，减少初始请求
└── README.md
```

## 使用方法

### 1. 在页面中引入加载器

```html
<script src="qna/qna-loader.js"></script>
```

### 2. 按需加载模块

```html
<script>
// 加载全部常用模块（auth + site）
QNA.init().then(function() {
    // 架构已就绪
    console.log('QNA 版本:', QNA.version);

    // 使用认证模块
    var auth = QNA.module.use('auth');
    auth.updateNav();

    // 使用站点模块
    var site = QNA.module.use('site');
});

// 或只加载需要的模块
QNA.load(['auth']).then(function() {
    var auth = QNA.module.use('auth');
});
</script>
```

### 3. 使用 UI 组件

```html
<!-- 引入基础样式 -->
<link rel="stylesheet" href="qna/ui/qna-ui.css">

<!-- 使用组件 -->
<div class="qna-card">
    <h2 class="qna-gradient-text">标题</h2>
    <p>内容</p>
    <button class="qna-btn qna-btn-primary">按钮</button>
    <span class="qna-tag qna-tag-green">标签</span>
</div>
```

## 核心功能

### QNA-Core
- **Utils**: DOM选择、事件委托、节流防抖、格式化、存储封装
- **Cache**: LRU缓存，带过期时间
- **EventBus**: 组件间通信，支持 on/off/emit/once
- **Module**: 模块定义和按需加载

### QNA-Auth
- 统一登录/注册/找回密码
- 自动更新导航栏（登录后显示用户名+管理入口）
- 权限守卫 `auth.guard({ requireLogin: true, requireAdmin: true })`
- 激活码检查

### QNA-Site
- 网站关闭/维护检查
- 自定义关闭页面文字
- 激活码解锁
- 全局设置管理

## 性能优化

1. **按需加载**: 只加载页面需要的模块
2. **缓存系统**: 60秒缓存站点设置，减少请求
3. **事件委托**: 减少事件监听器数量
4. **CSS变量**: 统一主题，减少重复样式
5. **懒加载Supabase**: 只在需要时创建客户端

## 迁移指南

现有页面迁移到青柠架构：

1. 删除重复的 `formatSize`、`formatDate` 等工具函数，改用 `QNA.utils`
2. 删除重复的登录状态检查逻辑，改用 `QNA.module.use('auth')`
3. 删除重复的站点关闭检查，改用 `QNA.module.use('site')`
4. 统一使用 `qna-ui.css` 的组件类名

## 版本

v1.0.0 - 初始版本
