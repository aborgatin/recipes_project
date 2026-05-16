from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:////data/recipes.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week
    upload_dir: str = "/data/uploads"

    class Config:
        env_file = ".env"


settings = Settings()
