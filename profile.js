// ===== profile.js - 个人主页逻辑 =====

(function () {
    'use strict';

    // ===== 状态 =====
    let isEditing = false;
    let isOwnProfile = false;
    let currentUser = null;        // 当前登录用户
    let profileUser = null;       // 被查看的用户
    let profileData = null;        // 从数据库加载的 profile 数据
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

    // ===== 初始化 =====
    async function init() {
        // 获取当前登录用户
        const userEmail = localStorage.getItem('qn_user_email');
        if (userEmail && typeof supabaseClient !== 'undefined') {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('email', userEmail)
                    .single();
                if (!error && data) {
                    currentUser = data;
                }
            } catch (e) {
                console.warn('获取当前用户失败:', e);
            }
        }

        // 设置导航栏头像
        if (currentUser) {
            if (currentUser.avatar_url) {
                navAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="头像">`;
            } else {
                navAvatar.textContent = getFirstLetter(currentUser.username || currentUser.email);
            }
        }

        // 判断查看的是谁的主页
        const viewEmail = getQueryParam('user');
        if (viewEmail) {
            // 查看他人主页
            isOwnProfile = false;
            await loadUserProfile(viewEmail);
            editBtn.style.display = 'none';
            privacyToggle.style.display = 'none';
        } else if (currentUser) {
            // 查看自己的主页
            isOwnProfile = true;
            await loadUserProfile(currentUser.email);
            privacyToggle.style.display = 'flex';
        } else {
            // 未登录，显示提示
            profileName.textContent = '请先登录';
            profileBio.textContent = '登录后即可查看和编辑个人主页';
            worksLoading.style.display = 'none';
            worksEmpty.style.display = 'block';
            worksEmpty.querySelector('p').textContent = '登录后即可查看作品';
            favLoading.style.display = 'none';
            return;
        }

        // 加载作品和收藏
        loadWorks();
        loadFavorites();
    }

    // ===== 加载用户资料 =====
    async function loadUserProfile(email) {
        if (typeof supabaseClient === 'undefined') {
            profileName.textContent = email ? getFirstLetter(email) : '未知用户';
            profileBio.textContent = '服务暂不可用';
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();

            if (!error && data) {
                profileData = data;
                renderProfile(data);
            } else {
                // 没有资料记录，使用 users 表数据
                profileData = {
                    email: email,
                    username: currentUser ? (currentUser.username || email.split('@')[0]) : email.split('@')[0],
                    bio: '',
                    avatar_url: currentUser ? currentUser.avatar_url : null,
                    banner_url: null,
                    is_verified: false,
                    is_admin: false,
                    favorites_public: false,
                };
                renderProfile(profileData);
            }
        } catch (e) {
            console.warn('加载资料失败:', e);
            profileName.textContent = email ? getFirstLetter(email) : '未知用户';
        }
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
        }

        // 简介
        profileBio.textContent = data.bio || '这个人很懒，什么都没写~';

        // 认证标识
        if (data.is_verified) {
            badgeVerified.style.display = 'inline-flex';
        }
        if (data.is_admin) {
            badgeAdmin.style.display = 'inline-flex';
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

        profileAvatar.addEventListener('click', onAvatarClick);
        profileBanner.addEventListener('click', onBannerClick);
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

        profileAvatar.removeEventListener('click', onAvatarClick);
        profileBanner.removeEventListener('click', onBannerClick);

        // 恢复原值
        profileName.textContent = originalName;
        profileBio.textContent = originalBio || '这个人很懒，什么都没写~';
    };

    window.saveProfile = async function () {
        const newName = profileNameInput.value.trim();
        const newBio = profileBioInput.value.trim();

        if (!newName) {
            showToast('用户名不能为空', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';

        try {
            if (typeof supabaseClient === 'undefined') {
                showToast('服务暂不可用', 'error');
                return;
            }

            const updateData = {
                username: newName,
                bio: newBio,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabaseClient
                .from('profiles')
                .upsert(updateData, { onConflict: 'email' });

            if (error) throw error;

            // 更新本地数据
            profileData.username = newName;
            profileData.bio = newBio;

            // 更新显示
            profileName.textContent = newName;
            profileBio.textContent = newBio || '这个人很懒，什么都没写~';

            // 更新导航栏头像首字母
            if (!profileData.avatar_url) {
                navAvatar.textContent = getFirstLetter(newName);
                profileAvatar.textContent = getFirstLetter(newName);
            }

            showToast('资料已保存', 'success');
            window.cancelEdit();
        } catch (e) {
            console.error('保存失败:', e);
            showToast('保存失败: ' + (e.message || '未知错误'), 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 保存';
        }
    };

    // ===== 头像上传 =====
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
            if (typeof supabaseClient === 'undefined') {
                showToast('服务暂不可用', 'error');
                return;
            }

            showToast('正在上传头像...', 'info');

            const ext = file.name.split('.').pop();
            const fileName = `avatars/${currentUser.email}/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('profiles')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage
                .from('profiles')
                .getPublicUrl(fileName);

            const avatarUrl = urlData.publicUrl;

            // 更新数据库
            const { error: updateError } = await supabaseClient
                .from('profiles')
                .upsert({
                    email: currentUser.email,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'email' });

            if (updateError) throw updateError;

            // 更新显示
            profileData.avatar_url = avatarUrl;
            profileAvatar.innerHTML = `<img src="${avatarUrl}" alt="头像">`;
            navAvatar.innerHTML = `<img src="${avatarUrl}" alt="头像">`;

            showToast('头像已更新', 'success');
        } catch (e) {
            console.error('头像上传失败:', e);
            showToast('头像上传失败: ' + (e.message || '未知错误'), 'error');
        }

        this.value = '';
    });

    // ===== 背景图上传 =====
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
            if (typeof supabaseClient === 'undefined') {
                showToast('服务暂不可用', 'error');
                return;
            }

            showToast('正在上传背景...', 'info');

            const ext = file.name.split('.').pop();
            const fileName = `banners/${currentUser.email}/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('profiles')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage
                .from('profiles')
                .getPublicUrl(fileName);

            const bannerUrl = urlData.publicUrl;

            // 更新数据库
            const { error: updateError } = await supabaseClient
                .from('profiles')
                .upsert({
                    email: currentUser.email,
                    banner_url: bannerUrl,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'email' });

            if (updateError) throw updateError;

            // 更新显示
            profileData.banner_url = bannerUrl;
            profileBanner.style.backgroundImage = `url(${bannerUrl})`;

            showToast('背景已更新', 'success');
        } catch (e) {
            console.error('背景上传失败:', e);
            showToast('背景上传失败: ' + (e.message || '未知错误'), 'error');
        }

        this.value = '';
    });

    // ===== 收藏隐私切换 =====
    window.toggleFavoritesPrivacy = async function () {
        if (!isOwnProfile || !profileData) return;

        const newPublic = !profileData.favorites_public;

        try {
            if (typeof supabaseClient === 'undefined') {
                showToast('服务暂不可用', 'error');
                return;
            }

            const { error } = await supabaseClient
                .from('profiles')
                .update({ favorites_public: newPublic })
                .eq('email', profileData.email);

            if (error) throw error;

            profileData.favorites_public = newPublic;

            if (newPublic) {
                favToggle.classList.add('active');
                favPrivacyLabel.textContent = '公开';
                showToast('收藏已设为公开', 'success');
            } else {
                favToggle.classList.remove('active');
                favPrivacyLabel.textContent = '私密';
                showToast('收藏已设为私密', 'success');
            }
        } catch (e) {
            console.error('切换隐私失败:', e);
            showToast('操作失败', 'error');
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
    async function loadWorks() {
        worksLoading.style.display = 'flex';
        worksGrid.style.display = 'none';
        worksEmpty.style.display = 'none';

        try {
            if (typeof supabaseClient === 'undefined') {
                worksLoading.style.display = 'none';
                worksEmpty.style.display = 'block';
                return;
            }

            const email = profileData ? profileData.email : (currentUser ? currentUser.email : null);
            if (!email) {
                worksLoading.style.display = 'none';
                worksEmpty.style.display = 'block';
                return;
            }

            const { data, error } = await supabaseClient
                .from('user_works')
                .select('*')
                .eq('user_email', email)
                .order('created_at', { ascending: false });

            worksLoading.style.display = 'none';

            if (error) throw error;

            if (!data || data.length === 0) {
                worksEmpty.style.display = 'block';
                return;
            }

            worksGrid.style.display = 'grid';
            worksGrid.innerHTML = data.map((work, i) => `
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
        } catch (e) {
            console.warn('加载作品失败:', e);
            worksLoading.style.display = 'none';
            worksEmpty.style.display = 'block';
        }
    }

    // ===== 加载收藏 =====
    async function loadFavorites() {
        favLoading.style.display = 'flex';
        favGrid.style.display = 'none';
        favEmpty.style.display = 'none';
        favPrivate.style.display = 'none';

        try {
            if (typeof supabaseClient === 'undefined') {
                favLoading.style.display = 'none';
                favEmpty.style.display = 'block';
                return;
            }

            const email = profileData ? profileData.email : (currentUser ? currentUser.email : null);
            if (!email) {
                favLoading.style.display = 'none';
                favEmpty.style.display = 'block';
                return;
            }

            // 如果不是自己的主页，且对方收藏为私密
            if (!isOwnProfile && profileData && !profileData.favorites_public) {
                favLoading.style.display = 'none';
                favPrivate.style.display = 'block';
                return;
            }

            const { data, error } = await supabaseClient
                .from('user_favorites')
                .select('*')
                .eq('user_email', email)
                .order('created_at', { ascending: false });

            favLoading.style.display = 'none';

            if (error) throw error;

            if (!data || data.length === 0) {
                favEmpty.style.display = 'block';
                return;
            }

            favGrid.style.display = 'grid';
            favGrid.innerHTML = data.map((fav, i) => `
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
        } catch (e) {
            console.warn('加载收藏失败:', e);
            favLoading.style.display = 'none';
            favEmpty.style.display = 'block';
        }
    }

    // ===== 启动 =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
