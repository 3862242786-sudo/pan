# ============================================================================
# 青柠 ROM - device.mk
# 虚拟大师定制版 Android 11
# ============================================================================

# 继承通用配置
$(call inherit-product, $(SRC_TARGET_DIR)/product/core_64_bit.mk)
$(call inherit-product, $(SRC_TARGET_DIR)/product/full_base_telephony.mk)
$(call inherit-product, $(SRC_TARGET_DIR)/product/languages_full.mk)

# 产品信息
PRODUCT_NAME := qingning_rom
PRODUCT_DEVICE := generic
PRODUCT_BRAND := Qingning
PRODUCT_MODEL := Qingning ROM for Virtual Master
PRODUCT_MANUFACTURER := QingningOS

# 覆盖层
DEVICE_PACKAGE_OVERLAYS += device/qingning/generic/overlay

# 虚拟机特定属性
PRODUCT_PROPERTY_OVERRIDES += \
    ro.hardware=qingning \
    ro.kernel.qemu=1 \
    ro.kernel.qemu.gles=2 \
    qemu.hw.mainkeys=0 \
    ro.opengles.version=196609 \
    ro.sf.lcd_density=320 \
    persist.sys.disable_rescue=true \
    ro.sys.sdcardfs=1

# 虚拟大师兼容性
PRODUCT_PROPERTY_OVERRIDES += \
    ro.vmos.supported=true \
    ro.vmos.version=2 \
    ro.boot.vmos=1 \
    persist.vmos.compat=1

# 网络优化
PRODUCT_PROPERTY_OVERRIDES += \
    net.dns1=8.8.8.8 \
    net.dns2=8.8.4.4 \
    net.eth0.dns1=8.8.8.8 \
    net.eth0.dns2=8.8.4.4

# 性能优化
PRODUCT_PROPERTY_OVERRIDES += \
    dalvik.vm.heapstartsize=8m \
    dalvik.vm.heapgrowthlimit=192m \
    dalvik.vm.heapsize=512m \
    dalvik.vm.heaptargetutilization=0.75 \
    dalvik.vm.heapminfree=512k \
    dalvik.vm.heapmaxfree=8m \
    ro.config.low_ram=false \
    persist.sys.vm_stats=false

# 调试支持 (开发版本)
PRODUCT_PROPERTY_OVERRIDES += \
    ro.debuggable=1 \
    ro.adb.secure=0 \
    persist.sys.usb.config=adb \
    persist.service.adb.enable=1 \
    persist.service.debuggable=1

# 预装应用
PRODUCT_PACKAGES += \
    Magisk \
    LSPosed \
    QingningLauncher \
    QingningSettings

# 移除不必要的包
PRODUCT_PACKAGES := $(filter-out \
    Calendar \
    CalendarProvider \
    Contacts \
    DeskClock \
    Email \
    Exchange2 \
    Gallery2 \
    Music \
    MusicFX \
    OneTimeInitializer \
    PrintSpooler \
    QuickSearchBox \
    SecureElement \
    SimAppDialog \
    Traceur \
    WallpaperCropper \
,$(PRODUCT_PACKAGES))

# 权限
PRODUCT_COPY_FILES += \
    frameworks/native/data/etc/android.hardware.wifi.xml:$(TARGET_COPY_OUT_VENDOR)/etc/permissions/android.hardware.wifi.xml \
    frameworks/native/data/etc/android.hardware.bluetooth.xml:$(TARGET_COPY_OUT_VENDOR)/etc/permissions/android.hardware.bluetooth.xml \
    frameworks/native/data/etc/android.hardware.bluetooth_le.xml:$(TARGET_COPY_OUT_VENDOR)/etc/permissions/android.hardware.bluetooth_le.xml \
    frameworks/native/data/etc/android.hardware.location.gps.xml:$(TARGET_COPY_OUT_VENDOR)/etc/permissions/android.hardware.location.gps.xml \
    frameworks/native/data/etc/android.hardware.touchscreen.multitouch.xml:$(TARGET_COPY_OUT_VENDOR)/etc/permissions/android.hardware.touchscreen.multitouch.xml \
    frameworks/native/data/etc/android.hardware.usb.accessory.xml:$(TARGET_COPY_OUT_VENDOR)/etc/permissions/android.hardware.usb.accessory.xml \
    frameworks/native/data/etc/android.hardware.usb.host.xml:$(TARGET_COPY_OUT_VENDOR)/etc/permissions/android.hardware.usb.host.xml

# 初始化脚本
PRODUCT_COPY_FILES += \
    device/qingning/generic/init.qingning.rc:$(TARGET_COPY_OUT_VENDOR)/etc/init/hw/init.qingning.rc \
    device/qingning/generic/fstab.qingning:$(TARGET_COPY_OUT_VENDOR)/etc/fstab.qingning

# 内核
ifeq ($(TARGET_PREBUILT_KERNEL),)
    LOCAL_KERNEL := device/qingning/generic/kernel
else
    LOCAL_KERNEL := $(TARGET_PREBUILT_KERNEL)
endif

PRODUCT_COPY_FILES += \
    $(LOCAL_KERNEL):kernel
