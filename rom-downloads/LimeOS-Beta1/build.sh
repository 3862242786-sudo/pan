#!/bin/bash
# ============================================================================
# LimeOS Beta 1 - 一键构建脚本
# ============================================================================
# 将所有构建产物输出到当前目录 (rom-downloads/LimeOS-Beta1/)
# 运行: bash build.sh
# ============================================================================

set -e

# 目录配置 (所有输出都在当前目录)
OUTPUT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR="$OUTPUT_DIR/.build"
SOURCE_DIR="$WORK_DIR/aosp"
ROM_NAME="LimeOS-Beta1"
ANDROID_VERSION="11"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP $1/7]${NC} $2"; }

# 检查环境
check_env() {
    echo "========================================"
    echo "  LimeOS Beta 1 一键构建"
    echo "========================================"
    echo

    log_info "检查构建环境..."

    # 检查存储空间
    local avail=$(df "$OUTPUT_DIR" | tail -1 | awk '{print $4}')
    if [ "$avail" -lt 10485760 ]; then
        log_err "存储空间不足 10GB"
        log_info "当前可用: $(($avail / 1024 / 1024)) GB"
        exit 1
    fi
    log_ok "存储空间充足 ($(($avail / 1024 / 1024)) GB)"

    # 检查内存
    local mem=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo "0")
    if [ "$mem" -lt 4096 ]; then
        log_warn "内存不足 4GB (当前: ${mem}MB)，构建可能较慢"
    else
        log_ok "内存充足 (${mem}MB)"
    fi

    # 检查工具
    local tools="git python3 curl make zip"
    for t in $tools; do
        if ! command -v "$t" >/dev/null 2>&1; then
            log_err "缺少工具: $t"
            log_info "请安装: sudo apt-get install -y $tools"
            exit 1
        fi
    done
    log_ok "所有工具已就绪"
}

# 步骤1: 准备工作目录
step1_setup() {
    log_step 1 "准备工作目录..."
    rm -rf "$WORK_DIR"
    mkdir -p "$WORK_DIR" "$OUTPUT_DIR"
    log_ok "工作目录: $WORK_DIR"
}

# 步骤2: 下载 AOSP 源码
step2_download() {
    log_step 2 "下载 AOSP Android 11 源码..."
    log_info "使用清华镜像加速，预计 30-60 分钟"

    cd "$WORK_DIR"

    # repo 工具
    if [ ! -f "$WORK_DIR/repo" ]; then
        curl -s https://storage.googleapis.com/git-repo-downloads/repo > "$WORK_DIR/repo"
        chmod a+x "$WORK_DIR/repo"
    fi

    export REPO_URL='https://mirrors.tuna.tsinghua.edu.cn/git/git-repo'

    mkdir -p "$SOURCE_DIR"
    cd "$SOURCE_DIR"

    if [ ! -d ".repo" ]; then
        "$WORK_DIR/repo" init \
            -u https://aosp.tuna.tsinghua.edu.cn/platform/manifest \
            -b android-11.0.0_r48 \
            --depth=1 \
            --groups=all,-notdefault,-device,-darwin,-mips
    fi

    "$WORK_DIR/repo" sync -c -j$(nproc --all) --force-sync --no-clone-bundle --no-tags

    log_ok "源码下载完成"
}

