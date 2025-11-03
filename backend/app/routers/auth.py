from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from datetime import datetime
from bson import ObjectId
import json
from app.models.user import UserCreate, User, UserLogin, Token, UserUpdate, PasswordChange
from app.core.database import db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.config import settings
from app.core.storage import save_user_image, delete_user_image, get_image_url

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
    
    # Get image_path - explicitly retrieve and handle it
    image_path = user.get("image_path")
    if image_path == "":
        image_path = None
    
    return User(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        birthdate=user["birthdate"],
        gender=user["gender"],
        image_path=image_path,
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
        image_path=user.get("image_path"),
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )
    
    return Token(access_token=access_token, user=user_obj)


@router.get("/me")
async def get_current_user_info(token: str = Depends(oauth2_scheme)):
    """Get current user information - always fetch fresh from database"""
    # Decode token to get user_id
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
    
    # Always fetch fresh from database
    user = await db.database.Users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    image_path = user.get("image_path")
    if image_path == "":
        image_path = None
    
    user_obj = User(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        birthdate=user["birthdate"],
        gender=user["gender"],
        image_path=image_path,
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )
    
    # Serialize to JSON to ensure datetime objects are properly handled
    user_json = user_obj.model_dump_json(exclude_none=False, exclude_unset=False)
    user_dict = json.loads(user_json)
    return JSONResponse(content=user_dict)


@router.post("/logout")
async def logout():
    """Logout user (client should delete token)"""
    return {"message": "Successfully logged out"}


@router.put("/profile")
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
        
        update_doc["updated_at"] = datetime.utcnow()
        
        await db.database.Users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": update_doc}
        )
        
        updated_user = await db.database.Users.find_one({"_id": ObjectId(current_user.id)})
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_obj = User(
            id=str(updated_user["_id"]),
            name=updated_user["name"],
            email=updated_user["email"],
            birthdate=updated_user["birthdate"],
            gender=updated_user["gender"],
            image_path=updated_user.get("image_path"),
            created_at=updated_user["created_at"],
            updated_at=updated_user["updated_at"],
        )
        
        user_json = user_obj.model_dump_json(exclude_none=False, exclude_unset=False)
        user_dict = json.loads(user_json)
        return JSONResponse(content=user_dict)
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


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload user profile image"""
    try:
        # Validate current_user is not None
        if current_user is None or not hasattr(current_user, 'id'):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Delete old image if exists
        user = await db.database.Users.find_one({"_id": ObjectId(current_user.id)})
        if user and user.get("image_path"):
            await delete_user_image(user["image_path"])
        
        # Save new image
        image_path = await save_user_image(file, current_user.id)
        
        # Update user in database
        await db.database.Users.update_one(
            {"_id": ObjectId(current_user.id)},
            {
                "$set": {
                    "image_path": image_path,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Fetch updated user
        updated_user = await db.database.Users.find_one({"_id": ObjectId(current_user.id)})
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Create User object and serialize explicitly
        user_obj = User(
            id=str(updated_user["_id"]),
            name=updated_user["name"],
            email=updated_user["email"],
            birthdate=updated_user["birthdate"],
            gender=updated_user["gender"],
            image_path=updated_user.get("image_path"),
            created_at=updated_user["created_at"],
            updated_at=updated_user["updated_at"],
        )
        
        # Use model_dump_json to properly serialize datetime objects
        user_json = user_obj.model_dump_json(exclude_none=False, exclude_unset=False)
        user_dict = json.loads(user_json)
        return JSONResponse(content=user_dict)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Image upload error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


