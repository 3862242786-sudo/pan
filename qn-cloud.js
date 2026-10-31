/* 青柠社区云端同步层
 * - 用户资料（用户名 / 头像 / 背景）存到 Supabase Storage 的 social_profiles.json
 * - 作品存到 social_works.json，作品图片与头像上传到 files 桶
 * - 所有页面统一通过 window.QNCloud 读取，保证跨页面、跨设备一致
 */
(function () {
    'use strict';

    var BUCKET = 'files';
    var PROFILE_DOC = 'social_profiles.json';
    var WORKS_DOC = 'social_works.json';

    var profilesCache = null;
    var profilesPromise = null;
    var worksCache = {};

    function norm(email) {
        return String(email || '').trim().toLowerCase();
    }

    function clientReady() {
        return typeof window.supabaseClient !== 'undefined' && window.supabaseClient;
    }

    async function waitClient() {
        var i = 0;
        while (!clientReady() && i < 30) {
            await new Promise(function (r) { setTimeout(r, 300); });
            i++;
        }
        return !!clientReady();
    }

    function publicUrl(doc) {
        return window.supabaseClient.storage.from(BUCKET).getPublicUrl(doc).data.publicUrl;
    }

    async function readDoc(doc) {
        try {
            var res = await fetch(publicUrl(doc) + '?t=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn('[QNCloud] 读取失败', doc, e);
            return null;
        }
    }

    async function writeDoc(doc, obj) {
        try {
            var blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
            var res = await window.supabaseClient.storage.from(BUCKET).upload(doc, blob, {
                upsert: true,
                contentType: 'application/json',
                cacheControl: '0'
            });
            return !res.error;
        } catch (e) {
            console.warn('[QNCloud] 写入失败', doc, e);
            return false;
        }
    }

    function localProfile(email) {
        try {
            return JSON.parse(localStorage.getItem('qn_profile_' + email) || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function setLocalProfile(email, data) {
        try {
            var local = localProfile(email);
            for (var k in data) {
                if (Object.prototype.hasOwnProperty.call(data, k)) local[k] = data[k];
            }
            localStorage.setItem('qn_profile_' + email, JSON.stringify(local));
        } catch (e) { }
    }

    // ===== 资料 =====
    async function getProfiles(force) {
        if (!(await waitClient())) return profilesCache || {};
        if (!force && profilesCache) return profilesCache;
        if (!force && profilesPromise) return profilesPromise;
        profilesPromise = (async function () {
            var doc = await readDoc(PROFILE_DOC) || {};
            profilesCache = doc.profiles || {};
            return profilesCache;
        })();
        var result = await profilesPromise;
        profilesPromise = null;
        return result;
    }

    function cachedProfile(email) {
        var e = norm(email);
        return (profilesCache && profilesCache[e]) || {};
    }

    async function getProfile(email) {
        var e = norm(email);
        if (!e) return {};
        var profiles = await getProfiles(false);
        var cloud = profiles[e];
        if (cloud && (cloud.username || cloud.avatar_url)) {
            // 云端有资料：同步回本机缓存，供其他页面直接读取
            setLocalProfile(e, cloud);
            return cloud;
        }

        var local = localProfile(e);
        if (local && (local.username || local.avatar_url)) {
            // 本机已有资料但云端没有：迁移到云端（Base64 头像会转存为图片 URL）
            var payload = { username: local.username || '', bio: local.bio || '' };
            if (local.avatar_url) {
                if (/^https?:/.test(local.avatar_url)) {
                    payload.avatar_url = local.avatar_url;
                } else if (/^data:/i.test(local.avatar_url)) {
                    var uploadedAvatar = await uploadAvatar(e, local.avatar_url);
                    if (uploadedAvatar) payload.avatar_url = uploadedAvatar;
                }
            }
            await saveProfile(e, payload);
            return cachedProfile(e) || local;
        }
        return local || {};
    }

    async function saveProfile(email, patch) {
        var e = norm(email);
        if (!e || !(await waitClient())) return false;
        try {
            var doc = await readDoc(PROFILE_DOC) || {};
            doc.version = doc.version || 1;
            doc.profiles = doc.profiles || {};
            var cur = doc.profiles[e] || {};
            var next = {
                username: patch.username !== undefined ? patch.username : (cur.username || ''),
                avatar_url: patch.avatar_url !== undefined ? patch.avatar_url : (cur.avatar_url || ''),
                bio: patch.bio !== undefined ? patch.bio : (cur.bio || ''),
                banner_url: patch.banner_url !== undefined ? patch.banner_url : (cur.banner_url || ''),
                // 保留封禁状态，避免普通资料编辑误改封禁字段
                banned: patch.banned !== undefined ? patch.banned : !!cur.banned,
                banned_reason: patch.banned_reason !== undefined ? patch.banned_reason : (cur.banned_reason || ''),
                banned_at: patch.banned_at !== undefined ? patch.banned_at : (cur.banned_at || ''),
                banned_until: patch.banned_until !== undefined ? patch.banned_until : (cur.banned_until || null),
                updated_at: new Date().toISOString()
            };
            doc.profiles[e] = next;
            var ok = await writeDoc(PROFILE_DOC, doc);
            if (ok) {
                profilesCache = doc.profiles;
                setLocalProfile(e, next);
            }
            return ok;
        } catch (err) {
            console.warn('[QNCloud] 保存资料失败', err);
            return false;
        }
    }

    // ===== 图片上传 =====
    function dataUrlToBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
        var bstr = atob(parts[1]);
        var n = bstr.length;
        var u8 = new Uint8Array(n);
        while (n--) u8[n] = bstr.charCodeAt(n);
        return new Blob([u8], { type: mime });
    }

    async function uploadImage(path, dataUrl) {
        if (!(await waitClient())) return null;
        try {
            var blob = /^data:/.test(dataUrl) ? dataUrlToBlob(dataUrl) : dataUrl;
            var ext = 'jpg';
            var m = blob.type.match(/image\/(\w+)/);
            if (m) ext = m[1].toLowerCase();
            if (ext === 'jpeg') ext = 'jpg';
            var filePath = path + '.' + ext;
            var res = await window.supabaseClient.storage.from(BUCKET).upload(filePath, blob, {
                upsert: true,
                contentType: blob.type,
                cacheControl: '0'
            });
            if (res.error) {
                console.warn('[QNCloud] 图片上传失败', res.error);
                return null;
            }
            return publicUrl(filePath);
        } catch (e) {
            console.warn('[QNCloud] 图片上传异常', e);
            return null;
        }
    }

    function uploadAvatar(email, dataUrl) {
        return uploadImage('avatars/' + encodeURIComponent(norm(email)), dataUrl);
    }

    function uploadBanner(email, dataUrl) {
        return uploadImage('banners/' + encodeURIComponent(norm(email)), dataUrl);
    }

    function uploadWorkImage(email, dataUrl) {
        return uploadImage('works/' + encodeURIComponent(norm(email)) + '/' + Date.now() + '-' + Math.floor(Math.random() * 100000), dataUrl);
    }

    // ===== 作品 =====
    async function readWorksDoc() {
        var doc = await readDoc(WORKS_DOC) || {};
        doc.version = doc.version || 1;
        doc.works = doc.works || {};
        return doc;
    }

    async function getWorks(email) {
        var e = norm(email);
        if (!e) return [];
        if (worksCache[e]) return worksCache[e];

        var doc = await readWorksDoc();
        var cloud = doc.works[e] || [];
        if (typeof cloud === 'string') {
            try { cloud = JSON.parse(cloud) || []; } catch (err) { cloud = []; }
        }

        var local = [];
        try { local = JSON.parse(localStorage.getItem('qn_works_' + e) || '[]') || []; } catch (err) { local = []; }

        // 云端为空但本机有作品：把本机作品（含 base64 图片）迁移到云端
        if (cloud.length === 0 && local.length > 0) {
            cloud = await migrateWorks(e, local);
        }

        worksCache[e] = cloud;
        try { localStorage.setItem('qn_works_' + e, JSON.stringify(cloud)); } catch (err) { }
        return cloud;
    }

    async function migrateWorks(email, local) {
        var out = [];
        for (var i = 0; i < local.length; i++) {
            var w = local[i];
            var images = [];
            var srcImages = w.images || (w.thumbnail_url ? [w.thumbnail_url] : []);
            for (var j = 0; j < srcImages.length; j++) {
                var u = srcImages[j];
                if (u && /^data:/i.test(u)) {
                    var uploaded = await uploadWorkImage(email, u);
                    images.push(uploaded || u);
                } else {
                    images.push(u);
                }
            }
            out.push({
                id: w.id || Date.now().toString(36) + i,
                title: w.title || '未命名',
                description: w.description || '',
                thumbnail_url: images[0] || '',
                images: images,
                created_at: w.created_at || new Date().toISOString()
            });
        }
        var doc = await readWorksDoc();
        doc.works[email] = out;
        await writeDoc(WORKS_DOC, doc);
        return out;
    }

    async function addWork(email, work) {
        var e = norm(email);
        if (!e) return false;
        var doc = await readWorksDoc();
        var list = doc.works[e] || [];
        if (typeof list === 'string') {
            try { list = JSON.parse(list) || []; } catch (err) { list = []; }
        }
        list.unshift(work);
        doc.works[e] = list;
        var ok = await writeDoc(WORKS_DOC, doc);
        if (ok) {
            worksCache[e] = list;
            try { localStorage.setItem('qn_works_' + e, JSON.stringify(list)); } catch (err) { }
        }
        return ok;
    }

    // ===== 关注关系 =====
    function relationsPath(email) {
        return 'userdata/' + encodeURIComponent(norm(email)) + '/relations.json';
    }

    async function getRelations(email) {
        var e = norm(email);
        if (!e) return { follows: [] };
        var doc = await readDoc(relationsPath(e)) || {};
        if (!doc.follows) doc.follows = [];
        try { localStorage.setItem('qn_relations_' + e, JSON.stringify(doc)); } catch (err) { }
        return doc;
    }

    async function saveRelations(email, data) {
        var e = norm(email);
        if (!e || !(await waitClient())) return false;
        var ok = await writeDoc(relationsPath(e), data);
        if (ok) {
            try { localStorage.setItem('qn_relations_' + e, JSON.stringify(data)); } catch (err) { }
        }
        return ok;
    }

    // ===== 账号封禁 =====
    // 判断是否处于封禁期（banned=true 且 banned_until 未到期或为永久）
    function isProfileBanned(p) {
        if (!p || p.banned !== true) return false;
        if (!p.banned_until) return true; // 永久封禁
        return new Date(p.banned_until).getTime() > Date.now();
    }

    function banInfo(email) {
        var e = norm(email);
        var p = cachedProfile(e);
        if (!isProfileBanned(p)) return null;
        return {
            banned: true,
            reason: p.banned_reason || '违反社区规则',
            banned_at: p.banned_at || '',
            banned_until: p.banned_until || ''
        };
    }

    async function isBanned(email) {
        var e = norm(email);
        if (!e) return false;
        var p = await getProfile(e);
        return isProfileBanned(p);
    }

    async function banUser(email, options) {
        var e = norm(email);
        if (!e || !(await waitClient())) return false;
        options = options || {};
        var patch = {
            banned: true,
            banned_reason: options.reason || '违反社区规则',
            banned_at: new Date().toISOString(),
            banned_until: options.until || null
        };
        return saveProfile(e, patch);
    }

    async function unbanUser(email) {
        var e = norm(email);
        if (!e || !(await waitClient())) return false;
        return saveProfile(e, {
            banned: false,
            banned_reason: '',
            banned_at: '',
            banned_until: null
        });
    }

    async function getBannedUsers() {
        var profiles = await getProfiles(true) || {};
        var list = [];
        for (var k in profiles) {
            if (Object.prototype.hasOwnProperty.call(profiles, k)) {
                var p = profiles[k];
                if (isProfileBanned(p)) {
                    list.push({
                        email: k,
                        username: p.username || '',
                        avatar_url: p.avatar_url || '',
                        reason: p.banned_reason || '',
                        banned_at: p.banned_at || '',
                        banned_until: p.banned_until || null
                    });
                }
            }
        }
        return list;
    }

    // ===== 展示辅助 =====
    function displayName(email, fallbackName) {
        var p = cachedProfile(email);
        return p.username || fallbackName || '匿名用户';
    }

    function avatarHtml(email, fallbackName, fallbackColor) {
        var p = cachedProfile(email);
        var name = p.username || fallbackName || '匿名用户';
        if (p.avatar_url && /^https?:/.test(p.avatar_url)) {
            var v = p.updated_at ? ('?v=' + encodeURIComponent(p.updated_at)) : '';
            var sep = p.avatar_url.indexOf('?') === -1 ? v : '';
            return '<img src="' + p.avatar_url + sep + '" alt="' + name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">';
        }
        return (name.charAt(0) || '?').toUpperCase();
    }

    // ===== 启动时把云端资料同步回本机（登录态） =====
    (async function () {
        try {
            if (!(await waitClient())) return;
            var email = localStorage.getItem('qn_user_email');
            if (!email) return;
            var cloud = await getProfile(email);

            // 已被封禁：强制退出，阻止继续使用
            if (cloud && isProfileBanned(cloud)) {
                try {
                    if (typeof window.handleLogout === 'function') {
                        window.handleLogout();
                    } else {
                        localStorage.removeItem('qn_logged_in');
                        localStorage.removeItem('qn_user_email');
                        localStorage.removeItem('qn_is_admin');
                    }
                } catch (e) { }
                var reason = cloud.banned_reason || '违反社区规则';
                var until = cloud.banned_until
                    ? '，解封时间：' + new Date(cloud.banned_until).toLocaleString('zh-CN')
                    : '（永久）';
                if (localStorage.getItem('qn_ban_notified') !== email + ':' + (cloud.banned_at || '')) {
                    localStorage.setItem('qn_ban_notified', email + ':' + (cloud.banned_at || ''));
                    alert('账号已被封禁：' + reason + until + '\n如有疑问请联系站长。');
                }
                // 跳转到登录页，并带上封禁标记
                if (!/auth\.html|banned\.html/.test(window.location.pathname)) {
                    window.location.href = 'auth.html?banned=1&reason=' + encodeURIComponent(reason);
                }
                return;
            }

            if (cloud && cloud.username) {
                setLocalProfile(email, {
                    username: cloud.username,
                    avatar_url: cloud.avatar_url || localProfile(email).avatar_url || '',
                    banned: !!cloud.banned
                });
                if (window.QNCloud && typeof window.QNCloud.onProfileReady === 'function') {
                    window.QNCloud.onProfileReady(email);
                }
            }
        } catch (e) { }
    })();

    window.QNCloud = {
        waitClient: waitClient,
        getProfiles: getProfiles,
        cachedProfile: cachedProfile,
        getProfile: getProfile,
        saveProfile: saveProfile,
        uploadAvatar: uploadAvatar,
        uploadBanner: uploadBanner,
        uploadWorkImage: uploadWorkImage,
        getWorks: getWorks,
        addWork: addWork,
        getRelations: getRelations,
        saveRelations: saveRelations,
        isBanned: isBanned,
        banUser: banUser,
        unbanUser: unbanUser,
        getBannedUsers: getBannedUsers,
        banInfo: banInfo,
        displayName: displayName,
        avatarHtml: avatarHtml,
        onProfileReady: null
    };
})();
