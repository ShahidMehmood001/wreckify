import re
import scrapy
from app.core.part_mapper import map_gari_pk_part_name, parse_price_pkr

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

_BASE = "https://www.gari.pk/new-cars"

# Confirmed model list with verified gari.pk URL slugs.
# HR-V and BR-V excluded — their pages redirect to the gari.pk home page.
# As of 2026-05-09: ONLY Honda Civic and Honda City have actual price data;
# all other model pages return "no spare parts list available".
# Kept in list so we detect when gari.pk adds data for them.
MODELS = [
    # ── Have confirmed spare-parts price data on gari.pk ──────────────────
    {"make": "Honda",   "model": "Civic",    "slug": "honda/civic"},
    {"make": "Honda",   "model": "City",     "slug": "honda/city"},
    # ── Pages exist, "no spare parts list available" as of 2026-05-09 ─────
    {"make": "Suzuki",  "model": "Mehran",   "slug": "suzuki/mehran"},
    {"make": "Suzuki",  "model": "Alto",     "slug": "suzuki/alto"},
    {"make": "Suzuki",  "model": "Cultus",   "slug": "suzuki/cultus"},
    {"make": "Suzuki",  "model": "Swift",    "slug": "suzuki/swift"},
    {"make": "Suzuki",  "model": "Wagon R",  "slug": "suzuki/wagon-r"},
    {"make": "Toyota",  "model": "Corolla",  "slug": "toyota/corolla"},
    {"make": "Toyota",  "model": "Yaris",    "slug": "toyota/yaris"},
    {"make": "Toyota",  "model": "Hilux",    "slug": "toyota/hilux"},
    {"make": "Toyota",  "model": "Fortuner", "slug": "toyota/fortuner"},
    {"make": "Toyota",  "model": "Prado",    "slug": "toyota/prado"},
    {"make": "Kia",     "model": "Sportage", "slug": "kia/sportage"},
    {"make": "Kia",     "model": "Picanto",  "slug": "kia/picanto"},
    {"make": "Hyundai", "model": "Tucson",   "slug": "hyundai/tucson"},
    {"make": "Hyundai", "model": "Elantra",  "slug": "hyundai/elantra"},
    {"make": "Changan", "model": "Alsvin",   "slug": "changan/alsvin"},
    {"make": "MG",      "model": "HS",       "slug": "mg/hs"},
]

# gari.pk shows one price per part in its carousel — no grade separation in HTML.
# The displayed price is the current market/aftermarket price (most common in Pakistan).
# All carousel items are stored as AFTERMARKET — the tier that covers 80% of Pakistani
# repair decisions (D4 decision from PRICING_PLAN_REVIEW.md).
DEFAULT_GRADE = "AFTERMARKET"


class GariPkSpider(scrapy.Spider):
    name = "gari_pk"
    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": False,
        "CONCURRENT_REQUESTS": 1,
        "ROBOTSTXT_OBEY": False,
        "DEFAULT_REQUEST_HEADERS": {
            "User-Agent": _UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.gari.pk/",
        },
    }

    def start_requests(self):
        for m in MODELS:
            url = f"{_BASE}/{m['slug']}/spare-parts-price/"
            yield scrapy.Request(
                url=url,
                callback=self.parse_model_page,
                meta={"make": m["make"], "model": m["model"]},
                errback=self.handle_error,
            )

    def handle_error(self, failure):
        self.logger.error(
            f"[gari.pk] Request failed: {failure.request.url} — {failure.value}"
        )

    def parse_model_page(self, response):
        make  = response.meta["make"]
        model = response.meta["model"]

        # Redirect guard — gari.pk redirects unknown models to home
        if "spare-parts-price" not in response.url:
            self.logger.warning(
                f"[gari.pk] {make} {model} — redirected to {response.url}, skipping"
            )
            return

        # No-data guard
        if "no spare parts list available" in response.text.lower():
            self.logger.info(
                f"[gari.pk] {make} {model} — no spare parts data on gari.pk"
            )
            return

        scraped = 0

        # gari.pk structure (verified from HTML inspection):
        #   div.responsive.my_slider
        #     └─ div.fleft.my_s_class  (one card per part)
        #          └─ div.slider_inner
        #               └─ div (wrapper)
        #                    ├─ div.bold.fleft  →  <a>Part Name</a>
        #                    └─ div[color:gray].fleft  →  "Rs. 51,340"
        #
        # One slider, one price per part — stored as AFTERMARKET (market price).
        for card in response.css("div.my_s_class"):
            item = self._extract_card(card, make, model, response.url)
            if item:
                yield item
                scraped += 1

        if scraped == 0:
            self.logger.warning(
                f"[gari.pk] {make} {model} — 0 items extracted. "
                f"Snippet: {response.text[193000:194500]!r}"
            )
        else:
            self.logger.info(f"[gari.pk] {make} {model} — {scraped} items scraped")

    def _extract_card(self, card, make, model, url):
        # Part name: inside div.bold > a
        part_label = (
            card.css("div.bold a::text").get("").strip() or
            card.css("div.bold::text").get("").strip()
        )
        if not part_label:
            return None

        part_name = map_gari_pk_part_name(part_label)
        if not part_name:
            self.logger.debug(f"[gari.pk] Unmapped part label: {part_label!r}")
            return None

        # Price: div with inline style containing "color: gray" or "color:gray"
        price_text = card.css("div[style*='color: gray']::text").get("").strip()
        if not price_text:
            # Fallback: last div.fleft that contains a price pattern
            for div in card.css("div.fleft"):
                text = div.css("::text").get("").strip()
                if re.search(r'Rs\.?\s*[\d,]+', text):
                    price_text = text
                    break

        if not price_text:
            return None

        prices = parse_price_pkr(price_text)
        if not prices or prices[0] <= 0:
            return None

        return {
            "part_name":  part_name,
            "car_make":   make,
            "car_model":  model,
            "grade":      DEFAULT_GRADE,
            "price_min":  prices[0],
            "price_max":  prices[1],
            "source":     "gari_pk",
            "source_url": url,
        }
