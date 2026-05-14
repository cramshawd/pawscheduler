from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from . import models

bearer = HTTPBearer()


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> str:
    payload = decode_token(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id


def get_current_sitter(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> models.Sitter:
    sitter = db.query(models.Sitter).filter(models.Sitter.user_id == user_id).first()
    if not sitter or not sitter.is_active:
        raise HTTPException(status_code=403, detail="Not a registered sitter")
    return sitter


def get_current_owner(sitter: models.Sitter = Depends(get_current_sitter)) -> models.Sitter:
    if not sitter.is_owner:
        raise HTTPException(status_code=403, detail="Owner access required")
    return sitter


def get_current_client(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> models.Client:
    client = db.query(models.Client).filter(models.Client.user_id == user_id).first()
    if not client:
        raise HTTPException(status_code=403, detail="Not a registered client")
    return client


def get_current_user_flexible(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> tuple[Optional[models.Sitter], Optional[models.Client]]:
    """Returns whichever account type the user has."""
    sitter = db.query(models.Sitter).filter(models.Sitter.user_id == user_id).first()
    client = db.query(models.Client).filter(models.Client.user_id == user_id).first()
    return sitter, client
