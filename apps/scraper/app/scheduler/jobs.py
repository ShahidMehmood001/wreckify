import json
import logging
from datetime import datetime
from scrapy import signals
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from app.core.db import get_session, log_scraper_run
from app.spiders.gari_pk_spider import GariPkSpider

logger = logging.getLogger(__name__)

SPIDER_CLASSES = [GariPkSpider]

# Minimum models that must return data for the run to be considered healthy.
MIN_MODELS_THRESHOLD = 8


def run_all_spiders():
    logger.info("Starting scheduled scrape run...")

    settings = get_project_settings()
    settings.update({
        "ITEM_PIPELINES": {"app.pipelines.postgres_pipeline.PostgresPipeline": 300},
        "LOG_LEVEL": "WARNING",
    })

    process = CrawlerProcess(settings)
    run_meta = {}

    for spider_class in SPIDER_CLASSES:
        source = spider_class.name
        started_at = datetime.utcnow()
        run_meta[source] = {
            "session":      get_session(),
            "started_at":   started_at,
            "records_added": 0,
            "error":        None,
            # Coverage tracking — populated by spider signals
            "models_with_data": set(),
            "parts_by_model":   {},
            "tiers_by_model":   {},
        }

        crawler = process.create_crawler(spider_class)

        def make_item_handler(src):
            def on_item_scraped(item, response, spider):
                meta = run_meta[src]
                key = f"{item['car_make']} {item['car_model']}"
                meta["models_with_data"].add(key)
                meta["parts_by_model"].setdefault(key, set()).add(item["part_name"])
                meta["tiers_by_model"].setdefault(key, set()).add(item["grade"])
            return on_item_scraped

        def make_closed_handler(src, crwlr):
            def on_spider_closed(spider, reason):
                count = crwlr.stats.get_value("item_scraped_count", 0) if crwlr.stats else 0
                run_meta[src]["records_added"] = count
                if reason != "finished":
                    run_meta[src]["error"] = f"Spider closed: {reason}"
                logger.info(f"[{src}] Spider closed — reason={reason}, records={count}")
            return on_spider_closed

        crawler.signals.connect(make_item_handler(source),   signal=signals.item_scraped)
        crawler.signals.connect(make_closed_handler(source, crawler), signal=signals.spider_closed)
        process.crawl(crawler)

    try:
        process.start(stop_after_crawl=True)
    except Exception as e:
        logger.error(f"CrawlerProcess failed: {e}")
        for meta in run_meta.values():
            if meta["error"] is None:
                meta["error"] = str(e)

    for source, meta in run_meta.items():
        coverage = _build_coverage_report(meta)
        _log_coverage(source, coverage)

        status = "success" if meta["error"] is None else "failed"
        if coverage["models_with_data"] < MIN_MODELS_THRESHOLD:
            status = "low_coverage"
            logger.error(
                f"[{source}] LOW COVERAGE — only {coverage['models_with_data']} models "
                f"returned data (minimum: {MIN_MODELS_THRESHOLD})"
            )

        session = meta["session"]
        try:
            log_scraper_run(
                session=session,
                source=source,
                status=status,
                records_added=meta["records_added"],
                error_message=json.dumps(coverage),
                started_at=meta["started_at"],
                finished_at=datetime.utcnow(),
            )
        except Exception as e:
            logger.error(f"[{source}] Failed to log run: {e}")
        finally:
            session.close()

    logger.info("Scheduled scrape run complete.")


def _build_coverage_report(meta: dict) -> dict:
    models = meta["models_with_data"]
    parts  = meta["parts_by_model"]
    tiers  = meta["tiers_by_model"]

    model_count = len(models)
    parts_per_model = {m: len(p) for m, p in parts.items()}
    avg_parts = (
        sum(parts_per_model.values()) / model_count if model_count else 0
    )
    full_tier_count = sum(
        1 for m in models if len(tiers.get(m, set())) == 3
    )
    full_tier_pct = round(full_tier_count / model_count * 100) if model_count else 0

    return {
        "models_with_data":     model_count,
        "avg_parts_per_model":  round(avg_parts, 1),
        "full_3tier_models":    full_tier_count,
        "full_3tier_pct":       full_tier_pct,
        "model_detail": {
            m: {
                "parts": list(parts.get(m, [])),
                "tiers": list(tiers.get(m, [])),
            }
            for m in sorted(models)
        },
        "total_records": meta["records_added"],
    }


def _log_coverage(source: str, coverage: dict):
    logger.info(
        f"\n{'='*60}\n"
        f"  COVERAGE REPORT — {source}\n"
        f"{'='*60}\n"
        f"  Models with data:    {coverage['models_with_data']}\n"
        f"  Avg parts/model:     {coverage['avg_parts_per_model']}\n"
        f"  Full 3-tier models:  {coverage['full_3tier_models']} "
        f"({coverage['full_3tier_pct']}%)\n"
        f"  Total records:       {coverage['total_records']}\n"
        f"{'='*60}"
    )
