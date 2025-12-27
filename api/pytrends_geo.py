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
    print(f"[PyTrendsGeo] ====== FETCH START ======")
    print(f"[PyTrendsGeo] Keyword: {keyword}")
    print(f"[PyTrendsGeo] Geo: {geo}, Timeframe: {timeframe}, Resolution: {resolution}")

    try:
        from pytrends.request import TrendReq
        import pandas as pd
        print(f"[PyTrendsGeo] pytrends imported OK")
    except ImportError as e:
        print(f"[PyTrendsGeo] ERROR: pytrends import failed: {e}")
        return {"error": "pytrends not installed", "data": []}

    max_retries = 3

    for attempt in range(max_retries):
        print(f"[PyTrendsGeo] Attempt {attempt + 1}/{max_retries}")
        try:
            # Random delay to avoid rate limiting
            delay = 2 + random.uniform(0, 2)
            print(f"[PyTrendsGeo] Sleeping {delay:.1f}s before request")
            time.sleep(delay)

            print(f"[PyTrendsGeo] Creating TrendReq...")
            pytrends = TrendReq(hl="fr-FR", tz=60, timeout=(10, 25))

            print(f"[PyTrendsGeo] Building payload...")
            pytrends.build_payload([keyword], timeframe=timeframe, geo=geo)

            time.sleep(1 + random.uniform(0, 1))

            # Patch: Force resolution for non-US countries
            # The original pytrends only allows CITY/REGION for US or empty geo
            # We manually set the resolution in the widget request
            print(f"[PyTrendsGeo] Checking interest_by_region_widget...")
            if hasattr(pytrends, 'interest_by_region_widget') and pytrends.interest_by_region_widget:
                print(f"[PyTrendsGeo] Widget found, patching resolution to {resolution}")
                print(f"[PyTrendsGeo] Widget before patch: {pytrends.interest_by_region_widget}")
                pytrends.interest_by_region_widget['request']['resolution'] = resolution
                print(f"[PyTrendsGeo] Widget after patch: {pytrends.interest_by_region_widget}")
            else:
                print(f"[PyTrendsGeo] WARNING: No interest_by_region_widget found!")
                print(f"[PyTrendsGeo] hasattr: {hasattr(pytrends, 'interest_by_region_widget')}")
                if hasattr(pytrends, 'interest_by_region_widget'):
                    print(f"[PyTrendsGeo] Widget value: {pytrends.interest_by_region_widget}")

            print(f"[PyTrendsGeo] Calling interest_by_region...")
            df = pytrends.interest_by_region(resolution=resolution, inc_low_vol=True, inc_geo_code=False)

            print(f"[PyTrendsGeo] DataFrame received: type={type(df)}")
            if df is not None:
                print(f"[PyTrendsGeo] DataFrame shape: {df.shape}")
                print(f"[PyTrendsGeo] DataFrame empty: {df.empty}")
                print(f"[PyTrendsGeo] DataFrame columns: {list(df.columns)}")
                print(f"[PyTrendsGeo] DataFrame index (first 10): {list(df.index[:10])}")
                if not df.empty:
                    print(f"[PyTrendsGeo] DataFrame head:\n{df.head(10)}")

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

                print(f"[PyTrendsGeo] SUCCESS: Found {len(result)} cities with data")
                if result:
                    print(f"[PyTrendsGeo] Top 5: {result[:5]}")
                print(f"[PyTrendsGeo] ====== FETCH END - SUCCESS ======")
                return {"data": result, "error": None}
            else:
                print(f"[PyTrendsGeo] DataFrame is None or empty")
                if attempt < max_retries - 1:
                    print(f"[PyTrendsGeo] Retrying after delay...")
                    time.sleep(5 * (attempt + 1))

        except Exception as e:
            err_str = str(e)
            print(f"[PyTrendsGeo] EXCEPTION: {err_str}")
            import traceback
            print(f"[PyTrendsGeo] Traceback:\n{traceback.format_exc()}")

            if "429" in err_str:
                if attempt < max_retries - 1:
                    print(f"[PyTrendsGeo] Rate limited, waiting longer...")
                    time.sleep(10 * (attempt + 1) + random.uniform(0, 5))
                else:
                    print(f"[PyTrendsGeo] ====== FETCH END - RATE LIMITED ======")
                    return {"error": "RATE_LIMITED", "data": []}
            else:
                if attempt == max_retries - 1:
                    print(f"[PyTrendsGeo] ====== FETCH END - ERROR ======")
                    return {"error": err_str[:200], "data": []}
                time.sleep(3)

    print(f"[PyTrendsGeo] ====== FETCH END - NO DATA ======")
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

    print(f"[PyTrendsGeo] ====== BATCH START ======")
    print(f"[PyTrendsGeo] Keywords: {keywords}")
    print(f"[PyTrendsGeo] Geo: {geo}, Timeframe: {timeframe}, Resolution: {resolution}")

    if not keywords:
        print(f"[PyTrendsGeo] ERROR: No keywords provided")
        return {"results": {}, "error": "No keywords provided", "from_cache": False}

    # Rate limit check (minimum 60 seconds between full batch requests)
    if _last_request_time:
        elapsed = time.time() - _last_request_time
        print(f"[PyTrendsGeo] Time since last request: {elapsed:.1f}s")
        if elapsed < 60:
            # Return cached data if available
            cached_results = {}
            cache_key_prefix = f"{geo}:{resolution}:"
            for kw in keywords:
                cache_key = cache_key_prefix + kw
                if cache_key in _memory_cache:
                    cached_results[kw] = _memory_cache[cache_key]
            if cached_results:
                print(f"[PyTrendsGeo] Returning cached results for {len(cached_results)} keywords")
                return {"results": cached_results, "error": None, "from_cache": True}
            else:
                print(f"[PyTrendsGeo] No cached results available, proceeding anyway")

    _last_request_time = time.time()

    all_results = {}
    errors = []

    for i, kw in enumerate(keywords):
        print(f"[PyTrendsGeo] Processing keyword {i+1}/{len(keywords)}: {kw}")
        result = fetch_geo_trends(kw, geo, timeframe, resolution)

        if result.get("error") == "RATE_LIMITED":
            print(f"[PyTrendsGeo] Rate limited, using fallback for remaining keywords")
            # Use fallback for remaining keywords
            cache_key_prefix = f"{geo}:{resolution}:"
            for remaining_kw in keywords:
                if remaining_kw not in all_results:
                    cache_key = cache_key_prefix + remaining_kw
                    all_results[remaining_kw] = _memory_cache.get(cache_key, [])
            return {"results": all_results, "error": "RATE_LIMITED", "from_cache": False}

        if result.get("error"):
            print(f"[PyTrendsGeo] Error for {kw}: {result['error']}")
            errors.append(f"{kw}: {result['error']}")

        all_results[kw] = result.get("data", [])
        print(f"[PyTrendsGeo] Got {len(all_results[kw])} cities for {kw}")

        # Store in memory cache for fallback
        if result.get("data"):
            cache_key = f"{geo}:{resolution}:{kw}"
            _memory_cache[cache_key] = result["data"]

        # Delay between keywords to avoid rate limiting
        if len(keywords) > 1 and i < len(keywords) - 1:
            delay = 3 + random.uniform(0, 2)
            print(f"[PyTrendsGeo] Sleeping {delay:.1f}s before next keyword")
            time.sleep(delay)

    print(f"[PyTrendsGeo] ====== BATCH END ======")
    print(f"[PyTrendsGeo] Total results: {len(all_results)} keywords")
    for kw, cities in all_results.items():
        print(f"[PyTrendsGeo]   {kw}: {len(cities)} cities")

    return {
        "results": all_results,
        "error": errors[0] if errors else None,
        "from_cache": False
    }

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"[PyTrendsGeo] ====== HTTP GET REQUEST ======")
        print(f"[PyTrendsGeo] Path: {self.path}")
        try:
            # Parse query parameters
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            print(f"[PyTrendsGeo] Parsed params: {params}")

            keywords_raw = params.get("keywords", [""])[0]
            geo = params.get("geo", ["FR-J"])[0]  # Default: Ile-de-France
            days = int(params.get("days", ["7"])[0])
            resolution = params.get("resolution", ["CITY"])[0].upper()

            print(f"[PyTrendsGeo] keywords_raw: {keywords_raw}")
            print(f"[PyTrendsGeo] geo: {geo}, days: {days}, resolution: {resolution}")

            if resolution not in ["CITY", "REGION"]:
                resolution = "CITY"

            if not keywords_raw:
                print(f"[PyTrendsGeo] ERROR: Missing keywords parameter")
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing keywords parameter"}).encode())
                return

            # Parse keywords (comma-separated)
            keywords = [k.strip() for k in keywords_raw.split(",") if k.strip()]
            print(f"[PyTrendsGeo] Parsed keywords: {keywords}")

            if not keywords:
                print(f"[PyTrendsGeo] ERROR: No valid keywords")
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No valid keywords"}).encode())
                return

            # Get timeframe
            timeframe = get_timeframe(days)
            print(f"[PyTrendsGeo] Timeframe: {timeframe}")

            # Fetch geographic trends
            print(f"[PyTrendsGeo] Calling fetch_geo_trends_batch...")
            result = fetch_geo_trends_batch(keywords, geo, timeframe, resolution)
            print(f"[PyTrendsGeo] Result: {json.dumps(result)[:500]}...")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "s-maxage=7200")  # Cache 2h at edge
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            print(f"[PyTrendsGeo] ====== HTTP GET RESPONSE SENT ======")

        except Exception as e:
            print(f"[PyTrendsGeo] ====== HTTP GET EXCEPTION ======")
            print(f"[PyTrendsGeo] Exception: {e}")
            import traceback
            print(f"[PyTrendsGeo] Traceback:\n{traceback.format_exc()}")
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
