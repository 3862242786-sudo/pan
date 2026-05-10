// ===== 管理后台逻辑 =====
// ADMIN_EMAIL 已在 auth2.js 中定义

const BUCKET_NAME = 'files';

// 检查管理员权限
function checkAdmin() {
    const isLoggedIn = localStorage.getItem('qn_logged_in');
    const isAdmin = localStorage.getItem('qn_is_admin');
    const email = localStorage.getItem('qn_user_email');

    if (!isLoggedIn || isAdmin !== 'true') {
        alert('请先登录站长账号！');
        window.location.href = 'auth.html';
        return false;
    }
    document.getElementById('adminEmail').textContent = '管理员：' + email;
    return true;
}

// ===== 文件管理 =====
async function loadAdminFiles() {
    const fileList = document.getElementById('adminFileList');
    fileList.innerHTML = '<div class="loading-text">加载中...</div>';

    try {
        const { data, error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) {
            fileList.innerHTML = '<div class="empty-text">加载失败: ' + error.message + '</div>';
            return;
        }

        document.getElementById('totalFiles').textContent = data.length;

        if (data.length === 0) {
            fileList.innerHTML = '<div class="empty-text">📭 暂无文件，点击上方"上传文件"添加</div>';
            return;
        }

        let html = '';
        data.forEach(file => {
            const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(file.name);
            const size = file.metadata?.size ? formatSize(file.metadata.size) : '未知大小';
            const date = new Date(file.created_at).toLocaleString('zh-CN');
            const icon = getFileIcon(file.name);

            html += `
                <div class="user-row" data-name="${file.name.toLowerCase()}">
                    <div class="user-info">
                        <span class="user-email">${icon} ${file.name}</span>
                        <span class="user-meta">${size} · ${date}</span>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <a href="${urlData.publicUrl}" target="_blank" class="admin-btn" style="padding:8px 12px;font-size:0.85rem;text-decoration:none;">下载</a>
                        <button class="admin-btn-danger" onclick="adminDeleteFile('${file.name}')">删除</button>
                    </div>
                </div>
            `;
        });

        fileList.innerHTML = html;
    } catch (err) {
        fileList.innerHTML = '<div class="empty-text">加载失败，请刷新重试</div>';
        console.error('加载文件失败:', err);
    }
}

function searchAdminFiles() {
    const keyword = document.getElementById('fileSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#adminFileList .user-row');
    rows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        row.style.display = name.includes(keyword) ? 'flex' : 'none';
    });
}

async function adminUploadFiles(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const progressDiv = document.getElementById('adminUploadProgress');
    const progressFill = document.getElementById('adminProgressFill');
    const progressText = document.getElementById('adminProgressText');

    progressDiv.style.display = 'block';
    progressFill.style.width = '0%';

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = Math.round(((i + 1) / files.length) * 100);
        progressFill.style.width = progress + '%';
        progressText.textContent = `上传中 (${i + 1}/${files.length}): ${file.name}`;

        try {
            const ext = file.name.split('.').pop() || 'bin';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

            const { data, error } = await supabaseClient.storage
                .from(BUCKET_NAME)
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (error) {
                console.error('上传失败:', error);
                failCount++;
            } else {
                successCount++;
            }
        } catch (err) {
            console.error('上传异常:', err);
            failCount++;
        }
    }

    progressText.textContent = `✅ 上传完成！成功 ${successCount} 个，失败 ${failCount} 个`;
    setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);

    event.target.value = '';
    loadAdminFiles();
}

