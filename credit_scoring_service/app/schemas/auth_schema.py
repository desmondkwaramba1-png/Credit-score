from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    name: str = Field(..., max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    user_type: str = Field('SME', description="SME or lender")

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    user_type: str
    name: str
    api_key: str | None = None

class ApiKeyResponse(BaseModel):
    old_key_invalidated: bool
    new_api_key: str
