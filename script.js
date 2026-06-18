// ===== 移动端菜单切换 =====
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// 点击导航链接后关闭菜单
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// 点击页面其他区域自动关闭移动端菜单
document.addEventListener('click', function(e) {
    if (navLinks && navLinks.classList.contains('active')) {
        var navbar = document.querySelector('.navbar');
        if (navbar && !navbar.contains(e.target)) {
            navLinks.classList.remove('active');
        }
    }
});

// ===== 平滑滚动 =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ===== 文件分类筛选 =====
function filterFiles(category) {
    const tabs = document.querySelectorAll('.category-tabs .tab');
    const files = document.querySelectorAll('.file-card');
    
    // 更新标签状态
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // 筛选文件
    files.forEach(file => {
        if (category === 'all' || file.dataset.category === category) {
            file.classList.remove('hidden');
        } else {
            file.classList.add('hidden');
        }
    });
}

// ===== 搜索文件 =====
function searchFiles() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const files = document.querySelectorAll('.file-item');
    let foundCount = 0;
    
    files.forEach(file => {
        const nameEl = file.querySelector('.file-name');
        const fileName = nameEl ? nameEl.textContent.toLowerCase() : '';
        
        if (fileName.includes(searchTerm)) {
            file.classList.remove('hidden');
            file.style.display = '';
            foundCount++;
        } else {
            file.classList.add('hidden');
            file.style.display = 'none';
        }
    });
    
    // 显示搜索结果提示
    if (searchTerm && foundCount === 0) {
        alert('没有找到匹配的文件');
    }
}

// 搜索框回车触发搜索
document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchFiles();
    }
});

// ===== Toast 提示组件 =====
function showToast(message, type, duration) {
    type = type || 'success';
    duration = duration || 3500;

    // 确保 toast 容器存在
    var container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    var icons = {
        success: '\u2705',
        error: '\u274c',
        info: '\u2139\ufe0f'
    };

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML =
        '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
        '<span class="toast-message">' + message + '</span>' +
        '<button class="toast-close" onclick="this.parentElement.classList.add(\'toast-exit\');setTimeout(function(){this.parentElement.remove()}.bind(this),300)">&times;</button>';

    container.appendChild(toast);

    // 自动消失
    setTimeout(function() {
        if (toast.parentElement) {
            toast.classList.add('toast-exit');
            setTimeout(function() {
                if (toast.parentElement) toast.remove();
            }, 300);
        }
    }, duration);
}

// ===== 表单提交 =====
function handleSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var name = form.querySelector('input[type="text"]').value.trim();
    var email = form.querySelector('input[type="email"]').value.trim();
    var message = form.querySelector('textarea').value.trim();

    // 验证
    if (!name || !email || !message) {
        showToast('请填写完整的留言信息', 'error');
        return;
    }

    // 模拟提交（无后端）
    console.log('[留言提交]', { name: name, email: email, message: message });
    showToast('留言已提交，管理员会尽快回复', 'success', 4000);
    form.reset();
}

// ===== 页面加载动画 =====
document.addEventListener('DOMContentLoaded', () => {
    // 文件卡片渐入动画
    const fileCards = document.querySelectorAll('.file-card');
    fileCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

console.log('青柠网盘加载完成！🍋');
