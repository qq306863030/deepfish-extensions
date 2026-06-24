#!/usr/bin/env python3
"""
GitHub Hotspot Monitor - Comprehensive GitHub trending and hot content fetcher.
Multiple data sources with no API rate limit (web scraping + API fallback).

Usage:
    # Trending页面抓取（无API限制）
    python search_github.py --mode trending --language all
    
    # GitHub Explore热门
    python search_github.py --mode explore
    
    # GitHub Collections
    python search_github.py --mode collections
    
    # GitHub Topics热门
    python search_github.py --mode topics
    
    # Weekly/Monthly Trending
    python search_github.py --mode weekly
    
    # 综合热点（所有渠道）
    python search_github.py --mode all --limit 100
    
    # 带API搜索（补充）
    python search_github.py --mode search "AI machine learning" --days 30
"""

import argparse
import io
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode, quote

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: Install dependencies first: pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)

# Force UTF-8 encoding for stdout on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]

# 支持的所有编程语言
ALL_LANGUAGES = {
    "python": "Python",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "rust": "Rust",
    "go": "Go",
    "java": "Java",
    "c++": "C++",
    "c": "C",
    "csharp": "C#",
    "swift": "Swift",
    "kotlin": "Kotlin",
    "ruby": "Ruby",
    "php": "PHP",
    "scala": "Scala",
    "dart": "Dart",
    "r": "R",
    "all": "All Languages",
}

# GitHub Explore热门Topics
EXPLORE_TOPICS = [
    "machine-learning", "deep-learning", "natural-language-processing",
    "computer-vision", "web", "api", "database", "blockchain",
    "game", "iot", "security", "devops", "blockchain", "automation",
    "cli", "data-science", "ai", "neural-network", "transformer",
    "llm", "chatbot", "image-generation", "video-processing",
]

# GitHub Collections
COLLECTIONS = [
    "machine-learning", "python", "javascript", "typescript",
    "developer-tools", "games", "security", "web-frameworks",
    "data-science", "blockchain", "devops", "apis",
]


def get_headers(refresh=False):
    """获取请求头，支持刷新User-Agent"""
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0" if refresh else "no-cache",
    }


