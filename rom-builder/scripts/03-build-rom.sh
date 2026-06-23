#!/bin/bash
# ============================================================================
# 青柠 ROM 构建工具 - 步骤 3: 构建 ROM
# ============================================================================
# 编译系统镜像并打包
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AOSP_DIR="$PROJECT_ROOT/aosp"
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

# 检查环境
check_env() {
    log_info "检查构建环境..."
    
    if [ ! -d "$AOSP_DIR/.repo" ]; then
        log_err "AOSP 源码未找到。请先运行 01-sync-aosp.sh"
        exit 1
    fi
    
    if [ ! -f "$AOSP_DIR/device/qingning/generic/BoardConfig.mk" ]; then
        log_err "设备树未配置。请先运行 02-setup-device.sh"
        exit 1
    fi
    
    # 检查内存
    local mem_gb=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$mem_gb" -lt 8 ]; then
        log_warn "内存不足 8GB (当前: ${mem_gb}GB)，构建可能需要更长时间"
        log_info "建议启用 ZRAM: sudo swapon /dev/zram0"
    fi
    
    # 检查磁盘空间
    local disk_gb=$(df -BG "$AOSP_DIR" | awk 'NR==2{print $4}' | tr -d 'G')
    if [ "$disk_gb" -lt 50 ]; then
        log_err "磁盘空间不足 50GB (当前: ${disk_gb}GB)"
        exit 1
    fi
    
    log_ok "环境检查通过"
}

# 设置构建环境
setup_env() {
    log_info "设置构建环境..."
    
    cd "$AOSP_DIR"
    
    # 加载 AOSP 构建环境
    source build/envsetup.sh
    
    # 选择目标
    lunch qingning_rom-userdebug
    
    log_ok "构建环境就绪"
}

# 构建系统
build_system() {
    log_info "开始构建青柠 ROM..."
    log_info "这可能需要 2-4 小时，请耐心等待"
    echo
    
    cd "$AOSP_DIR"
    
    # 使用所有 CPU 核心
    local jobs=$(nproc --all)
    log_info "使用 $jobs 个并行任务"
    
    # 开始构建
    make -j$jobs \
        showcommands \
        2>&1 | tee "$OUTPUT_DIR/build.log"
    
    log_ok "系统构建完成"
}

# 打包 ROM
package_rom() {
    log_info "打包 ROM..."
    
    mkdir -p "$OUTPUT_DIR"
    
    local build_date=$(date +%Y%m%d)
    local rom_name="QingningROM-v1.0.0-${build_date}"
    
    # 收集输出文件
    local system_img="$AOSP_DIR/out/target/product/generic/system.img"
    local vendor_img="$AOSP_DIR/out/target/product/generic/vendor.img"
    local boot_img="$AOSP_DIR/out/target/product/generic/boot.img"
    local userdata_img="$AOSP_DIR/out/target/product/generic/userdata.img"
    
    if [ ! -f "$system_img" ]; then
        log_err "system.img 未找到，构建可能失败"
        exit 1
    fi
    
    # 创建 ROM 包目录
    local rom_dir="$OUTPUT_DIR/$rom_name"
    mkdir -p "$rom_dir"
    
    # 复制镜像
    cp "$system_img" "$rom_dir/"
    cp "$vendor_img" "$rom_dir/"
    cp "$boot_img" "$rom_dir/"
    cp "$userdata_img" "$rom_dir/"
    
    # 创建刷机脚本
    cat > "$rom_dir/flash.sh" << 'EOF'
#!/bin/bash
# 青柠 ROM 刷机脚本
# 用于虚拟大师环境

echo "========================================"
echo "  青柠 ROM 刷机工具"
echo "  虚拟大师专用版"
echo "========================================"
echo

echo "请将以下镜像文件放入虚拟大师的对应目录:"
echo "  - system.img -> /data/local/tmp/"
echo "  - vendor.img -> /data/local/tmp/"
echo "  - boot.img   -> /data/local/tmp/"
echo "  - userdata.img -> /data/local/tmp/"
echo
echo "然后在虚拟大师内执行:"
echo "  sh /data/local/tmp/flash.sh"
echo
EOF
    chmod +x "$rom_dir/flash.sh"
    
    # 创建 README
    cat > "$rom_dir/README.txt" << EOF
青柠 ROM v1.0.0
================

构建日期: $(date '+%Y-%m-%d %H:%M:%S')
Android 版本: 11 (API 30)
目标平台: 虚拟大师 (VMOS)
架构: arm64-v8a

包含镜像:
  - system.img (系统分区)
  - vendor.img (厂商分区)
  - boot.img (启动分区)
  - userdata.img (用户数据分区)

特性:
  - 预装 Magisk (Root)
  - 预装 LSPosed (Xposed 框架)
  - 系统精简优化
  - 虚拟大师兼容性修复
  - ADB 调试支持

安装方法:
  1. 将镜像文件复制到虚拟大师
  2. 运行 flash.sh 脚本
  3. 重启虚拟机

注意:
  - 此 ROM 专为虚拟大师优化
  - 首次启动可能需要 3-5 分钟
  - 建议在虚拟大师设置中分配 2GB+ 内存

技术支持: https://3862242786-sudo.github.io/pan/qingning-rom.html
EOF
    
    # 打包为 zip
    cd "$OUTPUT_DIR"
    zip -r "${rom_name}.zip" "$rom_name"
    
    log_ok "ROM 打包完成: ${rom_name}.zip"
    log_info "输出位置: $OUTPUT_DIR/${rom_name}.zip"
}

