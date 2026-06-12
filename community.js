// ===== community.js - 青柠社区逻辑 =====
// 纯 localStorage 实现，不依赖 Supabase 数据库表

(function () {
    'use strict';

    // ===== 常量 =====
    var ADMIN_EMAIL = '3862242786@qq.com';
    var POSTS_KEY = 'qn_posts';
    var FOLLOWS_KEY = 'qn_follows';
    var NOTIFS_KEY = 'qn_notifications';
    var SEED_KEY = 'qn_community_seeded';

    // ===== 状态 =====
    var currentUser = null; // { email, username, avatar_url, bio }
    var currentPage = 'home';
    var composeImages = []; // Base64 图片数组
    var expandedComments = {}; // postId -> boolean
    window._composeCommentsEnabled = true; // 发帖时是否允许评论

    // ===== DOM 引用 =====
    var $ = function (sel) { return document.querySelector(sel); };
    var $$ = function (sel) { return document.querySelectorAll(sel); };

    // ===== 工具函数 =====
    function showToast(message, type) {
        type = type || 'info';
        var container = $('#toastContainer');
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        container.appendChild(toast);
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
        var now = new Date();
        var diff = now - d;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
        if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // ===== localStorage 数据操作 =====
    function loadPosts() {
        try { return JSON.parse(localStorage.getItem(POSTS_KEY)) || []; }
        catch (e) { return []; }
    }
    function savePosts(posts) {
        try { localStorage.setItem(POSTS_KEY, JSON.stringify(posts)); }
        catch (e) { showToast('存储空间不足，请清理数据', 'error'); }
    }
    function loadFollows() {
        try { return JSON.parse(localStorage.getItem(FOLLOWS_KEY)) || []; }
        catch (e) { return []; }
    }
    function saveFollows(follows) {
        localStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows));
    }
    function loadNotifications() {
        try { return JSON.parse(localStorage.getItem(NOTIFS_KEY)) || []; }
        catch (e) { return []; }
    }
    function saveNotifications(notifs) {
        localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs));
    }

    function loadProfile(email) {
        try { return JSON.parse(localStorage.getItem('qn_profile_' + email)); }
        catch (e) { return null; }
    }

    // 获取所有已注册用户（从 localStorage 中的 profile 数据推断）
    function getAllUsers() {
        var users = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf('qn_profile_') === 0) {
                try {
                    var profile = JSON.parse(localStorage.getItem(key));
                    if (profile && profile.email) {
                        users.push(profile);
                    }
                } catch (e) { /* skip */ }
            }
        }
        // 确保管理员在列表中
        var hasAdmin = users.some(function (u) { return u.email === ADMIN_EMAIL; });
        if (!hasAdmin) {
            users.push({
                email: ADMIN_EMAIL,
                username: '青柠站长',
                bio: '青柠社区创始人',
                avatar_url: '',
                created_at: '2024-01-01T00:00:00.000Z'
            });
        }
        return users;
    }

    function getUserProfile(email) {
        var profile = loadProfile(email);
        if (profile) return profile;
        // 降级处理
        return {
            email: email,
            username: email.split('@')[0],
            bio: '',
            avatar_url: '',
            created_at: new Date().toISOString()
        };
    }

    // ===== 渲染头像 =====
    function renderAvatar(container, profile, size) {
        size = size || 42;
        container.style.width = size + 'px';
        container.style.height = size + 'px';
        container.style.borderRadius = '50%';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.overflow = 'hidden';
        container.style.flexShrink = '0';
        container.style.color = '#fff';
        container.style.fontWeight = '700';
        container.style.fontSize = Math.round(size * 0.38) + 'px';

        if (profile && profile.avatar_url) {
            container.style.background = 'transparent';
            container.innerHTML = '<img src="' + profile.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="头像">';
        } else {
            // 根据邮箱生成颜色
            var colors = [
                'linear-gradient(135deg, #22c55e, #16a34a)',
                'linear-gradient(135deg, #3b82f6, #6366f1)',
                'linear-gradient(135deg, #f59e0b, #ef4444)',
                'linear-gradient(135deg, #8b5cf6, #a855f7)',
                'linear-gradient(135deg, #ec4899, #f43f5e)',
                'linear-gradient(135deg, #06b6d4, #0ea5e9)',
                'linear-gradient(135deg, #14b8a6, #10b981)'
            ];
            var hash = 0;
            var email = profile ? profile.email || '' : '';
            for (var i = 0; i < email.length; i++) {
                hash = email.charCodeAt(i) + ((hash << 5) - hash);
            }
            var colorIndex = Math.abs(hash) % colors.length;
            container.style.background = colors[colorIndex];

            // 系统管理员显示 SVG 图标
            if (email === ADMIN_EMAIL) {
                container.innerHTML = '<svg width="' + Math.round(size * 0.45) + '" height="' + Math.round(size * 0.45) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            } else {
                var letter = (profile && profile.username) ? getFirstLetter(profile.username) : '?';
                container.textContent = letter;
            }
        }
    }

    // ===== 预置数据 =====
    function seedData() {
        if (localStorage.getItem(SEED_KEY)) return;

        var now = new Date().toISOString();
        var posts = [
            {
                id: generateId(),
                author_email: ADMIN_EMAIL,
                content: '欢迎来到青柠社区！在这里你可以分享你的想法、交流技术、结交朋友。让我们一起打造一个温暖的社区！',
                images: [],
                created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
                likes: [],
                comments: [
                    {
                        id: generateId(),
                        author_email: ADMIN_EMAIL,
                        content: '期待大家的精彩分享~',
                        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
                        likes: []
                    }
                ]
            },
            {
                id: generateId(),
                author_email: ADMIN_EMAIL,
                content: '青柠社区正式上线啦！\n\n功能包括：\n- 发帖分享\n- 点赞评论\n- 关注用户\n- 发现热门内容\n\n快来体验吧！',
                images: [],
                created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
                likes: ['test@example.com'],
                comments: []
            },
            {
                id: generateId(),
                author_email: ADMIN_EMAIL,
                content: '今天天气真不错，适合写代码。分享一下最近在做的项目 -- 青柠网盘，支持文件上传下载、在线预览，欢迎大家使用！',
                images: [],
                created_at: new Date(Date.now() - 86400000).toISOString(),
                likes: [],
                comments: [
                    {
                        id: generateId(),
                        author_email: ADMIN_EMAIL,
                        content: '青柠网盘真的很好用！',
                        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
                        likes: []
                    },
                    {
                        id: generateId(),
                        author_email: ADMIN_EMAIL,
                        content: '支持一下！',
                        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
                        likes: []
                    }
                ]
            }
        ];

        savePosts(posts);
        localStorage.setItem(SEED_KEY, 'true');
    }

    // ===== 登录检测 =====
    function checkAuth() {
        var loggedIn = localStorage.getItem('qn_logged_in');
        var email = localStorage.getItem('qn_user_email');

        if (loggedIn === 'true' && email) {
            currentUser = getUserProfile(email);
            currentUser.email = email;
            showLoggedInUI();
            return true;
        } else {
            currentUser = null;
            showLoggedOutUI();
            return false;
        }
    }

    function showLoggedInUI() {
        $('#loginPrompt').style.display = 'none';
        $('#composeBox').classList.remove('hidden');
        $('#tabsBar').style.display = 'flex';
        $('#navLoginBtn').style.display = 'none';
        $('#navPostBtn').style.display = '';
        $('#navAvatar').style.display = 'flex';
        $('#sidebarCard').style.display = 'block';

        // 渲染导航头像
        renderAvatar($('#navAvatar'), currentUser, 36);
        $('#navAvatar').setAttribute('href', 'profile.html');

        // 渲染发帖框头像
        renderAvatar($('#composeAvatar'), currentUser, 44);

        // 渲染侧边栏
        renderSidebar();
    }

    function showLoggedOutUI() {
        $('#loginPrompt').style.display = 'block';
        $('#composeBox').classList.add('hidden');
        $('#tabsBar').style.display = 'none';
        $('#navLoginBtn').style.display = '';
        $('#navPostBtn').style.display = 'none';
        $('#navAvatar').style.display = 'none';
        $('#sidebarCard').style.display = 'none';
    }

    // ===== 渲染侧边栏 =====
    function renderSidebar() {
        if (!currentUser) return;

        renderAvatar($('#sidebarAvatar'), currentUser, 80);
        $('#sidebarName').textContent = currentUser.username || currentUser.email.split('@')[0];
        $('#sidebarEmail').textContent = currentUser.email;
        $('#sidebarBio').textContent = currentUser.bio || '这个人很懒，什么都没写~';

        var posts = loadPosts();
        var myPosts = posts.filter(function (p) { return p.author_email === currentUser.email; });
        var follows = loadFollows();
        var followingCount = follows.filter(function (f) { return f.follower_email === currentUser.email; }).length;
        var followerCount = follows.filter(function (f) { return f.following_email === currentUser.email; }).length;

        $('#sidebarPostCount').textContent = myPosts.length;
        $('#sidebarFollowingCount').textContent = followingCount;
        $('#sidebarFollowerCount').textContent = followerCount;
    }

    // ===== 发帖 =====
    window.publishPost = function () {
        if (!currentUser) {
            showToast('请先登录', 'error');
            return;
        }

        var input = $('#composeInput');
        var content = input.value.trim();
        if (!content && composeImages.length === 0) {
            showToast('请输入内容或上传图片', 'error');
            return;
        }

        var post = {
            id: generateId(),
            author_email: currentUser.email,
            content: content,
            images: composeImages.slice(0, 9),
            created_at: new Date().toISOString(),
            likes: [],
            comments: [],
            comments_enabled: window._composeCommentsEnabled !== false
        };

        var posts = loadPosts();
        posts.unshift(post);
        savePosts(posts);

        // 清空输入
        input.value = '';
        composeImages = [];
        window._composeCommentsEnabled = true;
        var commentToggle = document.getElementById('composeCommentToggle');
        if (commentToggle) { commentToggle.style.color = '#22c55e'; commentToggle.title = '允许评论'; }
        $('#composeImagesPreview').innerHTML = '';
        $('#composePublishBtn').disabled = true;

        showToast('发布成功', 'success');
        renderFeed();
        renderSidebar();
    };

    // 监听输入框变化
    function initComposeListeners() {
        var input = $('#composeInput');
        input.addEventListener('input', function () {
            var hasContent = input.value.trim().length > 0 || composeImages.length > 0;
            $('#composePublishBtn').disabled = !hasContent;
        });

        // Ctrl+Enter 发布
        input.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                window.publishPost();
            }
        });
    }

    // ===== 图片上传 =====
    window.triggerImageUpload = function () {
        $('#composeImageInput').click();
    };

    window.handleImageSelect = function (e) {
        var files = e.target.files;
        if (!files || files.length === 0) return;

        var remaining = 9 - composeImages.length;
        if (remaining <= 0) {
            showToast('最多上传9张图片', 'error');
            return;
        }

        var toProcess = Math.min(files.length, remaining);
        var processed = 0;

        for (var i = 0; i < toProcess; i++) {
            (function (file) {
                compressImage(file, 800, function (base64) {
                    composeImages.push(base64);
                    processed++;
                    if (processed === toProcess) {
                        renderComposeImages();
                        $('#composePublishBtn').disabled = false;
                    }
                });
            })(files[i]);
        }

        // 清空 input 以便重复选择
        e.target.value = '';
    };

    function compressImage(file, maxSize, callback) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var w = img.width;
                var h = img.height;

                if (w > maxSize || h > maxSize) {
                    if (w > h) {
                        h = Math.round(h * maxSize / w);
                        w = maxSize;
                    } else {
                        w = Math.round(w * maxSize / h);
                        h = maxSize;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function renderComposeImages() {
        var container = $('#composeImagesPreview');
        container.innerHTML = '';
        composeImages.forEach(function (src, idx) {
            var div = document.createElement('div');
            div.className = 'img-item';
            div.innerHTML = '<img src="' + src + '" alt="预览">' +
                '<button class="img-remove" onclick="removeComposeImage(' + idx + ')">&times;</button>';
            container.appendChild(div);
        });
    }

    window.removeComposeImage = function (idx) {
        composeImages.splice(idx, 1);
        renderComposeImages();
        if (composeImages.length === 0 && !$('#composeInput').value.trim()) {
            $('#composePublishBtn').disabled = true;
        }
    };

    // ===== 渲染信息流 =====
    function renderFeed() {
        var posts = loadPosts();
        var container = $('#homeFeed');

        // 保留刷新指示器
        var indicator = $('#pullRefreshIndicator');
        container.innerHTML = '';
        container.appendChild(indicator);

        if (posts.length === 0) {
            container.innerHTML += '<div class="empty-state">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                '<p>暂无帖子，快来发布第一条吧！</p></div>';
            return;
        }

        // 按时间倒序
        posts.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

        posts.forEach(function (post) {
            container.appendChild(createPostCard(post));
        });
    }

    function createPostCard(post) {
        var card = document.createElement('div');
        card.className = 'post-card';
        card.id = 'post-' + post.id;

        var author = getUserProfile(post.author_email);
        var isOwn = currentUser && currentUser.email === post.author_email;
        var follows = loadFollows();
        var isFollowing = currentUser && follows.some(function (f) {
            return f.follower_email === currentUser.email && f.following_email === post.author_email;
        });
        var isLiked = currentUser && post.likes && post.likes.indexOf(currentUser.email) !== -1;

        // 头部
        var headerHTML = '<div class="post-header">' +
            '<div class="post-header-left">' +
            '<div class="post-avatar" data-email="' + post.author_email + '" onclick="viewProfile(\'' + post.author_email + '\')"></div>' +
            '<div class="post-user-info">' +
            '<span class="post-username" onclick="viewProfile(\'' + post.author_email + '\')">' +
            escapeHtml(author.username || post.author_email.split('@')[0]) +
            (post.author_email === ADMIN_EMAIL ? ' <span style="color:#22c55e;font-size:12px;">&#9733;站长</span>' : '') +
            '</span>' +
            '<span class="post-time">' + formatDate(post.created_at) + '</span>' +
            '</div></div>';

        if (!isOwn && currentUser) {
            headerHTML += '<button class="follow-btn ' + (isFollowing ? 'following' : '') + '" ' +
                'onclick="toggleFollow(\'' + post.author_email + '\', this)">' +
                (isFollowing ? '已关注' : '关注') + '</button>';
        }
        headerHTML += '</div>';

        // 内容
        var contentHTML = post.content ? '<div class="post-content">' + escapeHtml(post.content) + '</div>' : '';

        // 图片
        var imagesHTML = '';
        if (post.images && post.images.length > 0) {
            var gridClass = 'grid-' + Math.min(post.images.length, 3);
            imagesHTML = '<div class="post-images ' + gridClass + '">';
            post.images.forEach(function (src) {
                imagesHTML += '<img src="' + src + '" onclick="previewImage(this.src)" alt="帖子图片">';
            });
            imagesHTML += '</div>';
        }

        // 操作栏
        var likeCount = post.likes ? post.likes.length : 0;
        var commentCount = post.comments ? post.comments.length : 0;
        var commentsEnabled = post.comments_enabled !== false;
        var actionsHTML = '<div class="post-actions">' +
            '<button class="post-action-btn ' + (isLiked ? 'liked' : '') + '" onclick="toggleLike(\'' + post.id + '\', this)">' +
            '<svg viewBox="0 0 24 24" fill="' + (isLiked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '<span>' + likeCount + '</span></button>' +
            '<button class="post-action-btn" onclick="toggleComments(\'' + post.id + '\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
            '<span>' + commentCount + '</span></button>' +
            (isOwn ? '<button class="post-action-btn" title="' + (commentsEnabled ? '关闭评论' : '开启评论') + '" onclick="toggleCommentsEnabled(\'' + post.id + '\', this)">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
            (commentsEnabled ? '' : '<line x1="3" y1="3" x2="21" y2="21"/>') +
            '</svg>' +
            '<span>' + (commentsEnabled ? '评论开' : '评论关') + '</span></button>' : '') +
            '<button class="post-action-btn" onclick="sharePost(\'' + post.id + '\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
            '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
            '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
            '<span>分享</span></button>' +
            '</div>';

        // 评论区
        var commentsHTML = '<div class="comments-section" id="comments-' + post.id + '">';
        if (commentCount > 0) {
            // 预览前2条
            var previewCount = Math.min(2, commentCount);
            var previewText = '';
            for (var i = 0; i < previewCount; i++) {
                var c = post.comments[i];
                var cp = getUserProfile(c.author_email);
                previewText += cp.username || c.author_email.split('@')[0];
                previewText += '：' + c.content.substring(0, 30);
                if (c.content.length > 30) previewText += '...';
                if (i < previewCount - 1) previewText += '  ';
            }
            if (commentCount > 2) {
                previewText = previewText + ' 等' + commentCount + '条评论';
            }
            commentsHTML += '<div class="comment-preview" onclick="toggleComments(\'' + post.id + '\')">' + escapeHtml(previewText) + '</div>';
        }

        // 评论列表
        commentsHTML += '<div class="comments-list" id="commentsList-' + post.id + '" style="display:none;">';
        if (post.comments) {
            post.comments.forEach(function (c) {
                var cAuthor = getUserProfile(c.author_email);
                var cLiked = currentUser && c.likes && c.likes.indexOf(currentUser.email) !== -1;
                commentsHTML += '<div class="comment-item">' +
                    '<div class="comment-avatar" data-email="' + c.author_email + '"></div>' +
                    '<div class="comment-body">' +
                    '<div class="comment-meta">' +
                    '<span class="comment-author" onclick="viewProfile(\'' + c.author_email + '\')">' +
                    escapeHtml(cAuthor.username || c.author_email.split('@')[0]) + '</span>' +
                    '<span class="comment-time">' + formatDate(c.created_at) + '</span>' +
                    '</div>' +
                    '<div class="comment-text">' + escapeHtml(c.content) + '</div>' +
                    '<button class="comment-like-btn ' + (cLiked ? 'liked' : '') + '" ' +
                    'onclick="toggleCommentLike(\'' + post.id + '\', \'' + c.id + '\', this)">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (cLiked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2">' +
                    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
                    '<span>' + (c.likes ? c.likes.length : 0) + '</span></button>' +
                    '</div></div>';
            });
        }
        commentsHTML += '</div>';

        // 评论输入框（仅评论开启时显示）
        if (currentUser) {
            commentsHTML += '<div class="comment-input-row" id="commentInputRow-' + post.id + '" style="display:none;">' +
                '<input class="comment-input" id="commentInput-' + post.id + '" placeholder="写评论..." ' +
                'onkeydown="handleCommentKeydown(event, \'' + post.id + '\')">' +
                '<button class="comment-send-btn" onclick="submitComment(\'' + post.id + '\')">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
                '</button></div>';
        }

        // 评论关闭提示
        if (!commentsEnabled) {
            commentsHTML += '<div style="text-align:center; padding:8px; color:#64748b; font-size:13px;">评论已关闭</div>';
        }

        commentsHTML += '</div>';

        card.innerHTML = headerHTML + contentHTML + imagesHTML + actionsHTML + commentsHTML;

        // 渲染卡片内的头像
        setTimeout(function () {
            var avatarEl = card.querySelector('.post-avatar');
            if (avatarEl) renderAvatar(avatarEl, author, 42);
            var commentAvatars = card.querySelectorAll('.comment-avatar');
            commentAvatars.forEach(function (el) {
                var email = el.getAttribute('data-email');
                renderAvatar(el, getUserProfile(email), 32);
            });
        }, 0);

        return card;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ===== 点赞 =====
    window.toggleLike = function (postId, btn) {
        if (!currentUser) {
            showToast('请先登录', 'error');
            return;
        }

        var posts = loadPosts();
        var post = posts.find(function (p) { return p.id === postId; });
        if (!post) return;

        if (!post.likes) post.likes = [];
        var idx = post.likes.indexOf(currentUser.email);

        if (idx === -1) {
            post.likes.push(currentUser.email);
            btn.classList.add('liked');
            btn.querySelector('svg').setAttribute('fill', 'currentColor');
            // 添加通知
            if (post.author_email !== currentUser.email) {
                addNotification('like', currentUser.email, postId);
            }
        } else {
            post.likes.splice(idx, 1);
            btn.classList.remove('liked');
            btn.querySelector('svg').setAttribute('fill', 'none');
        }

        btn.querySelector('span').textContent = post.likes.length;
        savePosts(posts);
    };

    // ===== 评论 =====
    window.toggleComments = function (postId) {
        // 检查评论是否开启
        var posts = loadPosts();
        var post = posts.find(function (p) { return p.id === postId; });
        if (post && post.comments_enabled === false) {
            showToast('该帖子的评论已关闭', 'info');
            return;
        }

        var section = document.getElementById('comments-' + postId);
        var list = document.getElementById('commentsList-' + postId);
        var inputRow = document.getElementById('commentInputRow-' + postId);

        if (!section) return;

        if (section.classList.contains('open')) {
            section.classList.remove('open');
            if (list) list.style.display = 'none';
            if (inputRow) inputRow.style.display = 'none';
            expandedComments[postId] = false;
        } else {
            section.classList.add('open');
            if (list) list.style.display = 'block';
            if (inputRow) inputRow.style.display = 'flex';
            expandedComments[postId] = true;
            // 聚焦输入框
            setTimeout(function () {
                var input = document.getElementById('commentInput-' + postId);
                if (input) input.focus();
            }, 100);
        }
    };

    window.handleCommentKeydown = function (e, postId) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            window.submitComment(postId);
        }
    };

    window.submitComment = function (postId) {
        if (!currentUser) {
            showToast('请先登录', 'error');
            return;
        }

        var posts = loadPosts();
        var post = posts.find(function (p) { return p.id === postId; });
        if (!post) return;

        if (post.comments_enabled === false) {
            showToast('该帖子的评论已关闭', 'info');
            return;
        }

        var input = document.getElementById('commentInput-' + postId);
        if (!input) return;
        var content = input.value.trim();
        if (!content) return;

        if (!post.comments) post.comments = [];
        var comment = {
            id: generateId(),
            author_email: currentUser.email,
            content: content,
            created_at: new Date().toISOString(),
            likes: []
        };
        post.comments.push(comment);
        savePosts(posts);

        input.value = '';

        // 添加通知
        if (post.author_email !== currentUser.email) {
            addNotification('comment', currentUser.email, postId);
        }

        showToast('评论成功', 'success');

        // 重新渲染该帖子
        var card = document.getElementById('post-' + postId);
        if (card) {
            var newCard = createPostCard(post);
            card.replaceWith(newCard);
            // 保持评论区展开
            setTimeout(function () {
                var section = document.getElementById('comments-' + postId);
                var list = document.getElementById('commentsList-' + postId);
                var inputRow = document.getElementById('commentInputRow-' + postId);
                if (section) section.classList.add('open');
                if (list) list.style.display = 'block';
                if (inputRow) inputRow.style.display = 'flex';
            }, 50);
        }

        // 更新操作栏评论数
        renderFeed();
    };

    // ===== 评论点赞 =====
    window.toggleCommentLike = function (postId, commentId, btn) {
        if (!currentUser) {
            showToast('请先登录', 'error');
            return;
        }

        var posts = loadPosts();
        var post = posts.find(function (p) { return p.id === postId; });
        if (!post || !post.comments) return;

        var comment = post.comments.find(function (c) { return c.id === commentId; });
        if (!comment) return;

        if (!comment.likes) comment.likes = [];
        var idx = comment.likes.indexOf(currentUser.email);

        if (idx === -1) {
            comment.likes.push(currentUser.email);
            btn.classList.add('liked');
            btn.querySelector('svg').setAttribute('fill', 'currentColor');
        } else {
            comment.likes.splice(idx, 1);
            btn.classList.remove('liked');
            btn.querySelector('svg').setAttribute('fill', 'none');
        }

        btn.querySelector('span').textContent = comment.likes.length;
        savePosts(posts);
    };

    // ===== 关注/取关 =====
    window.toggleFollow = function (targetEmail, btn) {
        if (!currentUser) {
            showToast('请先登录', 'error');
            return;
        }

        if (targetEmail === currentUser.email) return;

        var follows = loadFollows();
        var existIdx = -1;
        for (var i = 0; i < follows.length; i++) {
            if (follows[i].follower_email === currentUser.email && follows[i].following_email === targetEmail) {
                existIdx = i;
                break;
            }
        }

        if (existIdx === -1) {
            // 关注
            follows.push({
                follower_email: currentUser.email,
                following_email: targetEmail,
                created_at: new Date().toISOString()
            });
            btn.classList.add('following');
            btn.textContent = '已关注';
            showToast('关注成功', 'success');
            // 添加通知
            addNotification('follow', currentUser.email, null);
        } else {
            // 取关
            follows.splice(existIdx, 1);
            btn.classList.remove('following');
            btn.textContent = '关注';
            showToast('已取消关注', 'info');
        }

        saveFollows(follows);
        renderSidebar();
    };

    // ===== 分享 =====
    window.sharePost = function (postId) {
        var url = window.location.href.split('?')[0] + '?post=' + postId;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function () {
                showToast('链接已复制到剪贴板', 'success');
            }).catch(function () {
                showToast('分享链接：' + url, 'info');
            });
        } else {
            showToast('分享链接：' + url, 'info');
        }
    };

    // ===== 开关评论 =====
    window.toggleCommentsEnabled = function (postId, btn) {
        if (!currentUser) return;

        var posts = loadPosts();
        var post = posts.find(function (p) { return p.id === postId; });
        if (!post) return;

        post.comments_enabled = post.comments_enabled === false ? true : false;
        savePosts(posts);

        if (post.comments_enabled) {
            showToast('已开启评论', 'success');
        } else {
            showToast('已关闭评论', 'info');
        }

        // 重新渲染该帖子
        var card = document.getElementById('post-' + postId);
        if (card) {
            var newCard = createPostCard(post);
            card.replaceWith(newCard);
        }
    };

    // ===== 发帖框评论开关 =====
    window.toggleComposeComments = function () {
        window._composeCommentsEnabled = !window._composeCommentsEnabled;
        var btn = document.getElementById('composeCommentToggle');
        if (btn) {
            btn.style.color = window._composeCommentsEnabled ? '#22c55e' : '#64748b';
            btn.title = window._composeCommentsEnabled ? '允许评论' : '禁止评论';
        }
        showToast(window._composeCommentsEnabled ? '已开启评论' : '已关闭评论', 'info');
    };

    // ===== 查看用户主页 =====
    window.viewProfile = function (email) {
        window.location.href = 'profile.html?user=' + encodeURIComponent(email);
    };

    // ===== 图片预览 =====
    window.previewImage = function (src) {
        var overlay = $('#imageOverlay');
        var img = $('#overlayImage');
        img.src = src;
        overlay.classList.add('open');
    };

    window.closeImageOverlay = function () {
        var overlay = $('#imageOverlay');
        overlay.classList.remove('open');
    };

    // ===== 页面切换 =====
    window.switchPage = function (page) {
        currentPage = page;

        // 更新标签页样式
        $$('.tab-item').forEach(function (el) {
            el.classList.toggle('active', el.getAttribute('data-tab') === page);
        });

        // 更新导航链接
        $('#navHome').classList.toggle('active', page === 'home');
        $('#navDiscover').classList.toggle('active', page === 'discover');

        // 更新移动端导航
        $('#mobNavHome').classList.toggle('active', page === 'home');
        $('#mobNavDiscover').classList.toggle('active', page === 'discover');

        // 切换内容
        if (page === 'home') {
            $('#homeFeed').style.display = 'block';
            $('#discoverSection').classList.remove('active');
            renderFeed();
        } else if (page === 'discover') {
            $('#homeFeed').style.display = 'none';
            $('#discoverSection').classList.add('active');
            renderDiscover();
        }
    };

    // ===== 发现页 =====
    function renderDiscover() {
        renderHotPosts();
        renderRecommendUsers();
    }

    function renderHotPosts() {
        var posts = loadPosts();
        var container = $('#hotPosts');
        container.innerHTML = '';

        // 按点赞数排序
        posts.sort(function (a, b) {
            return (b.likes ? b.likes.length : 0) - (a.likes ? a.likes.length : 0);
        });

        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>暂无热门帖子</p></div>';
            return;
        }

        // 只显示有点赞的帖子，最多20条
        var hotPosts = posts.filter(function (p) { return p.likes && p.likes.length > 0; }).slice(0, 20);
        if (hotPosts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>暂无热门帖子，去点赞吧！</p></div>';
            return;
        }

        hotPosts.forEach(function (post) {
            container.appendChild(createPostCard(post));
        });
    }

    function renderRecommendUsers() {
        var container = $('#recommendUsers');
        container.innerHTML = '';

        var users = getAllUsers();
        if (!currentUser) return;

        // 过滤掉自己
        users = users.filter(function (u) { return u.email !== currentUser.email; });

        // 随机排序
        users.sort(function () { return Math.random() - 0.5; });

        // 最多显示5个
        var recommend = users.slice(0, 5);

        if (recommend.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#64748b;padding:20px;">暂无推荐用户</div>';
            return;
        }

        var follows = loadFollows();

        recommend.forEach(function (user) {
            var isFollowing = follows.some(function (f) {
                return f.follower_email === currentUser.email && f.following_email === user.email;
            });

            var item = document.createElement('div');
            item.className = 'recommend-user-item';
            item.innerHTML =
                '<div class="recommend-user-left">' +
                '<div class="recommend-user-avatar" data-email="' + user.email + '" onclick="viewProfile(\'' + user.email + '\')"></div>' +
                '<div>' +
                '<div class="recommend-user-name" onclick="viewProfile(\'' + user.email + '\')">' +
                escapeHtml(user.username || user.email.split('@')[0]) +
                (user.email === ADMIN_EMAIL ? ' <span style="color:#22c55e;font-size:11px;">&#9733;</span>' : '') +
                '</div>' +
                '<div class="recommend-user-email">' + escapeHtml(user.email) + '</div>' +
                '</div></div>' +
                '<button class="follow-btn ' + (isFollowing ? 'following' : '') + '" ' +
                'onclick="toggleFollow(\'' + user.email + '\', this)">' +
                (isFollowing ? '已关注' : '关注') + '</button>';

            container.appendChild(item);

            // 渲染头像
            setTimeout(function () {
                var avatarEl = item.querySelector('.recommend-user-avatar');
                if (avatarEl) renderAvatar(avatarEl, user, 40);
            }, 0);
        });
    }

    // ===== 通知 =====
    function addNotification(type, fromEmail, postId) {
        if (!currentUser) return;

        var notifs = loadNotifications();
        notifs.unshift({
            id: generateId(),
            type: type,
            from_email: fromEmail,
            post_id: postId || '',
            created_at: new Date().toISOString(),
            read: false
        });

        // 最多保留100条
        if (notifs.length > 100) notifs = notifs.slice(0, 100);
        saveNotifications(notifs);
        updateNotifBadge();
    }

    function updateNotifBadge() {
        var notifs = loadNotifications();
        var unread = notifs.filter(function (n) { return !n.read; }).length;
        var badge = $('#navNotifCount');
        if (unread > 0) {
            badge.style.display = 'flex';
            badge.textContent = unread > 99 ? '99+' : unread;
        } else {
            badge.style.display = 'none';
        }
    }

    window.toggleNotifPanel = function () {
        var panel = $('#notifPanel');
        if (panel.classList.contains('open')) {
            panel.classList.remove('open');
        } else {
            panel.classList.add('open');
            renderNotifications();
            // 标记全部已读
            markAllNotifsRead();
        }
    };

    function renderNotifications() {
        var notifs = loadNotifications();
        var container = $('#notifList');
        container.innerHTML = '';

        if (notifs.length === 0) {
            container.innerHTML = '<div class="notif-empty">暂无通知</div>';
            return;
        }

        // 最多显示30条
        var display = notifs.slice(0, 30);

        display.forEach(function (notif) {
            var fromProfile = getUserProfile(notif.from_email);
            var text = '';
            var iconClass = '';
            var iconContent = '';

            if (notif.type === 'like') {
                iconClass = 'like';
                iconContent = '&#10084;';
                text = '<strong>' + escapeHtml(fromProfile.username || notif.from_email.split('@')[0]) + '</strong> 赞了你的帖子';
            } else if (notif.type === 'comment') {
                iconClass = 'comment';
                iconContent = '&#128172;';
                text = '<strong>' + escapeHtml(fromProfile.username || notif.from_email.split('@')[0]) + '</strong> 评论了你的帖子';
            } else if (notif.type === 'follow') {
                iconClass = 'follow';
                iconContent = '&#128101;';
                text = '<strong>' + escapeHtml(fromProfile.username || notif.from_email.split('@')[0]) + '</strong> 关注了你';
            }

            var item = document.createElement('div');
            item.className = 'notif-item' + (notif.read ? '' : ' unread');
            item.innerHTML =
                '<div class="notif-icon ' + iconClass + '">' + iconContent + '</div>' +
                '<div class="notif-body">' +
                '<div class="notif-text">' + text + '</div>' +
                '<div class="notif-time">' + formatDate(notif.created_at) + '</div>' +
                '</div>';

            // 点击通知跳转
            if (notif.post_id) {
                item.onclick = function () {
                    toggleNotifPanel();
                    switchPage('home');
                    setTimeout(function () {
                        var card = document.getElementById('post-' + notif.post_id);
                        if (card) {
                            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            card.style.borderColor = '#22c55e';
                            setTimeout(function () { card.style.borderColor = ''; }, 2000);
                        }
                    }, 300);
                };
            }

            container.appendChild(item);
        });
    }

    function markAllNotifsRead() {
        var notifs = loadNotifications();
        var changed = false;
        notifs.forEach(function (n) {
            if (!n.read) { n.read = true; changed = true; }
        });
        if (changed) {
            saveNotifications(notifs);
            updateNotifBadge();
        }
    }

    // ===== 聚焦发帖框 =====
    window.focusCompose = function () {
        if (!currentUser) {
            window.location.href = 'auth.html';
            return;
        }
        switchPage('home');
        setTimeout(function () {
            var input = $('#composeInput');
            if (input) input.focus();
            // 滚动到发帖框
            var box = $('#composeBox');
            if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    // ===== 下拉刷新 =====
    function initPullRefresh() {
        var startY = 0;
        var pulling = false;
        var container = $('#homeFeed');

        container.addEventListener('touchstart', function (e) {
            if (window.scrollY <= 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        });

        container.addEventListener('touchmove', function (e) {
            if (!pulling) return;
            var diff = e.touches[0].clientY - startY;
            if (diff > 60) {
                var indicator = $('#pullRefreshIndicator');
                if (indicator) indicator.classList.add('visible');
            }
        });

        container.addEventListener('touchend', function () {
            if (!pulling) return;
            pulling = false;
            var indicator = $('#pullRefreshIndicator');
            if (indicator && indicator.classList.contains('visible')) {
                indicator.textContent = '正在刷新...';
                setTimeout(function () {
                    renderFeed();
                    indicator.classList.remove('visible');
                    indicator.textContent = '下拉刷新...';
                    showToast('刷新成功', 'success');
                }, 800);
            }
        });
    }

    // ===== 点击外部关闭通知面板 =====
    document.addEventListener('click', function (e) {
        var panel = $('#notifPanel');
        if (panel && panel.classList.contains('open')) {
            if (!panel.contains(e.target) && !e.target.closest('#navMessages') && !e.target.closest('#mobNavMessages')) {
                panel.classList.remove('open');
            }
        }
    });

    // ===== ESC 关闭图片预览 =====
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeImageOverlay();
            var panel = $('#notifPanel');
            if (panel) panel.classList.remove('open');
        }
    });

    // ===== 初始化 =====
    function init() {
        seedData();
        var loggedIn = checkAuth();

        if (loggedIn) {
            renderFeed();
            updateNotifBadge();
        } else {
            // 未登录也显示帖子（只读）
            renderFeed();
        }

        initComposeListeners();
        initPullRefresh();
    }

    // DOM 就绪后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