async function adminDeleteFile(fileName) {
    if (!confirm('确定要删除文件 "' + fileName + '" 吗？\n此操作不可恢复！')) return;

    try {
        const { error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .remove([fileName]);

        if (error) {
            alert('删除失败: ' + error.message);
            return;
        }
        alert('✅ 文件已删除');
        loadAdminFiles();
    } catch (err) {
        alert('删除失败，请重试');
    }
}

// ===== 用户管理 =====
async function loadUsers() {
    const userList = document.getElementById('userList');
    userList.innerHTML = `
        <div class="admin-notice">
            <p>📌 <strong>用户管理说明</strong></p>
            <p>由于安全原因，用户管理需要通过 Supabase 控制台操作。</p>
            <p style="margin-top:12px;"><strong>操作步骤：</strong></p>
            <p>1. 打开 <a href="https://supabase.com/dashboard" target="_blank" style="color:#65a30d;">Supabase Dashboard</a></p>
            <p>2. 点击左侧菜单「Authentication」→「Users」</p>
            <p>3. 在这里可以查看、删除用户</p>
        </div>
    `;

    // 尝试获取用户数量（可能失败）
    try {
        const { count, error } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        if (!error && count !== null) {
            document.getElementById('totalUsers').textContent = count;
        }
    } catch (e) {
        // profiles 表可能不存在，忽略错误
    }
}

function searchUsers() {
    const keyword = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('.user-row');
    rows.forEach(row => {
        const email = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
        row.style.display = email.includes(keyword) ? 'flex' : 'none';
    });
}

// ===== 公告管理 =====
function saveAnnouncement() {
    const text = document.getElementById('announcement').value.trim();
    localStorage.setItem('qn_announcement', text);
    
    const msg = document.getElementById('announcementMsg');
    if (text) {
        msg.textContent = '✅ 公告已保存！将在首页显示。';
        msg.style.color = '#16a34a';
        // 更新预览
        document.getElementById('previewText').textContent = text;
        document.getElementById('announcementPreview').style.display = 'block';
    } else {
        msg.textContent = '✅ 公告已清除！首页将不再显示公告。';
        msg.style.color = '#64748b';
        document.getElementById('announcementPreview').style.display = 'none';
    }
    setTimeout(() => { msg.textContent = ''; }, 3000);
}

function clearAnnouncement() {
    document.getElementById('announcement').value = '';
    localStorage.removeItem('qn_announcement');
    document.getElementById('announcementPreview').style.display = 'none';
    
    const msg = document.getElementById('announcementMsg');
    msg.textContent = '✅ 公告已清除！';
    msg.style.color = '#64748b';
    setTimeout(() => { msg.textContent = ''; }, 3000);
}

function loadAnnouncement() {
    const announcement = localStorage.getItem('qn_announcement');
    if (announcement) {
        document.getElementById('announcement').value = announcement;
        // 显示预览
        document.getElementById('previewText').textContent = announcement;
        document.getElementById('announcementPreview').style.display = 'block';
    }
}

// ===== 网站设置 =====
function saveSetting(key) {
    if (key === 'allowRegister') {
        const val = document.getElementById('allowRegister').value;
        localStorage.setItem('qn_allow_register', val);
        alert('✅ 设置已保存！');
    } else if (key === 'contact') {
        const val = document.getElementById('adminContact').value;
        localStorage.setItem('qn_admin_contact', val);
        alert('✅ 设置已保存！');
    }
}

function loadSettings() {
    const allowReg = localStorage.getItem('qn_allow_register');
    if (allowReg !== null) {
        document.getElementById('allowRegister').value = allowReg;
    }
    const contact = localStorage.getItem('qn_admin_contact');
    if (contact) {
        document.getElementById('adminContact').value = contact;
    }
}

// ===== 工具函数 =====
function formatSize(bytes) {
    if (!bytes) return '未知';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '📕', 'doc': '📘', 'docx': '📘', 'xls': '📗', 'xlsx': '📗',
        'ppt': '📙', 'pptx': '📙', 'txt': '📄', 'md': '📄',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
        'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬',
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
        'exe': '⚙️', 'apk': '📱', 'js': '💛', 'py': '🐍', 'html': '🌐', 'css': '🎨',
        'json': '📋', 'xml': '📋', 'ini': '⚙️', 'cfg': '⚙️'
    };
    return icons[ext] || '📄';
}

// ===== 初始化 =====
async function init() {
    if (!checkAdmin()) return;
    
    // 加载文件列表
    loadAdminFiles();
    
    // 加载用户列表（显示说明）
    loadUsers();
    
    // 加载公告和设置
    loadAnnouncement();
    loadSettings();
}

init();
