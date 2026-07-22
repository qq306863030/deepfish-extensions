const Client = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'config.js');

// 辅助函数：获取远程文件列表
async function getRemoteFileList(sftp, remotePath, recursive = true) {
  const files = [];
  
  const traverse = async (currentPath) => {
    const list = await sftp.list(currentPath);
    
    for (const item of list) {
      const fullPath = `${currentPath}/${item.name}`;
      
      if (item.type === 'd' && recursive) {
        // 如果是目录且需要递归，则继续遍历
        await traverse(fullPath);
      } else if (item.type === '-' || item.type === 'l') {
        // 如果是文件或符号链接，添加到文件列表
        files.push({
          path: fullPath,
          name: item.name,
          size: item.size,
          modifyTime: item.modifyTime
        });
      }
    }
  };
  
  await traverse(remotePath);
  return files;
}

// 辅助函数：获取本地文件列表（递归）
function getLocalFileList(localPath, recursive = true) {
  const files = [];
  
  const traverse = (currentPath) => {
    let list;
    try {
      list = fs.readdirSync(currentPath);
    } catch (err) {
      return;
    }
    
    for (const name of list) {
      const fullPath = path.join(currentPath, name);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (err) {
        continue;
      }
      
      if (stat.isDirectory() && recursive) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        files.push({
          path: fullPath,
          name: name,
          size: stat.size,
          relativePath: path.relative(localPath, fullPath)
        });
      }
    }
  };
  
  traverse(localPath);
  return files;
}

// 读取配置文件
function readConfigs() {
  let configs = [];
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      // 使用 require 加载配置文件，支持注释
      // 注意：需要先清除 require 缓存以确保获取最新内容
      delete require.cache[require.resolve(CONFIG_FILE)];
      configs = require(CONFIG_FILE);
      
      // 确保 configs 是数组
      if (!Array.isArray(configs)) {
        console.error('配置文件格式错误: 必须导出数组');
        configs = [];
      }
    } catch (error) {
      console.error('读取配置文件失败:', error.message);
      // 如果 require 失败，尝试使用 JSON.parse 作为备选方案
      try {
        const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
        // 移除可能的注释和 module.exports 包装
        let jsonStr = fileContent
          .replace(/\/\/.*$/gm, '') // 移除行注释
          .replace(/\/\*[\s\S]*?\*\//g, '') // 移除块注释
          .trim();
        
        if (jsonStr.includes('module.exports')) {
          const match = jsonStr.match(/module\.exports\s*=\s*(\[.*\]);/s);
          if (match) {
            jsonStr = match[1];
          }
        }
        
        configs = JSON.parse(jsonStr);
      } catch (jsonError) {
        console.error('JSON 解析也失败:', jsonError.message);
        // 创建备份文件
        try {
          const backupFile = CONFIG_FILE + '.bak';
          fs.writeFileSync(backupFile, fs.readFileSync(CONFIG_FILE, 'utf8'), 'utf8');
          console.log(`配置文件已备份到: ${backupFile}`);
          // 删除损坏的配置文件
          fs.unlinkSync(CONFIG_FILE);
          console.log('已删除损坏的配置文件，请重新添加配置');
        } catch (e) {
          // 忽略备份错误
        }
      }
    }
  }
  return configs;
}
// 保存配置文件
function saveConfigs(configs) {
  const configContent = `module.exports = ${JSON.stringify(configs, null, 2)};`;
  fs.writeFileSync(CONFIG_FILE, configContent, 'utf8');
}

