from http.server import BaseHTTPRequestHandler
import json
import time
import random
from urllib.parse import parse_qs, urlparse
from datetime import datetime, timedelta

# Cache en memoire pour cette instance (fallback)
_memory_cache = {}
_last_request_time = None

def get_timeframe(days: int) -> str:
    """Convert days to Google Trends timeframe format"""
    end = datetime.now()
    start = end - timedelta(days=days)
    return f"{start.strftime('%Y-%m-%d')} {end.strftime('%Y-%m-%d')}"

def fetch_geo_trends(keyword: str, geo: str, timeframe: str, resolution: str = "CITY") -> dict:
    """
    Fetch geographic interest data for a keyword.
    Uses patched pytrends to support CITY resolution for non-US countries.

    Args:
        keyword: Search term
        geo: Geographic code (e.g., 'FR-J' for Ile-de-France)
        timeframe: Date range
        resolution: 'CITY' or 'REGION'
    """
    try:
        from pytrends.request import TrendReq
        import pandas as pd
    except ImportError:
        return {"error": "pytrends not installed", "data": []}

    max_retries = 3

    for attempt in range(max_retries):
        try:
            # Random delay to avoid rate limiting
            time.sleep(2 + random.uniform(0, 2))

            pytrends = TrendReq(hl="fr-FR", tz=60, timeout=(10, 25))
            pytrends.build_payload([keyword], timeframe=timeframe, geo=geo)

            time.sleep(1 + random.uniform(0, 1))

            # Patch: Force resolution for non-US countries
            # The original pytrends only allows CITY/REGION for US or empty geo
            # We manually set the resolution in the widget request
            if hasattr(pytrends, 'interest_by_region_widget') and pytrends.interest_by_region_widget:
                pytrends.interest_by_region_widget['request']['resolution'] = resolution

            df = pytrends.interest_by_region(resolution=resolution, inc_low_vol=True, inc_geo_code=False)

            if df is not None and not df.empty:
                # Convert to list of dicts
                result = []
                for idx, row in df.iterrows():
                    city_name = idx if isinstance(idx, str) else str(idx)
                    score = int(row[keyword]) if keyword in row.index else 0
                    if score > 0:  # Only include cities with data
                        result.append({
                            "name": city_name,
                            "score": score
                        })

                # Sort by score descending
                result.sort(key=lambda x: x["score"], reverse=True)

                return {"data": result, "error": None}
            else:
                if attempt < max_retries - 1:
                    time.sleep(5 * (attempt + 1))

        except Exception as e:
            err_str = str(e)
            if "429" in err_str:
                if attempt < max_retries - 1:
                    time.sleep(10 * (attempt + 1) + random.uniform(0, 5))
                else:
                    return {"error": "RATE_LIMITED", "data": []}
            else:
                if attempt == max_retries - 1:
                    return {"error": err_str[:200], "data": []}
                time.sleep(3)

    return {"data": [], "error": None}

def fetch_geo_trends_batch(keywords: list, geo: str, timeframe: str, resolution: str = "CITY") -> dict:
    """
    Fetch geographic interest data for multiple keywords.
    Processes sequentially with delays to avoid rate limiting.

    Returns:
        {
            "results": {
                "keyword1": [{"name": "Paris", "score": 100}, ...],
                "keyword2": [...],
            },
            "error": str or None,
            "from_cache": bool
        }
    """
    global _last_request_time

    if not keywords:
        return {"results": {}, "error": "No keywords provided", "from_cache": False}

    # Rate limit check (minimum 60 seconds between full batch requests)
    if _last_request_time:
        elapsed = time.time() - _last_request_time
        if elapsed < 60:
            # Return cached data if available
            cached_results = {}
            cache_key_prefix = f"{geo}:{resolution}:"
            for kw in keywords:
                cache_key = cache_key_prefix + kw
                if cache_key in _memory_cache:
                    cached_results[kw] = _memory_cache[cache_key]
            if cached_results:
                return {"results": cached_results, "error": None, "from_cache": True}

    _last_request_time = time.time()

    all_results = {}
    errors = []

    for kw in keywords:
        result = fetch_geo_trends(kw, geo, timeframe, resolution)

        if result.get("error") == "RATE_LIMITED":
            # Use fallback for remaining keywords
            cache_key_prefix = f"{geo}:{resolution}:"
            for remaining_kw in keywords:
                if remaining_kw not in all_results:
                    cache_key = cache_key_prefix + remaining_kw
                    all_results[remaining_kw] = _memory_cache.get(cache_key, [])
            return {"results": all_results, "error": "RATE_LIMITED", "from_cache": False}

        if result.get("error"):
            errors.append(f"{kw}: {result['error']}")

        all_results[kw] = result.get("data", [])

        # Store in memory cache for fallback
        if result.get("data"):
            cache_key = f"{geo}:{resolution}:{kw}"
            _memory_cache[cache_key] = result["data"]

        # Delay between keywords to avoid rate limiting
        if len(keywords) > 1:
            time.sleep(3 + random.uniform(0, 2))

    return {
        "results": all_results,
        "error": errors[0] if errors else None,
        "from_cache": False
    }

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse query parameters
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            keywords_raw = params.get("keywords", [""])[0]
            geo = params.get("geo", ["FR-J"])[0]  # Default: Ile-de-France
            days = int(params.get("days", ["7"])[0])
            resolution = params.get("resolution", ["CITY"])[0].upper()

            if resolution not in ["CITY", "REGION"]:
                resolution = "CITY"

            if not keywords_raw:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing keywords parameter"}).encode())
                return

            # Parse keywords (comma-separated)
            keywords = [k.strip() for k in keywords_raw.split(",") if k.strip()]

            if not keywords:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No valid keywords"}).encode())
                return

            # Get timeframe
            timeframe = get_timeframe(days)

            # Fetch geographic trends
            result = fetch_geo_trends_batch(keywords, geo, timeframe, resolution)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "s-maxage=7200")  # Cache 2h at edge
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body) if body else {}

            keywords = data.get("keywords", [])
            geo = data.get("geo", "FR-J")
            days = data.get("days", 7)
            resolution = data.get("resolution", "CITY").upper()

            if resolution not in ["CITY", "REGION"]:
                resolution = "CITY"

            if not keywords:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing keywords"}).encode())
                return

            timeframe = get_timeframe(days)
            result = fetch_geo_trends_batch(keywords, geo, timeframe, resolution)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
