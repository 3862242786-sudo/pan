package com.limeos.browser;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.limeos.browser.db.HistoryDbHelper;
import com.limeos.browser.model.HistoryItem;

import java.util.ArrayList;
import java.util.List;

public class HistoryActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private HistoryAdapter adapter;
    private EditText searchInput;
    private ImageButton btnClear;
    private TextView tvEmpty;
    private HistoryDbHelper dbHelper;
    private List<HistoryItem> allHistory = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_history);

        dbHelper = HistoryDbHelper.getInstance(this);
        recyclerView = findViewById(R.id.recyclerHistory);
        searchInput = findViewById(R.id.searchInput);
        btnClear = findViewById(R.id.btnClear);
        tvEmpty = findViewById(R.id.tvEmpty);

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new HistoryAdapter();
        recyclerView.setAdapter(adapter);

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        searchInput.setOnEditorActionListener((v, actionId, event) -> {
            String query = searchInput.getText().toString().trim();
            if (query.isEmpty()) {
                adapter.setData(allHistory);
            } else {
                adapter.setData(dbHelper.searchHistory(query));
            }
            updateEmptyState();
            return true;
        });

        btnClear.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                    .setTitle("清除历史记录")
                    .setMessage("确定要清除所有浏览历史吗？")
                    .setPositiveButton("清除", (dialog, which) -> {
                        dbHelper.clearHistory();
                        allHistory.clear();
                        adapter.setData(allHistory);
                        updateEmptyState();
                    })
                    .setNegativeButton("取消", null)
                    .show();
        });

        loadHistory();
    }

    private void loadHistory() {
        allHistory = dbHelper.getAllHistory();
        adapter.setData(allHistory);
        updateEmptyState();
    }

    private void updateEmptyState() {
        if (adapter.getItemCount() == 0) {
            tvEmpty.setVisibility(View.VISIBLE);
            recyclerView.setVisibility(View.GONE);
        } else {
            tvEmpty.setVisibility(View.GONE);
            recyclerView.setVisibility(View.VISIBLE);
        }
    }

    class HistoryAdapter extends RecyclerView.Adapter<HistoryAdapter.ViewHolder> {
        private List<HistoryItem> data = new ArrayList<>();

        void setData(List<HistoryItem> data) {
            this.data = data;
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_history, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            HistoryItem item = data.get(position);
            holder.tvTitle.setText(item.title);
            holder.tvUrl.setText(item.getDomain() + "  " + item.getFormattedTime());
            holder.itemView.setOnClickListener(v -> {
                Intent intent = new Intent(HistoryActivity.this, MainActivity.class);
                intent.putExtra("url", item.url);
                startActivity(intent);
            });
            holder.itemView.setOnLongClickListener(v -> {
                new AlertDialog.Builder(HistoryActivity.this)
                        .setTitle(item.title)
                        .setItems(new String[]{"删除此条", "在新标签打开"}, (dialog, which) -> {
                            if (which == 0) {
                                dbHelper.deleteHistoryItem(item.id);
                                data.remove(position);
                                notifyDataSetChanged();
                                updateEmptyState();
                            } else {
                                Intent intent = new Intent(HistoryActivity.this, MainActivity.class);
                                intent.putExtra("url", item.url);
                                intent.putExtra("new_tab", true);
                                startActivity(intent);
                            }
                        })
                        .show();
                return true;
            });
        }

        @Override
        public int getItemCount() {
            return data.size();
        }

        class ViewHolder extends RecyclerView.ViewHolder {
            TextView tvTitle, tvUrl;
            ViewHolder(View v) {
                super(v);
                tvTitle = v.findViewById(R.id.tvTitle);
                tvUrl = v.findViewById(R.id.tvUrl);
            }
        }
    }
}
