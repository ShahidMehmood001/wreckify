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

# PakWheels search queries via their auto-parts search
SEARCH_QUERIES = [
    "bumper", "car door", "bonnet", "windscreen",
    "headlight", "taillight", "fender", "side mirror",
]


class PakWheelsSpider(scrapy.Spider):
    name = "pakwheels"
    custom_settings = {
        "DOWNLOAD_DELAY": 2.5,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
        "ROBOTSTXT_OBEY": False,
        "DEFAULT_REQUEST_HEADERS": {
            "User-Agent": _UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    }

    def start_requests(self):
        for query in SEARCH_QUERIES:
            # PakWheels auto-parts search URL (current structure)
            url = f"https://www.pakwheels.com/auto-parts/?q={query.replace(' ', '+')}"
            yield scrapy.Request(
                url=url,
                callback=self.parse_listing,
                meta={"query": query, "page": 1},
                headers={"User-Agent": _UA},
                errback=self.handle_error,
            )

    def handle_error(self, failure):
        self.logger.error(
            f"[pakwheels] Request failed: {failure.request.url} — {failure.value}"
        )

    def parse_listing(self, response):
        # Guard: if we got redirected to homepage, the URL path doesn't exist
        if response.url == "https://www.pakwheels.com/" or "/auto-parts/" not in response.url:
            self.logger.warning(
                f"[pakwheels] Redirected away from auto-parts. "
                f"Final URL: {response.url} — URL structure may have changed again."
            )
            return

        # Try HTML selectors first (PakWheels uses server-rendered HTML for listings)
        cards = (
            response.css("li.classified-listing") or
            response.css("li.search-listing") or
            response.css("div.auto-part-listing") or
            response.css("article.auto-part") or
            response.css("div[class*='listing']")
        )

        # If HTML selectors fail, try __NEXT_DATA__ (PakWheels may also use Next.js)
        if not cards:
            raw = response.css("script#__NEXT_DATA__::text").get()
            if raw:
                yield from self._parse_next_data(response, raw)
                return

            self.logger.warning(
                f"[pakwheels] No cards found on {response.url} "
                f"(status={response.status}, size={len(response.body)}b). "
                f"HTML snippet: {response.text[:400]!r}"
            )
            return

        scraped = 0
        for card in cards:
            title = (
                card.css("h2 a::text").get("") or
                card.css("h3 a::text").get("") or
                card.css("h2::text").get("") or
                card.css(".listing-name::text").get("") or
                card.css(".search-title-bar a::text").get("")
            ).strip()

            price_text = (
                card.css("strong.price-detail::text").get("") or
                card.css(".price-details strong::text").get("") or
                card.css(".price-details::text").get("") or
                card.css(".listing-price::text").get("") or
                card.css("[class*='price']::text").get("")
            ).strip()

            url = card.css("a::attr(href)").get("") or ""

            if not title or not price_text:
                continue

            part_name = map_part_name(title)
            if not part_name:
                continue

            prices = parse_price_pkr(price_text)
            if not prices:
                continue

            yield {
                "part_name": part_name,
                "car_make": extract_car_make(title),
                "car_model": extract_car_model(title),
                "car_year": extract_year(title),
                "price_min": prices[0],
                "price_max": prices[1],
                "source": "pakwheels",
                "source_url": response.urljoin(url) if url else response.url,
            }
            scraped += 1

        self.logger.info(f"[pakwheels] Scraped {scraped} items from {response.url}")

        # Pagination
        next_page = (
            response.css("a[rel='next']::attr(href)").get() or
            response.css(".next_page a::attr(href)").get() or
            response.css("li.next a::attr(href)").get()
        )
        current_page = response.meta.get("page", 1)
        if next_page and current_page < 5:
            yield response.follow(
                next_page,
                callback=self.parse_listing,
                meta={"query": response.meta["query"], "page": current_page + 1},
                headers={"User-Agent": _UA},
                errback=self.handle_error,
            )

    def _parse_next_data(self, response, raw):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            self.logger.error(f"[pakwheels] Failed to parse __NEXT_DATA__: {e}")
            return

        page_props = data.get("props", {}).get("pageProps", {})
        listings = (
            page_props.get("listings") or
            page_props.get("ads") or
            page_props.get("parts") or
            page_props.get("results") or
            []
        )

        if not listings:
            self.logger.warning(
                f"[pakwheels] No listings in __NEXT_DATA__ on {response.url}. "
                f"pageProps keys: {list(page_props.keys())}"
            )
            return

        for item in listings:
            title = (item.get("title") or item.get("name") or "").strip()
            price_raw = item.get("price") or item.get("priceValue") or ""
            price_text = str(price_raw.get("value", "") if isinstance(price_raw, dict) else price_raw)

            if not title or not price_text or price_text in ("0", ""):
                continue

            part_name = map_part_name(title)
            if not part_name:
                continue

            prices = parse_price_pkr(price_text)
            if not prices:
                try:
                    val = float(price_text.replace(",", ""))
                    prices = (val * 0.9, val * 1.1) if val > 0 else None
                except ValueError:
                    pass

            if not prices:
                continue

            yield {
                "part_name": part_name,
                "car_make": extract_car_make(title),
                "car_model": extract_car_model(title),
                "car_year": extract_year(title),
                "price_min": prices[0],
                "price_max": prices[1],
                "source": "pakwheels",
                "source_url": item.get("url") or response.url,
            }
