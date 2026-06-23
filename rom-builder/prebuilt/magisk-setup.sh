#!/sbin/sh
# ============================================================================
# 青柠 ROM - Magisk 预装脚本
# ============================================================================
# 在 ROM 构建时集成 Magisk
# ============================================================================

# Magisk 版本
MAGISK_VERSION="26.4"
MAGISK_URL="https://github.com/topjohnwu/Magisk/releases/download/v${MAGISK_VERSION}/Magisk-v${MAGISK_VERSION}.apk"

# 下载 Magisk
download_magisk() {
    echo "[INFO] 下载 Magisk v${MAGISK_VERSION}..."
    
    local output_dir="$1"
    mkdir -p "$output_dir"
    
    curl -L -o "$output_dir/magisk.apk" "$MAGISK_URL"
    
    if [ ! -f "$output_dir/magisk.apk" ]; then
        echo "[ERROR] Magisk 下载失败"
        exit 1
    fi
    
    echo "[OK] Magisk 下载完成"
}

# 解压 Magisk 并提取必要文件
extract_magisk() {
    echo "[INFO] 解压 Magisk..."
    
    local magisk_dir="$1"
    local extract_dir="$magisk_dir/extract"
    
    mkdir -p "$extract_dir"
    
    # Magisk APK 实际上是 ZIP 文件
    unzip -o "$magisk_dir/magisk.apk" -d "$extract_dir"
    
    echo "[OK] Magisk 解压完成"
}

# 创建 Magisk 安装脚本
create_installer() {
    echo "[INFO] 创建 Magisk 安装脚本..."
    
    local target_dir="$1"
    
    cat > "$target_dir/install-magisk.sh" << 'EOF'
#!/sbin/sh
# Magisk 安装脚本 (青柠 ROM 内置)

ui_print "========================================"
ui_print "  安装 Magisk"
ui_print "  青柠 ROM 内置版"
ui_print "========================================"
ui_print ""

# 检测架构
ARCH=$(getprop ro.product.cpu.abi)
case $ARCH in
    arm64-v8a) MAGISK_ARCH="arm64" ;;
    armeabi-v7a) MAGISK_ARCH="arm" ;;
    x86_64) MAGISK_ARCH="x64" ;;
    x86) MAGISK_ARCH="x86" ;;
    *) MAGISK_ARCH="arm64" ;;
esac

ui_print "架构: $MAGISK_ARCH"

# 创建 Magisk 目录
mkdir -p /data/adb/magisk

# 复制 Magisk 文件
cp -f /tmp/magisk/extract/lib/$MAGISK_ARCH/libmagisk.so /data/adb/magisk/magisk
cp -f /tmp/magisk/extract/lib/$MAGISK_ARCH/libmagiskinit.so /data/adb/magisk/magiskinit
cp -f /tmp/magisk/extract/lib/$MAGISK_ARCH/libmagiskpolicy.so /data/adb/magisk/magiskpolicy

chmod 755 /data/adb/magisk/magisk
chmod 755 /data/adb/magisk/magiskinit
chmod 755 /data/adb/magisk/magiskpolicy

# 创建符号链接
ln -sf /data/adb/magisk/magisk /data/adb/magisk/su
ln -sf /data/adb/magisk/magisk /data/adb/magisk/resetprop
ln -sf /data/adb/magisk/magisk /data/adb/magisk/magiskhide

# 安装启动镜像
ui_print "修补启动镜像..."
/data/adb/magisk/magiskinit -x magisk /tmp/magisk/magisk

# 设置权限
chmod 755 /data/adb/magisk

ui_print ""
ui_print "Magisk 安装完成！"
ui_print "请重启设备以激活 Root"
EOF
    
    chmod +x "$target_dir/install-magisk.sh"
    
    echo "[OK] Magisk 安装脚本创建完成"
}

# 创建 Magisk 模块目录结构
create_module_structure() {
    echo "[INFO] 创建 Magisk 模块结构..."
    
    local modules_dir="$1"
    mkdir -p "$modules_dir"
    
    # 创建示例模块: 青柠优化模块
    local qingning_module="$modules_dir/qingning-optimize"
    mkdir -p "$qingning_module"
    
    cat > "$qingning_module/module.prop" << 'EOF'
id=qingning-optimize
name=青柠系统优化
version=1.0.0
versionCode=1000
author=青柠 ROM Team
description=为虚拟大师环境优化的系统参数调整
EOF
    
    cat > "$qingning_module/post-fs-data.sh" << 'EOF'
#!/system/bin/sh
# 青柠系统优化模块

# 虚拟机性能优化
write /proc/sys/vm/swappiness 60
write /proc/sys/vm/dirty_ratio 15
write /proc/sys/vm/dirty_background_ratio 5
write /proc/sys/vm/vfs_cache_pressure 50

# 网络优化
write /proc/sys/net/ipv4/tcp_congestion_control bbr
write /proc/sys/net/ipv4/tcp_fastopen 3

# 禁用不必要的服务
stop traced
stop traced_probes
EOF
    
    chmod +x "$qingning_module/post-fs-data.sh"
    
    echo "[OK] Magisk 模块结构创建完成"
}

# 主流程
main() {
    echo "========================================"
    echo "  青柠 ROM - Magisk 集成"
    echo "========================================"
    
    local prebuilt_dir="$(dirname "$0")"
    local magisk_dir="$prebuilt_dir/magisk"
    local modules_dir="$prebuilt_dir/modules"
    
    download_magisk "$magisk_dir"
    extract_magisk "$magisk_dir"
    create_installer "$magisk_dir"
    create_module_structure "$modules_dir"
    
    echo ""
    echo "[OK] Magisk 集成完成"
    echo "文件位置:"
    echo "  - $magisk_dir/magisk.apk"
    echo "  - $magisk_dir/install-magisk.sh"
    echo "  - $modules_dir/"
}

main "$@"
