# LimeBrowser

青柠浏览器 - LimeOS 官方浏览器

## 简介

LimeBrowser 是基于 Android WebView (Chromium 内核) 开发的轻量级浏览器，专为 LimeOS 系统优化。

## 特性

- 基于 Chromium 内核（Android WebView）
- 深色主题，与 LimeOS 系统风格统一
- 地址栏搜索（支持 Bing 搜索）
- 前进/后退/刷新/主页导航
- 标签页管理
- 文件下载支持
- 分享/复制链接
- 下拉刷新
- 支持第三方应用打开链接

## 技术栈

- Android SDK 33
- Java
- AndroidX AppCompat
- Material Design Components
- SwipeRefreshLayout

## 构建

```bash
cd lime-browser
./gradlew assembleDebug
```

## 安装

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 集成到 ROM

在 LimeOS 的 `device.mk` 中添加：

```makefile
PRODUCT_PACKAGES += LimeBrowser
```

## 版本

- v1.0.0 - 初始版本
  - 基本浏览功能
  - 深色主题
  - 导航控制

## 许可证

LimeOS Project (c) 2026
