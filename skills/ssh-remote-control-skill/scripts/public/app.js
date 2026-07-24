document.addEventListener('DOMContentLoaded', () => {
  let state = {
    curSSH: '',
    list: [],
    configPath: '',
  };

  // DOM Elements
  const currentConnDetails = document.getElementById('currentConnDetails');
  const currentStatusBadge = document.getElementById('currentStatusBadge');
  const connGrid = document.getElementById('connGrid');
  const connCount = document.getElementById('connCount');
  const searchInput = document.getElementById('searchInput');
  const configPathDisplay = document.getElementById('configPathDisplay');

  // Modal & Form Elements
  const connModal = document.getElementById('connModal');
  const modalTitle = document.getElementById('modalTitle');
  const connForm = document.getElementById('connForm');
  const originalName = document.getElementById('originalName');
  const inputName = document.getElementById('inputName');
  const inputHost = document.getElementById('inputHost');
  const inputPort = document.getElementById('inputPort');
  const inputUsername = document.getElementById('inputUsername');
  const passwordFields = document.getElementById('passwordFields');
  const privateKeyFields = document.getElementById('privateKeyFields');
  const inputPassword = document.getElementById('inputPassword');
  const inputPrivateKey = document.getElementById('inputPrivateKey');
  const inputPassphrase = document.getElementById('inputPassphrase');

  // Buttons
  const btnNewConn = document.getElementById('btnNewConn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnTestDraft = document.getElementById('btnTestDraft');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const togglePassphraseBtn = document.getElementById('togglePassphraseBtn');

  // Toast container
  const toastContainer = document.getElementById('toastContainer');

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Auth Type Radio handling
  const authRadioBtns = document.querySelectorAll('input[name="authType"]');
  authRadioBtns.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'password') {
        passwordFields.classList.remove('hidden');
        privateKeyFields.classList.add('hidden');
      } else {
        passwordFields.classList.add('hidden');
        privateKeyFields.classList.remove('hidden');
      }
    });
  });

  // Password visibility toggles
  togglePasswordBtn.addEventListener('click', () => {
    inputPassword.type = inputPassword.type === 'password' ? 'text' : 'password';
  });

  togglePassphraseBtn.addEventListener('click', () => {
    inputPassphrase.type = inputPassphrase.type === 'password' ? 'text' : 'password';
  });

  // API Calls
  async function loadData() {
    try {
      const res = await fetch('/api/connections');
      const json = await res.json();
      if (json.success) {
        state.curSSH = json.data.curSSH || '';
        state.list = json.data.list || [];
        state.configPath = json.data.configPath || '';
        configPathDisplay.textContent = state.configPath || '~/.ssh-remote-control-skill/ssh_config.json';
        render();
      } else {
        showToast(json.error || '获取连接配置列表失败', 'error');
      }
    } catch (err) {
      showToast('无法连接服务端 API', 'error');
    }
  }

  function render() {
    renderCurrentConn();
    renderGrid();
  }

  function renderCurrentConn() {
    const current = state.list.find((item) => item.name === state.curSSH);
    if (current) {
      currentStatusBadge.className = 'status-badge active';
      currentStatusBadge.textContent = '当前激活';
      currentConnDetails.innerHTML = `
        <div class="current-info-box">
          <div class="current-info-left">
            <div>
              <div class="current-name">${escapeHtml(current.name)}</div>
              <div class="current-address">${escapeHtml(current.username)}@${escapeHtml(current.host)}:${current.port || 22}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="testConnection('${escapeHtml(current.name)}')">
            ⚡ 测试连接
          </button>
        </div>
      `;
    } else {
      currentStatusBadge.className = 'status-badge inactive';
      currentStatusBadge.textContent = '未选择';
      currentConnDetails.innerHTML = `<div class="empty-current">暂未配置或未选择默认 SSH 连接，请从下方列表选择或新建</div>`;
    }
  }

  function renderGrid() {
    const filter = (searchInput.value || '').trim().toLowerCase();
    const filteredList = state.list.filter((conn) => {
      if (!filter) return true;
      return (
        (conn.name && conn.name.toLowerCase().includes(filter)) ||
        (conn.host && conn.host.toLowerCase().includes(filter)) ||
        (conn.username && conn.username.toLowerCase().includes(filter))
      );
    });

    connCount.textContent = state.list.length;

    if (filteredList.length === 0) {
      connGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 3rem 0;">
          ${state.list.length === 0 ? '暂无保存的连接配置，点击右上角"新增 SSH 连接"开始添加' : '没有找到匹配的连接配置'}
        </div>
      `;
      return;
    }

    connGrid.innerHTML = filteredList
      .map((conn) => {
        const isCurrent = conn.name === state.curSSH;
        const authTypeLabel = conn.privateKey ? '🔑 私钥认证' : '🔒 密码认证';

        return `
          <div class="conn-card ${isCurrent ? 'is-current' : ''}">
            <div class="card-top">
              <div>
                <div class="conn-title">${escapeHtml(conn.name)}</div>
                <div class="conn-address">${escapeHtml(conn.username)}@${escapeHtml(conn.host)}:${conn.port || 22}</div>
              </div>
              ${isCurrent ? '<span class="status-badge active">当前默认</span>' : ''}
            </div>

            <div class="conn-meta">
              <span class="meta-tag">${authTypeLabel}</span>
            </div>

            <div class="card-actions">
              ${
                !isCurrent
                  ? `<button class="btn btn-secondary btn-sm" onclick="setCurrent('${escapeHtml(conn.name)}')">设为当前</button>`
                  : `<button class="btn btn-tertiary btn-sm" disabled>当前默认</button>`
              }
              <div class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="testConnection('${escapeHtml(conn.name)}')">测试</button>
                <button class="btn btn-secondary btn-sm" onclick="editConnection('${escapeHtml(conn.name)}')">编辑</button>
                <button class="btn btn-tertiary btn-sm" style="color: var(--accent-red);" onclick="deleteConnection('${escapeHtml(conn.name)}')">删除</button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Filter input event
  searchInput.addEventListener('input', renderGrid);

  // Modal Open/Close
  function openModal(conn = null) {
    connForm.reset();
    if (conn) {
      modalTitle.textContent = '编辑 SSH 连接';
      originalName.value = conn.name;
      inputName.value = conn.name;
      inputHost.value = conn.host;
      inputPort.value = conn.port || 22;
      inputUsername.value = conn.username;

      if (conn.privateKey) {
        document.querySelector('input[name="authType"][value="privateKey"]').checked = true;
        passwordFields.classList.add('hidden');
        privateKeyFields.classList.remove('hidden');
        inputPrivateKey.value = conn.privateKey;
        inputPassphrase.value = conn.passphrase || '';
      } else {
        document.querySelector('input[name="authType"][value="password"]').checked = true;
        passwordFields.classList.remove('hidden');
        privateKeyFields.classList.add('hidden');
        inputPassword.value = conn.password || '';
      }
    } else {
      modalTitle.textContent = '新增 SSH 连接';
      originalName.value = '';
      document.querySelector('input[name="authType"][value="password"]').checked = true;
      passwordFields.classList.remove('hidden');
      privateKeyFields.classList.add('hidden');
      inputPort.value = 22;
    }
    connModal.classList.remove('hidden');
  }

  function closeModal() {
    connModal.classList.add('hidden');
  }

  btnNewConn.addEventListener('click', () => openModal());
  modalCloseBtn.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  // Global Actions attached to window for inline onclick attributes
  window.setCurrent = async function (name) {
    try {
      const res = await fetch('/api/connections/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`已成功将 "${name}" 设置为当前连接`, 'success');
        await loadData();
      } else {
        showToast(json.error || '切换连接失败', 'error');
      }
    } catch (err) {
      showToast('网络请求失败', 'error');
    }
  };

  window.editConnection = function (name) {
    const conn = state.list.find((item) => item.name === name);
    if (conn) openModal(conn);
  };

  window.deleteConnection = async function (name) {
    if (!confirm(`确定要删除 SSH 连接配置 "${name}" 吗？`)) return;
    try {
      const res = await fetch(`/api/connections/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast(`连接 "${name}" 已成功删除`, 'success');
        await loadData();
      } else {
        showToast(json.error || '删除连接失败', 'error');
      }
    } catch (err) {
      showToast('网络请求失败', 'error');
    }
  };

  window.testConnection = async function (name) {
    showToast(`正在测试与 "${name}" 的 SSH 认证...`, 'info');
    try {
      const res = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`⚡ SSH 连接认证成功！(${name})`, 'success');
      } else {
        showToast(`❌ 连接失败: ${json.error}`, 'error');
      }
    } catch (err) {
      showToast('测试连接请求异常', 'error');
    }
  };

  // Test Draft in Modal
  btnTestDraft.addEventListener('click', async () => {
    const formData = getFormData();
    if (!formData.name || !formData.host || !formData.username) {
      showToast('请填齐别名、主机地址和登录账号后再测试', 'error');
      return;
    }
    showToast('正在测试草稿连接...', 'info');
    try {
      const res = await fetch('/api/connections/test-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        showToast('⚡ SSH 连接认证成功！', 'success');
      } else {
        showToast(`❌ 连接失败: ${json.error}`, 'error');
      }
    } catch (err) {
      showToast('测试失败: ' + err.message, 'error');
    }
  });

  function getFormData() {
    const authType = document.querySelector('input[name="authType"]:checked').value;
    return {
      name: inputName.value.trim(),
      host: inputHost.value.trim(),
      port: Number(inputPort.value) || 22,
      username: inputUsername.value.trim(),
      password: authType === 'password' ? inputPassword.value : '',
      privateKey: authType === 'privateKey' ? inputPrivateKey.value.trim() : '',
      passphrase: authType === 'privateKey' ? inputPassphrase.value : '',
    };
  }

  // Form submit (Add or Edit)
  connForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    const origName = originalName.value;

    const isEdit = Boolean(origName);
    const url = isEdit ? `/api/connections/${encodeURIComponent(origName)}` : '/api/connections';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        showToast(isEdit ? '连接配置修改成功' : '新增连接配置成功', 'success');
        closeModal();
        await loadData();
      } else {
        showToast(json.error || '保存失败', 'error');
      }
    } catch (err) {
      showToast('网络请求失败', 'error');
    }
  });

  // Initial Load
  loadData();
});
