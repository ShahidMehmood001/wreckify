import scrapy
from app.core.part_mapper import (
    map_part_name, extract_car_make, extract_car_model, extract_year, parse_price_pkr
)


class PakWheelsSpider(scrapy.Spider):
    name = "pakwheels"
    custom_settings = {
        "DOWNLOAD_DELAY": 2.5,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "CONCURRENT_REQUESTS": 1,
        "ROBOTSTXT_OBEY": True,
        "DEFAULT_REQUEST_HEADERS": {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    }

    CATEGORIES = [
        "body-parts",
        "lights",
        "glass-mirrors",
    ]

    def start_requests(self):
        base = "https://www.pakwheels.com/classifieds/car-accessories-parts"
        for category in self.CATEGORIES:
            yield scrapy.Request(
                url=f"{base}/{category}/",
                callback=self.parse_listing,
                meta={"category": category, "page": 1},
            )

    def parse_listing(self, response):
        # PakWheels listing cards
        cards = response.css("li.classified-listing, div.car-listing")

        for card in cards:
            title = card.css("h2::text, h3::text, .listing-name::text").get("").strip()
            price_text = card.css(".price-details::text, .listing-price::text, strong.price::text").get("").strip()
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
                "source": "pakwheels",
                "source_url": response.urljoin(url) if url else response.url,
            }

        # Pagination
        next_page = response.css("a[rel='next']::attr(href), .next_page::attr(href)").get()
        current_page = response.meta.get("page", 1)

        if next_page and current_page < 5:
            yield response.follow(
                next_page,
                callback=self.parse_listing,
                meta={"category": response.meta["category"], "page": current_page + 1},
            )
