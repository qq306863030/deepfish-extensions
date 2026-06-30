English | [中文](./README_CN.md)

# Hot Monitor - AI Hotspot Monitoring & Report Generation

A multi-source hotspot monitoring system designed for tracking hot topics and technology trends in AI, tech, and internet fields. Generates structured Markdown reports to help users quickly grasp industry dynamics.

## Features

- **Multi-source Data Collection**: Bing, HackerNews, GitHub Trending, Sogou, Bilibili
- **Intelligent Heat Scoring**: Multi-dimensional calculation based on likes, retweets, comments
- **Automated Report Generation**: Outputs standard Markdown format reports

## Quick Start

### Installation

```bash
# 1. Install deepfish-ai globally
npm install deepfish-ai -g

# 2. Install this skill
ai skills add hot-monitor
ai skills ls
ai skills enable hot-monitor
```

### Usage

```bash
# Generate today's hotspot report
ai 生成今日热点报告

# Or in English
ai generate today's hotspot report
```

## Available Scripts

| Script | Function | Data Sources |
|--------|----------|--------------|
| `search_web.py` | Web search | Bing, Google, DuckDuckGo, HackerNews |
| `search_china.py` | China search | Sogou, Bilibili, Weibo |
| `search_github.py` | GitHub search | GitHub Search API |
| `search_twitter.py` | Twitter search | Twitter/X API |
| `generate_report.py` | Report generation | - |

## Report Structure

The generated report includes:

- 🌍 International Tech Hotspots
- 🇨🇳 Domestic Tech Hotspots  
- 🐙 GitHub Trending Projects
- 📊 Hot Topic Keywords
- 🔮 Industry Insights

## API Limits

- **GitHub API**: 60 requests/hour without authentication
- **Twitter/X**: Requires `TWITTER_API_KEY` environment variable
- **China sources (Sogou/Bilibili/Weibo)**: No authentication required

## License

MIT
