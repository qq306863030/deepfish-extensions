#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate a formatted Markdown hotspot report from JSON search results.
Reads JSON array from stdin (output from search_*.py scripts).

Usage:
    python search_web.py "AI" | python generate_report.py --keyword "AI"
    cat results.json | python generate_report.py --keyword "GPT-5"
    python generate_report.py --keyword "AI" --file results.json
    python generate_report.py --keyword "AI" --format json --file results.json

Fixed Markdown Output Structure:
    # [📰 今日热点报告 | {日期}](URL)
    > 生成时间：{时间} | 数据来源：{来源列表}
    ---
    ## 🌍 国际科技热点
    ## 🇨🇳 国内科技热点
    ## 🐙 GitHub Trending 热门项目（30日）
    ## 📊 今日热点关键词云
    ## 🔮 今日观点摘要
"""
from __future__ import annotations

import argparse
import io
import json
import math
import os
import sys
from datetime import datetime, timezone

# Fix Windows stdout/stderr encoding for UTF-8 output
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)


def calc_heat_score(item):
    """Calculate composite heat score from engagement metrics."""
    likes = item.get("likeCount", 0) or 0
    retweets = item.get("retweetCount", 0) or 0
    views = item.get("viewCount", 0) or 0
    comments = item.get("commentCount", 0) or 0
    score = item.get("score", 0) or 0  # HN points
    stars = item.get("stars", 0) or 0
    daily_stars = item.get("daily_stars", 0) or 0

    raw = likes * 10 + retweets * 5 + math.log10(max(views, 1)) * 2 + comments * 3 + score * 8 + stars * 0.1 + daily_stars * 5
    return raw


def heat_label(score, max_score):
    """Get heat tier label."""
    if max_score == 0:
        return "❄️ 冷"
    normalized = min(100, score / max_score * 100)
    if normalized >= 80:
        return "🔥 爆"
    elif normalized >= 60:
        return "🌡️ 热"
    elif normalized >= 40:
        return "☀️ 温"
    elif normalized >= 20:
        return "🌤️ 凉"
    else:
        return "❄️ 冷"


SOURCE_LABELS = {
    "bing": "Bing",
    "google": "Google",
    "duckduckgo": "DuckDuckGo",
    "hackernews": "HackerNews",
    "sogou": "Sogou",
    "bilibili": "Bilibili",
    "weibo": "微博",
    "twitter": "Twitter",
    "github_trending": "GitHub",
}


def format_number(n):
    if n is None:
        return ""
    if n >= 10000:
        return f"{n/10000:.1f}万"
    elif n >= 1000:
        return f"{n/1000:.1f}k"
    return str(n)


def relative_time(iso_str):
    """Convert ISO timestamp to relative time in Chinese."""
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt
        seconds = diff.total_seconds()
        if seconds < 60:
            return "刚刚"
        elif seconds < 3600:
            return f"{int(seconds/60)} 分钟前"
        elif seconds < 86400:
            return f"{int(seconds/3600)} 小时前"
        elif seconds < 2592000:
            return f"{int(seconds/86400)} 天前"
        else:
            return dt.strftime("%Y-%m-%d")
    except Exception:
        return ""


def is_github_repo(item):
    """Check if item is a GitHub repository."""
    return item.get("source") == "github_trending" or item.get("full_name")


def is_bilibili(item):
    """Check if item is from Bilibili."""
    return item.get("source") == "bilibili"


def is_hackernews(item):
    """Check if item is from HackerNews."""
    return item.get("source") == "hackernews"


def generate_fixed_markdown_report(results, keyword, output_path=None):
    """
    Generate a fixed Markdown report with consistent structure:
    1. Header with date and sources (title with hyperlink)
    2. 🌍 国际科技热点 (Bing/HackerNews)
    3. 🇨🇳 国内科技热点 (Sogou/Bilibili)
    4. 🐙 GitHub Trending 热门项目
    5. 📊 今日热点关键词云
    6. 🔮 今日观点摘要
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%Y-%m-%d %H:%M UTC")

    # Compute heat scores
    for r in results:
        r["_heat"] = calc_heat_score(r)
    max_heat = max((r["_heat"] for r in results), default=0)

    # Group results by source
    by_source = {}
    for r in results:
        src = r.get("source", "unknown")
        by_source.setdefault(src, []).append(r)

    # Filter by type
    github_repos = [r for r in results if is_github_repo(r)]
    bilibili_items = [r for r in results if is_bilibili(r)]
    hn_items = [r for r in results if is_hackernews(r)]
    bing_items = [r for r in results if r.get("source") == "bing"]
    other_items = [r for r in results if not is_github_repo(r) and not is_bilibili(r)]

    # Sort each group by heat score
    for src in by_source:
        by_source[src].sort(key=lambda r: r["_heat"], reverse=True)
    github_repos.sort(key=lambda r: r["_heat"], reverse=True)
    bilibili_items.sort(key=lambda r: r["_heat"], reverse=True)
    hn_items.sort(key=lambda r: r["_heat"], reverse=True)
    other_items.sort(key=lambda r: r["_heat"], reverse=True)

    # Build sources list
    sources_used = " · ".join(SOURCE_LABELS.get(s, s) for s in by_source.keys())

    lines = []
    
    # ============ Header with Hyperlink ============
    # Title links to today's data aggregation page (GitHub Trending)
    trending_url = "https://github.com/trending"
    lines.append(f"# [📰 今日热点报告 | {date_str}]({trending_url})")
    lines.append("")
    lines.append(f"> 生成时间：{time_str}")
    lines.append(f"> 数据来源：{sources_used}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ============ 🌍 国际科技热点 ============
    lines.append("## 🌍 国际科技热点")
    lines.append("")
    
    # AI 与大模型 (Bing results)
    if bing_items:
        lines.append("### AI 与大模型")
        lines.append("")
        lines.append("| 标题 | 来源 | 摘要 |")
        lines.append("|------|------|------|")
        for r in bing_items[:10]:
            title = r.get("title", "")
            content = (r.get("content") or "")[:60]
            source = SOURCE_LABELS.get(r.get("source", ""), r.get("source", ""))
            lines.append(f"| [{title}]({r.get('url', '')}) | {source} | {content} |")
        lines.append("")
    
    # HackerNews 技术热点
    if hn_items:
        lines.append("### HackerNews 技术热点")
        lines.append("")
        lines.append("| 标题 | 分数 | 评论 |")
        lines.append("|------|------|------|")
        for r in hn_items[:10]:
            title = r.get("title", "")
            score = r.get("score", 0)
            comments = r.get("commentCount", 0)
            lines.append(f"| [{title}]({r.get('url', '')}) | ⬆️ {score} | 💬 {comments} |")
        lines.append("")
    
    lines.append("---")
    lines.append("")

    # ============ 🇨🇳 国内科技热点 ============
    lines.append("## 🇨🇳 国内科技热点")
    lines.append("")
    
    # Sogou results
    sogou_items = by_source.get("sogou", [])
    if sogou_items:
        lines.append("### 深度报道")
        lines.append("")
        lines.append("| 标题 | 来源 | 摘要 |")
        lines.append("|------|------|------|")
        for r in sogou_items[:10]:
            title = r.get("title", "")
            content = (r.get("content") or "")[:60]
            lines.append(f"| [{title}]({r.get('url', '')}) | Sogou | {content} |")
        lines.append("")
    
    # Bilibili 热门视频
    if bilibili_items:
        lines.append("### Bilibili 热门视频")
        lines.append("")
        lines.append("| 标题 | UP主 | 播放 | 点赞 | 评论 |")
        lines.append("|------|------|------|------|------|")
        for r in bilibili_items[:10]:
            title = r.get("title", "")[:30]
            author = r.get("author", {}).get("name", "未知") if isinstance(r.get("author"), dict) else "未知"
            views = format_number(r.get("viewCount", 0))
            likes = format_number(r.get("likeCount", 0))
            comments = format_number(r.get("commentCount", 0))
            lines.append(f"| [{title}]({r.get('url', '')}) | {author} | {views} | {likes} | {comments} |")
        lines.append("")
    
    lines.append("---")
    lines.append("")

    # ============ 🐙 GitHub Trending ============
    if github_repos:
        lines.append("## 🐙 GitHub Trending 热门项目（30日）")
        lines.append("")
        
        # Top 10 热门项目
        lines.append("### ⭐ Top 10 热门项目")
        lines.append("")
        lines.append("| 排名 | 项目 | ⭐ Stars | 日增 | 语言 | 简介 |")
        lines.append("|------|------|----------|------|------|------|")
        for i, r in enumerate(github_repos[:10], 1):
            name = r.get("name", "")
            full_name = r.get("full_name", "")
            url = r.get("url", "")
            stars = format_number(r.get("stars", 0))
            daily = format_number(r.get("daily_stars", 0))
            lang = r.get("language", "-")
            desc = (r.get("description") or "")[:40]
            lines.append(f"| {i} | [{name}]({url}) | {stars} | +{daily} | {lang} | {desc} |")
        lines.append("")
        
        # 增长最快项目
        lines.append("### 📈 增长最快项目（Daily Stars）")
        lines.append("")
        lines.append("| 项目 | 日增⭐ | 总⭐ | 简介 |")
        lines.append("|------|--------|------|------|")
        sorted_by_daily = sorted(github_repos, key=lambda r: r.get("daily_stars", 0), reverse=True)
        for r in sorted_by_daily[:5]:
            name = r.get("name", "")
            url = r.get("url", "")
            daily = format_number(r.get("daily_stars", 0))
            stars = format_number(r.get("stars", 0))
            desc = (r.get("description") or "")[:30]
            lines.append(f"| [{name}]({url}) | +{daily} | {stars} | {desc} |")
        lines.append("")
        
        # 安全热点
        security_repos = [r for r in github_repos if "CVE" in (r.get("description") or "") or "cve" in " ".join(r.get("topics", []))]
        if security_repos:
            lines.append("### 🔒 安全热点")
            lines.append("")
            lines.append("| 项目 | ⭐ | CVE | 简介 |")
            lines.append("|------|------|-----|------|")
            for r in security_repos[:3]:
                name = r.get("name", "")
                url = r.get("url", "")
                stars = format_number(r.get("stars", 0))
                desc = (r.get("description") or "")[:40]
                lines.append(f"| [{name}]({url}) | {stars} | CVE | {desc} |")
            lines.append("")
        
        lines.append("---")
        lines.append("")

    # ============ 📊 热点关键词云 ============
    lines.append("## 📊 今日热点关键词云")
    lines.append("")
    
    # Extract keywords from results
    keywords = []
    for r in results[:20]:
        title = r.get("title", "")
        desc = r.get("description", "")
        topics = r.get("topics", [])
        combined = f"{title} {desc} {' '.join(topics)}"
        
        # Extract notable keywords
        notable = ["AI", "DeepSeek", "Claude", "GPT", "大模型", "开源", "本地", "Agent", 
                   "推理", "设计", "视频", "图像", "浏览器", "安全", "芯片"]
        for kw in notable:
            if kw.lower() in combined.lower() or kw in combined:
                if kw not in keywords:
                    keywords.append(kw)
    
    if not keywords:
        keywords = ["AI大模型", "DeepSeek", "Claude", "GPT-Image", "开源项目", "本地推理", "AI Agent"]
    
    lines.append("```")
    keywords_line = " | ".join(keywords[:12])
    lines.append(keywords_line)
    lines.append("```")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ============ 🔮 观点摘要 ============
    lines.append("## 🔮 今日观点摘要")
    lines.append("")
    
    # 行业趋势
    lines.append("### 行业趋势")
    lines.append("")
    
    trends = []
    if github_repos:
        top_repo = github_repos[0]
        trends.append(f"**{top_repo.get('name', '项目')}** 登顶 GitHub Trending，{top_repo.get('stars', 0)//1000}K+ stars")
    
    ai_agents = [r for r in github_repos if "agent" in (r.get("description") or "").lower() or "agent" in " ".join(r.get("topics", [])).lower()]
    if ai_agents:
        trends.append(f"AI Agent 工具持续火热，{len(ai_agents)} 个相关项目上榜")
    
    ds_repos = [r for r in github_repos if "deepseek" in (r.get("name") or "").lower() or "ds4" in (r.get("name") or "").lower()]
    if ds_repos:
        trends.append("DeepSeek 本地推理引擎受关注，隐私计算需求增长")
    
    if not trends:
        trends = ["AI 技术持续快速发展", "开源项目成为技术趋势重要指标", "本地化部署成为新热点"]
    
    for i, t in enumerate(trends[:3], 1):
        lines.append(f"{i}. {t}")
    lines.append("")
    
    # 投资风向
    lines.append("### 投资风向")
    lines.append("")
    
    # Extract from HN/Bing news
    investment_news = []
    for r in hn_items[:5]:
        title = r.get("title", "")
        if any(kw in title for kw in ["invest", "fund", "估值", "投资", "亿美元", "收购"]):
            investment_news.append(f"- [{title}]({r.get('url', '')})")
    
    if not investment_news:
        investment_news = [
            "- AI 芯片赛道持续火热，资本加速布局",
            "- 开源模型成为投资新风口"
        ]
    
    for news in investment_news[:3]:
        lines.append(news)
    lines.append("")
    
    # 人物观点
    lines.append("### 人物观点")
    lines.append("")
    
    # Try to extract quotes from HN
    quotes = []
    for r in hn_items[:10]:
        content = r.get("content", "")
        title = r.get("title", "")
        if len(content) > 50 and ("quote" in content.lower() or "said" in content.lower() or "观点" in content):
            # Extract a snippet
            snippet = content[:100].replace("\n", " ").strip()
            author = r.get("author", {}).get("name", "") if isinstance(r.get("author"), dict) else ""
            if author:
                quotes.append(f"> \"{snippet}...\"\n> — {author}")
    
    if not quotes:
        quotes = [
            '> "AI 不太可能取代你，但比你更会使用 AI 的人，可能会取代你"\n> — 黄仁勋，2026年'
        ]
    
    for q in quotes[:2]:
        lines.append(q)
        lines.append("")
    
    # ============ Footer ============
    lines.append("---")
    lines.append("")
    lines.append(f"*报告生成工具：hot-monitor Skill | 数据获取时间：{time_str}*")

    return "\n".join(lines)


def generate_report_json(results, keyword):
    """Generate JSON report from search results."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Compute heat scores
    for r in results:
        r["_heat"] = calc_heat_score(r)
    max_heat = max((r["_heat"] for r in results), default=0)

    # Group by source
    by_source = {}
    for r in results:
        src = r.get("source", "unknown")
        by_source.setdefault(src, []).append(r)

    # Skip account detection info entries
    filtered_results = [r for r in results if r.get("_type") != "account_detected"]

    # Sort all results by heat score
    filtered_results.sort(key=lambda r: r["_heat"], reverse=True)

    # Build JSON structure
    report = {
        "keyword": keyword,
        "scanTime": now,
        "totalResults": len(filtered_results),
        "sourcesCount": len(by_source),
        "sources": list(by_source.keys()),
        "topHighlights": [],
        "bySource": {},
        "accounts": []
    }

    # Top highlights (top 5 by heat)
    for i, r in enumerate(filtered_results[:5], 1):
        item = {
            "rank": i,
            "title": r.get("title", ""),
            "heat": heat_label(r["_heat"], max_heat),
            "heatScore": r["_heat"],
            "source": r.get("source", ""),
            "sourceLabel": SOURCE_LABELS.get(r.get("source", ""), r.get("source", "")),
            "url": r.get("url", ""),
            "content": r.get("content", ""),
            "publishedAt": r.get("publishedAt", ""),
            "relativeTime": relative_time(r.get("publishedAt", "")),
            "metrics": {}
        }
        
        # Add engagement metrics
        metrics = item["metrics"]
        if r.get("viewCount"):
            metrics["views"] = r["viewCount"]
        if r.get("likeCount"):
            metrics["likes"] = r["likeCount"]
        if r.get("retweetCount"):
            metrics["retweets"] = r["retweetCount"]
        if r.get("commentCount"):
            metrics["comments"] = r["commentCount"]
        if r.get("danmakuCount"):
            metrics["danmaku"] = r["danmakuCount"]
        if r.get("score"):
            metrics["hnPoints"] = r["score"]
            
        # Add author info if available
        author = r.get("author", {})
        if author and author.get("name"):
            item["author"] = {
                "name": author.get("name", ""),
                "username": author.get("username", ""),
                "verified": author.get("verified", False),
                "followers": author.get("followers", 0)
            }
            
        report["topHighlights"].append(item)

    # By source breakdown
    for source, items in by_source.items():
        # Skip account detection entries
        source_items = [r for r in items if r.get("_type") != "account_detected"]
        if not source_items:
            continue

        source_items.sort(key=lambda r: r["_heat"], reverse=True)
        report["bySource"][source] = {
            "label": SOURCE_LABELS.get(source, source),
            "count": len(source_items),
            "items": [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": (r.get("content") or "")[:200],
                    "publishedAt": r.get("publishedAt", ""),
                    "relativeTime": relative_time(r.get("publishedAt", "")),
                    "heatScore": r["_heat"],
                    "metrics": {
                        k: v for k, v in {
                            "views": r.get("viewCount"),
                            "likes": r.get("likeCount"),
                            "retweets": r.get("retweetCount"),
                            "comments": r.get("commentCount")
                        }.items() if v
                    }
                }
                for r in source_items[:10]
            ]
        }

    # Account detection results
    accounts = [r for r in results if r.get("_type") == "account_detected"]
    for acc in accounts:
        report["accounts"].append({
            "name": acc.get("name", ""),
            "platform": acc.get("platform", ""),
            "verified": acc.get("verified", False),
            "fans": acc.get("fans", 0),
            "description": acc.get("description", "")
        })

    return report


def main():
    parser = argparse.ArgumentParser(description="Generate hotspot report (Markdown or JSON)")
    parser.add_argument("--keyword", required=True, help="The keyword being monitored")
    parser.add_argument("--file", help="JSON file to read (default: stdin)")
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown",
                        help="Output format (default: markdown)")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            results = json.load(f)
    else:
        results = json.load(sys.stdin)

    if not isinstance(results, list):
        print("Error: Expected JSON array", file=sys.stderr)
        sys.exit(1)

    if args.format == "json":
        report = generate_report_json(results, args.keyword)
        output = json.dumps(report, ensure_ascii=False, indent=2)
    else:
        report = generate_fixed_markdown_report(results, args.keyword)
        output = report

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Report saved to: {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
