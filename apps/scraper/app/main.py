import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.core.config import get_settings
from app.scheduler.jobs import run_all_spiders

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    settings = get_settings()
    scheduler = BlockingScheduler()

    scheduler.add_job(
        func=run_all_spiders,
        trigger=IntervalTrigger(hours=settings.scraper_interval_hours),
        id="scrape_all",
        name="Scrape OLX + PakWheels",
        replace_existing=True,
        max_instances=1,
    )

    logger.info(
        f"Scraper scheduler started — running every {settings.scraper_interval_hours} hours"
    )
    logger.info("Running initial scrape now...")

    # Run immediately on startup, then on schedule
    run_all_spiders()

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scraper scheduler stopped.")


if __name__ == "__main__":
    main()