// 配置管理函数
async function manageConfig(action = 'select', configName = '') {
  let configs = readConfigs();
  
  if (action === 'list') {
    return configs;
  }
  
  if (action === 'add') {
    // 交互式添加配置
    const answers = await this.aiCli.Tools.inquirerAny([
      {
        type: 'input',
        name: 'name',
        message: '请输入配置名称:',
        default: configName || `config_${Date.now()}`
      },
      {
        type: 'input',
        name: 'host',
        message: '请输入SFTP服务器主机地址:',
        validate: input => input.trim() ? true : '主机地址不能为空'
      },
      {
        type: 'number',
        name: 'port',
        message: '请输入SFTP服务器端口:',
        default: 22
      },
      {
        type: 'input',
        name: 'username',
        message: '请输入用户名:',
        validate: input => input.trim() ? true : '用户名不能为空'
      },
      {
        type: 'password',
        name: 'password',
        message: '请输入密码 (输入将隐藏):',
        default: ''
      },
      {
        type: 'confirm',
        name: 'usePrivateKey',
        message: '是否使用私钥认证?',
        default: false
      }
    ]);
    
    let privateKey = '';
    let passphrase = '';
    
    if (answers.usePrivateKey) {
      const keyAnswers = await this.aiCli.Tools.inquirerAny([
        {
          type: 'input',
          name: 'privateKey',
          message: '请输入私钥文件路径:',
          default: ''
        },
        {
          type: 'confirm',
          name: 'usePassphrase',
          message: '私钥是否有密码?',
          default: false
        }
      ]);
      
      privateKey = keyAnswers.privateKey;
      
      if (keyAnswers.usePassphrase) {
        const passphraseAnswer = await this.aiCli.Tools.inquirerAny([
          {
            type: 'password',
            name: 'passphrase',
            message: '请输入私钥密码:',
            default: ''
          }
        ]);
        passphrase = passphraseAnswer.passphrase;
      }
    }
    
    const newConfig = {
      id: Date.now().toString(),
      name: answers.name,
      host: answers.host,
      port: answers.port,
      username: answers.username,
      password: answers.password,
      privateKey,
      passphrase,
      createdAt: new Date().toISOString()
    };
    
    configs.push(newConfig);
    saveConfigs(configs);
    
    console.log(`配置 "${answers.name}" 已保存到 ${CONFIG_FILE}`);
    return newConfig;
  }
  
  if (action === 'select') {
    if (configs.length === 0) {
      console.log('没有找到任何配置，请先添加配置。');
      const addNow = await this.aiCli.Tools.inquirerAny([
        {
          type: 'confirm',
          name: 'addNow',
          message: '是否立即添加配置?',
          default: true
        }
      ]);
      
      if (addNow.addNow) {
        return await manageConfig.call(this, 'add');
      } else {
        return null;
      }
    }
    
    if (configs.length === 1) {
      console.log(`使用唯一配置: ${configs[0].name} (${configs[0].host}:${configs[0].port})`);
      return configs[0];
    }
    
    // 让用户选择配置
    const choices = configs.map((config, index) => ({
      name: `${config.name} - ${config.host}:${config.port} (用户: ${config.username})`,
      value: config.id,
      short: config.name
    }));
    
    const answer = await this.aiCli.Tools.inquirerAny([
      {
        type: 'list',
        name: 'selectedId',
        message: '请选择SFTP服务器配置:',
        choices,
        default: 0
      }
    ]);
    
    const selectedConfig = configs.find(config => config.id === answer.selectedId);
    return selectedConfig;
  }
  
  return configs;
}

