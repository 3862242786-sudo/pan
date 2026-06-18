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
                        <a href="javascript:void(0)" onclick="downloadFile('${urlData.publicUrl}','${file.name}')" class="admin-btn" style="padding:8px 12px;font-size:0.85rem;text-decoration:none;">下载</a>
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
    userList.innerHTML = '<div class="loading-text">加载用户列表中...</div>';

    let users = [];
    let usedFallback = false;

    // 1. 尝试通过 Supabase Auth Admin API 获取用户列表
    try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (accessToken) {
            // 使用 Supabase Management API 的 listUsers 端点
            const supabaseUrl = supabaseClient.supabaseUrl;
            const response = await fetch(supabaseUrl + '/auth/v1/admin/users', {
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'apikey': supabaseClient.supabaseKey
                }
            });

            if (response.ok) {
                const result = await response.json();
                users = (result.users || []).map(u => ({
                    email: u.email || '未知',
                    created_at: u.created_at || '',
                    last_sign_in_at: u.last_sign_in_at || u.updated_at || '',
                    id: u.id || ''
                }));
            }
        }
    } catch (e) {
        console.warn('通过 Admin API 获取用户列表失败:', e);
    }

    // 2. 如果 Admin API 失败，从 localStorage 中收集已知用户
    if (users.length === 0) {
        usedFallback = true;
        const knownUsers = new Map();

        // 遍历 localStorage 中所有 qn_profile_ 开头的键
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('qn_profile_')) {
                try {
                    const profile = JSON.parse(localStorage.getItem(key));
                    if (profile && profile.email) {
                        knownUsers.set(profile.email, {
                            email: profile.email,
                            created_at: profile.created_at || '',
                            last_sign_in_at: profile.updated_at || '',
                            id: ''
                        });
                    }
                } catch (e) { /* 忽略解析错误 */ }
            }
        }

        // 也从 qn_user_email 获取当前管理员邮箱
        const adminEmail = localStorage.getItem('qn_user_email');
        if (adminEmail && !knownUsers.has(adminEmail)) {
            knownUsers.set(adminEmail, {
                email: adminEmail,
                created_at: '',
                last_sign_in_at: '',
                id: ''
            });
        }

        users = Array.from(knownUsers.values());
    }

    // 更新用户总数
    document.getElementById('totalUsers').textContent = users.length;

    if (users.length === 0) {
        userList.innerHTML = `
            <div class="admin-notice">
                <p>📌 <strong>用户管理说明</strong></p>
                <p>当前未找到任何用户数据。</p>
                <p style="margin-top:12px;"><strong>操作步骤：</strong></p>
                <p>1. 打开 <a href="https://supabase.com/dashboard" target="_blank" style="color:#65a30d;">Supabase Dashboard</a></p>
                <p>2. 点击左侧菜单「Authentication」→「Users」</p>
                <p>3. 在这里可以查看、删除用户</p>
            </div>
        `;
        return;
    }

    // 构建用户列表 HTML
    let html = '';

    if (usedFallback) {
        html += `<div class="admin-notice" style="margin-bottom:12px;">
            <p>⚠️ 以下为本地已知的用户信息（非完整列表）。完整用户管理请前往 <a href="https://supabase.com/dashboard" target="_blank" style="color:#65a30d;">Supabase Dashboard</a>。</p>
        </div>`;
    }

    // 按创建时间倒序排列
    users.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    users.forEach(user => {
        const email = user.email;
        const created = user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '未知';
        const lastLogin = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '从未登录';

        html += `
            <div class="user-row" data-email="${email.toLowerCase()}">
                <div class="user-info">
                    <span class="user-email">👤 ${email}</span>
                    <span class="user-meta">注册：${created}</span>
                    <span class="user-meta">最后登录：${lastLogin}</span>
                </div>
            </div>
        `;
    });

    userList.innerHTML = html;
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
    // 同步公告到云端，确保首页能读取
    saveSettingsToCloud();

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
    // 同步清除公告到云端
    saveSettingsToCloud();

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
const SETTINGS_FILE = 'site_settings.json';

function saveSetting(key) {
    if (key === 'allowRegister') {
        const val = document.getElementById('allowRegister').value;
        localStorage.setItem('qn_allow_register', val);
        saveSettingsToCloud();
        alert(val === 'true' ? '✅ 已开放注册！' : '🔒 已关闭注册！');
    } else if (key === 'contact') {
        const val = document.getElementById('adminContact').value;
        localStorage.setItem('qn_admin_contact', val);
        saveSettingsToCloud();
        alert('✅ 设置已保存！');
    }
}

// 将设置同步到 Supabase（所有用户可读）
async function saveSettingsToCloud() {
    const settings = {
        allowRegister: localStorage.getItem('qn_allow_register') || 'true',
        contact: localStorage.getItem('qn_admin_contact') || '',
        announcement: localStorage.getItem('qn_announcement') || '',
        updatedAt: new Date().toISOString()
    };
    try {
        await supabaseClient.storage
            .from(BUCKET_NAME)
            .upload(SETTINGS_FILE, JSON.stringify(settings), {
                cacheControl: '60',
                upsert: true,
                contentType: 'application/json'
            });
    } catch (err) {
        console.error('同步设置失败:', err);
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

// 通过 fetch+blob 强制下载
async function downloadFile(url, filename) {
    try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch (err) {
        window.open(url, '_blank');
    }
}

init();
