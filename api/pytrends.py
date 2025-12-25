from http.server import BaseHTTPRequestHandler
import json
import time
import random
from urllib.parse import parse_qs, urlparse
from datetime import datetime, timedelta

# Cache en mémoire pour cette instance (fallback)
_memory_cache = {}
_last_request_time = None

def get_timeframe(days: int) -> str:
    """Convert days to Google Trends timeframe format"""
    end = datetime.now()
    start = end - timedelta(days=days)
    return f"{start.strftime('%Y-%m-%d')} {end.strftime('%Y-%m-%d')}"

def fetch_trends_batch(keywords: list, timeframe: str) -> dict:
    """Fetch trends for a batch of up to 5 keywords"""
    try:
        from pytrends.request import TrendReq
    except ImportError:
        return {"error": "pytrends not installed", "scores": {}}

    scores = {}
    max_retries = 3

    for attempt in range(max_retries):
        try:
            # Random delay to avoid rate limiting
            time.sleep(2 + random.uniform(0, 2))

            pytrends = TrendReq(hl="fr-FR", tz=60, timeout=(10, 25))
            pytrends.build_payload(keywords, timeframe=timeframe, geo="FR")

            time.sleep(1 + random.uniform(0, 1))
            df = pytrends.interest_over_time()

            if df is not None and not df.empty:
                if "isPartial" in df.columns:
                    df = df.drop(columns=["isPartial"])

                for kw in keywords:
                    if kw in df.columns:
                        scores[kw] = round(float(df[kw].mean()), 1)
                    else:
                        scores[kw] = 0.0
                return {"scores": scores, "error": None}
            else:
                if attempt < max_retries - 1:
                    time.sleep(5 * (attempt + 1))

        except Exception as e:
            err_str = str(e)
            if "429" in err_str:
                if attempt < max_retries - 1:
                    time.sleep(10 * (attempt + 1) + random.uniform(0, 5))
                else:
                    return {"error": "RATE_LIMITED", "scores": {}}
            else:
                if attempt == max_retries - 1:
                    return {"error": err_str[:100], "scores": {}}
                time.sleep(3)

    return {"scores": scores, "error": None}

def fetch_trends_with_pivot(keywords: list, timeframe: str) -> dict:
    """
    Fetch trends for multiple keywords using pivot normalization.
    Google Trends only allows 5 keywords per request.
    We use the first keyword as a pivot to normalize across batches.
    """
    global _last_request_time

    if not keywords:
        return {"scores": {}, "error": "No keywords provided"}

    # Rate limit check (minimum 30 seconds between full requests)
    if _last_request_time:
        elapsed = time.time() - _last_request_time
        if elapsed < 30:
            # Return cached data if available
            cached_scores = {}
            for kw in keywords:
                if kw in _memory_cache:
                    cached_scores[kw] = _memory_cache[kw]
            if cached_scores:
                return {"scores": cached_scores, "error": None, "from_cache": True}

    _last_request_time = time.time()

    all_scores = {}
    errors = []

    # If 5 or fewer keywords, single request
    if len(keywords) <= 5:
        result = fetch_trends_batch(keywords, timeframe)
        if result.get("error") == "RATE_LIMITED":
            return {"scores": _get_fallback_scores(keywords), "error": "RATE_LIMITED"}
        if result.get("error"):
            errors.append(result["error"])
        all_scores.update(result.get("scores", {}))
    else:
        # Use pivot strategy for more than 5 keywords
        pivot = keywords[0]
        pivot_score = None
        batch_size = 4  # 4 + pivot = 5

        for i in range(0, len(keywords), batch_size):
            batch = keywords[i:i + batch_size]

            # Always include pivot in batch (except first batch where it's already there)
            if pivot not in batch:
                batch = [pivot] + batch

            result = fetch_trends_batch(batch, timeframe)

            if result.get("error") == "RATE_LIMITED":
                # Use fallback for remaining keywords
                for kw in keywords:
                    if kw not in all_scores:
                        all_scores[kw] = _memory_cache.get(kw, 0)
                return {"scores": all_scores, "error": "RATE_LIMITED"}

            if result.get("error"):
                errors.append(result["error"])
                continue

            batch_scores = result.get("scores", {})

            # Set pivot score from first successful batch
            if pivot_score is None and pivot in batch_scores:
                pivot_score = batch_scores[pivot]

            # Normalize scores relative to pivot
            for kw in batch:
                if kw in batch_scores:
                    raw_score = batch_scores[kw]
                    if pivot_score and pivot_score > 0 and pivot in batch_scores:
                        current_pivot = batch_scores[pivot]
                        if current_pivot > 0:
                            normalized = (raw_score / current_pivot) * pivot_score
                            all_scores[kw] = round(normalized, 1)
                        else:
                            all_scores[kw] = round(raw_score, 1)
                    else:
                        all_scores[kw] = round(raw_score, 1)

    # Store in memory cache for fallback
    for kw, score in all_scores.items():
        if score > 0:
            _memory_cache[kw] = score

    # Fill missing keywords with 0
    for kw in keywords:
        if kw not in all_scores:
            all_scores[kw] = _memory_cache.get(kw, 0)

    # Normalize to 0-100 scale (max = 100)
    if all_scores:
        max_score = max(all_scores.values())
        if max_score > 0:
            all_scores = {kw: round((score / max_score) * 100, 1) for kw, score in all_scores.items()}

    return {
        "scores": all_scores,
        "error": errors[0] if errors else None,
        "from_cache": False
    }

def _get_fallback_scores(keywords: list) -> dict:
    """Get fallback scores from memory cache"""
    return {kw: _memory_cache.get(kw, 0) for kw in keywords}

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse query parameters
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            keywords_raw = params.get("keywords", [""])[0]
            days = int(params.get("days", ["7"])[0])

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

            # Fetch trends
            result = fetch_trends_with_pivot(keywords, timeframe)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "s-maxage=3600")  # Cache 1h at edge
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
            days = data.get("days", 7)

            if not keywords:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing keywords"}).encode())
                return

            timeframe = get_timeframe(days)
            result = fetch_trends_with_pivot(keywords, timeframe)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
