package com.qingning.settings;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class AboutActivity extends Activity {

    private TextView mVersionText;
    private TextView mBuildText;
    private LinearLayout mUpdateRow;
    private TextView mUpdateStatus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_about);

        initViews();
        loadDeviceInfo();
        checkUpdateStatus();
    }

    private void initViews() {
        mVersionText = findViewById(R.id.version_text);
        mBuildText = findViewById(R.id.build_text);
        mUpdateRow = findViewById(R.id.update_row);
        mUpdateStatus = findViewById(R.id.update_status);

        // 检测更新点击
        mUpdateRow.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(AboutActivity.this, UpdateActivity.class));
            }
        });

        // ROM 信息点击
        findViewById(R.id.rom_info_row).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showRomDetails();
            }
        });

        // 设备信息点击
        findViewById(R.id.device_info_row).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showDeviceDetails();
            }
        });
    }

    private void loadDeviceInfo() {
        // ROM 版本
        String romVersion = getRomVersion();
        mVersionText.setText(romVersion);

        // 构建信息
        String buildInfo = "Android " + Build.VERSION.RELEASE + " | API " + Build.VERSION.SDK_INT;
        mBuildText.setText(buildInfo);
    }

    private String getRomVersion() {
        String version = System.getProperty("ro.qingning.version", "1.0.0");
        String buildType = System.getProperty("ro.qingning.build.type", "userdebug");
        return "Qingning ROM " + version + " (" + buildType + ")";
    }

    private void checkUpdateStatus() {
        // 检查是否有更新缓存
        UpdateChecker checker = new UpdateChecker(this);
        if (checker.hasUpdateCache()) {
            mUpdateStatus.setText(R.string.update_available);
            mUpdateStatus.setTextColor(getColor(R.color.accent_green));
        } else {
            mUpdateStatus.setText(R.string.update_checking);
            // 后台检查更新
            checker.checkForUpdate(new UpdateChecker.UpdateCallback() {
                @Override
                public void onResult(boolean hasUpdate, String version) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (hasUpdate) {
                                mUpdateStatus.setText(getString(R.string.update_new_version, version));
                                mUpdateStatus.setTextColor(getColor(R.color.accent_green));
                            } else {
                                mUpdateStatus.setText(R.string.update_latest);
                                mUpdateStatus.setTextColor(getColor(R.color.text_secondary));
                            }
                        }
                    });
                }
            });
        }
    }

    private void showRomDetails() {
        StringBuilder details = new StringBuilder();
        details.append("ROM 名称: Qingning ROM\n");
        details.append("ROM 版本: ").append(getRomVersion()).append("\n");
        details.append("Android 版本: ").append(Build.VERSION.RELEASE).append("\n");
        details.append("API 级别: ").append(Build.VERSION.SDK_INT).append("\n");
        details.append("安全补丁: ").append(Build.VERSION.SECURITY_PATCH).append("\n");
        details.append("构建日期: ").append(System.getProperty("ro.qingning.build.date", "Unknown")).append("\n");
        details.append("构建类型: ").append(System.getProperty("ro.qingning.build.type", "userdebug"));

        Toast.makeText(this, details.toString(), Toast.LENGTH_LONG).show();
    }

    private void showDeviceDetails() {
        StringBuilder details = new StringBuilder();
        details.append("设备: ").append(Build.MODEL).append("\n");
        details.append("制造商: ").append(Build.MANUFACTURER).append("\n");
        details.append("品牌: ").append(Build.BRAND).append("\n");
        details.append("设备代号: ").append(Build.DEVICE).append("\n");
        details.append("主板: ").append(Build.BOARD).append("\n");
        details.append("硬件: ").append(Build.HARDWARE).append("\n");
        details.append("处理器: ").append(Build.SUPPORTED_ABIS[0]).append("\n");
        details.append("Bootloader: ").append(Build.BOOTLOADER).append("\n");
        details.append("指纹: ").append(Build.FINGERPRINT);

        Toast.makeText(this, details.toString(), Toast.LENGTH_LONG).show();
    }
}