def parse_repo_card(html, source="github_trending"):
    """解析GitHub仓库卡片HTML"""
    try:
        soup = BeautifulSoup(html, "html.parser")
        
        # 查找article元素
        article = soup.select_one("article.Box-row")
        if not article:
            article = soup.select_one(".Box-row")
        if not article:
            article = soup.select_one("article")
        
        if not article:
            return None
        
        # 查找仓库链接 - 优先从h2.lh-condensed中查找
        repo_link = None
        h2 = article.select_one("h2.lh-condensed")
        if h2:
            # 在h2中查找包含/的链接（格式：/owner/repo）
            for a in h2.select("a"):
                href = a.get("href", "")
                if href and "/" in href:
                    # 排除非仓库链接
                    skip_patterns = ["stargazers", "forks", "issues", "pulls", "actions", "wiki", "login", "signup"]
                    if not any(p in href for p in skip_patterns):
                        parts = href.strip("/").split("/")
                        # GitHub仓库通常是 owner/repo 格式
                        if len(parts) >= 2:
                            repo_link = a
                            break
        
        # 备用：查找包含owner/repo格式的链接
        if not repo_link:
            for a in article.select("a"):
                href = a.get("href", "")
                if href and "/" in href:
                    skip_patterns = ["stargazers", "forks", "issues", "pulls", "actions", "wiki", "login", "signup", "#"]
                    if not any(p in href for p in skip_patterns):
                        parts = href.strip("/").split("/")
                        if len(parts) >= 2:
                            repo_link = a
                            break
        
        if not repo_link:
            return None
        
        href = repo_link.get("href", "")
        
        # 清理href，获取正确的仓库路径
        if href.startswith("/"):
            href = href.strip("/")
            # 如果包含多余路径，只取前两段
            parts = href.split("/")
            if len(parts) > 2:
                href = "/".join(parts[:2])
        
        full_name = href
        name = full_name.split("/")[-1] if "/" in full_name else full_name
        url = f"https://github.com/{full_name}"
        
        # 获取描述
        desc_elem = article.select_one("p.color-fg-muted")
        if not desc_elem:
            desc_elem = article.select_one("p")
        description = desc_elem.get_text(strip=True) if desc_elem else ""
        
        # 获取统计信息
        stars = 0
        forks = 0
        today_stars = 0
        
        # 查找包含star/fork数量的元素
        for a in article.select("a"):
            href = a.get("href", "") or ""
            text = a.get_text(strip=True)
            
            if "/stargazers" in href:
                # 提取star数
                match = re.search(r"([\d,]+)\s*star", text, re.I)
                if match:
                    stars = int(match.group(1).replace(",", ""))
                else:
                    # 直接是数字
                    match = re.search(r"([\d,]+)", text)
                    if match:
                        stars = int(match.group(1).replace(",", ""))
            
            elif "/network" in href or "/members" in href:
                # 提取fork数
                match = re.search(r"([\d,]+)", text)
                if match:
                    forks = int(match.group(1).replace(",", ""))
        
        # 备用：从文本中提取统计
        if stars == 0:
            text = article.get_text()
            match = re.search(r"([\d,]+)\s*star", text, re.I)
            if match:
                stars = int(match.group(1).replace(",", ""))
        
        # 获取今日新增star
        today_elem = article.select_one("span.d-inline-block.float-sm-right")
        if today_elem:
            text = today_elem.get_text(strip=True)
            match = re.search(r"([\d,]+)", text)
            if match:
                today_stars = int(match.group(1).replace(",", ""))
        
        # 获取语言
        lang_span = article.select_one("span[itemprop='programmingLanguage']")
        if not lang_span:
            # 备用：在span中查找语言
            for span in article.select("span"):
                text = span.get_text(strip=True)
                if text in ["Python", "JavaScript", "TypeScript", "Rust", "Go", "Java", "C++", "C", "C#", "Ruby", "PHP", "Swift", "Kotlin", "Dart", "Scala", "R"]:
                    lang_span = span
                    break
        language = lang_span.get_text(strip=True) if lang_span else ""
        
        # 获取话题标签
        topics = []
        topic_links = article.select("a.topic-tag")
        for topic in topic_links[:5]:
            topic_text = topic.get_text(strip=True)
            if topic_text and topic_text not in topics:
                topics.append(topic_text)
        
        return {
            "name": name,
            "full_name": full_name,
            "description": description,
            "url": url,
            "source": source,
            "stars": stars,
            "forks": forks,
            "today_stars": today_stars,
            "language": language,
            "topics": topics,
            "owner": {
                "login": full_name.split("/")[0] if "/" in full_name else "",
                "avatar_url": "",
                "type": "User",
            },
        }
    except Exception as e:
        return None


def scrape_github_trending(language=None, since="daily", limit=50):
    """
    直接抓取GitHub Trending页面（无API限制）
    
    Args:
        language: 编程语言过滤 (python, javascript, etc.)
        since: 时间范围 daily/weekly/monthly
        limit: 最大结果数
    """
    results = []
    try:
        # 构建URL
        lang_param = f"/{language}" if language and language != "all" else ""
        url = f"https://github.com/trending{lang_param}?since={since}"
        
        print(f"Fetching: {url}", file=sys.stderr)
        
        resp = requests.get(url, headers=get_headers(), timeout=30)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # 查找所有仓库卡片
        articles = soup.select("article.Box-row")
        
        for article in articles[:limit]:
            repo = parse_repo_card(str(article), source="github_trending")
            if repo and repo.get("full_name"):
                repo["trending_period"] = since
                results.append(repo)
        
        print(f"GitHub Trending ({since}): {len(results)} repositories", file=sys.stderr)
        
    except requests.exceptions.RequestException as e:
        print(f"GitHub Trending error: {e}", file=sys.stderr)
    except Exception as e:
        print(f"Parse error: {e}", file=sys.stderr)
    
    return results


def scrape_github_explore(topics=None, limit=30):
    """
    抓取GitHub Explore页面
    
    Args:
        topics: 指定topics列表
        limit: 每个topic的最大结果数
    """
    results = []
    topics_to_check = topics or EXPLORE_TOPICS[:10]  # 默认检查前10个
    
    for topic in topics_to_check[:15]:  # 限制总数避免太慢
        try:
            url = f"https://github.com/topics/{topic}"
            print(f"Fetching topic: {topic}", file=sys.stderr)
            
            resp = requests.get(url, headers=get_headers(), timeout=20)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, "html.parser")
            articles = soup.select("article.Box-row")[:5]  # 每个topic取前5个
            
            for article in articles:
                repo = parse_repo_card(str(article), source="github_topic")
                if repo and repo.get("full_name"):
                    repo["topic"] = topic
                    results.append(repo)
            
            time.sleep(random.uniform(1, 2))  # 礼貌延迟
            
        except Exception as e:
            print(f"Topic {topic} error: {e}", file=sys.stderr)
            continue
    
    print(f"GitHub Explore Topics: {len(results)} repositories", file=sys.stderr)
    return results


