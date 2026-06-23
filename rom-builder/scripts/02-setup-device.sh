#!/bin/bash
# ============================================================================
# 青柠 ROM 构建工具 - 步骤 2: 配置设备树
# ============================================================================
# 将青柠设备配置复制到 AOSP 源码树
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AOSP_DIR="$PROJECT_ROOT/aosp"
DEVICE_DIR="$PROJECT_ROOT/device/qingning/generic"

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

# 检查 AOSP 目录
if [ ! -d "$AOSP_DIR/.repo" ]; then
    log_err "AOSP 源码未找到。请先运行 01-sync-aosp.sh"
    exit 1
fi

# 创建设备树目录
setup_device_tree() {
    log_info "设置设备树..."
    
    local target_dir="$AOSP_DIR/device/qingning/generic"
    mkdir -p "$target_dir"
    
    # 复制设备配置文件
    cp "$DEVICE_DIR/BoardConfig.mk" "$target_dir/"
    cp "$DEVICE_DIR/device.mk" "$target_dir/"
    
    # 创建 AndroidProducts.mk
    cat > "$target_dir/AndroidProducts.mk" << 'EOF'
PRODUCT_MAKEFILES := \
    $(LOCAL_DIR)/qingning_rom.mk
EOF
    
    # 创建产品 makefile
    cat > "$target_dir/qingning_rom.mk" << 'EOF'
# 青柠 ROM 产品配置
$(call inherit-product, device/qingning/generic/device.mk)

PRODUCT_NAME := qingning_rom
PRODUCT_DEVICE := generic
PRODUCT_BRAND := Qingning
PRODUCT_MODEL := Qingning ROM for Virtual Master
PRODUCT_MANUFACTURER := QingningOS
EOF
    
    log_ok "设备树配置完成"
}

# 创建初始化脚本
setup_init_scripts() {
    log_info "创建初始化脚本..."
    
    local target_dir="$AOSP_DIR/device/qingning/generic"
    
    # init.qingning.rc
    cat > "$target_dir/init.qingning.rc" << 'EOF'
# 青柠 ROM 初始化脚本
import /init.environ.rc
import /init.usb.rc
import /init.${ro.hardware}.rc

on early-init
    # 虚拟大师检测
    exec_background /system/bin/sh -c "if [ -e /dev/vmos ]; then setprop ro.vmos.detected 1; fi"
    
    # 设置虚拟机优化参数
    write /sys/kernel/mm/ksm/run 1
    write /sys/kernel/mm/ksm/pages_to_scan 100
    write /sys/kernel/mm/ksm/sleep_millisecs 500

on init
    # 挂载点
    mkdir /mnt 0775 root system
    
    # 虚拟大师兼容性
    mount none /system/etc/hosts /system/etc/hosts bind
    
    # 性能优化
    write /proc/sys/vm/swappiness 60
    write /proc/sys/vm/dirty_ratio 15
    write /proc/sys/vm/dirty_background_ratio 5

on boot
    # 网络优化
    setprop net.dns1 8.8.8.8
    setprop net.dns2 8.8.4.4
    
    # 调试支持
    setprop persist.sys.usb.config adb
    setprop persist.service.adb.enable 1
    
    # 启动 ADB 守护进程
    start adbd

service adbd /system/bin/adbd --root_seclabel=u:r:su:s0
    class core
    socket adbd seqpacket 660 system system
    disabled
    seclabel u:r:adbd:s0
EOF
    
    # fstab.qingning
    cat > "$target_dir/fstab.qingning" << 'EOF'
# 青柠 ROM 分区表
/dev/block/vda /system ext4 ro,barrier=1 wait
/dev/block/vdb /vendor ext4 ro,barrier=1 wait
/dev/block/vdc /data ext4 noatime,nosuid,nodev,barrier=1,noauto_da_alloc wait,check,quota
/dev/block/vdd /cache ext4 noatime,nosuid,nodev wait,check
EOF
    
    log_ok "初始化脚本创建完成"
}

# 应用补丁
apply_patches() {
    log_info "应用虚拟大师兼容性补丁..."
    
    local patch_dir="$PROJECT_ROOT/patches"
    cd "$AOSP_DIR"
    
    for patch in "$patch_dir"/*.patch; do
        if [ -f "$patch" ]; then
            log_info "应用补丁: $(basename "$patch")"
            if patch -p1 --dry-run -i "$patch" > /dev/null 2>&1; then
                patch -p1 -i "$patch"
                log_ok "补丁应用成功"
            else
                log_warn "补丁可能已应用或冲突: $(basename "$patch")"
            fi
        fi
    done
}

# 主流程
main() {
    echo "========================================"
    echo "  青柠 ROM - 设备树配置"
    echo "  Android 11 | 虚拟大师定制版"
    echo "========================================"
    echo
    
    setup_device_tree
    setup_init_scripts
    apply_patches
    
    echo
    log_ok "步骤 2 完成: 设备树已配置"
    log_info "下一步: 运行 03-build-rom.sh 开始构建"
}

main "$@"
