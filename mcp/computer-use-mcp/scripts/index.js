/**
 * 桌面自动化控制工具库
 * 
 * 提供截图、鼠标控制、键盘控制、窗口管理等功能
 */

const screenshot = require('./lib/screenshot');
const click = require('./lib/click');
const type = require('./lib/type');
const key = require('./lib/key');
const mouse = require('./lib/mouse');
const window = require('./lib/window');
const info = require('./lib/info');
const flow = require('./lib/flow');

module.exports = {
  // 截图功能
  screenshot: {
    execute: screenshot.execute.bind(screenshot)
  },
  
  // 鼠标点击
  click: {
    execute: click.execute.bind(click)
  },
  
  // 键盘输入
  type: {
    execute: type.execute.bind(type)
  },
  
  // 键盘按键
  key: {
    execute: key.execute.bind(key)
  },
  
  // 鼠标移动
  mouse: {
    moveTo: mouse.moveTo.bind(mouse)
  },
  
  // 窗口管理
  window: {
    execute: window.execute.bind(window)
  },
  
  // 系统信息
  info: {
    execute: info.execute.bind(info)
  },
  
  // 自动化流程
  flow: {
    execute: flow.execute.bind(flow)
  }
};