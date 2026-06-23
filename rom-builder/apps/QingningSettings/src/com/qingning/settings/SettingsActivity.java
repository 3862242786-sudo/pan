package com.qingning.settings;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ListView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class SettingsActivity extends Activity {

    private ListView mListView;
    private SettingsAdapter mAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        mListView = findViewById(R.id.settings_list);
        setupSettingsList();
    }

    private void setupSettingsList() {
        List<SettingsItem> items = new ArrayList<>();

        // 网络和互联网
        items.add(new SettingsItem(
            R.drawable.ic_network,
            getString(R.string.network_title),
            getString(R.string.network_summary),
            "network"
        ));

        // 已连接的设备
        items.add(new SettingsItem(
            R.drawable.ic_bluetooth,
            getString(R.string.bluetooth_title),
            getString(R.string.bluetooth_summary),
            "bluetooth"
        ));

        // 应用和通知
        items.add(new SettingsItem(
            R.drawable.ic_apps,
            getString(R.string.apps_title),
            getString(R.string.apps_summary),
            "apps"
        ));

        // 电池
        items.add(new SettingsItem(
            R.drawable.ic_battery,
            getString(R.string.battery_title),
            getString(R.string.battery_summary),
            "battery"
        ));

        // 显示
        items.add(new SettingsItem(
            R.drawable.ic_display,
            getString(R.string.display_title),
            getString(R.string.display_summary),
            "display"
        ));

        // 声音
        items.add(new SettingsItem(
            R.drawable.ic_sound,
            getString(R.string.sound_title),
            getString(R.string.sound_summary),
            "sound"
        ));

        // 存储
        items.add(new SettingsItem(
            R.drawable.ic_storage,
            getString(R.string.storage_title),
            getString(R.string.storage_summary),
            "storage"
        ));

        // 隐私
        items.add(new SettingsItem(
            R.drawable.ic_privacy,
            getString(R.string.privacy_title),
            getString(R.string.privacy_summary),
            "privacy"
        ));

        // 位置信息
        items.add(new SettingsItem(
            R.drawable.ic_location,
            getString(R.string.location_title),
            getString(R.string.location_summary),
            "location"
        ));

        // 安全
        items.add(new SettingsItem(
            R.drawable.ic_security,
            getString(R.string.security_title),
            getString(R.string.security_summary),
            "security"
        ));

        // 账号
        items.add(new SettingsItem(
            R.drawable.ic_account,
            getString(R.string.account_title),
            getString(R.string.account_summary),
            "account"
        ));

        // 系统
        items.add(new SettingsItem(
            R.drawable.ic_system,
            getString(R.string.system_title),
            getString(R.string.system_summary),
            "system"
        ));

        // 关于手机 (带检测更新)
        items.add(new SettingsItem(
            R.drawable.ic_about,
            getString(R.string.about_title),
            getString(R.string.about_summary),
            "about"
        ));

        mAdapter = new SettingsAdapter(this, items);
        mListView.setAdapter(mAdapter);

        mListView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                SettingsItem item = items.get(position);
                handleItemClick(item);
            }
        });
    }

    private void handleItemClick(SettingsItem item) {
        switch (item.getKey()) {
            case "about":
                startActivity(new Intent(this, AboutActivity.class));
                break;
            case "system":
                openSystemSettings();
                break;
            default:
                Toast.makeText(this, item.getTitle() + " - 开发中", Toast.LENGTH_SHORT).show();
                break;
        }
    }

    private void openSystemSettings() {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_SETTINGS);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, R.string.error_open_settings, Toast.LENGTH_SHORT).show();
        }
    }
}
