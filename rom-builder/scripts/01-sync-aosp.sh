#!/bin/bash
# ============================================================================
# 青柠 ROM 构建工具 - 步骤 1: 同步 AOSP 源码
# ============================================================================
# 基于 Android 11 (android-11.0.0_r48) 标签
# 专为虚拟大师优化
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AOSP_DIR="$PROJECT_ROOT/aosp"

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

# 检查依赖
check_deps() {
    log_info "检查构建依赖..."
    
    local deps=("git" "python3" "curl" "repo")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_err "缺少依赖: ${missing[*]}"
        log_info "请安装以下包:"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install -y git python3 curl repo"
        exit 1
    fi
    
    log_ok "所有依赖已就绪"
}

# 安装 repo 工具
install_repo() {
    if [ ! -f "$HOME/bin/repo" ]; then
        log_info "安装 repo 工具..."
        mkdir -p "$HOME/bin"
        curl -s https://storage.googleapis.com/git-repo-downloads/repo > "$HOME/bin/repo"
        chmod a+x "$HOME/bin/repo"
        export PATH="$HOME/bin:$PATH"
        log_ok "repo 工具已安装"
    fi
}

# 同步 AOSP 源码
sync_aosp() {
    log_info "开始同步 AOSP Android 11 源码..."
    log_info "目标标签: android-11.0.0_r48"
    log_info "存储位置: $AOSP_DIR"
    
    mkdir -p "$AOSP_DIR"
    cd "$AOSP_DIR"
    
    if [ ! -d ".repo" ]; then
        log_info "初始化 repo..."
        repo init -u https://android.googlesource.com/platform/manifest \
            -b android-11.0.0_r48 \
            --depth=1 \
            --groups=all,-notdefault,-device,-darwin,-mips
    fi
    
    log_info "同步源码 (这可能需要 30-60 分钟)..."
    repo sync -c -j$(nproc --all) --force-sync --no-clone-bundle --no-tags
    
    log_ok "AOSP 源码同步完成"
}

# 主流程
main() {
    echo "========================================"
    echo "  青柠 ROM - AOSP 源码同步"
    echo "  Android 11 | 虚拟大师定制版"
    echo "========================================"
    echo
    
    check_deps
    install_repo
    sync_aosp
    
    echo
    log_ok "步骤 1 完成: AOSP 源码已同步"
    log_info "下一步: 运行 02-setup-device.sh 配置设备树"
}

main "$@"
