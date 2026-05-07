import logging
from datetime import datetime
from scrapy import signals
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from app.core.db import get_session, log_scraper_run
from app.spiders.olx_spider import OlxSpider
from app.spiders.pakwheels_spider import PakWheelsSpider

logger = logging.getLogger(__name__)

SPIDER_CLASSES = [OlxSpider, PakWheelsSpider]


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
            "session": get_session(),
            "started_at": started_at,
            "records_added": 0,
            "error": None,
        }

        crawler = process.create_crawler(spider_class)

        def make_closed_handler(src, crwlr):
            def on_spider_closed(spider, reason):
                # Use Scrapy's built-in stats — reliable across all versions
                count = crwlr.stats.get_value("item_scraped_count", 0) if crwlr.stats else 0
                run_meta[src]["records_added"] = count
                if reason != "finished":
                    run_meta[src]["error"] = f"Spider closed with reason: {reason}"
                logger.info(f"[{src}] Spider closed — reason={reason}, records={count}")
            return on_spider_closed

        crawler.signals.connect(
            make_closed_handler(source, crawler),
            signal=signals.spider_closed,
        )
        process.crawl(crawler)

    try:
        process.start(stop_after_crawl=True)
    except Exception as e:
        logger.error(f"CrawlerProcess failed: {e}")
        for meta in run_meta.values():
            if meta["error"] is None:
                meta["error"] = str(e)

    for source, meta in run_meta.items():
        session = meta["session"]
        status = "success" if meta["error"] is None else "failed"
        try:
            log_scraper_run(
                session=session,
                source=source,
                status=status,
                records_added=meta["records_added"],
                error_message=meta["error"],
                started_at=meta["started_at"],
                finished_at=datetime.utcnow(),
            )
            logger.info(
                f"[{source}] Run logged — status={status}, records={meta['records_added']}"
            )
        except Exception as e:
            logger.error(f"[{source}] Failed to log run: {e}")
        finally:
            session.close()

    logger.info("Scheduled scrape run complete.")
