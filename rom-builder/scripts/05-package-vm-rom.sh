#!/bin/bash
# ============================================================================
# 青柠 ROM - 虚拟大师 ROM 包打包脚本
# ============================================================================
# 生成可直接导入虚拟大师/VMOS 的 ROM 包
# 格式: .zip 或 .7z (包含 Android rootfs)
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AOSP_DIR="$PROJECT_ROOT/aosp"
OUTPUT_DIR="$PROJECT_ROOT/output"
WORK_DIR="$PROJECT_ROOT/work"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERROR]${NC} $1"; }

# ROM 信息
ROM_NAME="QingningROM"
ROM_VERSION="1.0.0"
ROM_ANDROID="11"
ROM_API="30"
ROM_ARCH="arm64"

# 创建工作目录
setup_work_dir() {
    log_info "设置工作目录..."
    
    rm -rf "$WORK_DIR"
    mkdir -p "$WORK_DIR"/{system,vendor,root,boot,data}
    
    log_ok "工作目录已创建"
}

# 从 AOSP 输出复制系统文件
copy_system_files() {
    log_info "复制系统文件..."
    
    local out_dir="$AOSP_DIR/out/target/product/generic"
    
    if [ ! -d "$out_dir" ]; then
        log_err "AOSP 构建输出未找到。请先完成系统构建"
        exit 1
    fi
    
    # 挂载并复制 system 分区
    if [ -f "$out_dir/system.img" ]; then
        log_info "提取 system.img..."
        mkdir -p "$WORK_DIR/mnt_system"
        sudo mount -o loop "$out_dir/system.img" "$WORK_DIR/mnt_system" 2>/dev/null || {
            log_warn "无法挂载 system.img，尝试直接复制"
            cp -r "$out_dir/system/"* "$WORK_DIR/system/" 2>/dev/null || true
        }
        if [ -d "$WORK_DIR/mnt_system" ] && [ "$(ls -A "$WORK_DIR/mnt_system")" ]; then
            sudo cp -a "$WORK_DIR/mnt_system/"* "$WORK_DIR/system/"
            sudo umount "$WORK_DIR/mnt_system"
        fi
        rmdir "$WORK_DIR/mnt_system" 2>/dev/null || true
    fi
    
    # 复制 vendor
    if [ -f "$out_dir/vendor.img" ]; then
        log_info "提取 vendor.img..."
        mkdir -p "$WORK_DIR/mnt_vendor"
        sudo mount -o loop "$out_dir/vendor.img" "$WORK_DIR/mnt_vendor" 2>/dev/null || true
        if [ -d "$WORK_DIR/mnt_vendor" ] && [ "$(ls -A "$WORK_DIR/mnt_vendor")" ]; then
            sudo cp -a "$WORK_DIR/mnt_vendor/"* "$WORK_DIR/vendor/"
            sudo umount "$WORK_DIR/mnt_vendor"
        fi
        rmdir "$WORK_DIR/mnt_vendor" 2>/dev/null || true
    fi
    
    # 复制 boot 镜像
    if [ -f "$out_dir/boot.img" ]; then
        cp "$out_dir/boot.img" "$WORK_DIR/boot/"
    fi
    
    log_ok "系统文件复制完成"
}

# 集成 Magisk
integrate_magisk() {
    log_info "集成 Magisk..."
    
    local magisk_dir="$PROJECT_ROOT/prebuilt/magisk"
    
    if [ -f "$magisk_dir/magisk.apk" ]; then
        # 创建 Magisk 安装目录
        mkdir -p "$WORK_DIR/system/addon.d"
        mkdir -p "$WORK_DIR/system/xbin"
        
        # 复制 Magisk 文件
        cp "$magisk_dir/magisk.apk" "$WORK_DIR/system/addon.d/"
        
        # 创建 Magisk 安装脚本
        cat > "$WORK_DIR/system/addon.d/50-magisk.sh" << 'EOF'
#!/sbin/sh
# Magisk 安装脚本

. /tmp/backuptool.functions

list_files() {
cat <<EOF
addon.d/magisk.apk
xbin/su
xbin/magisk
EOF
}

case "$1" in
  backup)
    list_files | while read FILE DUMMY; do
      backup_file $S/$FILE
    done
  ;;
  restore)
    list_files | while read FILE REPLACEMENT; do
      R=""
      [ -n "$REPLACEMENT" ] && R="$S/$REPLACEMENT"
      [ -f "$C/$S/$FILE" ] && restore_file $S/$FILE $R
    done
  ;;
  pre-backup)
    # Nothing
  ;;
  post-backup)
    # Nothing
  ;;
  pre-restore)
    # Nothing
  ;;
  post-restore)
    # 安装 Magisk
    if [ -f /system/addon.d/magisk.apk ]; then
      pm install -r /system/addon.d/magisk.apk
    fi
  ;;
esac
EOF
        
        chmod +x "$WORK_DIR/system/addon.d/50-magisk.sh"
        log_ok "Magisk 集成完成"
    else
        log_warn "Magisk 文件未找到，跳过"
    fi
}

