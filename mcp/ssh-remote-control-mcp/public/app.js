const state = {
  connections: [],
  currentConnection: null,
  configPath: '',
  isEditing: false,
};

const elements = {
  connGrid: document.getElementById('connGrid'),
  currentConnDetails: document.getElementById('currentConnDetails'),
  currentStatusBadge: document.getElementById('currentStatusBadge'),
  connCount: document.getElementById('connCount'),
  configPathDisplay: document.getElementById('configPathDisplay'),
  searchInput: document.getElementById('searchInput'),
  btnNewConn: document.getElementById('btnNewConn'),
  connModal: document.getElementById('connModal'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  btnCancelModal: document.getElementById('btnCancelModal'),
  connForm: document.getElementById('connForm'),
  modalTitle: document.getElementById('modalTitle'),
  originalName: document.getElementById('originalName'),
  inputName: document.getElementById('inputName'),
  inputHost: document.getElementById('inputHost'),
  inputPort: document.getElementById('inputPort'),
  inputUsername: document.getElementById('inputUsername'),
  inputPassword: document.getElementById('inputPassword'),
  inputPrivateKey: document.getElementById('inputPrivateKey'),
  inputPassphrase: document.getElementById('inputPassphrase'),
  inputContent: document.getElementById('inputContent'),
  passwordFields: document.getElementById('passwordFields'),
  privateKeyFields: document.getElementById('privateKeyFields'),
  btnTestDraft: document.getElementById('btnTestDraft'),
  contentEditWrap: document.getElementById('contentEditWrap'),
  contentPreviewWrap: document.getElementById('contentPreviewWrap'),
  btnContentEdit: document.getElementById('btnContentEdit'),
  btnContentPreview: document.getElementById('btnContentPreview'),
  previewModal: document.getElementById('previewModal'),
  previewModalTitle: document.getElementById('previewModalTitle'),
  previewModalBody: document.getElementById('previewModalBody'),
  previewModalCloseBtn: document.getElementById('previewModalCloseBtn'),
  previewModalCloseFooterBtn: document.getElementById('previewModalCloseFooterBtn'),
  toastContainer: document.getElementById('toastContainer'),
  togglePasswordBtn: document.getElementById('togglePasswordBtn'),
  togglePassphraseBtn: document.getElementById('togglePassphraseBtn'),
  serverPort: document.getElementById('serverPort'),
  uploadForm: document.getElementById('uploadForm'),
  downloadForm: document.getElementById('downloadForm'),
  uploadLocalPath: document.getElementById('uploadLocalPath'),
  uploadRemotePath: document.getElementById('uploadRemotePath'),
  uploadOverwrite: document.getElementById('uploadOverwrite'),
  downloadRemotePath: document.getElementById('downloadRemotePath'),
  downloadLocalPath: document.getElementById('downloadLocalPath'),
  downloadOverwrite: document.getElementById('downloadOverwrite'),
  transferTasks: document.getElementById('transferTasks'),
};

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function openModal() {
  elements.connModal.classList.remove('hidden');
}

function closeModal() {
  elements.connModal.classList.add('hidden');
  elements.connForm.reset();
  elements.originalName.value = '';
  elements.inputPort.value = '22';
  state.isEditing = false;
  document.querySelectorAll('input[name="authType"]').forEach((radio) => {
    radio.checked = radio.value === 'password';
  });
  switchAuthType('password');
  elements.contentPreviewWrap.classList.add('hidden');
  elements.contentEditWrap.classList.remove('hidden');
  elements.btnContentPreview.classList.remove('active');
  elements.btnContentEdit.classList.add('active');
  elements.inputContent.value = '';
}

function switchAuthType(type) {
  if (type === 'privateKey') {
    elements.passwordFields.classList.add('hidden');
    elements.privateKeyFields.classList.remove('hidden');
  } else {
    elements.passwordFields.classList.remove('hidden');
    elements.privateKeyFields.classList.add('hidden');
  }
}

function renderCurrentConnection() {
  if (!state.currentConnection) {
    elements.currentStatusBadge.textContent = '未设置';
    elements.currentStatusBadge.className = 'status-badge inactive';
    elements.currentConnDetails.innerHTML = '<div class="empty-current">暂未配置或未选择当前 SSH 连接</div>';
    return;
  }

  const conn = state.currentConnection;
  elements.currentStatusBadge.textContent = '已设置';
  elements.currentStatusBadge.className = 'status-badge active';
  elements.currentConnDetails.innerHTML = `
    <div class="current-info-box">
      <div class="current-info-left">
        <div>
          <div class="current-name">${conn.name}</div>
          <div class="current-address">${conn.username}@${conn.host}:${conn.port}</div>
        </div>
      </div>
      <div class="action-btns">
        <button class="btn btn-secondary btn-sm" data-action="set-current" data-name="${conn.name}">切换</button>
      </div>
    </div>
  `;
}

function renderConnections(filter = '') {
  const query = filter.trim().toLowerCase();
  const list = state.connections.filter((conn) => {
    if (!query) return true;
    return [conn.name, conn.host, conn.username, conn.content || '']
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  elements.connCount.textContent = list.length;
  if (!list.length) {
    elements.connGrid.innerHTML = '<div class="empty-current">没有找到匹配的连接配置</div>';
    return;
  }

  elements.connGrid.innerHTML = list.map((conn) => `
    <div class="conn-card ${state.currentConnection && state.currentConnection.name === conn.name ? 'is-current' : ''}">
      <div class="card-top">
        <div>
          <div class="conn-title">${conn.name}</div>
          <div class="conn-address">${conn.username}@${conn.host}:${conn.port}</div>
          <div class="conn-meta">
            <span class="meta-tag">${conn.password ? 'Password' : 'Key'}</span>
            <span class="meta-tag">${conn.port}</span>
          </div>
        </div>
      </div>
      <div class="card-actions">
        <div class="action-btns">
          <button class="btn btn-secondary btn-sm" data-action="set-current" data-name="${conn.name}">设为当前</button>
          <button class="btn btn-secondary btn-sm" data-action="preview" data-name="${conn.name}">预览</button>
          <button class="btn btn-secondary btn-sm" data-action="edit" data-name="${conn.name}">编辑</button>
          <button class="btn btn-secondary btn-sm" data-action="test" data-name="${conn.name}">测试</button>
        </div>
        <button class="btn btn-tertiary btn-sm" data-action="delete" data-name="${conn.name}">删除</button>
      </div>
    </div>
  `).join('');
}

async function loadData() {
  try {
    const res = await fetch('/api/status');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load data');
    state.connections = json.connections || [];
    state.currentConnection = json.currentConnection || null;
    state.configPath = json.configPath || '';
    elements.configPathDisplay.textContent = state.configPath;
    renderCurrentConnection();
    renderConnections(elements.searchInput.value);
  } catch (err) {
    showToast('加载配置失败: ' + err.message, 'error');
  }
}

async function saveConnection(data, origName = '') {
  const url = origName ? `/api/connections/${encodeURIComponent(origName)}` : '/api/connections';
  const method = origName ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '保存失败');
  return json;
}

async function deleteConnection(name) {
  const res = await fetch(`/api/connections/${encodeURIComponent(name)}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '删除失败');
  return json;
}

async function setCurrentConnection(name) {
  const res = await fetch(`/api/current/${encodeURIComponent(name)}`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '设置当前连接失败');
  return json;
}

async function testConnection(name) {
  const res = await fetch(`/api/connections/${encodeURIComponent(name)}/test`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '测试失败');
  return json;
}

function fillForm(conn) {
  elements.originalName.value = conn.name;
  elements.inputName.value = conn.name;
  elements.inputHost.value = conn.host;
  elements.inputPort.value = conn.port;
  elements.inputUsername.value = conn.username;
  elements.inputPassword.value = conn.password || '';
  elements.inputPrivateKey.value = conn.privateKey || '';
  elements.inputPassphrase.value = conn.passphrase || '';
  elements.inputContent.value = conn.content || '';
  const authType = conn.privateKey ? 'privateKey' : 'password';
  document.querySelectorAll('input[name="authType"]').forEach((radio) => {
    radio.checked = radio.value === authType;
  });
  switchAuthType(authType);
  elements.modalTitle.textContent = '编辑 SSH 连接';
  state.isEditing = true;
  openModal();
}

function getFormData() {
  const authType = document.querySelector('input[name="authType"]:checked').value;
  return {
    name: elements.inputName.value.trim(),
    host: elements.inputHost.value.trim(),
    port: Number(elements.inputPort.value) || 22,
    username: elements.inputUsername.value.trim(),
    password: authType === 'password' ? elements.inputPassword.value : '',
    privateKey: authType === 'privateKey' ? elements.inputPrivateKey.value.trim() : '',
    passphrase: authType === 'privateKey' ? elements.inputPassphrase.value : '',
    content: elements.inputContent.value,
  };
}

function showMarkdownPreview() {
  const content = elements.inputContent.value || '暂无内容';
  elements.previewModalBody.innerHTML = marked.parse(content);
  elements.previewModalTitle.textContent = '服务器备注说明';
  elements.previewModal.classList.remove('hidden');
}

function togglePreviewMode(showPreview) {
  elements.contentEditWrap.classList.toggle('hidden', showPreview);
  elements.contentPreviewWrap.classList.toggle('hidden', !showPreview);
  elements.btnContentEdit.classList.toggle('active', !showPreview);
  elements.btnContentPreview.classList.toggle('active', showPreview);
  if (showPreview) {
    elements.contentPreviewWrap.innerHTML = marked.parse(elements.inputContent.value || '');
  }
}

function attachEvents() {
  elements.btnNewConn.addEventListener('click', () => {
    elements.modalTitle.textContent = '新增 SSH 连接';
    state.isEditing = false;
    openModal();
  });

  elements.modalCloseBtn.addEventListener('click', closeModal);
  elements.btnCancelModal.addEventListener('click', closeModal);
  elements.previewModalCloseBtn.addEventListener('click', () => elements.previewModal.classList.add('hidden'));
  elements.previewModalCloseFooterBtn.addEventListener('click', () => elements.previewModal.classList.add('hidden'));

  document.querySelectorAll('input[name="authType"]').forEach((radio) => {
    radio.addEventListener('change', () => switchAuthType(radio.value));
  });

  elements.btnContentEdit.addEventListener('click', () => togglePreviewMode(false));
  elements.btnContentPreview.addEventListener('click', () => togglePreviewMode(true));
  elements.togglePasswordBtn.addEventListener('click', () => {
    elements.inputPassword.type = elements.inputPassword.type === 'password' ? 'text' : 'password';
  });
  elements.togglePassphraseBtn.addEventListener('click', () => {
    elements.inputPassphrase.type = elements.inputPassphrase.type === 'password' ? 'text' : 'password';
  });

  elements.connGrid.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.getAttribute('data-action');
    const name = button.getAttribute('data-name');

    try {
      if (action === 'set-current') {
        await setCurrentConnection(name);
        showToast('已设置为当前连接', 'success');
        await loadData();
      } else if (action === 'preview') {
        const conn = state.connections.find((item) => item.name === name);
        if (conn) {
          elements.previewModalBody.innerHTML = marked.parse(conn.content || '暂无内容');
          elements.previewModalTitle.textContent = `服务器备注说明 - ${conn.name}`;
          elements.previewModal.classList.remove('hidden');
        }
      } else if (action === 'edit') {
        const conn = state.connections.find((item) => item.name === name);
        if (conn) fillForm(conn);
      } else if (action === 'test') {
        await testConnection(name);
        showToast('连接测试成功', 'success');
      } else if (action === 'delete') {
        if (!confirm(`确定删除连接 ${name} 吗？`)) return;
        await deleteConnection(name);
        showToast('连接已删除', 'success');
        await loadData();
      }
    } catch (err) {
      showToast(err.message || '操作失败', 'error');
    }
  });

  elements.connForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = getFormData();
    const origName = elements.originalName.value;

    try {
      await saveConnection(data, origName);
      showToast(origName ? '连接配置已更新' : '连接配置已新增', 'success');
      closeModal();
      await loadData();
    } catch (err) {
      showToast(err.message || '保存失败', 'error');
    }
  });

  elements.btnTestDraft.addEventListener('click', async () => {
    try {
      const data = getFormData();
      const res = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '测试失败');
      showToast('测试成功', 'success');
    } catch (err) {
      showToast(err.message || '测试失败', 'error');
    }
  });

  elements.searchInput.addEventListener('input', (event) => {
    renderConnections(event.target.value);
  });
}

attachEvents();
loadData();

// ---------- 文件传输：实时进度 + 断点续传 ----------

const transferPoller = new Map(); // taskId -> intervalId

const TRANSFER_STATUS_TEXT = {
  running: '传输中',
  done: '已完成',
  error: '失败',
  cancelled: '已取消',
};

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  return `${formatBytes(bytesPerSec)}/s`;
}

function ensureTaskElement(task) {
  let el = document.getElementById(`task-${task.id}`);
  if (!el) {
    el = document.createElement('div');
    el.id = `task-${task.id}`;
    el.className = 'transfer-task';
    el.innerHTML = `
      <div class="task-head">
        <div class="task-title">
          <span class="task-type-icon">${task.type === 'upload' ? '⬆' : '⬇'}</span>
          <span class="task-name"></span>
          <span class="task-status-badge running">传输中</span>
        </div>
        <button type="button" class="btn-cancel-task" data-task-id="${task.id}" title="取消任务">✕</button>
      </div>
      <div class="task-progress">
        <div class="progress-track"><div class="progress-fill"></div></div>
      </div>
      <div class="task-meta">
        <span class="task-percent">0%</span>
        <span class="task-size"></span>
        <span class="task-speed"></span>
      </div>
      <div class="task-message"></div>
    `;
    elements.transferTasks.prepend(el);
  }
  return el;
}

// 更新同一个任务元素（不新增行），实时刷新进度条
function renderTransferTask(task) {
  const el = ensureTaskElement(task);
  const statusText = TRANSFER_STATUS_TEXT[task.status] || task.status;
  const badge = el.querySelector('.task-status-badge');
  badge.textContent = statusText;
  badge.className = `task-status-badge ${task.status}`;

  el.querySelector('.task-name').textContent = `${task.localPath} → ${task.remotePath}`;

  const fill = el.querySelector('.progress-fill');
  const percent = el.querySelector('.task-percent');
  const size = el.querySelector('.task-size');
  const speed = el.querySelector('.task-speed');
  const message = el.querySelector('.task-message');
  const cancelBtn = el.querySelector('.btn-cancel-task');

  const pct = task.percent || 0;
  fill.style.width = `${pct}%`;
  fill.classList.toggle('error', task.status === 'error');
  percent.textContent = `${pct}%`;
  size.textContent = task.total > 0 ? `${formatBytes(task.transferred || 0)} / ${formatBytes(task.total)}` : '';
  speed.textContent = formatSpeed(task.speed);

  if (task.status === 'done') {
    message.textContent = task.message || '传输完成';
    message.classList.remove('error');
    message.classList.add('success');
    cancelBtn.classList.add('hidden');
  } else if (task.status === 'error' || task.status === 'cancelled') {
    message.textContent = task.error || task.message || '';
    message.classList.remove('success');
    message.classList.add('error');
    cancelBtn.classList.add('hidden');
  } else {
    message.textContent = '';
    cancelBtn.classList.remove('hidden');
  }
}

async function pollTransferTask(taskId) {
  try {
    const res = await fetch(`/api/transfer/tasks/${taskId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '查询任务失败');
    renderTransferTask(json.task);
    if (['done', 'error', 'cancelled'].includes(json.task.status)) {
      stopPolling(taskId);
    }
  } catch (err) {
    // 任务可能已被服务端清理，停止轮询
    stopPolling(taskId);
  }
}

function startPolling(taskId) {
  if (transferPoller.has(taskId)) return;
  transferPoller.set(taskId, setInterval(() => pollTransferTask(taskId), 500));
}

function stopPolling(taskId) {
  const iv = transferPoller.get(taskId);
  if (iv) {
    clearInterval(iv);
    transferPoller.delete(taskId);
  }
}

async function startTransfer(type, payload) {
  try {
    const res = await fetch(`/api/transfer/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '启动传输失败');
    renderTransferTask({
      id: json.taskId,
      type,
      localPath: payload.localPath,
      remotePath: payload.remotePath,
      status: 'running',
      percent: 0,
      total: 0,
      transferred: 0,
      speed: 0,
    });
    startPolling(json.taskId);
  } catch (err) {
    showToast(err.message || '启动传输失败', 'error');
  }
}

function attachTransferEvents() {
  elements.uploadForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const localPath = elements.uploadLocalPath.value.trim();
    const remotePath = elements.uploadRemotePath.value.trim();
    if (!localPath || !remotePath) {
      showToast('请填写本地路径与远程路径', 'error');
      return;
    }
    startTransfer('upload', { localPath, remotePath, overwrite: elements.uploadOverwrite.checked });
  });

  elements.downloadForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const remotePath = elements.downloadRemotePath.value.trim();
    const localPath = elements.downloadLocalPath.value.trim();
    if (!remotePath || !localPath) {
      showToast('请填写远程路径与本地路径', 'error');
      return;
    }
    startTransfer('download', { localPath, remotePath, overwrite: elements.downloadOverwrite.checked });
  });

  elements.transferTasks.addEventListener('click', async (event) => {
    const btn = event.target.closest('.btn-cancel-task');
    if (!btn) return;
    const taskId = btn.getAttribute('data-task-id');
    try {
      const res = await fetch(`/api/transfer/cancel/${taskId}`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '取消失败');
      showToast('已发送取消请求', 'info');
      renderTransferTask(json.task);
      await pollTransferTask(taskId);
    } catch (err) {
      showToast(err.message || '取消失败', 'error');
    }
  });
}

async function loadTransferTasks() {
  try {
    const res = await fetch('/api/transfer/tasks');
    const json = await res.json();
    if (!json.success) return;
    json.tasks.forEach((task) => {
      renderTransferTask(task);
      if (task.status === 'running') startPolling(task.id);
    });
  } catch (err) {
    // 服务端未启动或暂无任务，忽略
  }
}

attachTransferEvents();
loadTransferTasks();
