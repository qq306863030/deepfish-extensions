中文 | [English](./README.md)

# Hot Monitor - AI热点监控与报告生成

一款多源热点监控系统，专为追踪AI、技术、互联网领域的热门动态而设计。生成结构化Markdown报告，帮助用户快速掌握行业动态。

## 核心功能

- **多源数据采集**：Bing、HackerNews、GitHub Trending、Sogou、Bilibili
- **智能热度评分**：基于点赞、转发、评论等多维度计算
- **自动化报告生成**：输出标准Markdown格式报告

## 快速开始

### 安装

```bash
# 1. 全局安装 deepfish-ai
npm install deepfish-ai -g

# 2. 安装当前项目
ai skills add hot-monitor
ai skills ls
ai skills enable hot-monitor
```

### 使用

```bash
# 生成今日热点报告
ai 生成今日热点报告
```

## 可用脚本

| 脚本 | 功能 | 数据源 |
|------|------|--------|
| `search_web.py` | 网页搜索 | Bing, Google, DuckDuckGo, HackerNews |
| `search_china.py` | 国内搜索 | Sogou, Bilibili, 微博 |
| `search_github.py` | GitHub搜索 | GitHub Search API |
| `search_twitter.py` | Twitter搜索 | Twitter/X API |
| `generate_report.py` | 报告生成 | - |

## 报告结构

生成的报告包含：

- 🌍 国际科技热点
- 🇨🇳 国内科技热点
- 🐙 GitHub Trending热门项目
- 📊 热点关键词云
- 🔮 行业观点摘要

## API限制

- **GitHub API**：无认证60请求/小时
- **Twitter/X**：需要设置 `TWITTER_API_KEY` 环境变量
- **中国源（Sogou/Bilibili/微博）**：无需认证

## 许可证

MIT
