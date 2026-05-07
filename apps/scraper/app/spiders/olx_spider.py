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


class OlxSpider(scrapy.Spider):
    name = "olx"
    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
        "ROBOTSTXT_OBEY": False,
        "DEFAULT_REQUEST_HEADERS": {
            "User-Agent": _UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    }

    SEARCH_QUERIES = [
        "bumper", "car+door", "bonnet", "windscreen",
        "headlight", "taillight", "fender", "car+mirror",
    ]

    def start_requests(self):
        for query in self.SEARCH_QUERIES:
            url = f"https://www.olx.com.pk/items/q-{query}"
            yield scrapy.Request(
                url=url,
                callback=self.parse_listing,
                meta={"query": query, "page": 1},
                headers={"User-Agent": _UA},
            )

    def parse_listing(self, response):
        # OLX is a Next.js app — listing data is in __NEXT_DATA__ JSON, not in DOM
        raw = response.css("script#__NEXT_DATA__::text").get()
        if not raw:
            self.logger.warning(
                f"[olx] No __NEXT_DATA__ on {response.url} "
                f"(status={response.status}, size={len(response.body)}b)"
            )
            return

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            self.logger.error(f"[olx] Failed to parse __NEXT_DATA__ on {response.url}: {e}")
            return

        page_props = data.get("props", {}).get("pageProps", {})

        # Try known keys where OLX Pakistan stores listing arrays
        listings = (
            page_props.get("listings") or
            page_props.get("ads") or
            page_props.get("adList") or
            page_props.get("regularAds") or
            page_props.get("data", {}).get("listings") if isinstance(page_props.get("data"), dict) else None or
            []
        )

        if not listings:
            self.logger.warning(
                f"[olx] No listings found in __NEXT_DATA__ on {response.url}. "
                f"pageProps keys: {list(page_props.keys())}"
            )
            return

        self.logger.info(f"[olx] Found {len(listings)} listings on {response.url}")

        for ad in listings:
            title = (ad.get("title") or ad.get("name") or "").strip()

            # Price can be a dict {value, currency} or a plain string/number
            price_raw = ad.get("price") or ad.get("priceValue") or ""
            if isinstance(price_raw, dict):
                price_text = str(price_raw.get("value", "") or price_raw.get("amount", ""))
            else:
                price_text = str(price_raw)

            ad_url = ad.get("url") or ad.get("slug") or ad.get("link") or ""

            if not title or not price_text or price_text in ("0", ""):
                continue

            part_name = map_part_name(title)
            if not part_name:
                continue

            prices = parse_price_pkr(price_text)
            if not prices:
                # price_text may already be a plain number from the API
                try:
                    val = float(price_text.replace(",", ""))
                    if val > 0:
                        prices = (val * 0.9, val * 1.1)
                except ValueError:
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
                "source_url": response.urljoin(ad_url) if ad_url else response.url,
            }

        # Pagination — OLX Pakistan appends ?page=N to the search URL
        current_page = response.meta.get("page", 1)
        if len(listings) >= 20 and current_page < 5:
            base = response.url.split("?")[0]
            next_url = f"{base}?page={current_page + 1}"
            yield scrapy.Request(
                url=next_url,
                callback=self.parse_listing,
                meta={"query": response.meta["query"], "page": current_page + 1},
                headers={"User-Agent": _UA},
            )
