#!/data/data/com.termux/files/usr/bin/bash
# ============================================================================
# LimeOS - Termux 环境安装脚本
# ============================================================================
# 一键安装 Termux 构建环境
# 运行: bash termux-install.sh
# ============================================================================

echo "========================================"
echo "  LimeOS Termux 构建环境安装"
echo "========================================"
echo

# 更新源
echo "[1/5] 更新软件源..."
termux-change-repo
pkg update -y

# 安装必要工具
echo "[2/5] 安装构建工具..."
pkg install -y git python python-pip curl wget make zip unzip \
    clang lld llvm binutils-is-llvm \
    libandroid-spawn liblzma libxml2 \
    ncurses-utils procps

# 安装 repo 工具
echo "[3/5] 安装 repo 工具..."
mkdir -p ~/bin
curl -s https://storage.googleapis.com/git-repo-downloads/repo > ~/bin/repo
chmod a+x ~/bin/repo

# 配置环境变量
echo "[4/5] 配置环境..."
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
echo 'export REPO_URL="https://mirrors.tuna.tsinghua.edu.cn/git/git-repo"' >> ~/.bashrc
source ~/.bashrc

# 创建工作目录
echo "[5/5] 创建工作目录..."
mkdir -p ~/LimeOS-Build

# 下载构建脚本
echo "下载 LimeOS 构建脚本..."
cd ~/LimeOS-Build
curl -L -o android-build.sh \
    "https://3862242786-sudo.github.io/pan/rom-builder/android-build.sh"
chmod +x android-build.sh

echo
echo "========================================"
echo "  安装完成！"
echo "========================================"
echo
echo "使用方法:"
echo "  cd ~/LimeOS-Build"
echo "  bash android-build.sh"
echo
echo "注意:"
echo "  - 确保设备有 8GB+ 存储空间"
echo "  - 确保设备有 4GB+ 内存"
echo "  - 构建过程需要 2-4 小时"
echo "  - 保持设备充电状态"
echo
echo "技术支持: https://3862242786-sudo.github.io/pan/qingning-rom.html"
