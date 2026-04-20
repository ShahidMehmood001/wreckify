from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from .config import get_settings


def get_engine():
    settings = get_settings()
    return create_engine(settings.database_url, pool_pre_ping=True)


def get_session():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session()


def insert_scraped_price(session, record: dict):
    session.execute(
        text("""
            INSERT INTO scraped_part_prices
                (id, part_name, car_make, car_model, car_year,
                 price_min, price_max, currency, source, source_url, scraped_at)
            VALUES
                (gen_random_uuid(), :part_name, :car_make, :car_model, :car_year,
                 :price_min, :price_max, 'PKR', :source, :source_url, NOW())
        """),
        record,
    )


def log_scraper_run(session, source: str, status: str, records_added: int,
                    error_message: str | None, started_at, finished_at=None):
    session.execute(
        text("""
            INSERT INTO scraper_logs
                (id, source, status, records_added, error_message, started_at, finished_at)
            VALUES
                (gen_random_uuid(), :source, :status, :records_added,
                 :error_message, :started_at, :finished_at)
        """),
        {
            "source": source,
            "status": status,
            "records_added": records_added,
            "error_message": error_message,
            "started_at": started_at,
            "finished_at": finished_at,
        },
    )
    session.commit()