# 步骤3: 配置设备树
step3_device() {
    log_step 3 "配置 LimeOS 设备树..."

    local device_dir="$SOURCE_DIR/device/limeos/generic"
    mkdir -p "$device_dir"

    # BoardConfig.mk
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
TARGET_COPY_OUT_VENDOR := vendor
EOF

    # device.mk
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
    ro.limeos.build.date=2026-06-23 \
    ro.vmos.supported=true \
    ro.kernel.qemu=1 \
    ro.hardware=limeos \
    net.dns1=8.8.8.8 \
    net.dns2=8.8.4.4 \
    dalvik.vm.heapstartsize=8m \
    dalvik.vm.heapgrowthlimit=192m \
    dalvik.vm.heapsize=512m
EOF

    # AndroidProducts.mk
    cat > "$device_dir/AndroidProducts.mk" << 'EOF'
PRODUCT_MAKEFILES := \
    $(LOCAL_DIR)/limeos_rom.mk
EOF

    # limeos_rom.mk
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

# 步骤4: 应用补丁
step4_patch() {
    log_step 4 "应用虚拟大师兼容性补丁..."

    cd "$SOURCE_DIR"

    # 创建并应用本地补丁
    mkdir -p "$SOURCE_DIR/.limeos-patches"

    cat > "$SOURCE_DIR/.limeos-patches/vmos.patch" << 'PATCH_EOF'
diff --git a/build/core/main.mk b/build/core/main.mk
index 1234..5678 100644
--- a/build/core/main.mk
+++ b/build/core/main.mk
@@ -50,6 +50,10 @@ endif
 # 虚拟大师优化
 ifeq ($(TARGET_DEVICE),generic)
   TARGET_BUILD_VARIANT := userdebug
+  TARGET_NO_BOOTLOADER := true
+  TARGET_NO_RADIO := true
+  BOARD_USES_QEMU_HARDWARE := true
 endif
 
 # 设置默认目标
PATCH_EOF

    patch -p1 -i "$SOURCE_DIR/.limeos-patches/vmos.patch" || log_warn "部分补丁应用失败，继续构建"

    log_ok "补丁应用完成"
}

# 步骤5: 构建系统
step5_build() {
    log_step 5 "构建 LimeOS 系统..."
    log_info "预计 2-4 小时，请保持设备充电"
    echo

    cd "$SOURCE_DIR"
    source build/envsetup.sh
    lunch limeos_rom-userdebug

    local jobs=$(nproc --all)
    log_info "使用 $jobs 个并行任务"

    make -j$jobs 2>&1 | tee "$OUTPUT_DIR/build.log"

    log_ok "系统构建完成"
}

# 步骤6: 打包 ROM
step6_package() {
    log_step 6 "打包 ROM..."

    local out_dir="$SOURCE_DIR/out/target/product/generic"
    local build_date=$(date +%Y%m%d_%H%M)
    local package_name="${ROM_NAME}-Android${ANDROID_VERSION}-${build_date}"
    local rom_dir="$OUTPUT_DIR/$package_name"

    if [ ! -f "$out_dir/system.img" ]; then
        log_err "system.img 未找到，构建可能失败"
        log_info "请检查 $OUTPUT_DIR/build.log"
        exit 1
    fi

    mkdir -p "$rom_dir"

    # 复制镜像
    cp "$out_dir/system.img" "$rom_dir/"
    [ -f "$out_dir/vendor.img" ] && cp "$out_dir/vendor.img" "$rom_dir/"
    [ -f "$out_dir/boot.img" ] && cp "$out_dir/boot.img" "$rom_dir/"
    [ -f "$out_dir/userdata.img" ] && cp "$out_dir/userdata.img" "$rom_dir/"

    # 复制配置文件
    cp "$OUTPUT_DIR/rom_config.json" "$rom_dir/" 2>/dev/null || true
    cp "$OUTPUT_DIR/README.txt" "$rom_dir/" 2>/dev/null || true
    cp "$OUTPUT_DIR/changelog.txt" "$rom_dir/" 2>/dev/null || true

    # 创建新的 rom_config.json
    cat > "$rom_dir/rom_config.json" << EOF
{
  "name": "LimeOS",
  "version": "1.0.0-beta1",
  "versionCode": 10001,
  "android_version": "$ANDROID_VERSION",
  "api_level": 30,
  "architecture": "arm64-v8a",
  "build_date": "$build_date",
  "build_type": "beta",
  "file_size": $(du -b "$rom_dir/system.img" | cut -f1),
  "md5": "$(md5sum "$rom_dir/system.img" | cut -d' ' -f1)"
}
EOF

    # 打包 ZIP
    cd "$OUTPUT_DIR"
    zip -r "${package_name}.zip" "$package_name"

    # 创建导入说明
    cat > "$OUTPUT_DIR/IMPORT_GUIDE.txt" << EOF
LimeOS Beta 1 导入指南
========================

构建时间: $(date '+%Y-%m-%d %H:%M:%S')

文件说明:
  - ${package_name}.zip  -> ROM 导入包
  - build.log            -> 构建日志
  - IMPORT_GUIDE.txt     -> 本文件

导入步骤 (虚拟大师 / VMOS Pro):
  1. 将 ${package_name}.zip 复制到手机
  2. 打开虚拟大师应用
  3. 点击"添加自定义 ROM"
  4. 选择 ZIP 文件
  5. 等待导入完成
  6. 启动虚拟机

推荐配置:
  - 内存: 2GB+
  - 存储: 4GB+

技术支持: https://3862242786-sudo.github.io/pan/qingning-rom.html
EOF

    log_ok "ROM 打包完成"
}

# 步骤7: 清理
step7_cleanup() {
    log_step 7 "清理临时文件..."
    rm -rf "$WORK_DIR"
    log_ok "清理完成"
}

# 主流程
main() {
    check_env
    step1_setup
    step2_download
    step3_device
    step4_patch
    step5_build
    step6_package
    step7_cleanup

    echo
    echo "========================================"
    echo "  LimeOS Beta 1 构建完成！"
    echo "========================================"
    echo
    echo "输出目录: $OUTPUT_DIR"
    echo
    ls -lh "$OUTPUT_DIR/"*.zip 2>/dev/null || true
    echo
    echo "导入指南: $OUTPUT_DIR/IMPORT_GUIDE.txt"
    echo "构建日志: $OUTPUT_DIR/build.log"
    echo
    echo "下一步:"
    echo "  1. 将 .zip 文件复制到手机"
    echo "  2. 在虚拟大师中导入 ROM"
    echo "  3. 启动虚拟机"
}

# 信号处理
trap 'log_err "构建中断"; rm -rf "$WORK_DIR"; exit 1' INT TERM

# 运行
main "$@"
