---
name: "hot-monitor"
description: "AI热点监控与报告生成工具。支持多数据源采集（Bing、HackerNews、GitHub Trending、Sogou、Bilibili），生成结构化Markdown报告和JSON数据输出。"
homepage: "https://github.com/qq306863030/deepfish-extensions/tree/master/skills/hot-monitor
---

# Hot Monitor - AI热点监控与报告生成

## 功能边界

**数据采集范围**：
- 国际平台：Bing搜索、HackerNews
- 开源社区：GitHub Trending/Explore/Topics/Collections
- 国内平台：Sogou搜索、Bilibili

## 执行说明
- **推荐模式**：`--mode all` 或 `--mode trending`（无API限制）
- **Bing搜索**：使用英文关键词可获得更好的AI/科技新闻
- **多数据源**：需分开执行，使用 `--sources xxx` 格式
- **输出重定向**：数据输出到stdout，状态消息到stderr
- **scripts脚本目录**：scripts脚本目录在SKILL目录下，执行前请使用该目录


## 执行规范（必须严格遵守）
- **报告最终输出内容**：1.热点标题、GitHub项目名称等重要信息必须使用Markdown链接格式，链接指向原始数据源URL 2.GitHub Trending模块按日增⭐从高到低排序
- **执行策略**：1.每个模块创建一个子Agent执行查询命令（查询命令执行时间不超过20000ms），并将结果写入临时文件tmp_xxx_report.md或tmp_xxx_report.json
  2.合并生成最终报告,未指定文件名称时使用 `report.md`作为默认输出文件名
  3.完成后删除临时文件

## 快速开始

### GitHub热点监控（推荐）

```bash
# 综合热点获取（无API限制）
python scripts/search_github.py --mode all --limit 100

# 近3天日增Stars最多（推荐）
python scripts/search_github.py --mode trending --limit 50 | sort_by_stars

# 单日/周/月Trending
python scripts/search_github.py --mode trending --since daily
python scripts/search_github.py --mode weekly-monthly

# 多语言Trending
python scripts/search_github.py --mode multi-lang --languages python typescript rust go

# Explore Topics
python scripts/search_github.py --mode explore

# API搜索（60次/小时限制）
python scripts/search_github.py --mode api "machine learning" --days 30
```

### 其他数据源

```bash
# Bing/HackerNews
python scripts/search_web.py "AI" --sources bing --limit 10
python scripts/search_web.py "AI" --sources hackernews --limit 20

# 国内热点
python scripts/search_china.py "AI" --limit 15
```

### 报告生成

```bash
# 生成Markdown报告
cat results.json | python scripts/generate_report.py --keyword "AI" > report.md

# 输出JSON格式
python scripts/generate_report.py --keyword "AI" --file results.json --format json
```

## GitHub热点监控

### 模式说明

| 模式 | 说明 | API限制 |
|------|------|---------|
| `all` | 多渠道综合热点聚合 | 无 |
| `trending` | 单日Trending | 无 |
| `multi-lang` | 多语言Trending | 无 |
| `weekly-monthly` | 周/月Trending | 无 |
| `explore` | Explore Topics列表 | 无 |
| `collections` | Collections列表 | 无 |
| `search` | 搜索页面结果 | 无 |
| `api` | GitHub API搜索 | 60次/小时 |

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--mode, -m` | 数据获取模式 | all |
| `--limit` | 最大返回结果数 | 50 |
| `--language, -l` | 单语言过滤 | - |
| `--languages` | 多语言列表 | python, typescript, rust, go, javascript |
| `--since` | Trending时间范围 | daily/weekly/monthly |
| `--days` | API搜索时间范围（天） | 7 |
| `--min-stars` | 最小Star数 | 10 |

### 日增排序查询

查询近3天日增Stars最多的项目：

```bash
# 获取Trending数据
python scripts/search_github.py --mode trending --limit 100

# 获取多语言Trending并排序
python scripts/search_github.py --mode multi-lang --languages python typescript rust --limit 50
```

### 支持的语言

python, typescript, javascript, rust, go, java, c++, c, csharp, swift, kotlin, ruby, php, scala, dart, r, all

### JSON输出字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 仓库名称 |
| `full_name` | string | 完整名称（owner/name） |
| `description` | string | 项目描述 |
| `url` | string | GitHub链接 |
| `stars` | integer | Star总数 |
| `forks` | integer | Fork数 |
| `today_stars` | integer | 今日新增Star |
| `daily_stars` | float | 日均增长 |
| `language` | string | 编程语言 |
| `topics` | array | Topics标签 |
| `trending_period` | string | daily/weekly/monthly |

## 其他数据源

### 数据采集命令

| 脚本 | 功能 | 示例 |
|------|------|------|
| `search_web.py` | 网页搜索 | `--sources bing,hackernews` |
| `search_china.py` | 国内热点 | Sogou、Bilibili |
| `search_twitter.py` | Twitter采集 | 需配置API Key |

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--limit` | 最大结果数 | 20 |
| `--days` | 时间范围（天） | 7 |
| `--sources` | 数据源类型 | 必填 |
| `--format` | 输出格式（json/markdown） | markdown |
| `--output, -o` | 输出文件 | stdout |

## 报告输出规范

### 报告格式

```markdown
# [📰 今日热点报告 | {日期}](https://github.com/trending)

> 生成时间：{时间}  
> 数据来源：Bing · HackerNews · GitHub Trending · Sogou · Bilibili

## 🌍 国际科技热点

### AI 与大模型

| 标题 | 来源 | 摘要 |
|------|------|------|

### HackerNews 技术热点

| 标题 | 分数 | 评论 |
|------|------|------|

## 🇨🇳 国内科技热点

| 标题 | 来源 | 摘要 |
|------|------|------|

## 🐙 GitHub Trending 热门项目

### 近3天日增Stars最多

| 排名 | 项目 | ⭐ Stars | 日增 | 语言 | 简介 |
|------|------|----------|------|------|------|

### 单日Trending

| 排名 | 项目 | ⭐ Stars | 日增 | 语言 | 简介 |
|------|------|----------|------|------|------|

### 周/月Trending

| 排名 | 项目 | ⭐ Stars | 日增 | 语言 | 简介 |
|------|------|----------|------|------|------|

### 综合热点

| 排名 | 项目 | ⭐ Stars | 日增 | 语言 | 简介 |
|------|------|----------|------|------|------|

## 📊 热点关键词

关键词1 | 关键词2 | 关键词3

*报告生成工具：hot-monitor | 数据获取时间：{时间}*
```

## 脚本说明

| 脚本 | 功能 |
|------|------|
| `search_github.py` | GitHub热门项目采集（网页抓取，无API限制） |
| `search_web.py` | Bing/Google/DuckDuckGo/HackerNews搜索 |
| `search_china.py` | Sogou/Bilibili/微博热点 |
| `search_twitter.py` | Twitter/X内容采集 |
| `generate_report.py` | 结构化报告生成 |

## 环境配置

### 系统要求

- Python 3.8+
- Node.js 18+（可选）

### 依赖安装

```bash
pip install requests beautifulsoup4
```

### API限制

| 数据源 | 限制 | 说明 |
|--------|------|------|
| GitHub（网页抓取） | 无 | 推荐 |
| GitHub API | 60/小时 | 需认证可提升 |
| Twitter/X | 需配置 | `TWITTER_API_KEY` |
| 其他源 | 无 | - |