# 集成青柠设置应用
integrate_settings_app() {
    log_info "集成青柠设置应用..."
    
    local app_dir="$PROJECT_ROOT/apps/QingningSettings"
    
    if [ -d "$app_dir" ]; then
        # 编译 APK (简化版，实际需要 Android SDK)
        log_info "编译 QingningSettings..."
        
        # 创建预编译 APK 目录
        mkdir -p "$WORK_DIR/system/priv-app/QingningSettings"
        
        # 这里应该使用 aapt 和 dx 工具编译
        # 简化处理：复制源码到输出目录，由构建系统处理
        cp -r "$app_dir" "$OUTPUT_DIR/QingningSettings-src"
        
        log_warn "请使用 Android Studio 或 aapt 工具编译 QingningSettings"
        log_info "源码位置: $OUTPUT_DIR/QingningSettings-src"
    fi
}

# 应用虚拟大师补丁
apply_vmos_patches() {
    log_info "应用虚拟大师兼容性补丁..."
    
    # 修改 init.rc
    local init_rc="$WORK_DIR/root/init.rc"
    if [ -f "$init_rc" ]; then
        # 添加虚拟大师服务
        cat >> "$init_rc" << 'EOF'

# 虚拟大师兼容性服务
service vmos_compat /system/bin/vmos_compat
    class main
    user root
    group root
    oneshot

on property:sys.boot_completed=1
    exec_background /system/bin/sh -c "echo 1 > /sys/class/vmos/compat_enabled"
EOF
    fi
    
    # 创建虚拟大师兼容性文件
    mkdir -p "$WORK_DIR/system/etc"
    cat > "$WORK_DIR/system/etc/vmos_config.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<vmos-config>
    <property name="compat_mode" value="true" />
    <property name="hardware_accel" value="auto" />
    <property name="network_bridge" value="true" />
    <property name="shared_storage" value="true" />
    <property name="root_access" value="true" />
    <property name="xposed_support" value="true" />
</vmos-config>
EOF
    
    log_ok "虚拟大师补丁应用完成"
}

# 创建 ROM 配置文件
create_rom_config() {
    log_info "创建 ROM 配置..."
    
    cat > "$WORK_DIR/rom_config.json" << EOF
{
  "name": "${ROM_NAME}",
  "version": "${ROM_VERSION}",
  "android_version": "${ROM_ANDROID}",
  "api_level": ${ROM_API},
  "architecture": "${ROM_ARCH}",
  "author": "Qingning ROM Team",
  "description": "专为虚拟大师优化的 Android 11 定制 ROM",
  "features": [
    "预装 Root (Magisk)",
    "Xposed 框架支持",
    "系统精简优化",
    "虚拟大师兼容性修复",
    "深色主题",
    "系统更新检测"
  ],
  "min_vm_version": "2.0",
  "recommended_ram": 2048,
  "recommended_storage": 4096,
  "supports_import": true,
  "import_format": ["zip", "7z"],
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    log_ok "ROM 配置创建完成"
}

# 打包 ROM
package_rom() {
    log_info "打包 ROM..."
    
    local build_date=$(date +%Y%m%d)
    local package_name="${ROM_NAME}-v${ROM_VERSION}-Android${ROM_ANDROID}-${build_date}"
    
    mkdir -p "$OUTPUT_DIR"
    
    # 创建 ZIP 包 (虚拟大师导入格式)
    cd "$WORK_DIR"
    zip -r "$OUTPUT_DIR/${package_name}.zip" . -x "*.git*" -x "*.tmp"
    
    # 创建 7z 包 (更高压缩率)
    if command -v 7z &> /dev/null; then
        7z a -t7z -m0=lzma2 -mx=9 "$OUTPUT_DIR/${package_name}.7z" .
    fi
    
    # 创建导入说明
    cat > "$OUTPUT_DIR/${package_name}-README.txt" << EOF
青柠 ROM v${ROM_VERSION}
================

Android 版本: ${ROM_ANDROID} (API ${ROM_API})
架构: ${ROM_ARCH}
构建日期: $(date '+%Y-%m-%d')

导入方法 (虚拟大师):
1. 将 ${package_name}.zip 下载到手机
2. 打开虚拟大师应用
3. 点击"添加自定义 ROM"
4. 选择下载的 ZIP 文件
5. 等待导入完成
6. 启动虚拟机

特性:
- 预装 Magisk (Root 权限)
- 支持 Xposed 框架
- 系统精简优化
- 虚拟大师兼容性修复
- 深色主题
- 系统更新检测

注意:
- 首次启动可能需要 3-5 分钟
- 建议分配 2GB+ 内存
- 建议分配 4GB+ 存储

技术支持: https://3862242786-sudo.github.io/pan/qingning-rom.html
EOF
    
    log_ok "ROM 打包完成"
    log_info "输出文件:"
    ls -lh "$OUTPUT_DIR/${package_name}".*
}

# 清理工作目录
cleanup() {
    log_info "清理工作目录..."
    rm -rf "$WORK_DIR"
    log_ok "清理完成"
}

# 主流程
main() {
    echo "========================================"
    echo "  青柠 ROM - 虚拟大师 ROM 包打包"
    echo "  Android ${ROM_ANDROID} | ${ROM_ARCH}"
    echo "========================================"
    echo
    
    setup_work_dir
    copy_system_files
    integrate_magisk
    integrate_settings_app
    apply_vmos_patches
    create_rom_config
    package_rom
    cleanup
    
    echo
    log_ok "ROM 包构建完成！"
    log_info "文件位置: $OUTPUT_DIR/"
    echo
    echo "使用说明:"
    echo "1. 将 .zip 文件复制到手机"
    echo "2. 在虚拟大师中选择'添加自定义 ROM'"
    echo "3. 选择 ZIP 文件并导入"
    echo "4. 启动虚拟机"
}

main "$@"
