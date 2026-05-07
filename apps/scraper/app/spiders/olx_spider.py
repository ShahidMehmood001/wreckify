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

# Spare parts category page (user-verified 2026-05-07): /spare-parts_c82
_BASE = "https://www.olx.com.pk/spare-parts_c82"

SEARCH_QUERIES = [
    "bumper", "car door", "bonnet", "windscreen",
    "headlight", "taillight", "fender", "side mirror",
]


class OlxSpider(scrapy.Spider):
    name = "olx"
    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
        "ROBOTSTXT_OBEY": False,
        "DEFAULT_REQUEST_HEADERS": {
            "User-Agent": _UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    }

    def start_requests(self):
        for query in SEARCH_QUERIES:
            url = f"{_BASE}?q={query.replace(' ', '+')}"
            yield scrapy.Request(
                url=url,
                callback=self.parse_page,
                meta={"query": query, "page": 1},
                errback=self.handle_error,
            )

    def handle_error(self, failure):
        self.logger.error(f"[olx] Request error: {failure.request.url} — {failure.value}")

    def parse_page(self, response):
        # Guard: should stay on olx.com.pk spare-parts
        if "olx.com.pk" not in response.url:
            self.logger.warning(f"[olx] Unexpected redirect — final URL: {response.url}")
            return

        # OLX Pakistan uses Next.js SSR — listings are in __NEXT_DATA__ JSON
        raw = response.css("script#__NEXT_DATA__::text").get()
        if not raw:
            self.logger.warning(
                f"[olx] No __NEXT_DATA__ on {response.url} "
                f"(status={response.status}, size={len(response.body)}b). "
                f"HTML snippet: {response.text[:500]!r}"
            )
            return

        try:
            next_data = json.loads(raw)
        except json.JSONDecodeError as e:
            self.logger.error(f"[olx] __NEXT_DATA__ JSON parse error: {e}")
            return

        # Navigate common OLX Next.js pageProps shapes
        page_props = next_data.get("props", {}).get("pageProps", {})
        listings = (
            page_props.get("listings") or
            page_props.get("ads") or
            page_props.get("data", {}).get("listings") if isinstance(page_props.get("data"), dict) else None or
            []
        )

        if not listings:
            # Log top-level keys to help identify the correct path
            self.logger.warning(
                f"[olx] No listings in __NEXT_DATA__ for '{response.meta['query']}'. "
                f"pageProps keys: {list(page_props.keys())} "
                f"data keys: {list(page_props.get('data', {}).keys()) if isinstance(page_props.get('data'), dict) else 'N/A'}"
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

        # Pagination — OLX Next.js typically embeds page info in __NEXT_DATA__
        current_page = response.meta.get("page", 1)
        pagination = page_props.get("pagination") or page_props.get("data", {}).get("pagination", {})
        total_pages = (
            pagination.get("totalPages") or
            pagination.get("pages") or
            0
        ) if isinstance(pagination, dict) else 0

        if current_page < 5 and current_page < total_pages:
            next_page = current_page + 1
            query = response.meta["query"]
            next_url = f"{_BASE}?q={query.replace(' ', '+')}&page={next_page}"
            yield scrapy.Request(
                url=next_url,
                callback=self.parse_page,
                meta={"query": query, "page": next_page},
                errback=self.handle_error,
            )
