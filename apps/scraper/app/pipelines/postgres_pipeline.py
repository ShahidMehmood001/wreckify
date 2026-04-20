from app.core.db import get_session, insert_scraped_price
from scrapy.exceptions import DropItem


class PostgresPipeline:
    def __init__(self):
        self.session = None
        self.records_added = 0

    def open_spider(self, spider):
        self.session = get_session()
        self.records_added = 0

    def close_spider(self, spider):
        try:
            self.session.commit()
            spider.logger.info(f"Pipeline committed {self.records_added} records to DB")
        except Exception as e:
            self.session.rollback()
            spider.logger.error(f"Pipeline commit failed: {e}")
        finally:
            self.session.close()

    def process_item(self, item, spider):
        try:
            insert_scraped_price(self.session, dict(item))
            self.records_added += 1
        except Exception as e:
            spider.logger.warning(f"Failed to insert item: {e} — {item}")
            raise DropItem(f"DB insert failed: {e}")
        return item
