import re
import time
import scrapy
from app.core.part_mapper import map_gari_pk_part_name, parse_price_pkr

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

_BASE = "https://www.gari.pk/new-cars"

# All confirmed models with their gari.pk URL slugs.
# HR-V and BR-V excluded — their pages redirect to the gari.pk home page.
MODELS = [
    # ── Established models (confirmed to have price data) ──────────────────
    {"make": "Suzuki",  "model": "Mehran",   "slug": "suzuki/mehran"},
    {"make": "Suzuki",  "model": "Alto",     "slug": "suzuki/alto"},
    {"make": "Suzuki",  "model": "Cultus",   "slug": "suzuki/cultus"},
    {"make": "Suzuki",  "model": "Swift",    "slug": "suzuki/swift"},
    {"make": "Toyota",  "model": "Corolla",  "slug": "toyota/corolla"},
    {"make": "Toyota",  "model": "Yaris",    "slug": "toyota/yaris"},
    {"make": "Toyota",  "model": "Hilux",    "slug": "toyota/hilux"},
    {"make": "Toyota",  "model": "Fortuner", "slug": "toyota/fortuner"},
    {"make": "Toyota",  "model": "Prado",    "slug": "toyota/prado"},
    {"make": "Honda",   "model": "Civic",    "slug": "honda/civic"},
    {"make": "Honda",   "model": "City",     "slug": "honda/city"},
    # ── Pages exist but no data yet — attempt, log, continue ──────────────
    {"make": "Suzuki",  "model": "Wagon R",  "slug": "suzuki/wagon-r"},
    {"make": "Kia",     "model": "Sportage", "slug": "kia/sportage"},
    {"make": "Kia",     "model": "Picanto",  "slug": "kia/picanto"},
    {"make": "Hyundai", "model": "Tucson",   "slug": "hyundai/tucson"},
    {"make": "Hyundai", "model": "Elantra",  "slug": "hyundai/elantra"},
    {"make": "Changan", "model": "Alsvin",   "slug": "changan/alsvin"},
    {"make": "MG",      "model": "HS",       "slug": "mg/hs"},
]

# gari.pk section headings → internal grade enum values
GRADE_MAP = {
    "genuine":      "GENUINE",
    "duplicate":    "AFTERMARKET",
    "second-hand":  "USED",
    "second hand":  "USED",
    "used":         "USED",
}


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

        # ── Strategy 1: grade sections identified by heading text ──────────
        # gari.pk renders three card sections: Genuine / Duplicate / Second-Hand
        # Each section has a heading and a list of part cards underneath.
        for heading in response.css("h2, h3, h4, .section-title, [class*='heading']"):
            heading_text = " ".join(heading.css("::text").getall()).strip().lower()
            grade = self._resolve_grade(heading_text)
            if not grade:
                continue

            # Walk to the nearest parent that contains both the heading and part cards,
            # then select cards within it but not in sibling grade sections.
            section = heading.xpath(
                "ancestor::div[.//div[contains(@class,'card') "
                "or contains(@class,'part') "
                "or contains(@class,'item')]][1]"
            )
            if not section:
                # Fallback: look for the next sibling container
                section = heading.xpath("following-sibling::div[1]")

            cards = section.css(
                "[class*='card'], [class*='part-item'], [class*='price-item'], "
                ".col, li"
            )

            for card in cards:
                item = self._extract_item(card, make, model, grade, response.url)
                if item:
                    yield item
                    scraped += 1

        # ── Strategy 2: table with columns per grade ───────────────────────
        # Some pages may use a single table: Part Name | Genuine | Duplicate | Second-hand
        if scraped == 0:
            scraped += yield from self._parse_table(response, make, model)

        if scraped == 0:
            self.logger.warning(
                f"[gari.pk] {make} {model} — page loaded but 0 items extracted. "
                f"HTML snippet: {response.text[:800]!r}"
            )
        else:
            self.logger.info(f"[gari.pk] {make} {model} — {scraped} items scraped")

    def _parse_table(self, response, make, model):
        """Fallback: parse a table where each column is a grade."""
        scraped = 0
        for table in response.css("table"):
            headers = [
                th.css("::text").get("").strip().lower()
                for th in table.css("thead th, thead td")
            ]
            grade_cols = {}
            for idx, header in enumerate(headers):
                grade = self._resolve_grade(header)
                if grade:
                    grade_cols[idx] = grade

            if not grade_cols:
                continue

            for row in table.css("tbody tr"):
                cells = row.css("td")
                if not cells:
                    continue
                part_label = cells[0].css("::text").get("").strip()
                part_name  = map_gari_pk_part_name(part_label)
                if not part_name:
                    continue

                for col_idx, grade in grade_cols.items():
                    if col_idx >= len(cells):
                        continue
                    price_text = cells[col_idx].css("::text").get("").strip()
                    prices = parse_price_pkr(price_text)
                    if not prices:
                        continue
                    yield {
                        "part_name":  part_name,
                        "car_make":   make,
                        "car_model":  model,
                        "grade":      grade,
                        "price_min":  prices[0],
                        "price_max":  prices[1],
                        "source":     "gari_pk",
                        "source_url": response.url,
                    }
                    scraped += 1
        return scraped

    def _extract_item(self, card, make, model, grade, url):
        """Extract one part + price from a card element."""
        texts = [t.strip() for t in card.css("::text").getall() if t.strip()]
        if not texts:
            return None

        # Part name is usually the first meaningful text in the card
        part_label = next(
            (t for t in texts if len(t) > 3 and not re.match(r'^PKR|^Rs', t, re.I)),
            None,
        )
        if not part_label:
            return None

        part_name = map_gari_pk_part_name(part_label)
        if not part_name:
            self.logger.debug(f"[gari.pk] Unmapped part: {part_label!r}")
            return None

        # Price: find text containing PKR or Rs or digits with commas
        price_text = next(
            (t for t in texts if re.search(r'PKR|Rs\.?|\d{3,}', t, re.I)),
            None,
        )
        if not price_text:
            return None

        prices = parse_price_pkr(price_text)
        if not prices or prices[0] <= 0:
            return None

        return {
            "part_name":  part_name,
            "car_make":   make,
            "car_model":  model,
            "grade":      grade,
            "price_min":  prices[0],
            "price_max":  prices[1],
            "source":     "gari_pk",
            "source_url": url,
        }

    @staticmethod
    def _resolve_grade(text: str) -> str | None:
        for keyword, grade in GRADE_MAP.items():
            if keyword in text:
                return grade
        return None
