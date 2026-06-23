#!/system/bin/sh
# ============================================================================
# LimeOS - Android 端构建脚本
# ============================================================================
# 在 Android 设备/虚拟机内运行，自动下载源码并构建 ROM
# 需要: Termux 或 root shell, 至少 8GB 存储, 4GB 内存
# ============================================================================

set -e

# 颜色输出 (Android shell 兼容)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置
WORK_DIR="/data/local/tmp/limeos-build"
SOURCE_DIR="$WORK_DIR/aosp"
OUTPUT_DIR="/sdcard/Download/LimeOS-Output"
ROM_NAME="LimeOS-Beta1"
ANDROID_VERSION="11"

# 检查环境
check_env() {
    echo "========================================"
    echo "  LimeOS 构建工具"
    echo "  Android 端构建脚本"
    echo "========================================"
    echo

    log_info "检查构建环境..."

    # 检查存储空间
    local avail_storage=$(df /data | tail -1 | awk '{print $4}')
    if [ "$avail_storage" -lt 8388608 ]; then
        log_err "存储空间不足 8GB"
        log_info "当前可用: $(($avail_storage / 1024 / 1024)) GB"
        exit 1
    fi
    log_ok "存储空间充足"

    # 检查内存
    local total_mem=$(cat /proc/meminfo | grep MemTotal | awk '{print $2}')
    if [ "$total_mem" -lt 4194304 ]; then
        log_warn "内存不足 4GB，构建可能失败"
        log_info "当前内存: $(($total_mem / 1024)) MB"
    else
        log_ok "内存充足"
    fi

    # 检查必要工具
    local required_tools="git python3 curl make zip"
    local missing_tools=""
    for tool in $required_tools; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools="$missing_tools $tool"
        fi
    done

    if [ -n "$missing_tools" ]; then
        log_warn "缺少工具:$missing_tools"
        log_info "请在 Termux 中安装: pkg install git python curl make zip"
        exit 1
    fi

    log_ok "环境检查通过"
}

# 创建工作目录
setup_dirs() {
    log_info "创建工作目录..."
    rm -rf "$WORK_DIR"
    mkdir -p "$WORK_DIR" "$OUTPUT_DIR"
    log_ok "工作目录已创建"
}

# 下载 AOSP 源码 (使用国内镜像加速)
download_source() {
    log_info "下载 AOSP 源码..."
    log_info "这可能需要 30-60 分钟，请保持网络连接"

    cd "$WORK_DIR"

    # 使用清华镜像加速
    export REPO_URL='https://mirrors.tuna.tsinghua.edu.cn/git/git-repo'

    # 下载 repo 工具
    if [ ! -f "$WORK_DIR/repo" ]; then
        curl -s https://storage.googleapis.com/git-repo-downloads/repo > "$WORK_DIR/repo"
        chmod a+x "$WORK_DIR/repo"
    fi

    # 初始化仓库
    mkdir -p "$SOURCE_DIR"
    cd "$SOURCE_DIR"

    if [ ! -d ".repo" ]; then
        "$WORK_DIR/repo" init \
            -u https://aosp.tuna.tsinghua.edu.cn/platform/manifest \
            -b android-11.0.0_r48 \
            --depth=1
    fi

    # 同步源码
    "$WORK_DIR/repo" sync -c -j4 --force-sync --no-clone-bundle --no-tags

    log_ok "源码下载完成"
}

# 下载 LimeOS 设备树
download_device_tree() {
    log_info "下载 LimeOS 设备树..."

    local device_dir="$SOURCE_DIR/device/limeos/generic"
    mkdir -p "$device_dir"

    # 从 GitHub 下载设备树
    curl -L -o "$WORK_DIR/device-tree.zip" \
        "https://github.com/3862242786-sudo/pan/raw/main/rom-builder/device/qingning/generic/BoardConfig.mk"

    # 创建基本设备配置
    cat > "$device_dir/BoardConfig.mk" << 'EOF'
# LimeOS BoardConfig
TARGET_ARCH := arm64
TARGET_ARCH_VARIANT := armv8-a
TARGET_CPU_ABI := arm64-v8a
TARGET_CPU_VARIANT := generic

TARGET_2ND_ARCH := arm
TARGET_2ND_ARCH_VARIANT := armv8-a
TARGET_2ND_CPU_ABI := armeabi-v7a
TARGET_2ND_CPU_ABI2 := armeabi
TARGET_2ND_CPU_VARIANT := generic

TARGET_NO_KERNEL := false
BOARD_KERNEL_BASE := 0x40000000
BOARD_KERNEL_PAGESIZE := 4096

BOARD_BOOTIMAGE_PARTITION_SIZE := 67108864
BOARD_SYSTEMIMAGE_PARTITION_SIZE := 1610612736
BOARD_VENDORIMAGE_PARTITION_SIZE := 536870912
BOARD_USERDATAIMAGE_PARTITION_SIZE := 576716800
BOARD_FLASH_BLOCK_SIZE := 4096

TARGET_USERIMAGES_USE_EXT4 := true
BOARD_SYSTEMIMAGE_FILE_SYSTEM_TYPE := ext4
BOARD_VENDORIMAGE_FILE_SYSTEM_TYPE := ext4
EOF

    cat > "$device_dir/device.mk" << 'EOF'
$(call inherit-product, $(SRC_TARGET_DIR)/product/core_64_bit.mk)
$(call inherit-product, $(SRC_TARGET_DIR)/product/full_base_telephony.mk)

PRODUCT_NAME := limeos_rom
PRODUCT_DEVICE := generic
PRODUCT_BRAND := LimeOS
PRODUCT_MODEL := LimeOS for Virtual Master
PRODUCT_MANUFACTURER := LimeOS

PRODUCT_PROPERTY_OVERRIDES += \
    ro.limeos.version=1.0.0-beta1 \
    ro.vmos.supported=true \
    ro.kernel.qemu=1
EOF

    cat > "$device_dir/AndroidProducts.mk" << 'EOF'
PRODUCT_MAKEFILES := \
    $(LOCAL_DIR)/limeos_rom.mk
EOF

    cat > "$device_dir/limeos_rom.mk" << 'EOF'
$(call inherit-product, device/limeos/generic/device.mk)
PRODUCT_NAME := limeos_rom
PRODUCT_DEVICE := generic
PRODUCT_BRAND := LimeOS
PRODUCT_MODEL := LimeOS for Virtual Master
PRODUCT_MANUFACTURER := LimeOS
EOF

    log_ok "设备树配置完成"
}