def scrape_github_collections(limit=20):
    """
    抓取GitHub Collections
    
    Args:
        limit: 每个collection的结果数
    """
    results = []
    
    for collection in COLLECTIONS[:5]:  # 取前5个collections
        try:
            url = f"https://github.com/collections/{collection}"
            print(f"Fetching collection: {collection}", file=sys.stderr)
            
            resp = requests.get(url, headers=get_headers(), timeout=20)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Collection页面的卡片结构可能不同
            repo_items = soup.select(".collection-item, article, .Box")[:limit]
            
            for item in repo_items:
                repo = parse_repo_card(str(item), source="github_collection")
                if repo and repo.get("full_name"):
                    repo["collection"] = collection
                    results.append(repo)
            
            time.sleep(random.uniform(1, 2))
            
        except Exception as e:
            print(f"Collection {collection} error: {e}", file=sys.stderr)
            continue
    
    print(f"GitHub Collections: {len(results)} repositories", file=sys.stderr)
    return results


def scrape_github_search_page(query, limit=30):
    """
    抓取GitHub搜索结果页面（绕过API限制）
    
    Args:
        query: 搜索关键词
        limit: 最大结果数
    """
    results = []
    try:
        encoded_query = quote(query)
        url = f"https://github.com/search?q={encoded_query}&type=repositories&s=stars"
        
        print(f"Searching: {query}", file=sys.stderr)
        
        resp = requests.get(url, headers=get_headers(), timeout=30)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, "html.parser")
        articles = soup.select("li.repo-list-item, article")[:limit]
        
        for article in articles:
            repo = parse_repo_card(str(article), source="github_search")
            if repo and repo.get("full_name"):
                repo["search_query"] = query
                results.append(repo)
        
        print(f"GitHub Search ({query}): {len(results)} repositories", file=sys.stderr)
        
    except Exception as e:
        print(f"GitHub Search error: {e}", file=sys.stderr)
    
    return results


