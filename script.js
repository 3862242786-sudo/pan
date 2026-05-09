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
    const files = document.querySelectorAll('.file-card');
    let foundCount = 0;
    
    files.forEach(file => {
        const fileName = file.dataset.name.toLowerCase();
        const fileTitle = file.querySelector('h3').textContent.toLowerCase();
        const fileDesc = file.querySelector('.file-desc').textContent.toLowerCase();
        
        if (fileName.includes(searchTerm) || fileTitle.includes(searchTerm) || fileDesc.includes(searchTerm)) {
            file.classList.remove('hidden');
            foundCount++;
        } else {
            file.classList.add('hidden');
        }
    });
    
    // 重置分类标签
    const tabs = document.querySelectorAll('.category-tabs .tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[0].classList.add('active');
    
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

// ===== 表单提交 =====
function handleSubmit(e) {
    e.preventDefault();
    alert('感谢您的留言！我会尽快回复您。');
    e.target.reset();
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