// 交互式获取下载参数
async function getDownloadParams(config = null) {
  let host, port, username, password, privateKey, passphrase;
  
  if (config) {
    host = config.host;
    port = config.port;
    username = config.username;
    password = config.password;
    privateKey = config.privateKey || '';
    passphrase = config.passphrase || '';
    
    console.log(`使用配置: ${config.name} (${host}:${port})`);
  } else {
    // 如果没有配置，询问连接信息
    const connectionAnswers = await this.aiCli.Tools.inquirerAny([
      {
        type: 'input',
        name: 'host',
        message: '请输入SFTP服务器主机地址:',
        validate: input => input.trim() ? true : '主机地址不能为空'
      },
      {
        type: 'number',
        name: 'port',
        message: '请输入SFTP服务器端口:',
        default: 22
      },
      {
        type: 'input',
        name: 'username',
        message: '请输入用户名:',
        validate: input => input.trim() ? true : '用户名不能为空'
      },
      {
        type: 'password',
        name: 'password',
        message: '请输入密码 (输入将隐藏):',
        default: ''
      },
      {
        type: 'confirm',
        name: 'usePrivateKey',
        message: '是否使用私钥认证?',
        default: false
      }
    ]);
    
    host = connectionAnswers.host;
    port = connectionAnswers.port;
    username = connectionAnswers.username;
    password = connectionAnswers.password;
    privateKey = '';
    passphrase = '';
    
    if (connectionAnswers.usePrivateKey) {
      const keyAnswers = await this.aiCli.Tools.inquirerAny([
        {
          type: 'input',
          name: 'privateKey',
          message: '请输入私钥文件路径:',
          default: ''
        },
        {
          type: 'confirm',
          name: 'usePassphrase',
          message: '私钥是否有密码?',
          default: false
        }
      ]);
      
      privateKey = keyAnswers.privateKey;
      
      if (keyAnswers.usePassphrase) {
        const passphraseAnswer = await this.aiCli.Tools.inquirerAny([
          {
            type: 'password',
            name: 'passphrase',
            message: '请输入私钥密码:',
            default: ''
          }
        ]);
        passphrase = passphraseAnswer.passphrase;
      }
    }
  }
  
  // 询问下载路径
  const downloadAnswers = await this.aiCli.Tools.inquirerAny([
    {
      type: 'input',
      name: 'remotePath',
      message: '请输入远程文件或目录路径:',
      default: '/'
    },
    {
      type: 'input',
      name: 'localPath',
      message: '请输入本地保存路径:',
      default: './download'
    },
    {
      type: 'confirm',
      name: 'recursive',
      message: '是否递归下载目录?',
      default: true
    },
    {
      type: 'number',
      name: 'concurrency',
      message: '请输入并发下载数量:',
      default: 5
    }
  ]);
  
  return {
    host,
    port,
    username,
    password,
    privateKey,
    passphrase,
    remotePath: downloadAnswers.remotePath,
    localPath: downloadAnswers.localPath,
    recursive: downloadAnswers.recursive,
    concurrency: downloadAnswers.concurrency
  };
}

// 智能下载函数：如果缺少必要参数，则通过交互式获取
async function smartDownload(params = {}) {
  const {
    host,
    port = 22,
    username,
    password = '',
    remotePath,
    localPath,
    privateKey = '',
    passphrase = '',
    recursive = true,
    concurrency = 5,
    useConfig = true
  } = params;
  
  // 检查是否缺少必要参数
  const missingRequiredParams = [];
  if (!host) missingRequiredParams.push('host');
  if (!username) missingRequiredParams.push('username');
  if (!remotePath) missingRequiredParams.push('remotePath');
  if (!localPath) missingRequiredParams.push('localPath');
  
  // 如果所有必要参数都提供，直接下载
  if (missingRequiredParams.length === 0) {
    return await this.sftpDownload_downloadFiles(
      host, port, username, password, remotePath, localPath,
      privateKey, passphrase, recursive, concurrency
    );
  }
  
  // 如果缺少参数，进入交互式模式
  console.log('缺少必要参数，进入交互式模式...');
  
  let config = null;
  if (useConfig) {
    config = await manageConfig.call(this, 'select');
  }
  
  const interactiveParams = await getDownloadParams.call(this, config);
  
  // 使用交互式获取的参数，覆盖传入的参数
  const finalParams = {
    host: host || interactiveParams.host,
    port: port || interactiveParams.port,
    username: username || interactiveParams.username,
    password: password || interactiveParams.password,
    remotePath: remotePath || interactiveParams.remotePath,
    localPath: localPath || interactiveParams.localPath,
    privateKey: privateKey || interactiveParams.privateKey,
    passphrase: passphrase || interactiveParams.passphrase,
    recursive: recursive !== undefined ? recursive : interactiveParams.recursive,
    concurrency: concurrency || interactiveParams.concurrency
  };
  
  return await this.sftpDownload_downloadFiles(
    finalParams.host,
    finalParams.port,
    finalParams.username,
    finalParams.password,
    finalParams.remotePath,
    finalParams.localPath,
    finalParams.privateKey,
    finalParams.passphrase,
    finalParams.recursive,
    finalParams.concurrency
  );
}

