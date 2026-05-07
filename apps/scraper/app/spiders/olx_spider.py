import json
import scrapy
from app.core.part_mapper import (
    map_part_name, extract_car_make, extract_car_model, extract_year, parse_price_pkr
)

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# OLX REST API — the same endpoint their SPA calls in the browser
_API = "https://www.olx.com.pk/api/relevance/v4/search"

SEARCH_QUERIES = [
    "bumper", "car door", "bonnet", "windscreen",
    "headlight", "taillight", "fender", "side mirror",
]


class OlxSpider(scrapy.Spider):
    name = "olx"
    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
        "ROBOTSTXT_OBEY": False,
        "DEFAULT_REQUEST_HEADERS": {
            "User-Agent": _UA,
            "Accept": "application/json, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.olx.com.pk/",
        },
    }

    def start_requests(self):
        for query in SEARCH_QUERIES:
            url = (
                f"{_API}?query={query.replace(' ', '+')}"
                f"&platform=web-desktop&page=1&perPage=40"
            )
            yield scrapy.Request(
                url=url,
                callback=self.parse_api,
                meta={"query": query, "page": 1},
                errback=self.handle_error,
            )

    def handle_error(self, failure):
        self.logger.error(f"[olx] Request error: {failure.request.url} — {failure.value}")

    def parse_api(self, response):
        # Check if we got JSON back
        content_type = response.headers.get("Content-Type", b"").decode()
        if "json" not in content_type:
            self.logger.warning(
                f"[olx] API did not return JSON on {response.url} "
                f"(Content-Type: {content_type}, status: {response.status}). "
                f"Response snippet: {response.text[:300]!r}"
            )
            return

        try:
            data = json.loads(response.text)
        except json.JSONDecodeError as e:
            self.logger.error(f"[olx] JSON parse error on {response.url}: {e}")
            return

        # Navigate the response — try common OLX API response shapes
        listings = (
            data.get("data", {}).get("listings") or
            data.get("data", {}).get("ads") or
            data.get("listings") or
            data.get("ads") or
            []
        )

        if not listings:
            self.logger.warning(
                f"[olx] No listings in API response for '{response.meta['query']}'. "
                f"Top-level keys: {list(data.keys())} "
                f"data keys: {list(data.get('data', {}).keys()) if isinstance(data.get('data'), dict) else 'N/A'}"
            )
            return

        self.logger.info(f"[olx] Got {len(listings)} listings for '{response.meta['query']}'")
        scraped = 0

        for ad in listings:
            title = (ad.get("title") or ad.get("name") or "").strip()

            price_raw = ad.get("price") or ad.get("priceValue") or ""
            if isinstance(price_raw, dict):
                price_text = str(price_raw.get("value") or price_raw.get("amount") or "")
            else:
                price_text = str(price_raw)

            ad_url = ad.get("url") or ad.get("slug") or ad.get("link") or ""

            if not title or not price_text or price_text in ("0", "", "None"):
                continue

            part_name = map_part_name(title)
            if not part_name:
                continue

            prices = parse_price_pkr(price_text)
            if not prices:
                try:
                    val = float(str(price_text).replace(",", ""))
                    if val > 0:
                        prices = (val * 0.9, val * 1.1)
                except (ValueError, TypeError):
                    continue

            if not prices:
                continue

            yield {
                "part_name": part_name,
                "car_make": extract_car_make(title),
                "car_model": extract_car_model(title),
                "car_year": extract_year(title),
                "price_min": prices[0],
                "price_max": prices[1],
                "source": "olx",
                "source_url": f"https://www.olx.com.pk{ad_url}" if ad_url.startswith("/") else (ad_url or response.url),
            }
            scraped += 1

        self.logger.info(f"[olx] Yielded {scraped} items for '{response.meta['query']}'")

        # Pagination
        current_page = response.meta.get("page", 1)
        total = (
            data.get("data", {}).get("totalCount") or
            data.get("data", {}).get("total") or
            data.get("totalCount") or
            0
        )
        per_page = 40
        if current_page < 5 and (current_page * per_page) < total:
            next_page = current_page + 1
            query = response.meta["query"]
            next_url = (
                f"{_API}?query={query.replace(' ', '+')}"
                f"&platform=web-desktop&page={next_page}&perPage={per_page}"
            )
            yield scrapy.Request(
                url=next_url,
                callback=self.parse_api,
                meta={"query": query, "page": next_page},
                errback=self.handle_error,
            )
