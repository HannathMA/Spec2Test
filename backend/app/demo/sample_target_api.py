import time
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/demo-target/api/v1", tags=["Demo Target Commerce API"])

# In-memory tracking for demo target behavior
_login_failed_attempts: Dict[str, int] = {}
_processed_orders: set[str] = set()

class LoginRequest(BaseModel):
    username: str
    password: str

class CartItemRequest(BaseModel):
    item_id: str
    quantity: int

class PaymentRequest(BaseModel):
    order_id: str
    amount: float
    currency: str = "USD"
    card_expiry: str = "12/28"
    idempotency_key: str = "IDEMP-DEFAULT"

@router.get("/health")
def target_health():
    return {"status": "healthy", "service": "Commerce API", "version": "2.4.0"}

@router.post("/auth/register")
def target_register(payload: Dict[str, Any]):
    if not payload.get("username") or not payload.get("email"):
        raise HTTPException(status_code=400, detail="Username and email are required.")
    return {"id": "USR-101", "username": payload["username"], "status": "active"}

@router.post("/auth/login")
def target_login(req: LoginRequest):
    uname = req.username.strip()
    pwd = req.password

    if not uname or not pwd:
        raise HTTPException(status_code=400, detail="Missing required login credentials.")

    # Check lockout threshold
    attempts = _login_failed_attempts.get(uname, 0)
    if attempts >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account locked out: exceeded 3 failed attempts."
        )

    if uname == "hanna" and pwd == "ValidPassword123!":
        _login_failed_attempts[uname] = 0
        return {
            "access_token": "mock-jwt-token-verified-hanna",
            "token_type": "bearer",
            "expires_in": 3600
        }

    # Record failure
    _login_failed_attempts[uname] = attempts + 1
    if _login_failed_attempts[uname] >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account locked out: exceeded 3 failed attempts."
        )

    raise HTTPException(status_code=401, detail="Invalid username or password.")

@router.get("/products")
def target_products():
    return {
        "products": [
            {"id": "PROD-1", "name": "Swiss Brutalist Mechanical Keyboard", "price": 189.0, "in_stock": True},
            {"id": "PROD-2", "name": "Minimalist Display 27-inch 4K", "price": 499.0, "in_stock": True},
            {"id": "PROD-3", "name": "Studio Sound Monitor Speakers", "price": 299.0, "in_stock": False}
        ]
    }

@router.post("/cart/items")
def target_cart_items(item: CartItemRequest):
    if item.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")
    if item.quantity > 99:
        raise HTTPException(status_code=400, detail="Maximum allowable cart quantity is 99 units.")
    return {"status": "added", "item_id": item.item_id, "quantity": item.quantity}

@router.post("/payment/charge")
def target_payment(req: PaymentRequest):
    # Expired card check
    if req.card_expiry == "01/20" or "expired" in req.card_expiry:
        raise HTTPException(status_code=400, detail="Card is expired. Transaction rejected.")

    # DELIBERATE BUG FOR DEMO PURPOSES:
    # If duplicate payment is attempted for order_id 'ORD-9912', the service fails to deduplicate
    # and processes a duplicate charge instead of returning HTTP 409 Conflict!
    # This proves genuine assertion failure in pytest.
    if req.order_id == "ORD-9912":
        # Simulates a duplicate payment bug where duplicate flag is False and status is 200 without deduplication
        return {
            "charge_id": f"CHG-DUPLICATE-{int(time.time()*1000)}",
            "status": "success",
            "duplicate": False,  # Bug: not flagged as duplicate
            "amount": req.amount
        }

    if req.idempotency_key in _processed_orders:
        return {"status": "deduplicated", "duplicate": True, "amount": req.amount}

    _processed_orders.add(req.idempotency_key)
    return {"charge_id": f"CHG-{int(time.time()*1000)}", "status": "success", "amount": req.amount}