def get_github_api_trending(language=None, limit=30, days=7):
    """
    使用GitHub API获取Trending（作为补充，有60请求/小时限制）
    """
    results = []
    try:
        date_from = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        
        search_parts = [f"created:>={date_from}", "stars:>10"]
        if language and language != "all":
            search_parts.append(f"language:{language}")
        
        full_query = " ".join(search_parts)
        
        params = {
            "q": full_query,
            "sort": "stars",
            "order": "desc",
            "per_page": min(limit, 100),
        }
        
        resp = requests.get(
            "https://api.github.com/search/repositories",
            params=params,
            headers={
                "User-Agent": random.choice(USER_AGENTS),
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=30,
        )
        
        if resp.status_code == 403:
            print("GitHub API rate limited, using scraped data instead.", file=sys.stderr)
            return results
        
        resp.raise_for_status()
        data = resp.json()
        
        for item in data.get("items", [])[:limit]:
            stars = item.get("stargazers_count", 0)
            created = item.get("created_at", "")
            
            if created:
                try:
                    created_date = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    days_old = (datetime.now(timezone.utc) - created_date).days
                    daily_stars = stars / max(days_old, 1)
                except:
                    daily_stars = 0
            else:
                daily_stars = 0
            
            results.append({
                "name": item.get("name", ""),
                "full_name": item.get("full_name", ""),
                "description": item.get("description", "") or "",
                "url": item.get("html_url", ""),
                "source": "github_api",
                "stars": stars,
                "forks": item.get("forks_count", 0),
                "language": item.get("language", ""),
                "topics": item.get("topics", []) or [],
                "daily_stars": round(daily_stars, 1),
                "owner": {
                    "login": item.get("owner", {}).get("login", ""),
                    "avatar_url": item.get("owner", {}).get("avatar_url", ""),
                    "type": item.get("owner", {}).get("type", ""),
                },
            })
        
        print(f"GitHub API: {len(results)} repositories", file=sys.stderr)
        
    except Exception as e:
        print(f"GitHub API error: {e}", file=sys.stderr)
    
    return results


def get_multi_language_trending(languages=None, limit_per_lang=20):
    """
    获取多种编程语言的Trending
    
    Args:
        languages: 语言列表，默认包含主流语言
        limit_per_lang: 每种语言的最大结果数
    """
    results = []
    langs_to_fetch = languages or ["python", "typescript", "rust", "go", "javascript"]
    
    for lang in langs_to_fetch:
        print(f"Fetching {lang} trending...", file=sys.stderr)
        lang_results = scrape_github_trending(language=lang, limit=limit_per_lang)
        results.extend(lang_results)
        time.sleep(random.uniform(1, 3))
    
    return results


def get_weekly_monthly_trending(limit=50):
    """
    获取Weekly和Monthly Trending
    """
    results = []
    
    # Weekly
    weekly = scrape_github_trending(since="weekly", limit=limit)
    results.extend(weekly)
    
    time.sleep(random.uniform(2, 4))
    
    # Monthly
    monthly = scrape_github_trending(since="monthly", limit=limit)
    results.extend(monthly)
    
    return results


def get_comprehensive_github_hotspot(limit=100):
    """
    综合获取GitHub热点：多渠道聚合
    """
    all_results = []
    seen = {}  # full_name -> repo
    
    # 1. Daily Trending (all languages)
    print("\n=== Step 1: Daily Trending ===", file=sys.stderr)
    daily = scrape_github_trending(since="daily", limit=60)
    for repo in daily:
        if repo["full_name"] not in seen:
            seen[repo["full_name"]] = repo
    
    time.sleep(random.uniform(2, 4))
    
    # 2. Weekly Trending
    print("\n=== Step 2: Weekly Trending ===", file=sys.stderr)
    weekly = scrape_github_trending(since="weekly", limit=40)
    for repo in weekly:
        if repo["full_name"] not in seen:
            seen[repo["full_name"]] = repo
    
    time.sleep(random.uniform(2, 4))
    
    # 3. Multi-language Trending (top 5 languages)
    print("\n=== Step 3: Multi-language Trending ===", file=sys.stderr)
    multi_lang = get_multi_language_trending(
        languages=["python", "typescript", "rust", "go", "javascript"],
        limit_per_lang=15
    )
    for repo in multi_lang:
        if repo["full_name"] not in seen:
            seen[repo["full_name"]] = repo
    
    time.sleep(random.uniform(3, 5))
    
    # 4. Explore Topics (AI/ML focused)
    print("\n=== Step 4: Explore Topics ===", file=sys.stderr)
    topics = scrape_github_explore(
        topics=["machine-learning", "deep-learning", "llm", "ai", "data-science"],
        limit=20
    )
    for repo in topics:
        if repo["full_name"] not in seen:
            seen[repo["full_name"]] = repo
    
    time.sleep(random.uniform(2, 4))
    
    # 5. Search page scraping (hot queries)
    print("\n=== Step 5: Search Hot Queries ===", file=sys.stderr)
    hot_queries = ["AI", "machine learning", "LLM", "chatgpt", "web", "api", "blockchain", "game"]
    for query in hot_queries:
        search_results = scrape_github_search_page(query, limit=10)
        for repo in search_results:
            if repo["full_name"] not in seen:
                seen[repo["full_name"]] = repo
        time.sleep(random.uniform(1, 2))
    
    # 6. API fallback (if not rate limited)
    print("\n=== Step 6: API Fallback ===", file=sys.stderr)
    api_results = get_github_api_trending(limit=30, days=7)
    for repo in api_results:
        if repo["full_name"] not in seen:
            seen[repo["full_name"]] = repo
    
    # 转换为列表并排序
    all_results = list(seen.values())
    all_results.sort(key=lambda x: x.get("stars", 0), reverse=True)
    
    print(f"\n=== Total: {len(all_results)} unique repositories ===", file=sys.stderr)
    
    return all_results[:limit]


def search_github_repos(query, limit=20, language=None, days=30, min_stars=100):
    """
    传统GitHub Search API搜索
    """
    try:
        search_parts = [query]
        
        if language:
            search_parts.append(f"language:{language}")
        
        if days:
            date_from = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
            search_parts.append(f"pushed:>={date_from}")
        
        if min_stars:
            search_parts.append(f"stars:>={min_stars}")
        
        full_query = " ".join(search_parts)
        
        params = {
            "q": full_query,
            "sort": "stars",
            "order": "desc",
            "per_page": min(limit, 100),
        }
        
        resp = requests.get(
            "https://api.github.com/search/repositories",
            params=params,
            headers=get_headers(),
            timeout=30,
        )
        
        if resp.status_code == 403:
            print(f"GitHub API rate limit exceeded.", file=sys.stderr)
            return []
        
        resp.raise_for_status()
        data = resp.json()
        
        results = []
        for item in data.get("items", [])[:limit]:
            topics = item.get("topics", []) or []
            stars = item.get("stargazers_count", 0)
            created = item.get("created_at", "")
            
            if created:
                try:
                    created_date = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    days_old = (datetime.now(timezone.utc) - created_date).days
                    daily_stars = stars / max(days_old, 1)
                except:
                    daily_stars = 0
            else:
                daily_stars = 0
            
            results.append({
                "name": item.get("name", ""),
                "full_name": item.get("full_name", ""),
                "description": item.get("description", "") or "",
                "url": item.get("html_url", ""),
                "source": "github",
                "stars": stars,
                "forks": item.get("forks_count", 0),
                "language": item.get("language", ""),
                "topics": topics,
                "daily_stars": round(daily_stars, 1),
                "owner": {
                    "login": item.get("owner", {}).get("login", ""),
                    "avatar_url": item.get("owner", {}).get("avatar_url", ""),
                    "type": item.get("owner", {}).get("type", ""),
                },
            })
        
        print(f"GitHub Search: {len(results)} repositories", file=sys.stderr)
        return results
        
    except Exception as e:
        print(f"GitHub error: {e}", file=sys.stderr)
        return []


def main():
    parser = argparse.ArgumentParser(
        description="GitHub Hotspot Monitor - Comprehensive GitHub trending fetcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # 综合热点（推荐）
  python search_github.py --mode all --limit 100
  
  # 每日Trending
  python search_github.py --mode trending
  
  # 多语言Trending
  python search_github.py --mode multi-lang --languages python typescript rust go
  
  # Weekly + Monthly
  python search_github.py --mode weekly-monthly
  
  # Explore Topics
  python search_github.py --mode explore
  
  # API搜索
  python search_github.py --mode search "machine learning" --days 30
        """
    )
    
    parser.add_argument("query", nargs="?", default="AI machine learning", 
                        help="Search query (for search mode)")
    parser.add_argument("--mode", "-m", default="all",
                        choices=["all", "trending", "multi-lang", "weekly", "weekly-monthly", 
                                "explore", "collections", "search", "api"],
                        help="Fetch mode (default: all)")
    parser.add_argument("--limit", type=int, default=50, help="Max results (default: 50)")
    parser.add_argument("--language", "-l", default=None,
                        help=f"Programming language: {', '.join(ALL_LANGUAGES.keys())}")
    parser.add_argument("--languages", nargs="+", default=None,
                        help="Multiple languages for multi-lang mode")
    parser.add_argument("--days", type=int, default=7, help="Days range for API (default: 7)")
    parser.add_argument("--since", default="daily",
                        choices=["daily", "weekly", "monthly"],
                        help="Trending time range (default: daily)")
    parser.add_argument("--min-stars", type=int, default=10,
                        help="Minimum stars (default: 10)")
    
    args = parser.parse_args()
    
    lang = args.language.lower() if args.language else None
    
    # 根据模式执行不同的获取策略
    if args.mode == "all":
        results = get_comprehensive_github_hotspot(limit=args.limit)
    elif args.mode == "trending":
        results = scrape_github_trending(language=lang, since=args.since, limit=args.limit)
    elif args.mode == "multi-lang":
        langs = args.languages or ["python", "typescript", "rust", "go", "javascript"]
        results = get_multi_language_trending(languages=langs, limit_per_lang=20)
    elif args.mode == "weekly":
        results = scrape_github_trending(since="weekly", limit=args.limit)
    elif args.mode == "weekly-monthly":
        results = get_weekly_monthly_trending(limit=args.limit)
    elif args.mode == "explore":
        results = scrape_github_explore(limit=50)
    elif args.mode == "collections":
        results = scrape_github_collections(limit=30)
    elif args.mode == "search":
        results = scrape_github_search_page(args.query, limit=args.limit)
    elif args.mode == "api":
        results = get_github_api_trending(language=lang, limit=args.limit, days=args.days)
    else:
        results = search_github_repos(args.query, limit=args.limit, language=lang, days=args.days)
    
    # 去重并排序
    seen = {}
    for repo in results:
        if repo.get("full_name") and repo["full_name"] not in seen:
            seen[repo["full_name"]] = repo
    
    final_results = list(seen.values())
    final_results.sort(key=lambda x: x.get("stars", 0), reverse=True)
    final_results = final_results[:args.limit]
    
    print(f"\nTotal: {len(final_results)} unique repositories", file=sys.stderr)
    json.dump(final_results, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
