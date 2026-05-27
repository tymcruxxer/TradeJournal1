import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    authenticate_user,
    create_access_token,
    generate_api_key,
    get_current_user,
    get_password_hash,
)
from app.database import get_db
from app.models import User
from app.schemas import ApiKeyResponse, Token, UserCreate, UserLogin


router = APIRouter(prefix="/api/auth", tags=["auth"])
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _token_for_user(user: User) -> Token:
    access_token = create_access_token({"sub": str(user.id)})
    return Token(access_token=access_token, user=user)


def _new_unique_api_key(db: Session) -> str:
    api_key = generate_api_key()

    while db.query(User).filter(User.api_key == api_key).first():
        api_key = generate_api_key()

    return api_key


@router.post("/signup", response_model=Token)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.strip().lower()

    if len(email) > 254 or not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")

    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")

    user = User(
        email=email,
        password_hash=get_password_hash(data.password),
        api_key=_new_unique_api_key(db),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _token_for_user(user)


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.email.strip().lower(), data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _token_for_user(user)


@router.get("/api-key", response_model=ApiKeyResponse)
def get_api_key(current_user: User = Depends(get_current_user)):
    return ApiKeyResponse(api_key=current_user.api_key)


@router.post("/api-key/regenerate", response_model=ApiKeyResponse)
def regenerate_api_key(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.api_key = _new_unique_api_key(db)
    db.commit()
    db.refresh(current_user)

    return ApiKeyResponse(api_key=current_user.api_key)


@router.delete("/api-key", response_model=ApiKeyResponse)
def revoke_api_key(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.api_key = None
    db.commit()
    db.refresh(current_user)

    return ApiKeyResponse(api_key=None)
