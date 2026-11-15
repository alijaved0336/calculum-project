from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_user: str = "postgres"
    postgres_password: str = ""
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "calculum"
    postgres_dsn: str = ""
    ALGORITHM: str = "HS256"

    jwt_secret: str = "35787b59582c30eec2822c460601b84cb03e0dad537daa5e9d532155696229e5"
    jwt_expiry_hours: int = 24
    password_pepper: str = "4d71a88c0165fcf51bb370082bbc4f16be33824d276f0ca892f9792f38ad3376"

    cors_origins: list[str] = ["*"]

    model_config = {"extra": "ignore", "env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
