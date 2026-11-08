import pytest
from app.database.session import engine, Base, apply_sqlite_migrations

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    apply_sqlite_migrations(engine)
    yield
