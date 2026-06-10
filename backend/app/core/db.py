from sqlmodel import SQLModel, Session, create_engine
from .config import settings

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}
        _engine = create_engine(settings.database_url, connect_args=args, echo=False)
    return _engine


def get_session():
    with Session(get_engine()) as session:
        yield session
