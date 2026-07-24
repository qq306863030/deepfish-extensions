const path = require('path');
const { exec } = require('child_process');
const express = require('express');

function createServer(helpers) {
  const {
    readConfig,
    writeConfig,
    validateConnection,
    testConnection,
    describeSshError,
    CONFIG_FILE,
    safeConnection,
    decrypt,
  } = helpers;

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // GET /api/connections
  app.get('/api/connections', (req, res) => {
    try {
      const config = readConfig();
      const listForClient = config.list.map((conn) => {
        const item = { ...conn };
        if (item.password && item._encrypted) {
          item.password = decrypt(item.password);
        }
        return item;
      });
      res.json({
        success: true,
        data: {
          curSSH: config.curSSH,
          list: listForClient,
          configPath: CONFIG_FILE,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/connections (Add)
  app.post('/api/connections', (req, res) => {
    try {
      const config = readConfig();
      const conn = validateConnection(req.body, config.list);
      config.list.push(conn);
      if (!config.curSSH || config.list.length === 1) {
        config.curSSH = conn.name;
      }
      writeConfig(config);
      res.json({ success: true, data: { added: safeConnection(conn), curSSH: config.curSSH } });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // PUT /api/connections/:name (Update)
  app.put('/api/connections/:name', (req, res) => {
    try {
      const originalName = req.params.name;
      const config = readConfig();
      const index = config.list.findIndex((item) => item.name === originalName);
      if (index === -1) {
        return res.status(404).json({ success: false, error: `未找到名称为 "${originalName}" 的连接` });
      }
      const updated = validateConnection(req.body, config.list, originalName);
      config.list[index] = updated;
      if (config.curSSH === originalName) {
        config.curSSH = updated.name;
      }
      writeConfig(config);
      res.json({ success: true, data: { updated: safeConnection(updated), curSSH: config.curSSH } });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/connections/:name
  app.delete('/api/connections/:name', (req, res) => {
    try {
      const name = req.params.name;
      const config = readConfig();
      const before = config.list.length;
      config.list = config.list.filter((item) => item.name !== name);
      if (config.list.length === before) {
        return res.status(404).json({ success: false, error: `连接 "${name}" 不存在` });
      }
      if (config.curSSH === name) {
        config.curSSH = config.list[0] ? config.list[0].name : '';
      }
      writeConfig(config);
      res.json({ success: true, data: { deleted: name, curSSH: config.curSSH } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/connections/current (Set active connection)
  app.post('/api/connections/current', (req, res) => {
    try {
      const { name } = req.body;
      const config = readConfig();
      const target = config.list.find((item) => item.name === name);
      if (!target) {
        return res.status(404).json({ success: false, error: `连接 "${name}" 不存在` });
      }
      config.curSSH = target.name;
      writeConfig(config);
      res.json({ success: true, data: { current: safeConnection(target) } });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /api/connections/test (Test saved connection)
  app.post('/api/connections/test', async (req, res) => {
    let target = null;
    try {
      const { name } = req.body;
      const config = readConfig();
      target = config.list.find((item) => item.name === name);
      if (!target) {
        return res.status(404).json({ success: false, error: `连接 "${name}" 不存在` });
      }
      await testConnection(target);
      res.json({ success: true, data: { message: 'SSH 认证成功' } });
    } catch (err) {
      res.json({ success: false, error: describeSshError(err, target) });
    }
  });

  // POST /api/connections/test-draft (Test unsaved connection)
  app.post('/api/connections/test-draft', async (req, res) => {
    let draft = null;
    try {
      draft = validateConnection(req.body, [], req.body.name);
      await testConnection(draft);
      res.json({ success: true, data: { message: 'SSH 认证成功' } });
    } catch (err) {
      res.json({ success: false, error: describeSshError(err, draft) });
    }
  });

  return app;
}

function openBrowserUrl(url) {
  const platform = process.platform;
  let command = '';
  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }
  exec(command, (err) => {
    if (err) {
      console.error(`无法自动打开浏览器，请手动在浏览器访问: ${url}`);
    }
  });
}

function startServer(helpers, port = 11889, shouldOpenBrowser = true) {
  return new Promise((resolve, reject) => {
    const app = createServer(helpers);
    const server = app
      .listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(`\n==================================================`);
        console.log(`🚀 SSH 管理页面服务已启动: ${url}`);
        console.log(`==================================================\n`);
        if (shouldOpenBrowser) {
          openBrowserUrl(url);
        }
        resolve({ server, url, port });
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ 端口 ${port} 已在运行，正自动为您打开浏览器: http://localhost:${port}`);
          if (shouldOpenBrowser) {
            openBrowserUrl(`http://localhost:${port}`);
          }
          resolve({ server: null, url: `http://localhost:${port}`, port });
        } else {
          reject(err);
        }
      });
  });
}

module.exports = { createServer, startServer, openBrowserUrl };
