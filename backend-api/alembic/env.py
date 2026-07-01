import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

load_dotenv()

config = context.config

# Inject DB URL from environment
config.set_section_option(config.config_ini_section, "DB_USER", os.getenv("DB_USER", ""))
config.set_section_option(config.config_ini_section, "DB_PASSWORD", os.getenv("DB_PASSWORD", ""))
config.set_section_option(config.config_ini_section, "DB_HOST", os.getenv("DB_HOST", "localhost"))
config.set_section_option(config.config_ini_section, "DB_NAME", os.getenv("DB_NAME", ""))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.models.models import Base
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
