from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime
from bson import ObjectId
from app.models.user import UserCreate, User, UserLogin, Token, UserUpdate, PasswordChange
from app.core.database import db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from token"""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    user = await db.database.Users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return User(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        birthdate=user["birthdate"],
        gender=user["gender"],
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    """Register a new user"""
    try:
        # Check if database is connected
        if db.database is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection not available"
            )
        
        # Check if user already exists
        existing_user = await db.database.Users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user document
        now = datetime.utcnow()
        user_doc = {
            "name": user_data.name,
            "email": user_data.email,
            "hashed_password": hashed_password,
            "birthdate": user_data.birthdate,
            "gender": user_data.gender,
            "created_at": now,
            "updated_at": now,
        }
        
        # Insert user into database
        result = await db.database.Users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # Create access token
        access_token = create_access_token(data={"sub": user_id})
        
        # Return user data and token
        user = User(
            id=user_id,
            name=user_data.name,
            email=user_data.email,
            birthdate=user_data.birthdate,
            gender=user_data.gender,
            created_at=now,
            updated_at=now,
        )
        
        return Token(access_token=access_token, user=user)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Authenticate user and return token"""
    # Find user by email
    user = await db.database.Users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    # Return user data and token
    user_obj = User(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        birthdate=user["birthdate"],
        gender=user["gender"],
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )
    
    return Token(access_token=access_token, user=user_obj)


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.post("/logout")
async def logout():
    """Logout user (client should delete token)"""
    return {"message": "Successfully logged out"}


@router.put("/profile", response_model=User)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user profile information"""
    try:
        # Build update document with only provided fields
        update_doc = {}
        if user_update.name is not None:
            update_doc["name"] = user_update.name
        if user_update.email is not None:
            # Check if email is already taken by another user
            existing_user = await db.database.Users.find_one({
                "email": user_update.email,
                "_id": {"$ne": ObjectId(current_user.id)}
            })
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            update_doc["email"] = user_update.email
        if user_update.birthdate is not None:
            update_doc["birthdate"] = user_update.birthdate
        if user_update.gender is not None:
            update_doc["gender"] = user_update.gender
        
        if not update_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Add updated_at timestamp
        update_doc["updated_at"] = datetime.utcnow()
        
        # Update user in database
        await db.database.Users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": update_doc}
        )
        
        # Fetch updated user
        updated_user = await db.database.Users.find_one({"_id": ObjectId(current_user.id)})
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return User(
            id=str(updated_user["_id"]),
            name=updated_user["name"],
            email=updated_user["email"],
            birthdate=updated_user["birthdate"],
            gender=updated_user["gender"],
            created_at=updated_user["created_at"],
            updated_at=updated_user["updated_at"],
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Profile update error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    try:
        # Get user from database
        user = await db.database.Users.find_one({"_id": ObjectId(current_user.id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(password_data.current_password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        new_hashed_password = get_password_hash(password_data.new_password)
        
        # Update password in database
        await db.database.Users.update_one(
            {"_id": ObjectId(current_user.id)},
            {
                "$set": {
                    "hashed_password": new_hashed_password,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Password change error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


