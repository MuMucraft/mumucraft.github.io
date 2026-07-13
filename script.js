// =============================================================
// 行号范围：1-10   Supabase 初始化
// =============================================================
(function() {
    'use strict';

    // 1. Supabase 配置（请确保 URL 和 anon key 正确）
    const SUPABASE_URL = 'https://ttdpqgjwpxdhtcqpifsc.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ZHBxZ2p3cHhkaHRjcXBpZnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MDExNDAsImV4cCI6MjA5OTQ3NzE0MH0.bt-yKJfnjTK-djdL6T7vPbSzaCyT4sKRdpWJFgn4fTk';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // =============================================================
    // 行号范围：11-25   管理员账户管理（localStorage）
    // =============================================================
    const INITIAL_PASSWORD = 'muop123ggp';
    const PASSWORD_STORAGE_KEY = 'admin_password';
    const USERNAME_STORAGE_KEY = 'admin_username';
    const PW_CHANGED_FLAG = 'admin_password_changed';
    // ----- 新增：用户名是否已修改的标志 -----
    const USERNAME_CHANGED_FLAG = 'admin_username_changed';   // 行号 18

    function getStoredUsername() {
        return localStorage.getItem(USERNAME_STORAGE_KEY) || 'MuopggAdmin';
    }
    function setStoredUsername(name) {
        localStorage.setItem(USERNAME_STORAGE_KEY, name);
    }
    function getStoredPassword() {
        return localStorage.getItem(PASSWORD_STORAGE_KEY) || INITIAL_PASSWORD;
    }
    function setStoredPassword(newPw) {
        localStorage.setItem(PASSWORD_STORAGE_KEY, newPw);
        localStorage.setItem(PW_CHANGED_FLAG, 'true');
    }
    function hasChangedPassword() {
        return localStorage.getItem(PW_CHANGED_FLAG) === 'true';
    }

    // ----- 新增：用户名相关的函数 (行号 32-38) -----
    function hasChangedUsername() {
        return localStorage.getItem(USERNAME_CHANGED_FLAG) === 'true';
    }
    function setUsernameChanged() {
        localStorage.setItem(USERNAME_CHANGED_FLAG, 'true');
    }

    // =============================================================
    // 行号范围：40-80   核心数据操作（Supabase）
    // =============================================================
    async function fetchApplications() {
        try {
            const { data, error } = await supabase
                .from('whitelist')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('获取数据失败:', err);
            showToast('❌ 获取数据失败，请检查网络', 'error');
            return [];
        }
    }

    async function submitApplication({ gameId, qq, age, reason }) {
        try {
            const { data, error } = await supabase
                .from('whitelist')
                .insert([{ gameId, qq, age: age || '', reason, status: 'pending' }])
                .select();
            if (error) throw error;
            showToast('✅ 申请提交成功！', 'success');
            return data[0];
        } catch (err) {
            console.error('提交失败:', err);
            showToast('❌ 提交失败，请重试', 'error');
            return null;
        }
    }

    async function updateApplicationStatus(id, newStatus) {
        try {
            const { error } = await supabase
                .from('whitelist')
                .update({ status: newStatus })
                .eq('id', id);
            if (error) throw error;
            showToast(`✅ 状态已更新为: ${newStatus === 'approved' ? '已通过' : '已拒绝'}`, 'success');
            return true;
        } catch (err) {
            console.error('更新状态失败:', err);
            showToast('❌ 操作失败，请重试', 'error');
            return false;
        }
    }

    async function deleteApplication(id) {
        try {
            const { error } = await supabase
                .from('whitelist')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast('🗑️ 已删除该申请', 'info');
            return true;
        } catch (err) {
            console.error('删除失败:', err);
            showToast('❌ 删除失败，请重试', 'error');
            return false;
        }
    }

    // =============================================================
    // 行号范围：82-100  Toast 提示
    // =============================================================
    function showToast(message, type) {
        type = type || 'info';
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            setTimeout(() => toast.remove(), 400);
        }, 2800);
    }

    // =============================================================
    // 行号范围：102-145  页面判断与首页逻辑
    // =============================================================
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // 首页：更新已通过人数
    if (currentPage === 'index.html') {
        updateTotalPlayers();
    }

    async function updateTotalPlayers() {
        const all = await fetchApplications();
        const approved = all.filter(a => a.status === 'approved').length;
        const el = document.getElementById('totalPlayersDisplay');
        if (el) el.textContent = approved;
    }

    // 申请页：提交和查询
    if (currentPage === 'apply.html') {
        // ...（与原代码相同，此处省略，稍后附完整）
    }

    // =============================================================
    // 行号范围：147-350  后台管理页（重点修改）
    // =============================================================
    if (currentPage === 'admin.html') {
        let isAdminLoggedIn = false;

        // ----- 修改：checkAdminSession 增加用户名强制检查 (行号 150-159) -----
        function checkAdminSession() {
            if (isAdminLoggedIn) {
                document.getElementById('adminLoginArea').style.display = 'none';
                document.getElementById('adminPanelArea').style.display = 'block';
                renderAdminTable();
                // 强制改密码
                if (!hasChangedPassword()) {
                    showChangePasswordModal();
                }
                // 强制改用户名（新增）
                if (!hasChangedUsername()) {
                    showChangeUsernameModal();
                }
            } else {
                document.getElementById('adminLoginArea').style.display = 'block';
                document.getElementById('adminPanelArea').style.display = 'none';
            }
        }

        // 登录表单提交
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value.trim();
            const errorEl = document.getElementById('loginError');

            if (user === getStoredUsername() && pass === getStoredPassword()) {
                isAdminLoggedIn = true;
                errorEl.textContent = '';
                document.getElementById('adminLoginArea').style.display = 'none';
                document.getElementById('adminPanelArea').style.display = 'block';
                renderAdminTable();
                showToast('✅ 登录成功！', 'success');
                if (!hasChangedPassword()) {
                    showChangePasswordModal();
                }
                // 新增：检查用户名
                if (!hasChangedUsername()) {
                    showChangeUsernameModal();
                }
            } else {
                errorEl.textContent = '❌ 账号或密码错误，请重试。';
                showToast('❌ 登录失败，请检查账号密码', 'error');
            }
        });

        // 退出登录
        document.getElementById('logoutBtn').addEventListener('click', function() {
            isAdminLoggedIn = false;
            document.getElementById('adminLoginArea').style.display = 'block';
            document.getElementById('adminPanelArea').style.display = 'none';
            document.getElementById('loginError').textContent = '';
            showToast('已退出管理后台', 'info');
            document.getElementById('changePasswordModal').style.display = 'none';
            document.getElementById('resetPasswordModal').style.display = 'none';
            document.getElementById('changeUsernameModal').style.display = 'none';
        });

        document.getElementById('loginPass').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('loginForm').dispatchEvent(new Event('submit'));
        });

        // ---------- 强制更改密码 ----------
        function showChangePasswordModal() {
            document.getElementById('changePasswordModal').style.display = 'flex';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            document.getElementById('changePwError').textContent = '';
        }

        document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const newPw = document.getElementById('newPassword').value.trim();
            const confirmPw = document.getElementById('confirmPassword').value.trim();
            const errorEl = document.getElementById('changePwError');

            if (newPw.length < 6) {
                errorEl.textContent = '密码长度至少 6 位';
                return;
            }
            if (newPw !== confirmPw) {
                errorEl.textContent = '两次密码输入不一致';
                return;
            }
            setStoredPassword(newPw);
            errorEl.textContent = '';
            document.getElementById('changePasswordModal').style.display = 'none';
            showToast('✅ 密码修改成功！请使用新密码重新登录。', 'success');
            isAdminLoggedIn = false;
            document.getElementById('adminLoginArea').style.display = 'block';
            document.getElementById('adminPanelArea').style.display = 'none';
            document.getElementById('loginPass').value = '';
            document.getElementById('loginError').textContent = '';
        });

        // ---------- 忘记密码重置 ----------
        document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('resetPasswordModal').style.display = 'flex';
            document.getElementById('initialPassword').value = '';
            document.getElementById('resetNewPassword').value = '';
            document.getElementById('resetConfirmPassword').value = '';
            document.getElementById('resetPwError').textContent = '';
        });

        document.getElementById('closeResetModalLink').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('resetPasswordModal').style.display = 'none';
        });

        document.getElementById('resetPasswordForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const initial = document.getElementById('initialPassword').value.trim();
            const newPw = document.getElementById('resetNewPassword').value.trim();
            const confirmPw = document.getElementById('resetConfirmPassword').value.trim();
            const errorEl = document.getElementById('resetPwError');

            if (initial !== INITIAL_PASSWORD) {
                errorEl.textContent = '初始密码错误，请重试。';
                return;
            }
            if (newPw.length < 6) {
                errorEl.textContent = '新密码长度至少 6 位';
                return;
            }
            if (newPw !== confirmPw) {
                errorEl.textContent = '两次密码输入不一致';
                return;
            }
            setStoredPassword(newPw);
            errorEl.textContent = '';
            document.getElementById('resetPasswordModal').style.display = 'none';
            showToast('✅ 密码已重置！请使用新密码登录。', 'success');
            document.getElementById('loginPass').value = '';
            document.getElementById('loginError').textContent = '';
            if (isAdminLoggedIn) {
                isAdminLoggedIn = false;
                document.getElementById('adminLoginArea').style.display = 'block';
                document.getElementById('adminPanelArea').style.display = 'none';
            }
        });

        // ---------- 更改用户名（新增了强制逻辑） ----------
        function showChangeUsernameModal() {
            document.getElementById('changeUsernameModal').style.display = 'flex';
            document.getElementById('currentPwForUser').value = '';
            document.getElementById('newUsername').value = '';
            document.getElementById('changeUserError').textContent = '';
        }

        document.getElementById('changeUsernameBtn').addEventListener('click', function() {
            showChangeUsernameModal();
        });

        document.getElementById('closeUserModalLink').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('changeUsernameModal').style.display = 'none';
        });

        document.getElementById('changeUsernameForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const currentPw = document.getElementById('currentPwForUser').value.trim();
            const newName = document.getElementById('newUsername').value.trim();
            const errorEl = document.getElementById('changeUserError');

            if (currentPw !== getStoredPassword()) {
                errorEl.textContent = '当前密码错误，请重试。';
                return;
            }
            if (newName.length < 2) {
                errorEl.textContent = '用户名至少 2 个字符';
                return;
            }
            if (newName === getStoredUsername()) {
                errorEl.textContent = '新用户名与当前相同，无需修改';
                return;
            }

            // 保存新用户名
            setStoredUsername(newName);
            // 标记用户名已修改（新增）
            setUsernameChanged();   // 行号 285

            errorEl.textContent = '';
            document.getElementById('changeUsernameModal').style.display = 'none';
            showToast(`✅ 用户名已更改为「${newName}」，请重新登录。`, 'success');
            // 退出登录，强制重新登录
            isAdminLoggedIn = false;
            document.getElementById('adminLoginArea').style.display = 'block';
            document.getElementById('adminPanelArea').style.display = 'none';
            document.getElementById('loginUser').value = newName;
            document.getElementById('loginPass').value = '';
            document.getElementById('loginError').textContent = '';
        });

        // ---------- 渲染表格、操作处理、统计等（与原代码相同） ----------
        async function renderAdminTable() {
            // ... 此处省略，实际代码中完整保留
        }

        async function handleAdminAction(id, action) {
            // ... 省略
        }

        function updateStats(list) {
            // ... 省略
        }

        // 搜索 / 过滤 / 重置
        document.getElementById('searchInput').addEventListener('input', renderAdminTable);
        document.getElementById('filterStatus').addEventListener('change', renderAdminTable);
        document.getElementById('clearFilterBtn').addEventListener('click', function() {
            document.getElementById('searchInput').value = '';
            document.getElementById('filterStatus').value = 'all';
            renderAdminTable();
            showToast('已重置筛选条件', 'info');
        });

        // 初始化后台
        checkAdminSession();
    }

    // 其他页面（如 index.html）不需要额外操作
    console.log(`✅ 当前页面: ${currentPage}，已初始化对应功能。`);
})();