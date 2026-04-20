import logging
from datetime import datetime
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from app.core.db import get_session, log_scraper_run
from app.spiders.olx_spider import OlxSpider
from app.spiders.pakwheels_spider import PakWheelsSpider

logger = logging.getLogger(__name__)


def run_spider(spider_class):
    source = spider_class.name
    started_at = datetime.utcnow()
    session = get_session()
    records_added = 0

    try:
        settings = get_project_settings()
        settings.update({
            "ITEM_PIPELINES": {"app.pipelines.postgres_pipeline.PostgresPipeline": 300},
            "LOG_LEVEL": "WARNING",
        })

        process = CrawlerProcess(settings)
        crawler = process.create_crawler(spider_class)
        process.crawl(crawler)
        process.start(stop_after_crawl=True)

        pipeline = None
        for ext in crawler.engine.scraper.itemproc.middlewares:
            if hasattr(ext, "records_added"):
                pipeline = ext
                break

        if pipeline:
            records_added = pipeline.records_added

        log_scraper_run(
            session=session,
            source=source,
            status="success",
            records_added=records_added,
            error_message=None,
            started_at=started_at,
            finished_at=datetime.utcnow(),
        )
        logger.info(f"[{source}] Scrape complete — {records_added} records added")

    except Exception as e:
        logger.error(f"[{source}] Scrape failed: {e}")
        log_scraper_run(
            session=session,
            source=source,
            status="failed",
            records_added=0,
            error_message=str(e),
            started_at=started_at,
            finished_at=datetime.utcnow(),
        )
    finally:
        session.close()


def run_all_spiders():
    logger.info("Starting scheduled scrape run...")
    run_spider(OlxSpider)
    run_spider(PakWheelsSpider)
    logger.info("Scheduled scrape run complete.")
