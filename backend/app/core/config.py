from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """
    Application settings loaded from .env file.
    All values will be read from .env if present, otherwise defaults are used.
    """
    
    # MongoDB settings - Read from .env or use defaults
    MONGODB_URL: str = Field(
        default="mongodb://localhost:27017/",
        description="MongoDB connection URL"
    )
    MONGODB_DB_NAME: str = Field(
        default="Dermadoc",
        description="MongoDB database name"
    )
    
    # Security - Read from .env or use defaults
    SECRET_KEY: str = Field(
        default="your-secret-key-change-this-in-production",
        description="Secret key for JWT tokens"
    )
    ALGORITHM: str = Field(
        default="HS256",
        description="JWT algorithm"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="JWT token expiration time in minutes"
    )
    
    # CORS - Read as comma-separated string from .env, will be converted to list
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
        description="Comma-separated list of allowed CORS origins"
    )
    
    # Google Gemini API
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google Gemini API key"
    )
    
    # Chat token limits
    CHAT_MAX_OUTPUT_TOKENS: int = Field(
        default=1024,
        description="Maximum output tokens for chat responses"
    )
    CHAT_MAX_INPUT_TOKENS: int = Field(
        default=8000,
        description="Maximum input tokens for chat (will truncate history if exceeded)"
    )
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    @field_validator("GEMINI_API_KEY", mode="after")
    @classmethod
    def strip_gemini_api_key(cls, v):
        """Strip whitespace from Gemini API key"""
        if isinstance(v, str):
            return v.strip()
        return v
    
    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v):
        """Convert CORS_ORIGINS string to list"""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            # Split by comma and clean up
            origins = [origin.strip() for origin in v.split(",") if origin.strip()]
            return origins
        return v
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list"""
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


# Create settings instance - this reads from .env automatically
settings = Settings()

# Convert CORS_ORIGINS to list for easier use
if isinstance(settings.CORS_ORIGINS, str):
    settings.CORS_ORIGINS = settings.cors_origins_list
