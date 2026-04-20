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
        session = get_session()
        run_meta[source] = {
            "session": session,
            "started_at": started_at,
            "records_added": 0,
        }

        crawler = process.create_crawler(spider_class)

        def make_closed_handler(src, crwlr):
            def on_spider_closed(spider, reason):
                for mw in crwlr.engine.scraper.itemproc.middlewares:
                    if hasattr(mw, "records_added"):
                        run_meta[src]["records_added"] = mw.records_added
                        break
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

    for source, meta in run_meta.items():
        session = meta["session"]
        try:
            log_scraper_run(
                session=session,
                source=source,
                status="success",
                records_added=meta["records_added"],
                error_message=None,
                started_at=meta["started_at"],
                finished_at=datetime.utcnow(),
            )
            logger.info(f"[{source}] Scrape complete — {meta['records_added']} records added")
        except Exception as e:
            logger.error(f"[{source}] Failed to log run: {e}")
        finally:
            session.close()

    logger.info("Scheduled scrape run complete.")
