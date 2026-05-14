from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from supabase import Client
from .config import settings
from .database import get_supabase

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")


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
    sb: Client = Depends(get_supabase),
) -> dict:
    result = sb.table("sitters").select("*").eq("user_id", user_id).execute()
    if not result.data or not result.data[0].get("is_active"):
        raise HTTPException(status_code=403, detail="Not a registered sitter")
    return result.data[0]


def get_current_owner(sitter: dict = Depends(get_current_sitter)) -> dict:
    if not sitter.get("is_owner"):
        raise HTTPException(status_code=403, detail="Owner access required")
    return sitter


def get_current_client(
    user_id: str = Depends(get_current_user_id),
    sb: Client = Depends(get_supabase),
) -> dict:
    result = sb.table("clients").select("*, pets(*)").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Not a registered client")
    return result.data[0]
