# ============================================================================
# 青柠 ROM - BoardConfig.mk
# 虚拟大师定制版 Android 11
# ============================================================================

# 目标架构
TARGET_ARCH := arm64
TARGET_ARCH_VARIANT := armv8-a
TARGET_CPU_ABI := arm64-v8a
TARGET_CPU_ABI2 :=
TARGET_CPU_VARIANT := generic

TARGET_2ND_ARCH := arm
TARGET_2ND_ARCH_VARIANT := armv8-a
TARGET_2ND_CPU_ABI := armeabi-v7a
TARGET_2ND_CPU_ABI2 := armeabi
TARGET_2ND_CPU_VARIANT := generic

# 虚拟机优化
TARGET_IS_64_BIT := true
TARGET_SUPPORTS_64_BIT_APPS := true

# 内核配置
TARGET_NO_KERNEL := false
TARGET_PREBUILT_KERNEL := device/qingning/generic/kernel
BOARD_KERNEL_BASE := 0x40000000
BOARD_KERNEL_PAGESIZE := 4096
BOARD_KERNEL_CMDLINE := console=ttyS0,115200n8 androidboot.console=ttyS0 androidboot.hardware=qingning
BOARD_KERNEL_CMDLINE += androidboot.selinux=permissive

# 分区大小 (虚拟机环境，适当缩小)
BOARD_BOOTIMAGE_PARTITION_SIZE := 67108864
BOARD_SYSTEMIMAGE_PARTITION_SIZE := 1610612736
BOARD_VENDORIMAGE_PARTITION_SIZE := 536870912
BOARD_USERDATAIMAGE_PARTITION_SIZE := 576716800
BOARD_FLASH_BLOCK_SIZE := 4096

# 文件系统
TARGET_USERIMAGES_USE_EXT4 := true
TARGET_USERIMAGES_USE_F2FS := true
BOARD_SYSTEMIMAGE_FILE_SYSTEM_TYPE := ext4
BOARD_VENDORIMAGE_FILE_SYSTEM_TYPE := ext4
TARGET_COPY_OUT_VENDOR := vendor

# 图形
TARGET_USES_HWC2 := true
TARGET_USES_ION := true
NUM_FRAMEBUFFER_SURFACE_BUFFERS := 3

# 音频
BOARD_USES_ALSA_AUDIO := true
BOARD_USES_GENERIC_AUDIO := true

# WiFi
BOARD_WLAN_DEVICE := wlan0
WPA_SUPPLICANT_VERSION := VER_0_8_X
BOARD_WPA_SUPPLICANT_DRIVER := NL80211

# 蓝牙
BOARD_HAVE_BLUETOOTH := true
BOARD_BLUETOOTH_BDROID_BUILDCFG_INCLUDE_DIR := device/qingning/generic/bluetooth

# GPS
BOARD_GPS_LIBRARIES := true

# 传感器
TARGET_NO_SENSOR := true

# 虚拟机特定优化
# 虚拟大师使用 goldfish 内核，需要特殊处理
BOARD_USES_QEMU_HARDWARE := true
BOARD_USES_QEMU_AUDIO := true
BOARD_USES_QEMU_GPS := true

# SELinux (开发阶段设为 permissive)
BOARD_KERNEL_CMDLINE += androidboot.selinux=permissive
BOARD_SEPOLICY_DIRS += device/qingning/generic/sepolicy

# 调试
BOARD_INCLUDE_RECOVERY_DTBO := false
TARGET_ENABLE_MEDIADRM_64 := true
