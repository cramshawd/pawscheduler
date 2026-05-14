from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    supabase_jwt_secret: str
    invite_secret_key: str
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