const descriptions = [
  {
    name: 'sftpDownload_interactiveDownload',
    description: 'SFTP下载:从SFTP服务器下载文件或目录',
    parameters: {
      type: 'object',
      properties: {
        useConfig: { 
          type: 'boolean', 
          description: '是否使用已保存的配置',
          default: true
        }
      },
      required: []
    }
  },
  {
    name: 'sftpUpload_uploadFiles',
    description: 'SFTP上传:上传文件或目录到SFTP服务器',
    parameters: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'SFTP服务器主机地址' },
        port: { type: 'number', description: 'SFTP服务器端口', default: 22 },
        username: { type: 'string', description: 'SFTP服务器用户名' },
        password: { type: 'string', description: 'SFTP服务器密码' },
        localPath: { type: 'string', description: '本地文件或目录路径' },
        remotePath: { type: 'string', description: '远程目标路径' },
        privateKey: { type: 'string', description: '私钥路径' },
        passphrase: { type: 'string', description: '私钥密码' },
        recursive: { type: 'boolean', description: '是否递归上传目录', default: true },
        concurrency: { type: 'number', description: '并发上传数量', default: 5 }
      },
      required: ['host', 'username', 'localPath', 'remotePath']
    }
  }
];

const functions = {
  sftpDownload_downloadFiles: async function(host, port = 22, username, password, remotePath, localPath, privateKey = '', passphrase = '', recursive = true, concurrency = 5) {
    const sftp = new Client();
    let totalFiles = 0;
    let downloadedFiles = 0;
    let startTime = Date.now();
    
    try {
      // 连接SFTP服务器
      process.stdout.write('正在连接到SFTP服务器...\r');
      const connectOptions = {
        host,
        port,
        username,
        password
      };
      
      if (privateKey) {
        connectOptions.privateKey = privateKey;
        if (passphrase) {
          connectOptions.passphrase = passphrase;
        }
      }
      
      await sftp.connect(connectOptions);
      process.stdout.write('SFTP连接成功!\n');
      
      // 检查远程路径是否存在
      const remoteStats = await sftp.stat(remotePath);
      if (!remoteStats) {
        throw new Error(`远程路径不存在: ${remotePath}`);
      }
      
      // 如果是文件，直接下载
      if (remoteStats.isFile) {
        totalFiles = 1;
        process.stdout.write(`开始下载文件: ${remotePath}\n`);
        await sftp.fastGet(remotePath, localPath);
        downloadedFiles = 1;
        process.stdout.write(`下载完成: ${localPath}\n`);
      } 
      // 如果是目录，递归下载
      else if (remoteStats.isDirectory) {
        process.stdout.write(`正在扫描目录 ${remotePath}...\r`);
        
        // 递归获取所有文件列表
        const fileList = await getRemoteFileList(sftp, remotePath, recursive);
        totalFiles = fileList.length;
        
        if (totalFiles === 0) {
          process.stdout.write(`目录为空，没有文件可下载\n`);
          await sftp.end();
          return { success: true, message: '目录为空，没有文件可下载', files: 0 };
        }
        
        process.stdout.write(`找到 ${totalFiles} 个文件，开始下载...\n`);
        
        // 创建本地目录
        const fs = require('fs');
        const path = require('path');
        if (!fs.existsSync(localPath)) {
          fs.mkdirSync(localPath, { recursive: true });
        }
        
        // 并发下载控制
        const queue = [...fileList];
        const activeDownloads = new Set();
        const errors = [];
        
        const downloadNext = async () => {
          if (queue.length === 0) return;
          
          const file = queue.shift();
          const remoteFilePath = file.path;
          const relativePath = path.relative(remotePath, remoteFilePath);
          const localFilePath = path.join(localPath, relativePath);
          
          // 创建本地目录结构
          const localDir = path.dirname(localFilePath);
          if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
          }
          
          activeDownloads.add(remoteFilePath);
          
          try {
            await sftp.fastGet(remoteFilePath, localFilePath);
            downloadedFiles++;
            
            // 更新进度显示
            const progress = Math.round((downloadedFiles / totalFiles) * 100);
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const speed = elapsed > 0 ? (downloadedFiles / elapsed).toFixed(2) : 0;
            
            process.stdout.write(`进度: ${progress}% | 已下载: ${downloadedFiles}/${totalFiles} | 速度: ${speed} 文件/秒 | 当前: ${path.basename(remoteFilePath)}\r`);
          } catch (error) {
            errors.push({
              file: remoteFilePath,
              error: error.message
            });
            process.stdout.write(`下载失败: ${remoteFilePath} - ${error.message}\n`);
          } finally {
            activeDownloads.delete(remoteFilePath);
            
            // 继续下载下一个
            if (activeDownloads.size < concurrency) {
              await downloadNext();
            }
          }
        };
        
        // 启动初始并发下载
        const initialDownloads = Math.min(concurrency, totalFiles);
        const downloadPromises = [];
        for (let i = 0; i < initialDownloads; i++) {
          downloadPromises.push(downloadNext());
        }
        
        // 等待所有下载完成
        await Promise.all(downloadPromises);
        
        // 显示最终结果
        const elapsedTotal = Math.floor((Date.now() - startTime) / 1000);
        process.stdout.write(`\n下载完成! 总计: ${downloadedFiles}/${totalFiles} 个文件 | 耗时: ${elapsedTotal} 秒\n`);
        
        if (errors.length > 0) {
          process.stdout.write(`有 ${errors.length} 个文件下载失败\n`);
          errors.forEach(err => {
            process.stdout.write(`  - ${err.file}: ${err.error}\n`);
          });
        }
      }
      
      await sftp.end();
      return { 
        success: true, 
        totalFiles, 
        downloadedFiles,
        failedFiles: totalFiles - downloadedFiles,
        message: '下载完成'
      };
      
    } catch (error) {
      process.stdout.write(`\n错误: ${error.message}\n`);
      try {
        await sftp.end();
      } catch (e) {
        // 忽略关闭错误
      }
      return { 
        success: false, 
        error: error.message,
        message: '下载失败'
      };
    }
  },
  
  sftpUpload_uploadFiles: async function(host, port = 22, username, password, localPath, remotePath, privateKey = '', passphrase = '', recursive = true, concurrency = 5) {
    const sftp = new Client();
    let totalFiles = 0;
    let uploadedFiles = 0;
    let startTime = Date.now();
    
    try {
      // 连接SFTP服务器
      process.stdout.write('正在连接到SFTP服务器...\r');
      const connectOptions = {
        host,
        port,
        username,
        password
      };
      
      if (privateKey) {
        connectOptions.privateKey = privateKey;
        if (passphrase) {
          connectOptions.passphrase = passphrase;
        }
      }
      
      await sftp.connect(connectOptions);
      process.stdout.write('SFTP连接成功!\n');
      
      // 检查本地路径是否存在
      if (!fs.existsSync(localPath)) {
        throw new Error(`本地路径不存在: ${localPath}`);
      }
      
      const localStats = fs.statSync(localPath);
      
      // 如果是文件，直接上传
      if (localStats.isFile()) {
        totalFiles = 1;
        process.stdout.write(`开始上传文件: ${localPath}\n`);
        
        // 创建远程目录结构
        const remoteDir = path.posix.dirname(remotePath);
        await sftp.mkdir(remoteDir, { recursive: true }).catch(() => {});
        
        // 使用 step 回调显示文件级进度
        await sftp.fastPut(localPath, remotePath, {
          step: (totalTransferred, chunk, total) => {
            if (total <= 0) return;
            const percent = Math.round((totalTransferred / total) * 100);
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const speed = elapsed > 0 ? (totalTransferred / 1024 / elapsed).toFixed(2) : 0;
            const transferredMB = (totalTransferred / 1024 / 1024).toFixed(2);
            const totalMB = (total / 1024 / 1024).toFixed(2);
            process.stdout.write(`上传进度: ${percent}% | 已传输: ${transferredMB}MB/${totalMB}MB | 速度: ${speed} KB/s\r`);
          }
        });
        
        uploadedFiles = 1;
        const elapsedTotal = Math.floor((Date.now() - startTime) / 1000);
        process.stdout.write(`\n上传完成: ${remotePath} | 耗时: ${elapsedTotal} 秒\n`);
      } 
      // 如果是目录，递归上传
      else if (localStats.isDirectory()) {
        process.stdout.write(`正在扫描本地目录 ${localPath}...\r`);
        
        // 递归获取所有本地文件列表
        const fileList = getLocalFileList(localPath, recursive);
        totalFiles = fileList.length;
        
        if (totalFiles === 0) {
          process.stdout.write(`目录为空，没有文件可上传\n`);
          await sftp.end();
          return { success: true, message: '目录为空，没有文件可上传', files: 0 };
        }
        
        process.stdout.write(`找到 ${totalFiles} 个文件，开始上传...\n`);
        
        // 创建远程根目录
        await sftp.mkdir(remotePath, { recursive: true }).catch(() => {});
        
        // 并发上传控制
        const queue = [...fileList];
        const activeUploads = new Set();
        const errors = [];
        
        const uploadNext = async () => {
          if (queue.length === 0) return;
          
          const file = queue.shift();
          // 使用 posix 路径确保远程路径使用正斜杠
          const remoteFilePath = path.posix.join(remotePath, file.relativePath.replace(/\\/g, '/'));
          const remoteDir = path.posix.dirname(remoteFilePath);
          
          // 创建远程目录结构
          await sftp.mkdir(remoteDir, { recursive: true }).catch(() => {});
          
          activeUploads.add(file.path);
          
          try {
            await sftp.fastPut(file.path, remoteFilePath);
            uploadedFiles++;
            
            // 更新进度显示
            const progress = Math.round((uploadedFiles / totalFiles) * 100);
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const speed = elapsed > 0 ? (uploadedFiles / elapsed).toFixed(2) : 0;
            
            process.stdout.write(`进度: ${progress}% | 已上传: ${uploadedFiles}/${totalFiles} | 速度: ${speed} 文件/秒 | 当前: ${file.name}\r`);
          } catch (error) {
            errors.push({
              file: file.path,
              error: error.message
            });
            process.stdout.write(`上传失败: ${file.relativePath} - ${error.message}\n`);
          } finally {
            activeUploads.delete(file.path);
            
            // 继续上传下一个
            if (activeUploads.size < concurrency) {
              await uploadNext();
            }
          }
        };
        
        // 启动初始并发上传
        const initialUploads = Math.min(concurrency, totalFiles);
        const uploadPromises = [];
        for (let i = 0; i < initialUploads; i++) {
          uploadPromises.push(uploadNext());
        }
        
        // 等待所有上传完成
        await Promise.all(uploadPromises);
        
        // 显示最终结果
        const elapsedTotal = Math.floor((Date.now() - startTime) / 1000);
        process.stdout.write(`\n上传完成! 总计: ${uploadedFiles}/${totalFiles} 个文件 | 耗时: ${elapsedTotal} 秒\n`);
        
        if (errors.length > 0) {
          process.stdout.write(`有 ${errors.length} 个文件上传失败\n`);
          errors.forEach(err => {
            process.stdout.write(`  - ${err.file}: ${err.error}\n`);
          });
        }
      }
      
      await sftp.end();
      return { 
        success: true, 
        totalFiles, 
        uploadedFiles,
        failedFiles: totalFiles - uploadedFiles,
        message: '上传完成'
      };
      
    } catch (error) {
      process.stdout.write(`\n错误: ${error.message}\n`);
      try {
        await sftp.end();
      } catch (e) {
        // 忽略关闭错误
      }
      return { 
        success: false, 
        error: error.message,
        message: '上传失败'
      };
    }
  },
  
  sftpDownload_manageConfig: async function(action = 'select', configName = '') {
    return await manageConfig.call(this, action, configName);
  },
  
  sftpDownload_interactiveDownload: async function(useConfig = true) {
    
    let config = null;
    
    if (useConfig) {
      config = await manageConfig.call(this, 'select');
    }
    
    const params = await getDownloadParams.call(this, config);
    // 调用原始的下载函数
    return await this.sftpDownload_downloadFiles(
      params.host,
      params.port,
      params.username,
      params.password,
      params.remotePath,
      params.localPath,
      params.privateKey,
      params.passphrase,
      params.recursive,
      params.concurrency
    );
  },
  
  sftpDownload_smartDownload: async function(
    host = '', port = 22, username = '', password = '', 
    remotePath = '', localPath = '', privateKey = '', passphrase = '',
    recursive = true, concurrency = 5, useConfig = true
  ) {
    const params = {
      host, port, username, password, remotePath, localPath,
      privateKey, passphrase, recursive, concurrency, useConfig
    };
    
    return await smartDownload.call(this, params);
  }
};

module.exports = {
  name: 'sftpDownload',
  description: '提供SFTP文件下载和上传功能，支持从SFTP服务器下载文件和目录、上传文件/目录到SFTP服务器，并实时显示传输进度。支持配置管理和交互式操作。',
  descriptions,
  functions,
};