# 生成刷机包 (用于 Recovery)
make_flashable_zip() {
    log_info "创建 Recovery 刷机包..."
    
    local build_date=$(date +%Y%m%d)
    local zip_name="QingningROM-v1.0.0-${build_date}-flashable.zip"
    local zip_dir="$OUTPUT_DIR/flashable"
    
    mkdir -p "$zip_dir/META-INF/com/google/android"
    
    # 创建 update-binary
    cat > "$zip_dir/META-INF/com/google/android/update-binary" << 'EOF'
#!/sbin/sh
# 青柠 ROM Update Binary

ui_print "========================================"
ui_print "  青柠 ROM"
ui_print "  虚拟大师定制版"
ui_print "========================================"
ui_print ""

# 挂载分区
mount /system
mount /vendor

# 刷入镜像
ui_print "正在刷入 system.img..."
dd if=/tmp/system.img of=/dev/block/bootdevice/by-name/system bs=4M

ui_print "正在刷入 vendor.img..."
dd if=/tmp/vendor.img of=/dev/block/bootdevice/by-name/vendor bs=4M

ui_print "正在刷入 boot.img..."
dd if=/tmp/boot.img of=/dev/block/bootdevice/by-name/boot bs=4M

# 清理并重启
ui_print "清理缓存..."
rm -rf /cache/*

ui_print "刷机完成！"
ui_print "正在重启..."
reboot
EOF
    chmod +x "$zip_dir/META-INF/com/google/android/update-binary"
    
    # 创建 updater-script
    cat > "$zip_dir/META-INF/com/google/android/updater-script" << 'EOF'
# 青柠 ROM Updater Script
ui_print("青柠 ROM 安装程序");
ui_print("虚拟大师定制版");
ui_print("");
ui_print("准备安装...");
run_program("/sbin/sh", "/tmp/update-binary");
EOF
    
    # 打包
    cd "$zip_dir"
    zip -r "$OUTPUT_DIR/$zip_name" .
    
    log_ok "Recovery 刷机包创建完成: $zip_name"
}

# 主流程
main() {
    echo "========================================"
    echo "  青柠 ROM - 构建系统"
    echo "  Android 11 | 虚拟大师定制版"
    echo "========================================"
    echo
    
    check_env
    setup_env
    build_system
    package_rom
    make_flashable_zip
    
    echo
    log_ok "构建完成！"
    log_info "输出文件位于: $OUTPUT_DIR/"
    echo
    echo "构建产物:"
    ls -lh "$OUTPUT_DIR"/*.zip 2>/dev/null || true
}

main "$@"
