import scrapy
from app.core.part_mapper import (
    map_part_name, extract_car_make, extract_car_model, extract_year, parse_price_pkr
)

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

SEARCH_QUERIES = [
    "bumper", "car door", "bonnet", "windscreen",
    "headlight", "taillight", "fender", "side mirror",
]

# Confirmed working search URL (user-verified 2026-05-07): /search/-/?q=bumper
_BASE = "https://www.pakwheels.com/accessories-spare-parts/search/-/"


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
            "Accept-Language": "en-US,en;q=0.9",
        },
    }

    def start_requests(self):
        for query in SEARCH_QUERIES:
            url = f"{_BASE}?q={query.replace(' ', '+')}"
            yield scrapy.Request(
                url=url,
                callback=self.parse_listing,
                meta={"query": query, "page": 1},
                errback=self.handle_error,
            )

    def handle_error(self, failure):
        self.logger.error(f"[pakwheels] Request error: {failure.request.url} — {failure.value}")

    def parse_listing(self, response):
        # Guard: redirected away
        if "accessories-spare-parts" not in response.url:
            self.logger.warning(
                f"[pakwheels] Unexpected redirect — final URL: {response.url}. "
                f"HTML snippet: {response.text[:400]!r}"
            )
            return

        # PakWheels is server-rendered Rails — try known listing selectors
        cards = (
            response.css("li.classified-listing") or
            response.css("li.search-listing") or
            response.css("div.classified-listing") or
            response.css("article.classified-listing")
        )

        if not cards:
            self.logger.warning(
                f"[pakwheels] No cards on {response.url} "
                f"(status={response.status}, size={len(response.body)}b). "
                f"HTML snippet: {response.text[:500]!r}"
            )
            return

        # Diagnostic: log all text nodes from first card to identify title/price selectors
        texts = [t.strip() for t in cards[0].css("*::text").getall() if t.strip()]
        self.logger.warning(f"[pakwheels] Card texts: {texts[:30]}")

        scraped = 0
        for card in cards:
            title = (
                card.css("h2 a::text").get("") or
                card.css("h3 a::text").get("") or
                card.css("h2::text").get("") or
                card.css(".search-title-bar a::text").get("") or
                card.css(".listing-name::text").get("")
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
                errback=self.handle_error,
            )
