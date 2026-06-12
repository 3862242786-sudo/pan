// ===== profile.js - 个人主页逻辑 =====
// 使用 Supabase 认证 + localStorage 存储资料 + Supabase Storage 存储图片

(function () {
    'use strict';

    // ===== 状态 =====
    let isEditing = false;
    let isOwnProfile = false;
    let currentEmail = null;
    let currentUserId = null;
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
    function showToast(message, type) {
        type = type || 'info';
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(function () { toast.remove(); }, 300);
        }, 3000);
    }

    function getFirstLetter(str) {
        if (!str) return '?';
        return str.charAt(0).toUpperCase();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function getQueryParam(key) {
        var params = new URLSearchParams(window.location.search);
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
        try { return JSON.parse(localStorage.getItem(getProfileKey(email))); }
        catch (e) { return null; }
    }
    function saveProfileData(email, data) {
        localStorage.setItem(getProfileKey(email), JSON.stringify(data));
    }
    function loadWorks(email) {
        try { return JSON.parse(localStorage.getItem(getWorksKey(email))) || []; }
        catch (e) { return []; }
    }
    function saveWorks(email, works) {
        try { localStorage.setItem(getWorksKey(email), JSON.stringify(works)); }
        catch (e) { showToast('存储空间不足', 'error'); }
    }
    function loadFavorites(email) {
        try { return JSON.parse(localStorage.getItem(getFavoritesKey(email))) || []; }
        catch (e) { return []; }
    }

    function createDefaultProfile(email) {
        return {
            email: email,
            username: email.split('@')[0],
            bio: '',
            avatar_url: '',
            banner_url: '',
            verified: (email === ADMIN_EMAIL),
            role: (email === ADMIN_EMAIL) ? 'admin' : 'user',
            favorites_public: false,
            created_at: new Date().toISOString()
        };
    }

    // ===== 图片压缩为 Base64 =====
    function fileToBase64(file, maxSize) {
        maxSize = maxSize || 800;
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var img = new Image();
                img.onload = function () {
                    var canvas = document.createElement('canvas');
                    var w = img.width, h = img.height;
                    if (w > maxSize || h > maxSize) {
                        if (w > h) { h = h * maxSize / w; w = maxSize; }
                        else { w = w * maxSize / h; h = maxSize; }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ===== 初始化 =====
    async function init() {
        // 等待 Supabase SDK 加载
        if (typeof supabaseClient === 'undefined') {
            // SDK 未加载，尝试从 localStorage 读取
            currentEmail = localStorage.getItem('qn_user_email');
            if (!currentEmail) {
                showLoginPrompt();
                return;
            }
            setupProfile();
            return;
        }

        // 通过 Supabase 验证登录状态
        try {
            var result = await supabaseClient.auth.getSession();
            var session = result.data.session;

            if (session && session.user) {
                currentEmail = session.user.email;
                currentUserId = session.user.id;
                // 同步到 localStorage
                localStorage.setItem('qn_logged_in', 'true');
                localStorage.setItem('qn_user_email', currentEmail);
                localStorage.setItem('qn_is_admin', (currentEmail === ADMIN_EMAIL) ? 'true' : 'false');
                setupProfile();
            } else {
                // Session 过期或未登录
                localStorage.removeItem('qn_logged_in');
                localStorage.removeItem('qn_user_email');
                localStorage.removeItem('qn_is_admin');
                showLoginPrompt();
            }
        } catch (e) {
            console.warn('Session check error:', e);
            // 出错时尝试 localStorage
            currentEmail = localStorage.getItem('qn_user_email');
            if (!currentEmail) {
                showLoginPrompt();
                return;
            }
            setupProfile();
        }
    }

    // ===== 未登录提示 =====
    function showLoginPrompt() {
        profileName.textContent = '请先登录';
        profileBio.textContent = '登录后即可查看和编辑个人主页';
        profileAvatar.textContent = '?';
        editBtn.style.display = 'none';
        privacyToggle.style.display = 'none';
        worksLoading.style.display = 'none';
        worksEmpty.style.display = 'block';
        worksEmpty.querySelector('p').textContent = '登录后即可查看作品';

        // 在操作按钮区域显示登录按钮
        var actions = document.getElementById('profileActions');
        actions.innerHTML = '<a href="auth.html" class="btn btn-primary" style="margin-top:20px">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>' +
            '<polyline points="10 17 15 12 10 7"/>' +
            '<line x1="15" y1="12" x2="3" y2="12"/>' +
            '</svg> 前往登录</a>';
    }

    // ===== 设置个人主页 =====
    function setupProfile() {
        // 设置导航栏头像
        if (currentEmail) {
            var myProfile = loadProfile(currentEmail);
            if (myProfile && myProfile.avatar_url) {
                navAvatar.innerHTML = '<img src="' + myProfile.avatar_url + '" alt="头像">';
            } else {
                navAvatar.textContent = getFirstLetter(currentEmail);
            }
        }

        // 判断查看的是谁的主页
        viewEmail = getQueryParam('user') || currentEmail;

        if (!viewEmail) {
            showLoginPrompt();
            return;
        }

        isOwnProfile = (currentEmail === viewEmail);

        // 加载用户资料
        profileData = loadProfile(viewEmail);
        if (!profileData) {
            profileData = createDefaultProfile(viewEmail);
            if (isOwnProfile) {
                saveProfileData(viewEmail, profileData);
            }
        }

        renderProfile(profileData);

        // 控制按钮显示
        if (isOwnProfile) {
            editBtn.style.display = 'inline-flex';
            privacyToggle.style.display = 'flex';
            var addWorkArea = document.getElementById('addWorkArea');
            if (addWorkArea) addWorkArea.style.display = 'block';
            // 显示账户信息（注册时间等）
            var accountInfo = document.getElementById('accountInfo');
            var regDate = document.getElementById('regDate');
            var accountType = document.getElementById('accountType');
            if (accountInfo) {
                accountInfo.style.display = 'block';
                if (regDate) {
                    var created = profileData.created_at;
                    if (created) {
                        var d = new Date(created);
                        regDate.textContent = d.getFullYear() + '-' +
                            String(d.getMonth() + 1).padStart(2, '0') + '-' +
                            String(d.getDate()).padStart(2, '0');
                    } else {
                        regDate.textContent = '未知';
                    }
                }
                if (accountType) {
                    accountType.textContent = (profileData.role === 'admin') ? '站长' : '普通用户';
                    accountType.style.color = (profileData.role === 'admin') ? '#f59e0b' : '#e2e8f0';
                }
            }
        } else {
            editBtn.style.display = 'none';
            privacyToggle.style.display = 'none';
            var accountInfo = document.getElementById('accountInfo');
            if (accountInfo) accountInfo.style.display = 'none';
        }

        loadWorksList();
        loadFavoritesList();
    }

    // ===== 渲染资料 =====
    function renderProfile(data) {
        var name = data.username || data.email.split('@')[0];
        profileName.textContent = name;

        if (data.avatar_url) {
            profileAvatar.innerHTML = '<img src="' + data.avatar_url + '" alt="头像">';
        } else {
            profileAvatar.textContent = getFirstLetter(name);
        }

        if (data.banner_url) {
            profileBanner.style.backgroundImage = 'url(' + data.banner_url + ')';
        }

        profileBio.textContent = data.bio || '这个人很懒，什么都没写~';

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

        profileName.style.display = 'none';
        profileNameInput.style.display = 'block';
        profileNameInput.value = profileData.username || '';

        profileBio.style.display = 'none';
        profileBioInput.style.display = 'block';
        profileBioInput.value = profileData.bio || '';

        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';

        profileAvatar.classList.add('editable');
        profileBanner.classList.add('editable');
        profileAvatar.onclick = function () { avatarInput.click(); };
        profileBanner.onclick = function () { bannerInput.click(); };
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
        profileName.textContent = originalName || profileData.username || profileData.email.split('@')[0];
        profileBio.textContent = originalBio || profileData.bio || '这个人很懒，什么都没写~';
    };

    window.saveProfile = function () {
        var newName = profileNameInput.value.trim();
        var newBio = profileBioInput.value.trim();

        if (!newName) {
            showToast('用户名不能为空', 'error');
            return;
        }

        profileData.username = newName;
        profileData.bio = newBio;
        profileData.updated_at = new Date().toISOString();
        saveProfileData(currentEmail, profileData);

        profileName.textContent = newName;
        profileBio.textContent = newBio || '这个人很懒，什么都没写~';

        if (!profileData.avatar_url) {
            navAvatar.textContent = getFirstLetter(newName);
            profileAvatar.textContent = getFirstLetter(newName);
        }

        localStorage.setItem('qn_profile_updated', Date.now().toString());
        showToast('资料已保存', 'success');
        window.cancelEdit();
    };

    // ===== 头像上传 =====
    avatarInput.addEventListener('change', async function () {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('头像图片不能超过 5MB', 'error');
            return;
        }
        try {
            showToast('正在处理头像...', 'info');
            var base64 = await fileToBase64(file, 400);
            profileData.avatar_url = base64;
            saveProfileData(currentEmail, profileData);
            profileAvatar.innerHTML = '<img src="' + base64 + '" alt="头像">';
            navAvatar.innerHTML = '<img src="' + base64 + '" alt="头像">';
            localStorage.setItem('qn_profile_updated', Date.now().toString());
            showToast('头像已更新', 'success');
        } catch (e) {
            console.error('头像处理失败:', e);
            showToast('头像处理失败', 'error');
        }
        this.value = '';
    });

    // ===== 背景图上传 =====
    bannerInput.addEventListener('change', async function () {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('背景图片不能超过 5MB', 'error');
            return;
        }
        try {
            showToast('正在处理背景...', 'info');
            var base64 = await fileToBase64(file, 1200);
            profileData.banner_url = base64;
            saveProfileData(currentEmail, profileData);
            profileBanner.style.backgroundImage = 'url(' + base64 + ')';
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
        var newPublic = !profileData.favorites_public;
        profileData.favorites_public = newPublic;
        saveProfileData(currentEmail, profileData);
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
        document.querySelectorAll('.profile-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelector('.profile-tab[data-tab="' + tab + '"]').classList.add('active');
        document.getElementById('tabWorks').style.display = (tab === 'works') ? 'block' : 'none';
        document.getElementById('tabFavorites').style.display = (tab === 'favorites') ? 'block' : 'none';
    };

    // ===== 加载作品 =====
    function loadWorksList() {
        worksLoading.style.display = 'none';
        worksGrid.style.display = 'none';
        worksEmpty.style.display = 'none';
        var works = loadWorks(viewEmail);
        if (!works || works.length === 0) {
            worksEmpty.style.display = 'block';
            return;
        }
        worksGrid.style.display = 'grid';
        worksGrid.innerHTML = works.map(function (work, i) {
            return '<div class="work-card anim" style="animation-delay:' + (i * 0.05) + 's; cursor:pointer;" onclick="viewWork(\'' + work.id + '\')">' +
                '<div class="work-card-thumb">' +
                (work.thumbnail_url
                    ? '<img src="' + work.thumbnail_url + '" alt="' + work.title + '" loading="lazy">'
                    : '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>') +
                '</div>' +
                '<div class="work-card-body">' +
                '<div class="work-card-title" title="' + (work.title || '未命名') + '">' + (work.title || '未命名') + '</div>' +
                (work.description ? '<div class="work-card-date" style="margin-top:4px;color:#94a3b8;font-size:12px;">' + work.description.substring(0, 50) + '</div>' : '') +
                '<div class="work-card-date">' + formatDate(work.created_at) + '</div>' +
                '</div></div>';
        }).join('');
    }

    // ===== 加载收藏 =====
    function loadFavoritesList() {
        favLoading.style.display = 'none';
        favGrid.style.display = 'none';
        favEmpty.style.display = 'none';
        favPrivate.style.display = 'none';

        if (!isOwnProfile && profileData && !profileData.favorites_public) {
            favPrivate.style.display = 'block';
            return;
        }

        var favorites = loadFavorites(viewEmail);
        if (!favorites || favorites.length === 0) {
            favEmpty.style.display = 'block';
            return;
        }
        favGrid.style.display = 'grid';
        favGrid.innerHTML = favorites.map(function (fav, i) {
            return '<div class="fav-card anim" style="animation-delay:' + (i * 0.05) + 's">' +
                '<div class="fav-card-thumb">' +
                (fav.thumbnail_url
                    ? '<img src="' + fav.thumbnail_url + '" alt="' + fav.title + '" loading="lazy">'
                    : '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>') +
                '</div>' +
                '<div class="fav-card-body">' +
                '<div class="fav-card-title" title="' + (fav.title || '未命名') + '">' + (fav.title || '未命名') + '</div>' +
                '<div class="fav-card-author">' + (fav.author_name || '未知作者') + '</div>' +
                '</div></div>';
        }).join('');
    }

    // ===== 发布作品 =====
    window.showAddWorkModal = function () {
        document.getElementById('addWorkModal').style.display = 'block';
        document.getElementById('workTitle').value = '';
        document.getElementById('workDesc').value = '';
        document.getElementById('workImagesPreview').innerHTML = '';
        window._workImages = [];
    };

    window.closeAddWorkModal = function () {
        document.getElementById('addWorkModal').style.display = 'none';
    };

    window.handleWorkImages = function (input) {
        var files = input.files;
        if (!files.length) return;
        var preview = document.getElementById('workImagesPreview');
        var remaining = 9 - (window._workImages || []).length;
        var toProcess = Math.min(files.length, remaining);

        for (var i = 0; i < toProcess; i++) {
            (function (file) {
                var reader = new FileReader();
                reader.onload = function () {
                    var img = new Image();
                    img.onload = function () {
                        var canvas = document.createElement('canvas');
                        var w = img.width, h = img.height;
                        var max = 800;
                        if (w > max || h > max) {
                            if (w > h) { h = h * max / w; w = max; }
                            else { w = w * max / h; h = max; }
                        }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        var base64 = canvas.toDataURL('image/jpeg', 0.8);
                        if (!window._workImages) window._workImages = [];
                        window._workImages.push(base64);
                        var imgEl = document.createElement('img');
                        imgEl.src = base64;
                        preview.appendChild(imgEl);
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            })(files[i]);
        }
        input.value = '';
    };

    window.publishWork = function () {
        var title = document.getElementById('workTitle').value.trim();
        if (!title) { showToast('请输入作品标题', 'error'); return; }
        var desc = document.getElementById('workDesc').value.trim();
        var images = window._workImages || [];

        var works = loadWorks(currentEmail);
        works.unshift({
            id: generateId(),
            title: title,
            description: desc,
            thumbnail_url: images.length > 0 ? images[0] : '',
            images: images,
            created_at: new Date().toISOString()
        });
        saveWorks(currentEmail, works);
        loadWorksList();
        closeAddWorkModal();
        showToast('作品已发布', 'success');
    };

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // ===== 启动 =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
