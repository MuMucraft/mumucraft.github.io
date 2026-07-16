(function() {
    'use strict';

    // =============================================================
    // 1. Supabase 初始化
    // =============================================================
    const SUPABASE_URL = 'https://ttdpqgjwpxdhtcqpifsc.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ZHBxZ2p3cHhkaHRjcXBpZnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MDExNDAsImV4cCI6MjA5OTQ3NzE0MH0.bt-yKJfnjTK-djdL6T7vPbSzaCyT4sKRdpWJFgn4fTk';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // =============================================================
    // 2. 管理员账户
    // =============================================================
    const INITIAL_PASSWORD = 'muop123ggp';
    const PASSWORD_STORAGE_KEY = 'admin_password';
    const USERNAME_STORAGE_KEY = 'admin_username';
    const PW_CHANGED_FLAG = 'admin_password_changed';
    const USERNAME_CHANGED_FLAG = 'admin_username_changed';

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
    function hasChangedUsername() {
        return localStorage.getItem(USERNAME_CHANGED_FLAG) === 'true';
    }
    function setUsernameChanged() {
        localStorage.setItem(USERNAME_CHANGED_FLAG, 'true');
    }

    // =============================================================
    // 3. 核心数据操作
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

    async function submitApplication({ gameId, qq, age, reason, groupNickname, version, isOriginal, hasMultipleAccounts }) {
        try {
            // 如果版本是基岩版，isOriginal 设为 null（不适用）
            let finalIsOriginal = isOriginal;
            if (version === '基岩版') {
                finalIsOriginal = null;
            }
            const { data, error } = await supabase
                .from('whitelist')
                .insert([{
                    gameId,
                    qq,
                    age: age || '',
                    reason,
                    status: 'pending',
                    qq_verified: false,
                    group_nickname: groupNickname,
                    version: version,
                    is_original: finalIsOriginal,
                    has_multiple_accounts: hasMultipleAccounts === '是' ? true : false
                }])
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

    async function markQQVerified(id) {
        try {
            const { error } = await supabase
                .from('whitelist')
                .update({ qq_verified: true })
                .eq('id', id);
            if (error) throw error;
            showToast('✅ 已标记 QQ 验证通过', 'success');
            return true;
        } catch (err) {
            console.error('标记验证失败:', err);
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
    // 4. Toast 提示
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
    // 5. 页面判断与初始化
    // =============================================================
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (currentPage === 'index.html') {
        updateTotalPlayers();
    }

    async function updateTotalPlayers() {
        const all = await fetchApplications();
        const approved = all.filter(a => a.status === 'approved').length;
        const el = document.getElementById('totalPlayersDisplay');
        if (el) el.textContent = approved;
    }

    // =============================================================
    // 6. 申请页逻辑（含版本联动隐藏正版）
    // =============================================================
    if (currentPage === 'apply.html') {
        const applyForm = document.getElementById('applyForm');
        const gameVersion = document.getElementById('gameVersion');
        const originalGroup = document.getElementById('originalGroup');
        const isOriginalSelect = document.getElementById('isOriginal');

        // 监听版本变化
        gameVersion.addEventListener('change', function() {
            if (this.value === '基岩版') {
                originalGroup.style.display = 'none';
                isOriginalSelect.removeAttribute('required');
                isOriginalSelect.value = ''; // 清空选值
            } else {
                originalGroup.style.display = 'block';
                isOriginalSelect.setAttribute('required', 'required');
            }
        });

        if (applyForm) {
            applyForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                const gameId = document.getElementById('applyGameId').value.trim();
                const qq = document.getElementById('applyQQ').value.trim();
                const qqConfirm = document.getElementById('applyQQConfirm').value.trim();
                const groupNickname = document.getElementById('groupNickname').value.trim();
                const version = gameVersion.value;
                let isOriginal = isOriginalSelect.value;
                const hasMultipleAccounts = document.getElementById('hasMultipleAccounts').value;
                const age = document.getElementById('applyAge').value.trim();
                const reason = document.getElementById('applyReason').value.trim();
                const agree = document.getElementById('agreeCheck').checked;

                // 基础必填校验（正版字段若隐藏则不校验）
                if (!gameId || !qq || !qqConfirm || !groupNickname || !version || !hasMultipleAccounts || !reason) {
                    showToast('请完整填写所有必填项！', 'error');
                    return;
                }
                // 如果正版可见则必须选择
                if (originalGroup.style.display !== 'none' && !isOriginal) {
                    showToast('请选择是否为正版玩家！', 'error');
                    return;
                }
                if (qq !== qqConfirm) {
                    showToast('两次输入的 QQ 号不一致，请重新输入。', 'error');
                    return;
                }
                if (!/^\d{5,11}$/.test(qq)) {
                    showToast('QQ 号必须为 5~11 位纯数字。', 'error');
                    return;
                }
                if (!agree) {
                    showToast('请勾选“保证 QQ 号真实有效”的承诺。', 'error');
                    return;
                }

                // 如果版本是基岩版，将 isOriginal 设为 null（由 submitApplication 处理）
                const result = await submitApplication({
                    gameId,
                    qq,
                    age,
                    reason,
                    groupNickname,
                    version,
                    isOriginal: version === '基岩版' ? null : isOriginal,
                    hasMultipleAccounts
                });
                if (result) {
                    applyForm.reset();
                    document.getElementById('agreeCheck').checked = false;
                    // 重置显示（默认显示正版）
                    originalGroup.style.display = 'block';
                    isOriginalSelect.setAttribute('required', 'required');
                    gameVersion.value = '';
                }
            });
        }

        // 查询功能（保持不变）
        const queryBtn = document.getElementById('queryBtn');
        if (queryBtn) {
            queryBtn.addEventListener('click', async function() {
                const qq = document.getElementById('queryQQ').value.trim();
                if (!qq) {
                    showToast('请输入 QQ 号进行查询', 'info');
                    return;
                }
                const all = await fetchApplications();
                const records = all.filter(a => a.qq === qq);
                const container = document.getElementById('statusResult');
                if (records.length === 0) {
                    container.innerHTML = `<div class="empty"><i class="fas fa-times-circle"></i> 未找到该 QQ 号的任何申请记录</div>`;
                    return;
                }
                records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                let html = '';
                records.forEach(a => {
                    const statusClass = a.status;
                    const statusLabel = {
                        pending: '⏳ 待审核',
                        approved: '✅ 已通过',
                        rejected: '❌ 已拒绝'
                    }[a.status] || '未知';
                    html += `
                        <div class="result-card ${statusClass}">
                            <div class="header">
                                <span class="game-id">🎮 ${a.gameId}</span>
                                <span class="status-badge-lg ${statusClass}">${statusLabel}</span>
                            </div>
                            <div class="detail-grid">
                                <div><span class="label">QQ 号：</span><span class="value">${a.qq}</span></div>
                                <div><span class="label">群昵称：</span><span class="value">${a.group_nickname || '-'}</span></div>
                                <div><span class="label">版本：</span><span class="value">${a.version || '-'}</span></div>
                                <div><span class="label">正版：</span><span class="value">${a.is_original === null ? '不适用' : (a.is_original ? '是' : '否')}</span></div>
                                <div><span class="label">多账号：</span><span class="value">${a.has_multiple_accounts ? '是' : '否'}</span></div>
                                <div><span class="label">年龄：</span><span class="value">${a.age || '-'}</span></div>
                                <div><span class="label">申请时间：</span><span class="value">${new Date(a.created_at).toLocaleString('zh-CN')}</span></div>
                                <div><span class="label">申请理由：</span><span class="value">${a.reason}</span></div>
                            </div>
                            ${a.status === 'approved' ? `<div class="congrats">🎉 恭喜通过！欢迎加入方块世界！</div>` : ''}
                            ${a.status === 'rejected' ? `<div class="reject-reason">❌ 很遗憾，您的申请未通过审核，可联系管理员了解详情。</div>` : ''}
                            ${a.status === 'pending' ? `<div style="margin-top:8px; color:#ffc107;">⏳ 您的申请正在审核中，请耐心等待。</div>` : ''}
                        </div>
                    `;
                });
                container.innerHTML = html;
            });
        }

        document.getElementById('queryQQ')?.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('queryBtn').click();
        });
    }

    // =============================================================
    // 7. 后台管理页（完整表格）
    // =============================================================
    if (currentPage === 'admin.html') {
        let isAdminLoggedIn = false;

        function checkAdminSession() {
            if (isAdminLoggedIn) {
                document.getElementById('adminLoginArea').style.display = 'none';
                document.getElementById('adminPanelArea').style.display = 'block';
                renderAdminTable();
                if (!hasChangedPassword()) {
                    showChangePasswordModal();
                }
                if (!hasChangedUsername()) {
                    showChangeUsernameModal();
                }
            } else {
                document.getElementById('adminLoginArea').style.display = 'block';
                document.getElementById('adminPanelArea').style.display = 'none';
            }
        }

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
                if (!hasChangedUsername()) {
                    showChangeUsernameModal();
                }
            } else {
                errorEl.textContent = '❌ 账号或密码错误，请重试。';
                showToast('❌ 登录失败，请检查账号密码', 'error');
            }
        });

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

        // 强制改密码
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

        // 忘记密码重置
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

        // 更改用户名
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

            setStoredUsername(newName);
            setUsernameChanged();
            errorEl.textContent = '';
            document.getElementById('changeUsernameModal').style.display = 'none';
            showToast(`✅ 用户名已更改为「${newName}」，请重新登录。`, 'success');
            isAdminLoggedIn = false;
            document.getElementById('adminLoginArea').style.display = 'block';
            document.getElementById('adminPanelArea').style.display = 'none';
            document.getElementById('loginUser').value = newName;
            document.getElementById('loginPass').value = '';
            document.getElementById('loginError').textContent = '';
        });

        // =============================================================
        // 8. 渲染表格（包含版本、正版、多账号）
        // =============================================================
        async function renderAdminTable() {
            const searchVal = document.getElementById('searchInput').value.trim().toLowerCase();
            const filterVal = document.getElementById('filterStatus').value;
            let list = await fetchApplications();

            if (searchVal) {
                list = list.filter(a =>
                    a.gameId.toLowerCase().includes(searchVal) ||
                    a.qq.includes(searchVal) ||
                    (a.group_nickname && a.group_nickname.toLowerCase().includes(searchVal))
                );
            }
            if (filterVal !== 'all') {
                list = list.filter(a => a.status === filterVal);
            }
            list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const tbody = document.getElementById('adminTableBody');
            if (list.length === 0) {
                tbody.innerHTML = `<tr class="empty-row"><td colspan="13">📭 暂无申请记录</td></tr>`;
                document.getElementById('rowCount').textContent = '0';
                updateStats(list);
                return;
            }

            let html = '';
            list.forEach((a, idx) => {
                const statusMap = {
                    pending: '<span class="status-badge pending">⏳ 待审核</span>',
                    approved: '<span class="status-badge approved">✅ 已通过</span>',
                    rejected: '<span class="status-badge rejected">❌ 已拒绝</span>',
                };
                const ageDisplay = a.age || '-';
                const reasonDisplay = a.reason.length > 18 ? a.reason.slice(0, 18) + '…' : a.reason;
                const verifiedBadge = a.qq_verified
                    ? '<span style="color:#4caf50;">✅ 已验证</span>'
                    : '<span style="color:#ff9800;">⏳ 未验证</span>';

                const versionDisplay = a.version || '-';
                const isOriginalDisplay = a.is_original === null ? '不适用' : (a.is_original ? '✅ 是' : '❌ 否');
                const hasMultipleDisplay = a.has_multiple_accounts ? '✅ 是' : '❌ 否';

                html += `
                    <tr data-id="${a.id}">
                        <td>${idx + 1}</td>
                        <td><strong>${a.gameId}</strong></td>
                        <td>${a.qq}</td>
                        <td>${a.group_nickname || '-'}</td>
                        <td>${versionDisplay}</td>
                        <td>${isOriginalDisplay}</td>
                        <td>${hasMultipleDisplay}</td>
                        <td>${ageDisplay}</td>
                        <td title="${a.reason}">${reasonDisplay}</td>
                        <td style="font-size:13px; color:#8888aa;">${new Date(a.created_at).toLocaleString('zh-CN')}</td>
                        <td>${statusMap[a.status] || statusMap.pending}</td>
                        <td>${verifiedBadge}</td>
                        <td>
                            <div class="action-group">
                                ${!a.qq_verified ? `<button class="verify-btn" data-id="${a.id}" data-action="verify">标记验证</button>` : ''}
                                ${a.status !== 'approved' ? `<button class="approve-btn" data-id="${a.id}" data-action="approve">通过</button>` : ''}
                                ${a.status !== 'rejected' ? `<button class="reject-btn" data-id="${a.id}" data-action="reject">拒绝</button>` : ''}
                                <button class="delete-btn" data-id="${a.id}" data-action="delete">删除</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
            document.getElementById('rowCount').textContent = list.length;

            tbody.querySelectorAll('.approve-btn, .reject-btn, .delete-btn, .verify-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    const action = this.dataset.action;
                    handleAdminAction(id, action);
                });
            });

            updateStats(list);
        }

        async function handleAdminAction(id, action) {
            if (!isAdminLoggedIn) {
                showToast('请先登录管理员账号', 'error');
                return;
            }
            if (action === 'verify') {
                await markQQVerified(id);
                renderAdminTable();
                return;
            }
            if (action === 'approve') {
                await updateApplicationStatus(id, 'approved');
            } else if (action === 'reject') {
                await updateApplicationStatus(id, 'rejected');
            } else if (action === 'delete') {
                if (!confirm('确定要删除该申请记录吗？')) return;
                await deleteApplication(id);
            }
            renderAdminTable();
        }

        function updateStats(list) {
            if (!list) {
                fetchApplications().then(all => {
                    const total = all.length;
                    const pending = all.filter(a => a.status === 'pending').length;
                    const approved = all.filter(a => a.status === 'approved').length;
                    const rejected = all.filter(a => a.status === 'rejected').length;
                    document.getElementById('statTotal').textContent = total;
                    document.getElementById('statPending').textContent = pending;
                    document.getElementById('statApproved').textContent = approved;
                    document.getElementById('statRejected').textContent = rejected;
                });
                return;
            }
            const total = list.length;
            const pending = list.filter(a => a.status === 'pending').length;
            const approved = list.filter(a => a.status === 'approved').length;
            const rejected = list.filter(a => a.status === 'rejected').length;
            document.getElementById('statTotal').textContent = total;
            document.getElementById('statPending').textContent = pending;
            document.getElementById('statApproved').textContent = approved;
            document.getElementById('statRejected').textContent = rejected;
        }

        // 搜索/过滤/重置
        document.getElementById('searchInput').addEventListener('input', renderAdminTable);
        document.getElementById('filterStatus').addEventListener('change', renderAdminTable);
        document.getElementById('clearFilterBtn').addEventListener('click', function() {
            document.getElementById('searchInput').value = '';
            document.getElementById('filterStatus').value = 'all';
            renderAdminTable();
            showToast('已重置筛选条件', 'info');
        });

        checkAdminSession();
    }

    console.log(`✅ 当前页面: ${currentPage}，已初始化对应功能。`);
})();