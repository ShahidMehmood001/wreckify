from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import get_settings


def get_engine():
    settings = get_settings()
    return create_engine(settings.database_url)


def get_session():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session()
