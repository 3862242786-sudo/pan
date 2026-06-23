# 青柠 ROM 构建工具

专为虚拟大师 (VMOS) 优化的 Android 11 定制 ROM。

## 项目结构

```
rom-builder/
├── scripts/              # 构建脚本
│   ├── 01-sync-aosp.sh   # 同步 AOSP 源码
│   ├── 02-setup-device.sh # 配置设备树
│   └── 03-build-rom.sh   # 构建 ROM
├── device/qingning/generic/  # 设备配置
│   ├── BoardConfig.mk    # 板级配置
│   └── device.mk         # 产品配置
├── patches/              # 系统补丁
│   └── 01-vmos-compat.patch  # 虚拟大师兼容性
├── overlay/              # 资源覆盖
├── prebuilt/             # 预编译文件
├── config/               # 构建配置
└── output/               # 输出目录
```

## 构建步骤

### 1. 环境准备

需要 Ubuntu 20.04+ 或 Debian 11+，至少：
- 8GB 内存（推荐 16GB）
- 100GB 磁盘空间
- 稳定的网络连接

安装依赖：
```bash
sudo apt-get update
sudo apt-get install -y git python3 curl repo bc bison build-essential \
    flex g++-multilib gcc-multilib gnupg gperf imagemagick lib32ncurses5-dev \
    lib32readline-dev lib32z1-dev liblz4-tool libncurses5-dev libsdl1.2-dev \
    libssl-dev libxml2 libxml2-utils lzop pngcrush rsync schedtool \
    squashfs-tools xsltproc zip zlib1g-dev
```

### 2. 同步源码

```bash
cd rom-builder/scripts
./01-sync-aosp.sh
```

这会从 Google 服务器同步 Android 11 源码（约 30-60 分钟）。

### 3. 配置设备树

```bash
./02-setup-device.sh
```

将青柠设备配置复制到 AOSP 源码树，并应用虚拟大师兼容性补丁。

### 4. 构建 ROM

```bash
./03-build-rom.sh
```

编译系统并打包 ROM（约 2-4 小时）。

## ROM 特性

- **Android 11** (API 30)
- **预装 Root** (Magisk)
- **Xposed 框架** (LSPosed)
- **系统精简** - 移除无用组件
- **虚拟大师适配** - 兼容性修复
- **网络优化** - DNS 和代理支持
- **调试支持** - ADB 无线调试

## 输出文件

构建完成后，`output/` 目录包含：
- `QingningROM-v1.0.0-YYYYMMDD.zip` - 完整镜像包
- `QingningROM-v1.0.0-YYYYMMDD-flashable.zip` - Recovery 刷机包
- `build.log` - 构建日志

## 刷机方法

### 方法一：直接刷入镜像
1. 将镜像文件复制到虚拟大师 `/data/local/tmp/`
2. 运行 `flash.sh` 脚本
3. 重启虚拟机

### 方法二：Recovery 刷机
1. 将 `-flashable.zip` 复制到虚拟大师
2. 进入 Recovery 模式
3. 选择"安装 ZIP"
4. 选择刷机包并确认

## 技术支持

- 项目页面: https://3862242786-sudo.github.io/pan/qingning-rom.html
- 问题反馈: 请在项目页面留言

## 许可证

基于 Android Open Source Project (AOSP)，遵循 Apache 2.0 许可证。
