// ===== APP专属JS =====

const SUPABASE_URL = 'https://jbmymvpydycurynmxgbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibXltdnB5ZHljdXJ5bm14Z2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDA0NjYsImV4cCI6MjA5MzkxNjQ2Nn0.FpL-rWQHriqyuDA3l1vEiovZVcGhUbpOVCUS_X5h33E';
const BUCKET_NAME = 'files';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let downloadHistory = [];
let currentVersion = '1.1.0';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initVersion();
    loadFiles();
    loadDownloadHistory();
    checkLoginState();
});

// 获取APP版本
function initVersion() {
    // 尝试从APP获取版本号
    if (window.AppInterface) {
        try {
            currentVersion = window.AppInterface.getVersion();
        } catch (e) {}
    }
    document.getElementById('versionDisplay').textContent = 'v' + currentVersion;
    document.getElementById('updateBadge').textContent = 'v' + currentVersion;
}

// 检查登录状态
async function checkLoginState() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            // 已登录，显示用户信息
            const email = session.user.email;
            const isAdmin = email === '3862242786@qq.com';
            
            document.getElementById('userId').textContent = email;
            document.querySelector('.app-profile-name').textContent = isAdmin ? '管理员' : '已登录用户';
            
            // 同步localStorage
            localStorage.setItem('qn_logged_in', 'true');
            localStorage.setItem('qn_user_email', email);
            localStorage.setItem('qn_is_admin', isAdmin ? 'true' : 'false');
        } else {
            // 未登录，显示游客状态
            document.getElementById('userId').textContent = '未登录';
            document.querySelector('.app-profile-name').textContent = '游客';
            
            // 清除可能残留的登录状态
            localStorage.removeItem('qn_logged_in');
            localStorage.removeItem('qn_user_email');
            localStorage.removeItem('qn_is_admin');
        }
    } catch (e) {
        console.warn('Session check failed:', e);
        document.getElementById('userId').textContent = '未登录';
        document.querySelector('.app-profile-name').textContent = '游客';
    }
}

// 切换标签页
function switchTab(tabName) {
    // 更新标签按钮状态
    document.querySelectorAll('.app-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // 更新内容显示
    document.querySelectorAll('.app-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // 如果切换到下载记录页，刷新列表
    if (tabName === 'history') {
        renderDownloadHistory();
    }
}

// 加载文件列表
async function loadFiles() {
    try {
        const { data: files, error } = await supabaseClient.storage.from(BUCKET_NAME).list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
        });
        
        if (error) throw error;
        
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        
        if (!files || files.length === 0) {
            fileList.innerHTML = `
                <div class="app-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <p>暂无文件</p>
                </div>
            `;
            fileCount.textContent = '0 个文件';
            return;
        }
        
        fileCount.textContent = files.length + ' 个文件';
        
        let html = '';
        for (const file of files) {
            const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(file.name);
            const icon = getFileIcon(file.name);
            const size = formatSize(file.metadata?.size || 0);
            const date = new Date(file.created_at).toLocaleDateString('zh-CN');
            
            html += `
                <div class="app-file-item">
                    <div class="app-file-icon">${icon}</div>
                    <div class="app-file-info">
                        <span class="app-file-name">${escapeHtml(file.name)}</span>
                        <span class="app-file-meta">${size} · ${date}</span>
                    </div>
                    <button class="app-file-action" onclick="downloadFile('${urlData.publicUrl}', '${escapeHtml(file.name)}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </button>
                </div>
            `;
        }
        
        fileList.innerHTML = html;
        
    } catch (err) {
        document.getElementById('fileList').innerHTML = `
            <div class="app-empty">
                <p>加载失败，请检查网络</p>
            </div>
        `;
    }
}

// 获取文件图标
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    const icons = {
        image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
        audio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
        doc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        zip: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>'
    };
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return icons.image;
    if (['mp4', 'avi', 'mov', 'mkv', 'flv'].includes(ext)) return icons.video;
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return icons.audio;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return icons.zip;
    return icons.doc;
}

// 下载文件
async function downloadFile(url, filename) {
    // 添加到下载历史
    addToHistory(filename, url);
    
    // 执行下载
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

// 加载下载历史
function loadDownloadHistory() {
    // 尝试从APP获取
    if (window.AppInterface) {
        try {
            const historyJson = window.AppInterface.getDownloadHistory();
            downloadHistory = JSON.parse(historyJson);
            return;
        } catch (e) {}
    }
    
    // 从localStorage获取
    const saved = localStorage.getItem('qn_download_history');
    if (saved) {
        try {
            downloadHistory = JSON.parse(saved);
        } catch (e) {
            downloadHistory = [];
        }
    }
}

// 添加到下载历史
function addToHistory(filename, url) {
    downloadHistory.unshift({
        name: filename,
        url: url,
        time: Date.now()
    });
    
    // 只保留最近50条
    if (downloadHistory.length > 50) {
        downloadHistory = downloadHistory.slice(0, 50);
    }
    
    // 保存到localStorage
    localStorage.setItem('qn_download_history', JSON.stringify(downloadHistory));
}

// 渲染下载历史
function renderDownloadHistory() {
    const historyList = document.getElementById('historyList');
    
    if (downloadHistory.length === 0) {
        historyList.innerHTML = `
            <div class="app-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p>暂无下载记录</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    for (const item of downloadHistory) {
        const date = new Date(item.time).toLocaleString('zh-CN');
        const icon = getFileIcon(item.name);
        
        html += `
            <div class="app-file-item">
                <div class="app-file-icon">${icon}</div>
                <div class="app-file-info">
                    <span class="app-file-name">${escapeHtml(item.name)}</span>
                    <span class="app-file-meta">${date}</span>
                </div>
                <button class="app-file-action" onclick="downloadFile('${item.url}', '${escapeHtml(item.name)}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
            </div>
        `;
    }
    
    historyList.innerHTML = html;
}

// 清空下载历史
function clearHistory() {
    if (!confirm('确定要清空所有下载记录吗？')) return;
    
    downloadHistory = [];
    localStorage.removeItem('qn_download_history');
    
    // 通知APP清空
    if (window.AppInterface) {
        try {
            window.AppInterface.clearDownloadHistory();
        } catch (e) {}
    }
    
    renderDownloadHistory();
}

// 检查更新
async function checkUpdate() {
    try {
        const resp = await fetch('app-version.json?t=' + Date.now());
        const data = await resp.json();
        
        if (isNewerVersion(data.version, currentVersion)) {
            const message = `发现新版本 v${data.version}\n\n当前版本: v${currentVersion}\n\n更新内容:\n${data.updateLog || '修复了一些问题'}`;
            
            if (confirm(message + '\n\n是否立即更新？')) {
                window.location.href = data.downloadUrl;
            }
        } else {
            alert('当前已是最新版本 v' + currentVersion);
        }
    } catch (err) {
        alert('检查更新失败，请稍后重试');
    }
}

// 版本号比较
function isNewerVersion(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
        const latestNum = latestParts[i] || 0;
        const currentNum = currentParts[i] || 0;
        
        if (latestNum > currentNum) return true;
        if (latestNum < currentNum) return false;
    }
    return false;
}

// 格式化文件大小
function formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 搜索功能
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.app-file-item');
    
    items.forEach(item => {
        const name = item.querySelector('.app-file-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(keyword) ? 'flex' : 'none';
    });
});
