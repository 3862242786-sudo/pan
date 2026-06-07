// ===== profile.js - 个人主页逻辑（纯前端 localStorage 版本）=====
// 不依赖任何后端数据库，所有数据存在浏览器本地

(function () {
    'use strict';

    // ===== 状态 =====
    let isEditing = false;
    let isOwnProfile = false;
    let currentEmail = null;
    let viewEmail = null;
    let profileData = null;
    let originalName = '';
    let originalBio = '';

    // ===== DOM 引用 =====
    const $ = (sel) => document.querySelector(sel);
    const navAvatar = $('#navAvatar');
    const profileBanner = $('#profileBanner');
    const profileAvatar = $('#profileAvatar');
    const profileName = $('#profileName');
    const profileNameInput = $('#profileNameInput');
    const profileBio = $('#profileBio');
    const profileBioInput = $('#profileBioInput');
    const badgeVerified = $('#badgeVerified');
    const badgeAdmin = $('#badgeAdmin');
    const editBtn = $('#editBtn');
    const saveBtn = $('#saveBtn');
    const cancelBtn = $('#cancelBtn');
    const privacyToggle = $('#privacyToggle');
    const favToggle = $('#favToggle');
    const favPrivacyLabel = $('#favPrivacyLabel');
    const avatarInput = $('#avatarInput');
    const bannerInput = $('#bannerInput');
    const worksGrid = $('#worksGrid');
    const worksLoading = $('#worksLoading');
    const worksEmpty = $('#worksEmpty');
    const favGrid = $('#favGrid');
    const favLoading = $('#favLoading');
    const favEmpty = $('#favEmpty');
    const favPrivate = $('#favPrivate');
    const toastContainer = $('#toastContainer');

    const ADMIN_EMAIL = '3862242786@qq.com';

    // ===== 工具函数 =====
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function getFirstLetter(str) {
        if (!str) return '?';
        return str.charAt(0).toUpperCase();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function getQueryParam(key) {
        const params = new URLSearchParams(window.location.search);
        return params.get(key);
    }

    // ===== localStorage 数据管理 =====
    function getProfileKey(email) {
        return 'qn_profile_' + (email || 'guest');
    }

    function getWorksKey(email) {
        return 'qn_works_' + (email || 'guest');
    }

    function getFavoritesKey(email) {
        return 'qn_favorites_' + (email || 'guest');
    }

    function loadProfile(email) {
        const key = getProfileKey(email);
        const data = localStorage.getItem(key);
        if (data) {
            try { return JSON.parse(data); } catch (e) { return null; }
        }
        return null;
    }

    function saveProfile(email, data) {
        const key = getProfileKey(email);
        localStorage.setItem(key, JSON.stringify(data));
    }

    function loadWorks(email) {
        const key = getWorksKey(email);
        const data = localStorage.getItem(key);
        if (data) {
            try { return JSON.parse(data); } catch (e) { return []; }
        }
        return [];
    }

    function saveWorks(email, works) {
        const key = getWorksKey(email);
        localStorage.setItem(key, JSON.stringify(works));
    }

    function loadFavorites(email) {
        const key = getFavoritesKey(email);
        const data = localStorage.getItem(key);
        if (data) {
            try { return JSON.parse(data); } catch (e) { return []; }
        }
        return [];
    }

    function saveFavorites(email, favorites) {
        const key = getFavoritesKey(email);
        localStorage.setItem(key, JSON.stringify(favorites));
    }

    function createDefaultProfile(email) {
        return {
            email: email,
            username: email.split('@')[0],
            bio: '',
            avatar_url: '',
            banner_url: '',
            verified: email === ADMIN_EMAIL,
            role: email === ADMIN_EMAIL ? 'admin' : 'user',
            favorites_public: false,
            created_at: new Date().toISOString()
        };
    }

    // ===== 图片转 Base64（纯前端存储图片）=====
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ===== 初始化 =====
    async function init() {
        // 获取当前登录用户
        currentEmail = localStorage.getItem('qn_user_email');

        // 设置导航栏头像
        if (currentEmail) {
            const myProfile = loadProfile(currentEmail);
            if (myProfile && myProfile.avatar_url) {
                navAvatar.innerHTML = `<img src="${myProfile.avatar_url}" alt="头像">`;
            } else {
                navAvatar.textContent = getFirstLetter(currentEmail);
            }
        } else {
            navAvatar.textContent = '?';
        }

        // 判断查看的是谁的主页
        viewEmail = getQueryParam('user') || currentEmail;

        if (!viewEmail) {
            // 未登录且没有指定用户
            profileName.textContent = '请先登录';
            profileBio.textContent = '登录后即可查看和编辑个人主页';
            profileAvatar.textContent = '?';
            worksLoading.style.display = 'none';
            worksEmpty.style.display = 'block';
            worksEmpty.querySelector('p').textContent = '登录后即可查看作品';
            favLoading.style.display = 'none';
            editBtn.style.display = 'none';
            return;
        }

        // 判断是否是自己的主页
        isOwnProfile = (currentEmail === viewEmail);

        // 加载用户资料
        profileData = loadProfile(viewEmail);
        if (!profileData) {
            // 如果没有资料，创建默认资料
            profileData = createDefaultProfile(viewEmail);
            if (isOwnProfile) {
                saveProfile(viewEmail, profileData);
            }
        }

        // 渲染资料
        renderProfile(profileData);

        // 控制按钮显示
        if (isOwnProfile) {
            editBtn.style.display = 'inline-flex';
            privacyToggle.style.display = 'flex';
        } else {
            editBtn.style.display = 'none';
            privacyToggle.style.display = 'none';
        }

        // 加载作品和收藏
        loadWorksList();
        loadFavoritesList();
    }

    // ===== 渲染资料 =====
    function renderProfile(data) {
        // 用户名
        const name = data.username || data.email.split('@')[0];
        profileName.textContent = name;

        // 头像
        if (data.avatar_url) {
            profileAvatar.innerHTML = `<img src="${data.avatar_url}" alt="头像">`;
        } else {
            profileAvatar.textContent = getFirstLetter(name);
        }

        // 背景图
        if (data.banner_url) {
            profileBanner.style.backgroundImage = `url(${data.banner_url})`;
        } else {
            profileBanner.style.backgroundImage = '';
        }

        // 简介
        profileBio.textContent = data.bio || '这个人很懒，什么都没写~';

        // 认证标识
        if (data.verified) {
            badgeVerified.style.display = 'inline-flex';
        } else {
            badgeVerified.style.display = 'none';
        }
        if (data.role === 'admin') {
            badgeAdmin.style.display = 'inline-flex';
        } else {
            badgeAdmin.style.display = 'none';
        }

        // 收藏隐私
        if (data.favorites_public) {
            favToggle.classList.add('active');
            favPrivacyLabel.textContent = '公开';
        } else {
            favToggle.classList.remove('active');
            favPrivacyLabel.textContent = '私密';
        }
    }

    // ===== 编辑模式 =====
    window.toggleEdit = function () {
        if (!isOwnProfile) return;
        isEditing = true;

        originalName = profileData.username || '';
        originalBio = profileData.bio || '';

        // 切换显示
        profileName.style.display = 'none';
        profileNameInput.style.display = 'block';
        profileNameInput.value = profileData.username || '';

        profileBio.style.display = 'none';
        profileBioInput.style.display = 'block';
        profileBioInput.value = profileData.bio || '';

        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';

        // 头像和背景可编辑
        profileAvatar.classList.add('editable');
        profileBanner.classList.add('editable');

        profileAvatar.onclick = onAvatarClick;
        profileBanner.onclick = onBannerClick;
    };

    window.cancelEdit = function () {
        isEditing = false;

        profileName.style.display = 'inline';
        profileNameInput.style.display = 'none';

        profileBio.style.display = 'block';
        profileBioInput.style.display = 'none';

        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';

        profileAvatar.classList.remove('editable');
        profileBanner.classList.remove('editable');

        profileAvatar.onclick = null;
        profileBanner.onclick = null;

        // 恢复原值
        profileName.textContent = originalName || profileData.username || profileData.email.split('@')[0];
        profileBio.textContent = originalBio || profileData.bio || '这个人很懒，什么都没写~';
    };

    window.saveProfile = function () {
        const newName = profileNameInput.value.trim();
        const newBio = profileBioInput.value.trim();

        if (!newName) {
            showToast('用户名不能为空', 'error');
            return;
        }

        // 更新数据
        profileData.username = newName;
        profileData.bio = newBio;
        profileData.updated_at = new Date().toISOString();

        // 保存到 localStorage
        saveProfile(currentEmail, profileData);

        // 更新显示
        profileName.textContent = newName;
        profileBio.textContent = newBio || '这个人很懒，什么都没写~';

        // 更新导航栏头像首字母
        if (!profileData.avatar_url) {
            navAvatar.textContent = getFirstLetter(newName);
            profileAvatar.textContent = getFirstLetter(newName);
        }

        // 更新 index.html 导航栏（通过 localStorage 事件）
        localStorage.setItem('qn_profile_updated', Date.now().toString());

        showToast('资料已保存', 'success');
        window.cancelEdit();
    };

    // ===== 头像上传（Base64 存储）=====
    function onAvatarClick() {
        avatarInput.click();
    }

    avatarInput.addEventListener('change', async function () {
        const file = this.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('头像图片不能超过 2MB', 'error');
            return;
        }

        try {
            showToast('正在处理头像...', 'info');
            const base64 = await fileToBase64(file);

            // 保存到 localStorage
            profileData.avatar_url = base64;
            saveProfile(currentEmail, profileData);

            // 更新显示
            profileAvatar.innerHTML = `<img src="${base64}" alt="头像">`;
            navAvatar.innerHTML = `<img src="${base64}" alt="头像">`;

            // 通知其他页面更新
            localStorage.setItem('qn_profile_updated', Date.now().toString());

            showToast('头像已更新', 'success');
        } catch (e) {
            console.error('头像处理失败:', e);
            showToast('头像处理失败', 'error');
        }

        this.value = '';
    });

    // ===== 背景图上传（Base64 存储）=====
    function onBannerClick() {
        bannerInput.click();
    }

    bannerInput.addEventListener('change', async function () {
        const file = this.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('背景图片不能超过 5MB', 'error');
            return;
        }

        try {
            showToast('正在处理背景...', 'info');
            const base64 = await fileToBase64(file);

            // 保存到 localStorage
            profileData.banner_url = base64;
            saveProfile(currentEmail, profileData);

            // 更新显示
            profileBanner.style.backgroundImage = `url(${base64})`;

            showToast('背景已更新', 'success');
        } catch (e) {
            console.error('背景处理失败:', e);
            showToast('背景处理失败', 'error');
        }

        this.value = '';
    });

    // ===== 收藏隐私切换 =====
    window.toggleFavoritesPrivacy = function () {
        if (!isOwnProfile || !profileData) return;

        const newPublic = !profileData.favorites_public;
        profileData.favorites_public = newPublic;
        saveProfile(currentEmail, profileData);

        if (newPublic) {
            favToggle.classList.add('active');
            favPrivacyLabel.textContent = '公开';
            showToast('收藏已设为公开', 'success');
        } else {
            favToggle.classList.remove('active');
            favPrivacyLabel.textContent = '私密';
            showToast('收藏已设为私密', 'success');
        }
    };

    // ===== 标签页切换 =====
    window.switchTab = function (tab) {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.profile-tab[data-tab="${tab}"]`).classList.add('active');

        document.getElementById('tabWorks').style.display = tab === 'works' ? 'block' : 'none';
        document.getElementById('tabFavorites').style.display = tab === 'favorites' ? 'block' : 'none';
    };

    // ===== 加载作品 =====
    function loadWorksList() {
        worksLoading.style.display = 'none';
        worksGrid.style.display = 'none';
        worksEmpty.style.display = 'none';

        const works = loadWorks(viewEmail);

        if (!works || works.length === 0) {
            worksEmpty.style.display = 'block';
            return;
        }

        worksGrid.style.display = 'grid';
        worksGrid.innerHTML = works.map((work, i) => `
            <div class="work-card anim" style="animation-delay:${i * 0.05}s">
                <div class="work-card-thumb">
                    ${work.thumbnail_url
                        ? `<img src="${work.thumbnail_url}" alt="${work.title}" loading="lazy">`
                        : `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
                    }
                </div>
                <div class="work-card-body">
                    <div class="work-card-title" title="${work.title || '未命名'}">${work.title || '未命名'}</div>
                    <div class="work-card-date">${formatDate(work.created_at)}</div>
                </div>
            </div>
        `).join('');
    }

    // ===== 加载收藏 =====
    function loadFavoritesList() {
        favLoading.style.display = 'none';
        favGrid.style.display = 'none';
        favEmpty.style.display = 'none';
        favPrivate.style.display = 'none';

        // 如果不是自己的主页，且对方收藏为私密
        if (!isOwnProfile && profileData && !profileData.favorites_public) {
            favPrivate.style.display = 'block';
            return;
        }

        const favorites = loadFavorites(viewEmail);

        if (!favorites || favorites.length === 0) {
            favEmpty.style.display = 'block';
            return;
        }

        favGrid.style.display = 'grid';
        favGrid.innerHTML = favorites.map((fav, i) => `
            <div class="fav-card anim" style="animation-delay:${i * 0.05}s">
                <div class="fav-card-thumb">
                    ${fav.thumbnail_url
                        ? `<img src="${fav.thumbnail_url}" alt="${fav.title}" loading="lazy">`
                        : `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
                    }
                </div>
                <div class="fav-card-body">
                    <div class="fav-card-title" title="${fav.title || '未命名'}">${fav.title || '未命名'}</div>
                    <div class="fav-card-author">${fav.author_name || '未知作者'}</div>
                </div>
            </div>
        `).join('');
    }

    // ===== 启动 =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
