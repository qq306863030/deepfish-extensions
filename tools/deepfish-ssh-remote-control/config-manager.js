const {
  safeConnection, readConfig, writeConfig, ensureConfigFile, ensureInitialized,
  getCurrentConnection, addConnectionInteractively, setCurrentInteractively, CONFIG_FILE,
} = require('./normal');

// ==================== 导出主函数 ====================

async function addConnection() {
  try {
    const added = await addConnectionInteractively();
    return { success: true, data: { added, confirmed: true, message: '连接已添加成功并保存到配置文件，无需再次向用户确认。' } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function setCurrentInteractive() {
  try {
    const current = await setCurrentInteractively();
    return { success: true, data: { current } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function listConnections() {
  try {
    const config = readConfig();
    return { success: true, data: { curSSH: config.curSSH, list: config.list.map(safeConnection) } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deleteConnection({ name } = {}) {
  try {
    name = String(name || '').trim();
    if (!name) throw new Error('删除连接需要提供 name');
    const config = readConfig();
    const before = config.list.length;
    config.list = config.list.filter((item) => item.name !== name);
    if (config.list.length === before) throw new Error('指定连接不存在');
    if (config.curSSH === name) config.curSSH = config.list[0] ? config.list[0].name : '';
    writeConfig(config);
    return { success: true, data: { deleted: name, curSSH: config.curSSH } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function switchConnection({ name } = {}) {
  try {
    name = String(name || '').trim();
    if (!name) throw new Error('切换连接需要提供 name');
    const config = readConfig();
    const target = config.list.find((item) => item.name === name);
    if (!target) throw new Error('指定连接不存在');
    config.curSSH = target.name;
    writeConfig(config);
    return { success: true, data: { current: safeConnection(target) } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getConfigPath() {
  ensureConfigFile();
  return { success: true, data: { configPath: CONFIG_FILE } };
}

// ==================== 描述 ====================

const addConnectionDescription = {
  type: 'function',
  function: {
    name: 'addConnection',
    description: '在本地终端交互式新增一个 SSH 连接并自动保存到配置文件。返回 success=true 即视为已成功保存，无需再向用户二次确认。无需任何参数。',
    parameters: { type: 'object', properties: {} },
  },
};

const setCurrentInteractiveDescription = {
  type: 'function',
  function: {
    name: 'setCurrentInteractive',
    description: '在本地终端交互式设置当前活跃的 SSH 连接。无需任何参数。',
    parameters: { type: 'object', properties: {} },
  },
};

const listConnectionsDescription = {
  type: 'function',
  function: {
    name: 'listConnections',
    description: '返回所有已保存的 SSH 连接列表和当前 curSSH。无需任何参数。',
    parameters: { type: 'object', properties: {} },
  },
};

const deleteConnectionDescription = {
  type: 'function',
  function: {
    name: 'deleteConnection',
    description: '根据 name 删除指定的 SSH 连接配置。若删除的是当前连接，会自动切换到列表中第一个连接。',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: '要删除的连接别名。' } },
      required: ['name'],
    },
  },
};

const switchConnectionDescription = {
  type: 'function',
  function: {
    name: 'switchConnection',
    description: '根据 name 切换当前活跃的 SSH 连接。',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: '要切换到的连接别名。' } },
      required: ['name'],
    },
  },
};

const getConfigPathDescription = {
  type: 'function',
  function: {
    name: 'getConfigPath',
    description: '返回本地 SSH 配置文件的绝对路径。无需任何参数。',
    parameters: { type: 'object', properties: {} },
  },
};

module.exports = {
  addConnection,
  setCurrentInteractive,
  listConnections,
  deleteConnection,
  switchConnection,
  getConfigPath,
  addConnectionDescription,
  setCurrentInteractiveDescription,
  listConnectionsDescription,
  deleteConnectionDescription,
  switchConnectionDescription,
  getConfigPathDescription,
};
