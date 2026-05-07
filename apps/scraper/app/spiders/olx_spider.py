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
        # Try all known OLX Pakistan card selectors
        cards = (
            response.css("li[data-aut-id='itemBox']") or
            response.css("div[data-aut-id='adCard']") or
            response.css("li._2Gniw") or           # class-based fallback
            response.css("article.ad-card")
        )

        if not cards:
            self.logger.warning(
                f"[olx] No cards found on {response.url} "
                f"(status={response.status}, size={len(response.body)}b). "
                f"Page HTML snippet: {response.text[:300]!r}"
            )

        for card in cards:
            title = (
                card.css("[data-aut-id='itemTitle']::text").get("") or
                card.css("p[data-aut-id='itemTitle']::text").get("") or
                card.css("h2::text").get("") or
                card.css("h3::text").get("")
            ).strip()

            price_text = (
                card.css("[data-aut-id='itemPrice']::text").get("") or
                card.css("span[aria-label*='price' i]::text").get("") or
                card.css("span.price::text").get("") or
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
                "source": "olx",
                "source_url": response.urljoin(url) if url else response.url,
            }

        # Pagination
        next_page = (
            response.css("a[data-aut-id='btnLoadMore']::attr(href)").get() or
            response.css("a.pagination-next::attr(href)").get() or
            response.css("a[aria-label='Next page']::attr(href)").get()
        )
        current_page = response.meta.get("page", 1)

        if next_page and current_page < 5:
            yield response.follow(
                next_page,
                callback=self.parse_listing,
                meta={"query": response.meta["query"], "page": current_page + 1},
                headers={"User-Agent": _UA},
            )
