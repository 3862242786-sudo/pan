// ===== 管理后台逻辑 =====

const ADMIN_EMAIL = '3862242786@qq.com';

// 检查管理员权限（通过 localStorage 检查，不依赖 Supabase session）
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

// ===== 加载用户列表 =====
async function loadUsers() {
    const userList = document.getElementById('userList');
    userList.innerHTML = '<div class="loading-text">加载中...</div>';

    try {
        // 使用 Supabase Admin API 获取用户列表
        const { data, error } = await supabaseClient.auth.admin.listUsers();

        if (error) {
            // 如果没有 admin 权限，显示提示
            userList.innerHTML = `
                <div class="admin-notice">
                    <p>⚠️ 当前 API 密钥权限不足，无法获取用户列表。</p>
                    <p>提示：需要在 Supabase 中使用 service_role key 才能管理用户。</p>
                    <p>用户管理功能需要更高权限的密钥配置。</p>
                </div>
            `;
            return;
        }

        const users = data.users;
        document.getElementById('totalUsers').textContent = users.length;

        if (users.length === 0) {
            userList.innerHTML = '<div class="empty-text">暂无注册用户</div>';
            return;
        }

        let html = '';
        users.forEach(user => {
            const created = new Date(user.created_at).toLocaleString('zh-CN');
            const lastSign = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '从未登录';
            const isConfirmed = user.email_confirmed_at ? '✅' : '❌';

            html += `
                <div class="user-row">
                    <div class="user-info">
                        <span class="user-email">${user.email}</span>
                        <span class="user-meta">注册: ${created} | 最后登录: ${lastSign} | 邮箱确认: ${isConfirmed}</span>
                    </div>
                    <button class="admin-btn-danger" onclick="deleteUser('${user.id}', '${user.email}')">删除</button>
                </div>
            `;
        });

        userList.innerHTML = html;
    } catch (err) {
        userList.innerHTML = '<div class="empty-text">加载失败，请检查权限</div>';
    }
}

// ===== 搜索用户 =====
function searchUsers() {
    const keyword = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('.user-row');
    rows.forEach(row => {
        const email = row.querySelector('.user-email').textContent.toLowerCase();
        row.style.display = email.includes(keyword) ? 'flex' : 'none';
    });
}

// ===== 删除用户 =====
async function deleteUser(userId, email) {
    if (!confirm('确定要删除用户 ' + email + ' 吗？此操作不可恢复！')) return;

    try {
        const { error } = await supabaseClient.auth.admin.deleteUser(userId);
        if (error) {
            alert('删除失败：' + error.message);
            return;
        }
        alert('用户已删除');
        loadUsers();
    } catch (err) {
        alert('删除失败，请检查权限');
    }
}

// ===== 保存公告 =====
function saveAnnouncement() {
    const text = document.getElementById('announcement').value;
    localStorage.setItem('qn_announcement', text);
    const msg = document.getElementById('announcementMsg');
    msg.textContent = '✅ 公告已保存！';
    msg.style.color = '#16a34a';
    setTimeout(() => { msg.textContent = ''; }, 3000);
}

// ===== 加载公告 =====
function loadAnnouncement() {
    const announcement = localStorage.getItem('qn_announcement');
    if (announcement) {
        document.getElementById('announcement').value = announcement;
    }
}

// ===== 保存设置 =====
function saveSetting(key) {
    if (key === 'allowRegister') {
        const val = document.getElementById('allowRegister').value;
        localStorage.setItem('qn_allow_register', val);
    } else if (key === 'contact') {
        const val = document.getElementById('adminContact').value;
        localStorage.setItem('qn_admin_contact', val);
    }
}

// ===== 加载设置 =====
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

// ===== 初始化 =====
async function init() {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    loadAdminFiles();
    loadUsers();
    loadAnnouncement();
    loadSettings();
}

// ===== 站长文件管理 =====
const BUCKET_NAME = 'files';

// 加载文件列表
async function loadAdminFiles() {
    const fileList = document.getElementById('adminFileList');
    fileList.innerHTML = '<div class="loading-text">加载中...</div>';

    try {
        const { data, error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) {
            fileList.innerHTML = '<div class="empty-text">加载失败</div>';
            return;
        }

        document.getElementById('totalFiles').textContent = data.length;

        if (data.length === 0) {
            fileList.innerHTML = '<div class="empty-text">暂无文件</div>';
            return;
        }

        let html = '';
        data.forEach(file => {
            const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(file.name);
            const size = file.metadata?.size ? formatAdminSize(file.metadata.size) : '';
            const date = new Date(file.created_at).toLocaleString('zh-CN');
            const ext = file.name.split('.').pop().toLowerCase();
            const icons = {
                'pdf':'📕','doc':'📘','docx':'📘','xls':'📗','xlsx':'📗',
                'ppt':'📙','pptx':'📙','txt':'📄','jpg':'🖼️','jpeg':'🖼️',
                'png':'🖼️','gif':'🖼️','mp4':'🎬','mp3':'🎵','zip':'📦','rar':'📦'
            };
            const icon = icons[ext] || '📄';

            html += `
                <div class="user-row" data-name="${file.name.toLowerCase()}">
                    <div class="user-info">
                        <span class="user-email">${icon} ${file.name}</span>
                        <span class="user-meta">${size} · ${date}</span>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <a href="${urlData.publicUrl}" target="_blank" class="admin-btn" style="padding:8px 12px;font-size:0.8rem;">下载</a>
                        <button class="admin-btn-danger" onclick="adminDeleteFile('${file.name}')">删除</button>
                    </div>
                </div>
            `;
        });

        fileList.innerHTML = html;
    } catch (err) {
        fileList.innerHTML = '<div class="empty-text">加载失败</div>';
    }
}

// 搜索文件
function searchAdminFiles() {
    const keyword = document.getElementById('fileSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#adminFileList .user-row');
    rows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        row.style.display = name.includes(keyword) ? 'flex' : 'none';
    });
}

// 站长上传文件（无大小限制）
async function adminUploadFiles(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const progressDiv = document.getElementById('adminUploadProgress');
    const progressFill = document.getElementById('adminProgressFill');
    const progressText = document.getElementById('adminProgressText');

    progressDiv.style.display = 'block';

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = Math.round((i / files.length) * 100);
        progressFill.style.width = progress + '%';
        progressText.textContent = `上传中 (${i + 1}/${files.length}): ${file.name}`;

        try {
            const ext = file.name.split('.').pop();
            const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

            const { data, error } = await supabaseClient.storage
                .from(BUCKET_NAME)
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (error) {
                failCount++;
            } else {
                successCount++;
            }
        } catch (err) {
            failCount++;
        }
    }

    progressFill.style.width = '100%';
    progressText.textContent = `上传完成！成功 ${successCount} 个，失败 ${failCount} 个`;
    setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);

    // 清空 input
    event.target.value = '';
    loadAdminFiles();
}

// 站长删除文件
async function adminDeleteFile(fileName) {
    if (!confirm('确定要删除文件 ' + fileName + ' 吗？此操作不可恢复！')) return;

    try {
        const { error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .remove([fileName]);

        if (error) {
            alert('删除失败：' + error.message);
            return;
        }
        alert('文件已删除');
        loadAdminFiles();
    } catch (err) {
        alert('删除失败');
    }
}

// 格式化文件大小
function formatAdminSize(bytes) {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

init();
