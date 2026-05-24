// ===== 文件上传逻辑 =====
// Supabase 配置和客户端已在 auth2.js 中初始化，直接使用 supabaseClient

const BUCKET_NAME = 'files';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

let selectedFiles = [];

// ===== 拖拽上传 =====
const uploadArea = document.getElementById('uploadArea');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
});

uploadArea.addEventListener('click', (e) => {
    if (e.target !== document.querySelector('.upload-select-btn')) {
        document.getElementById('fileInput').click();
    }
});

// ===== 选择文件 =====
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFiles(files);
}

function addFiles(files) {
    files.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
            alert('文件 ' + file.name + ' 超过 50MB 限制！');
            return;
        }
        selectedFiles.push(file);
    });
    renderPendingFiles();
}

// ===== 渲染待上传文件列表 =====
function renderPendingFiles() {
    const container = document.getElementById('pendingFiles');
    const list = document.getElementById('pendingList');

    if (selectedFiles.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    let html = '';
    selectedFiles.forEach((file, index) => {
        const size = formatFileSize(file.size);
        html += `
            <div class="pending-item">
                <span class="pending-name">📄 ${file.name}</span>
                <span class="pending-size">${size}</span>
                <button class="pending-remove" onclick="removeFile(${index})">✕</button>
            </div>
        `;
    });
    list.innerHTML = html;
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderPendingFiles();
}

// ===== 上传所有文件 =====
async function uploadAllFiles() {
    if (selectedFiles.length === 0) return;

    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resultDiv = document.getElementById('uploadResult');
    const resultList = document.getElementById('resultList');
    const uploadBtn = document.getElementById('uploadBtn');

    progressDiv.style.display = 'block';
    uploadBtn.disabled = true;
    uploadBtn.textContent = '上传中...';

    let successCount = 0;
    let failCount = 0;
    let results = [];

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const progress = Math.round(((i) / selectedFiles.length) * 100);
        progressFill.style.width = progress + '%';
        progressText.textContent = `上传中 (${i + 1}/${selectedFiles.length}): ${file.name}`;

        try {
            // 用时间戳+随机数作为文件名，避免重复
            const ext = file.name.split('.').pop();
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const fileName = `${timestamp}_${random}.${ext}`;

            const { data, error } = await supabaseClient.storage
                .from(BUCKET_NAME)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (error) {
                results.push({ name: file.name, success: false, error: error.message });
                failCount++;
            } else {
                // 获取公开URL
                const { data: urlData } = supabaseClient.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(fileName);

                results.push({
                    name: file.name,
                    success: true,
                    url: urlData.publicUrl,
                    size: file.size
                });
                successCount++;
            }
        } catch (err) {
            results.push({ name: file.name, success: false, error: '上传失败' });
            failCount++;
        }
    }

    // 上传完成
    progressFill.style.width = '100%';
    progressText.textContent = '上传完成！';

    // 显示结果
    resultDiv.style.display = 'block';
    let html = `<p class="upload-summary">✅ 成功 ${successCount} 个，❌ 失败 ${failCount} 个</p>`;
    results.forEach(r => {
        if (r.success) {
            html += `
                <div class="result-item success">
                    <span>✅ ${r.name} (${formatFileSize(r.size)})</span>
                    <a href="${r.url}" target="_blank" class="download-link">下载</a>
                </div>
            `;
        } else {
            html += `
                <div class="result-item fail">
                    <span>❌ ${r.name} - ${r.error}</span>
                </div>
            `;
        }
    });
    resultList.innerHTML = html;

    // 清空
    selectedFiles = [];
    document.getElementById('pendingFiles').style.display = 'none';
    uploadBtn.disabled = false;
    uploadBtn.textContent = '开始上传';

    // 刷新文件列表
    loadFiles();
}

// ===== 加载已上传文件列表 =====
async function loadFiles() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '<div class="loading-text">加载中...</div>';

    try {
        const { data, error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) {
            fileList.innerHTML = '<div class="empty-text">加载失败</div>';
            return;
        }

        if (data.length === 0) {
            fileList.innerHTML = '<div class="empty-text">暂无文件，快去上传吧！</div>';
            return;
        }

        let html = '';
        // 系统文件列表（非用户上传，不显示）
        const systemFiles = new Set([
            'about.html','admin.html','antivirus-app.html','antivirus-extensions.html',
            'antivirus-versions.html','app.html','auth.html','download.html','index.html',
            'qingning-antivirus.exe','qingning-antivirus','site_settings.json','styles.css',
            'upload-policy.html','upload.html','versions.html','test.txt'
        ]);
        data.forEach(file => {
            // 隐藏系统文件和系统目录
            if (systemFiles.has(file.name)) return;
            if (file.name.startsWith('qingning-antivirus/')) return;
            if (file.name.startsWith('antivirus-releases/')) return;
            if (file.name.startsWith('apk-releases/')) return;
            if (file.name.endsWith('.qn-verify')) return;
            const { data: urlData } = supabaseClient.storage
                .from(BUCKET_NAME)
                .getPublicUrl(file.name);

            const size = formatFileSize(file.metadata?.size || 0);
            const date = new Date(file.created_at).toLocaleString('zh-CN');
            const ext = file.name.split('.').pop().toLowerCase();
            const icon = getFileIcon(ext);

            html += `
                <div class="file-item">
                    <div class="file-info">
                        <span class="file-icon">${icon}</span>
                        <div class="file-detail">
                            <span class="file-name">${file.name}</span>
                            <span class="file-meta">${size} · ${date}</span>
                        </div>
                    </div>
                    <a href="${urlData.publicUrl}" target="_blank" class="file-download-btn" download>下载</a>
                </div>
            `;
        });

        fileList.innerHTML = html;
    } catch (err) {
        fileList.innerHTML = '<div class="empty-text">加载失败</div>';
    }
}

// ===== 工具函数 =====
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(ext) {
    const icons = {
        'pdf': '📕', 'doc': '📘', 'docx': '📘', 'xls': '📗', 'xlsx': '📗',
        'ppt': '📙', 'pptx': '📙', 'txt': '📄', 'md': '📄',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
        'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬',
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦',
        'exe': '⚙️', 'apk': '📱', 'js': '💛', 'py': '🐍', 'html': '🌐', 'css': '🎨',
    };
    return icons[ext] || '📄';
}

// 页面加载时获取文件列表
loadFiles();
