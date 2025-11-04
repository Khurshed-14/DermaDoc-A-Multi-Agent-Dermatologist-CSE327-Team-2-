import bcrypt
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # Ensure password is bytes
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    
    try:
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt with SHA256 pre-hashing for long passwords
    
    Note: Bcrypt has a 72-byte limit. For passwords exceeding this (rare but possible),
    we use SHA256 pre-hashing before bcrypt. This is a recommended approach that:
    1. Preserves all password entropy (vs truncation which loses information)
    2. Still uses bcrypt as the primary secure hash function
    3. The SHA256 is only a pre-processing step, not the final hash
    
    Security: The final hash is still protected by bcrypt's computational cost.
    The SHA256 pre-hash does not weaken security as bcrypt is still applied.
    """
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
    else:
        password_bytes = password
    
    # For passwords longer than 72 bytes, use SHA256 pre-hash to preserve entropy
    # This is better than truncating as it maintains security properties
    if len(password_bytes) > 72:
        # Pre-hash with SHA256 to fit within bcrypt's 72-byte limit
        # This preserves entropy while staying within bcrypt constraints
        password_bytes = hashlib.sha256(password_bytes).digest()
    
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Return as string
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str):
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

