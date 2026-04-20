import scrapy
from app.core.part_mapper import (
    map_part_name, extract_car_make, extract_car_model, extract_year, parse_price_pkr
)


class OlxSpider(scrapy.Spider):
    name = "olx"
    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 2,
        "ROBOTSTXT_OBEY": True,
        "DEFAULT_REQUEST_HEADERS": {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    }

    SEARCH_QUERIES = [
        "bumper", "car+door", "bonnet", "windscreen",
        "headlight", "taillight", "fender", "car+mirror",
    ]

    def start_requests(self):
        base_url = "https://www.olx.com.pk/items/q-"
        for query in self.SEARCH_QUERIES:
            yield scrapy.Request(
                url=f"{base_url}{query}",
                callback=self.parse_listing,
                meta={"query": query, "page": 1},
            )

    def parse_listing(self, response):
        # OLX listing cards
        cards = response.css("li[data-aut-id='itemBox'], div[data-aut-id='adCard']")

        for card in cards:
            title = card.css("[data-aut-id='itemTitle']::text, h2::text").get("").strip()
            price_text = card.css("[data-aut-id='itemPrice']::text, span.price::text").get("").strip()
            url = card.css("a::attr(href)").get("")

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

        # Pagination — next page
        next_page = response.css("a[data-aut-id='btnLoadMore']::attr(href), a.pagination-next::attr(href)").get()
        current_page = response.meta.get("page", 1)

        if next_page and current_page < 5:
            yield response.follow(
                next_page,
                callback=self.parse_listing,
                meta={"query": response.meta["query"], "page": current_page + 1},
            )