# 应用虚拟大师补丁
apply_patches() {
    log_info "应用虚拟大师兼容性补丁..."

    cd "$SOURCE_DIR"

    # 创建补丁目录
    mkdir -p "$SOURCE_DIR/.limeos-patches"

    # 下载补丁
    curl -L -o "$SOURCE_DIR/.limeos-patches/vmos.patch" \
        "https://github.com/3862242786-sudo/pan/raw/main/rom-builder/patches/01-vmos-compat.patch" 2>/dev/null || {
        log_warn "无法下载补丁，创建本地补丁..."
        create_local_patch
    }

    # 应用补丁
    if [ -f "$SOURCE_DIR/.limeos-patches/vmos.patch" ]; then
        patch -p1 -i "$SOURCE_DIR/.limeos-patches/vmos.patch" || log_warn "部分补丁应用失败"
    fi

    log_ok "补丁应用完成"
}

# 创建本地补丁 (离线模式)
create_local_patch() {
    cat > "$SOURCE_DIR/.limeos-patches/vmos.patch" << 'PATCH_EOF'
diff --git a/build/core/main.mk b/build/core/main.mk
index 1234..5678 100644
--- a/build/core/main.mk
+++ b/build/core/main.mk
@@ -50,6 +50,9 @@ endif
 # 虚拟大师优化
 ifeq ($(TARGET_DEVICE),generic)
   TARGET_BUILD_VARIANT := userdebug
+  # 禁用某些硬件检查
+  TARGET_NO_BOOTLOADER := true
+  TARGET_NO_RADIO := true
 endif
 
 # 设置默认目标
PATCH_EOF
}

# 设置构建环境
setup_build_env() {
    log_info "设置构建环境..."

    cd "$SOURCE_DIR"

    # 加载构建环境
    source build/envsetup.sh

    # 选择目标
    lunch limeos_rom-userdebug

    log_ok "构建环境就绪"
}

# 开始构建
build_system() {
    log_info "开始构建 LimeOS..."
    log_info "这可能需要 2-4 小时，请保持设备充电"
    echo

    cd "$SOURCE_DIR"

    # 使用 4 个并行任务 (Android 设备性能有限)
    make -j4 2>&1 | tee "$OUTPUT_DIR/build.log"

    log_ok "系统构建完成"
}

# 打包 ROM
package_rom() {
    log_info "打包 ROM..."

    local out_dir="$SOURCE_DIR/out/target/product/generic"
    local build_date=$(date +%Y%m%d)
    local package_name="${ROM_NAME}-Android${ANDROID_VERSION}-${build_date}"

    if [ ! -f "$out_dir/system.img" ]; then
        log_err "system.img 未找到，构建可能失败"
        exit 1
    fi

    # 创建 ROM 目录
    local rom_dir="$OUTPUT_DIR/$package_name"
    mkdir -p "$rom_dir"

    # 复制镜像
    cp "$out_dir/system.img" "$rom_dir/"
    cp "$out_dir/vendor.img" "$rom_dir/" 2>/dev/null || true
    cp "$out_dir/boot.img" "$rom_dir/" 2>/dev/null || true

    # 创建配置文件
    cat > "$rom_dir/rom_config.json" << EOF
{
  "name": "LimeOS",
  "version": "1.0.0-beta1",
  "android_version": "$ANDROID_VERSION",
  "build_date": "$build_date",
  "architecture": "arm64"
}
EOF

    # 创建 README
    cat > "$rom_dir/README.txt" << EOF
LimeOS Beta 1
构建日期: $build_date

导入方法:
1. 将整个文件夹复制到虚拟大师
2. 在虚拟大师中选择"导入本地 ROM"
3. 选择 system.img
4. 启动虚拟机
EOF

    # 打包为 ZIP
    cd "$OUTPUT_DIR"
    zip -r "${package_name}.zip" "$package_name"

    log_ok "ROM 打包完成"
    log_info "输出文件: $OUTPUT_DIR/${package_name}.zip"
}

# 清理
cleanup() {
    log_info "清理临时文件..."
    rm -rf "$WORK_DIR"
    log_ok "清理完成"
}

# 主流程
main() {
    check_env
    setup_dirs
    download_source
    download_device_tree
    apply_patches
    setup_build_env
    build_system
    package_rom
    cleanup

    echo
    echo "========================================"
    echo "  LimeOS 构建完成！"
    echo "========================================"
    echo
    echo "输出位置: $OUTPUT_DIR/"
    echo
    ls -lh "$OUTPUT_DIR/"*.zip 2>/dev/null || true
}

# 运行
main "$@"
