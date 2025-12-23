from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
from pytrends.request import TrendReq
from datetime import datetime, timedelta

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query parameters
        query = parse_qs(urlparse(self.path).query)
        keyword = query.get('q', [None])[0]
        days = int(query.get('days', [7])[0])

        if not keyword:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing keyword parameter"}).encode())
            return

        try:
            # Initialize pytrends
            pytrends = TrendReq(hl='fr-FR', tz=60, timeout=(10, 25))

            # Calculate timeframe
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            timeframe = f"{start_date.strftime('%Y-%m-%d')} {end_date.strftime('%Y-%m-%d')}"

            # Build payload and get interest over time
            pytrends.build_payload([keyword], cat=0, timeframe=timeframe, geo='FR')
            interest_df = pytrends.interest_over_time()

            if interest_df.empty:
                result = {
                    "keyword": keyword,
                    "currentValue": 0,
                    "maxValue": 0,
                    "avgValue": 0,
                    "timeline": [],
                    "available": False
                }
            else:
                # Extract values
                values = interest_df[keyword].tolist()
                dates = [d.strftime('%Y-%m-%d') for d in interest_df.index.tolist()]

                timeline = [{"date": d, "value": int(v)} for d, v in zip(dates, values)]

                result = {
                    "keyword": keyword,
                    "currentValue": int(values[-1]) if values else 0,
                    "maxValue": int(max(values)) if values else 0,
                    "avgValue": int(sum(values) / len(values)) if values else 0,
                    "timeline": timeline,
                    "available": True
                }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=14400')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e),
                "keyword": keyword,
                "currentValue": 50,
                "maxValue": 50,
                "avgValue": 50,
                "timeline": [],
                "available": False
            }).encode())
