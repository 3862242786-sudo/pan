#!/bin/bash
# ============================================================================
# 青柠 ROM - Goldfish 内核编译脚本
# ============================================================================
# 为虚拟大师环境编译 Android 模拟器内核
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AOSP_DIR="$PROJECT_ROOT/aosp"
KERNEL_DIR="$AOSP_DIR/prebuilts/qemu-kernel"
OUTPUT_DIR="$PROJECT_ROOT/output"

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

# 下载 Goldfish 内核源码
download_kernel_source() {
    log_info "下载 Goldfish 内核源码..."
    
    local kernel_repo="https://android.googlesource.com/kernel/goldfish"
    local kernel_branch="android-goldfish-5.4"
    
    if [ ! -d "$KERNEL_DIR" ]; then
        mkdir -p "$KERNEL_DIR"
    fi
    
    cd "$KERNEL_DIR"
    
    if [ ! -d ".git" ]; then
        git clone --depth=1 -b "$kernel_branch" "$kernel_repo" .
    fi
    
    log_ok "Goldfish 内核源码已就绪"
}

# 配置内核
defconfig() {
    log_info "配置内核..."
    
    cd "$KERNEL_DIR"
    
    # 使用 goldfish 默认配置
    make ARCH=arm64 goldfish_defconfig
    
    # 应用青柠 ROM 优化配置
    cat >> .config << 'EOF'
# 虚拟大师优化
CONFIG_KSM=y
CONFIG_KSM_LEGACY=y
CONFIG_ZSWAP=y
CONFIG_ZPOOL=y
CONFIG_ZBUD=y
CONFIG_ZSMALLOC=y

# 性能优化
CONFIG_CPU_FREQ_DEFAULT_GOV_PERFORMANCE=y
CONFIG_CPU_FREQ_GOV_PERFORMANCE=y
CONFIG_CPU_FREQ_GOV_ONDEMAND=y

# 调试支持
CONFIG_DEBUG_FS=y
CONFIG_MAGIC_SYSRQ=y

# 网络优化
CONFIG_TCP_CONG_ADVANCED=y
CONFIG_TCP_CONG_BBR=y
CONFIG_DEFAULT_TCP_CONG="bbr"

# 虚拟化支持
CONFIG_VIRTIO=y
CONFIG_VIRTIO_PCI=y
CONFIG_VIRTIO_BLK=y
CONFIG_VIRTIO_NET=y
CONFIG_VIRTIO_CONSOLE=y
CONFIG_VIRTIO_BALLOON=y

# 禁用不需要的驱动以减小体积
# CONFIG_WLAN is not set
# CONFIG_BT is not set
# CONFIG_SOUND is not set
# CONFIG_USB_SUPPORT is not set
EOF
    
    # 更新配置
    make ARCH=arm64 olddefconfig
    
    log_ok "内核配置完成"
}

# 编译内核
build_kernel() {
    log_info "编译 Goldfish 内核..."
    log_info "这可能需要 15-30 分钟"
    
    cd "$KERNEL_DIR"
    
    local jobs=$(nproc --all)
    
    make ARCH=arm64 CROSS_COMPILE=aarch64-linux-android- -j$jobs
    
    log_ok "内核编译完成"
}

# 复制内核到设备目录
copy_kernel() {
    log_info "复制内核到设备目录..."
    
    local kernel_image="$KERNEL_DIR/arch/arm64/boot/Image"
    local target_dir="$AOSP_DIR/device/qingning/generic"
    
    if [ ! -f "$kernel_image" ]; then
        log_err "内核镜像未找到: $kernel_image"
        exit 1
    fi
    
    cp "$kernel_image" "$target_dir/kernel"
    
    log_ok "内核已复制"
}

# 主流程
main() {
    echo "========================================"
    echo "  青柠 ROM - Goldfish 内核编译"
    echo "  虚拟大师定制版"
    echo "========================================"
    echo
    
    download_kernel_source
    defconfig
    build_kernel
    copy_kernel
    
    echo
    log_ok "Goldfish 内核编译完成"
    log_info "内核位置: $AOSP_DIR/device/qingning/generic/kernel"
}

main "$@"
