package com.qingning.settings;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class UpdateActivity extends Activity {

    private TextView mCurrentVersion;
    private TextView mLatestVersion;
    private TextView mUpdateInfo;
    private Button mCheckButton;
    private Button mDownloadButton;
    private ProgressBar mProgressBar;
    private LinearLayout mUpdateContainer;
    private LinearLayout mProgressContainer;
    private TextView mProgressText;

    private UpdateChecker mChecker;
    private long mDownloadId = -1;
    private BroadcastReceiver mDownloadReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_update);

        initViews();
        mChecker = new UpdateChecker(this);
        loadCurrentVersion();
        registerDownloadReceiver();
    }

    private void initViews() {
        mCurrentVersion = findViewById(R.id.current_version);
        mLatestVersion = findViewById(R.id.latest_version);
        mUpdateInfo = findViewById(R.id.update_info);
        mCheckButton = findViewById(R.id.check_button);
        mDownloadButton = findViewById(R.id.download_button);
        mProgressBar = findViewById(R.id.progress_bar);
        mUpdateContainer = findViewById(R.id.update_container);
        mProgressContainer = findViewById(R.id.progress_container);
        mProgressText = findViewById(R.id.progress_text);

        mCheckButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                checkForUpdate();
            }
        });

        mDownloadButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startDownload();
            }
        });
    }

    private void loadCurrentVersion() {
        String version = System.getProperty("ro.qingning.version", "1.0.0");
        mCurrentVersion.setText(getString(R.string.current_version, version));
    }

    private void checkForUpdate() {
        mCheckButton.setEnabled(false);
        mCheckButton.setText(R.string.checking);
        mProgressContainer.setVisibility(View.VISIBLE);
        mProgressText.setText(R.string.connecting_server);

        mChecker.checkForUpdate(new UpdateChecker.UpdateCallback() {
            @Override
            public void onResult(boolean hasUpdate, String version) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        mCheckButton.setEnabled(true);
                        mCheckButton.setText(R.string.check_update);
                        mProgressContainer.setVisibility(View.GONE);

                        if (hasUpdate) {
                            showUpdateAvailable(version);
                        } else {
                            showNoUpdate();
                        }
                    }
                });
            }
        });
    }

    private void showUpdateAvailable(String version) {
        mUpdateContainer.setVisibility(View.VISIBLE);
        mLatestVersion.setText(getString(R.string.latest_version, version));
        mLatestVersion.setTextColor(getColor(R.color.accent_green));

        // 获取更新日志
        String changelog = mChecker.getChangelog();
        mUpdateInfo.setText(changelog != null ? changelog : getString(R.string.no_changelog));

        mDownloadButton.setVisibility(View.VISIBLE);
        mDownloadButton.setText(getString(R.string.download_update, version));
    }

    private void showNoUpdate() {
        mUpdateContainer.setVisibility(View.VISIBLE);
        mLatestVersion.setText(R.string.already_latest);
        mLatestVersion.setTextColor(getColor(R.color.text_secondary));
        mUpdateInfo.setText(R.string.no_update_info);
        mDownloadButton.setVisibility(View.GONE);

        Toast.makeText(this, R.string.no_update_toast, Toast.LENGTH_SHORT).show();
    }

    private void startDownload() {
        String downloadUrl = mChecker.getDownloadUrl();
        if (downloadUrl == null) {
            Toast.makeText(this, R.string.download_url_error, Toast.LENGTH_SHORT).show();
            return;
        }

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(downloadUrl));
        request.setTitle(getString(R.string.download_title));
        request.setDescription(getString(R.string.download_description));
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "QingningROM-Update.zip");
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(true);

        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        mDownloadId = dm.enqueue(request);

        mDownloadButton.setEnabled(false);
        mDownloadButton.setText(R.string.downloading);
        mProgressContainer.setVisibility(View.VISIBLE);
        mProgressText.setText(R.string.download_started);

        // 开始进度更新
        startProgressUpdate();
    }

    private void startProgressUpdate() {
        final DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);

        new Thread(new Runnable() {
            @Override
            public void run() {
                boolean downloading = true;
                while (downloading) {
                    DownloadManager.Query q = new DownloadManager.Query();
                    q.setFilterById(mDownloadId);
                    Cursor cursor = dm.query(q);
                    if (cursor.moveToFirst()) {
                        int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
                        if (status == DownloadManager.STATUS_SUCCESSFUL) {
                            downloading = false;
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    mProgressBar.setProgress(100);
                                    mProgressText.setText(R.string.download_complete);
                                    mDownloadButton.setText(R.string.download_done);
                                    showInstallDialog();
                                }
                            });
                        } else if (status == DownloadManager.STATUS_FAILED) {
                            downloading = false;
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    mProgressText.setText(R.string.download_failed);
                                    mDownloadButton.setEnabled(true);
                                    mDownloadButton.setText(R.string.retry_download);
                                }
                            });
                        } else {
                            final int bytesDownloaded = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                            final int bytesTotal = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                            if (bytesTotal > 0) {
                                final int progress = (int) ((bytesDownloaded * 100L) / bytesTotal);
                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        mProgressBar.setProgress(progress);
                                        mProgressText.setText(getString(R.string.download_progress, progress));
                                    }
                                });
                            }
                        }
                    }
                    cursor.close();

                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException e) {
                        break;
                    }
                }
            }
        }).start();
    }

    private void showInstallDialog() {
        new AlertDialog.Builder(this)
            .setTitle(R.string.install_title)
            .setMessage(R.string.install_message)
            .setPositiveButton(R.string.install_now, (dialog, which) -> {
                // 启动 Recovery 安装
                Intent intent = new Intent("android.intent.action.REBOOT");
                intent.putExtra("android.intent.extra.REBOOT_REASON", "recovery");
                try {
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(this, R.string.reboot_failed, Toast.LENGTH_SHORT).show();
                }
            })
            .setNegativeButton(R.string.install_later, null)
            .show();
    }

    private void registerDownloadReceiver() {
        mDownloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id == mDownloadId) {
                    mDownloadButton.setEnabled(true);
                }
            }
        };
        registerReceiver(mDownloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mDownloadReceiver != null) {
            unregisterReceiver(mDownloadReceiver);
        }
    }
}
