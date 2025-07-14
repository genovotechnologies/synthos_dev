"""
Payment API Endpoints
Enterprise subscription management with dual payment provider support (Paddle & Stripe)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import stripe
from typing import List, Dict, Any, Optional

from app.core.config import settings, SUBSCRIPTION_TIERS, SUPPORT_TIERS
from app.core.database import get_db
from app.models.user import User, UserSubscription, SubscriptionTier
from app.models.payment import StripeCustomer, StripeSubscription, PaymentEvent, PaddleCustomer
from app.services.auth import get_current_user
from app.services.payment import UnifiedPaymentService, PaymentProviderError

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.get("/plans")
async def get_pricing_plans():
    """Get available pricing plans with dual payment provider support"""
    plans = []
    
    for tier_key, tier_data in SUBSCRIPTION_TIERS.items():
        plan = {
            "id": tier_key,
            "name": tier_data["name"],
            "price": tier_data["price"],
            "monthly_limit": tier_data["monthly_limit"],
            "features": tier_data["features"],
            "stripe_price_id": tier_data.get("stripe_price_id"),
            "paddle_product_id": tier_data.get("paddle_product_id"),
            "most_popular": tier_key == "professional",  # Mark professional as most popular
            "enterprise": tier_key == "enterprise"
        }
        plans.append(plan)
    
    return {
        "plans": plans,
        "currency": "USD",
        "billing_period": "monthly",
        "payment_providers": [
            {
                "id": "paddle",
                "name": "Paddle",
                "available": True,
                "description": "Secure global payments with tax compliance",
                "supported_countries": ["US", "CA", "GB", "EU", "AU", "NZ"],
                "payment_methods": ["card", "paypal", "apple_pay", "google_pay"],
                "features": ["Global tax compliance", "Multiple payment methods", "Instant setup"]
            },
            {
                "id": "stripe", 
                "name": "Stripe",
                "available": False,
                "description": "Coming soon - Advanced payment processing",
                "supported_countries": ["US", "CA", "GB", "EU", "AU"],
                "payment_methods": ["card", "bank_transfer", "sepa"],
                "features": ["Advanced analytics", "Bank transfers", "Coming Q2 2024"]
            }
        ]
    }

@router.get("/support-tiers")
async def get_support_tiers():
    """Get available support tiers and enterprise offerings"""
    return {
        "support_tiers": SUPPORT_TIERS,
        "enterprise_features": [
            "24/7 dedicated support",
            "Dedicated account manager", 
            "Professional services",
            "Custom training programs",
            "Priority feature requests",
            "Architecture reviews",
            "On-site support available",
            "Custom SLA agreements"
        ],
        "contact": {
            "sales": "sales@synthos.com",
            "support": "support@synthos.com", 
            "enterprise": "enterprise@synthos.com"
        }
    }

@router.get("/regions")
async def get_deployment_regions():
    """Get available deployment regions for enterprise customers"""
    from app.core.config import DEPLOYMENT_REGIONS
    
    return {
        "regions": DEPLOYMENT_REGIONS,
        "multi_region_available": True,
        "data_residency_compliance": True,
        "enterprise_only": ["multi-region", "data-residency", "compliance-certification"]
    }

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: Request,
    plan_id: str,
    provider: str = "paddle",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create checkout session for subscription with dual provider support"""
    
    if plan_id not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid plan selected")
    
    plan = SUBSCRIPTION_TIERS[plan_id]
    
    if plan_id == "enterprise":
        raise HTTPException(
            status_code=400, 
            detail="Enterprise plans require custom setup. Please contact sales@synthos.com"
        )
    
    # Validate provider availability
    if provider == "stripe":
        raise HTTPException(
            status_code=400, 
            detail="Stripe payments are coming soon. Please use Paddle for now."
        )
    
    if provider not in ["paddle", "stripe"]:
        raise HTTPException(status_code=400, detail="Invalid payment provider")
    
    try:
        if provider == "paddle":
            return await create_paddle_checkout(request, plan_id, plan, current_user, db)
        else:
            return await create_stripe_checkout(request, plan_id, plan, current_user, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def create_paddle_checkout(
    request: Request,
    plan_id: str,
    plan: dict,
    current_user: User,
    db: Session
):
    """Create Paddle checkout session"""
    
    # Get or create Paddle customer
    paddle_customer = db.query(PaddleCustomer).filter(
        PaddleCustomer.user_id == current_user.id
    ).first()
    
    if not paddle_customer:
        paddle_customer = PaddleCustomer(
            user_id=current_user.id,
            email=current_user.email,
            name=current_user.full_name
        )
        db.add(paddle_customer)
        db.commit()
    
    # Create Paddle checkout URL
    # Using mock data for demo - in production, integrate with Paddle's Checkout API
    checkout_data = {
        "product_id": plan.get("paddle_product_id", f"paddle_{plan_id}"),
        "prices": [f"USD:{plan['price']}.00"],
        "customer_email": current_user.email,
        "customer_name": current_user.full_name,
        "return_url": f"{request.headers.get('origin')}/billing?success=true",
        "passthrough": f"user_id:{current_user.id},plan_id:{plan_id}",
        "quantity_variable": 0,
        "custom_message": f"Synthos {plan['name']} Plan"
    }
    
    # For demo purposes - replace with actual Paddle integration
    base_url = "https://checkout.paddle.com/subscription/preview"
    checkout_url = f"{base_url}?product={plan.get('paddle_product_id', f'prod_{plan_id}_monthly')}&email={current_user.email}"
    
    return {
        "checkout_url": checkout_url, 
        "provider": "paddle",
        "plan": plan_id,
        "message": "Redirecting to Paddle Checkout..."
    }

async def create_stripe_checkout(
    request: Request,
    plan_id: str,
    plan: dict,
    current_user: User,
    db: Session
):
    """Create Stripe checkout session (currently unavailable)"""
    
    if not plan.get("stripe_price_id"):
        raise HTTPException(status_code=400, detail="Plan not available for Stripe")
    
    try:
        # Get or create Stripe customer
        stripe_customer = db.query(StripeCustomer).filter(
            StripeCustomer.user_id == current_user.id
        ).first()
        
        if not stripe_customer:
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name,
                metadata={"user_id": str(current_user.id)}
            )
            
            stripe_customer = StripeCustomer(
                user_id=current_user.id,
                stripe_customer_id=customer.id,
                email=current_user.email,
                name=current_user.full_name
            )
            db.add(stripe_customer)
            db.commit()
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': plan["stripe_price_id"],
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{request.headers.get('origin')}/billing?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{request.headers.get('origin')}/billing?canceled=true",
            metadata={
                "user_id": str(current_user.id),
                "plan_id": plan_id
            }
        )
        
        return {
            "checkout_url": checkout_session.url,
            "provider": "stripe",
            "plan": plan_id
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/providers")
async def get_payment_providers():
    """Get available payment providers and their status"""
    return {
        "providers": [
            {
                "id": "paddle",
                "name": "Paddle",
                "available": True,
                "logo": "/providers/paddle-logo.svg",
                "description": "Secure global payments with built-in tax compliance",
                "features": [
                    "Global tax compliance included",
                    "Accept payments in 200+ countries",
                    "Multiple payment methods (cards, PayPal, Apple Pay)",
                    "Instant merchant account setup",
                    "Revenue recognition & reporting"
                ],
                "processing_fee": "5% + $0.50 per transaction",
                "setup_time": "Instant"
            },
            {
                "id": "stripe",
                "name": "Stripe",
                "available": False,
                "logo": "/providers/stripe-logo.svg",
                "description": "Advanced payment processing - Coming Q2 2024",
                "features": [
                    "Advanced payment analytics",
                    "Bank transfer payments (ACH, SEPA)",
                    "Lower processing fees",
                    "Advanced fraud detection",
                    "Custom payment flows"
                ],
                "processing_fee": "2.9% + $0.30 per transaction",
                "setup_time": "Coming Q4 2024",
                "coming_soon": True
            }
        ],
        "default_provider": "paddle"
    }

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Stripe webhook events"""
    
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        await handle_checkout_completed(event['data']['object'], db)
    elif event['type'] == 'customer.subscription.updated':
        await handle_subscription_updated(event['data']['object'], db)
    elif event['type'] == 'customer.subscription.deleted':
        await handle_subscription_cancelled(event['data']['object'], db)
    elif event['type'] == 'invoice.payment_succeeded':
        await handle_payment_succeeded(event['data']['object'], db)
    elif event['type'] == 'invoice.payment_failed':
        await handle_payment_failed(event['data']['object'], db)
    
    return {"status": "success"}

@router.post("/paddle-webhook")
async def paddle_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Paddle webhook events"""
    
    payload = await request.form()
    
    # Verify Paddle webhook signature here
    # For demo purposes, we'll process without verification
    
    alert_name = payload.get("alert_name")
    
    if alert_name == "subscription_created":
        await handle_paddle_subscription_created(payload, db)
    elif alert_name == "subscription_updated":
        await handle_paddle_subscription_updated(payload, db)
    elif alert_name == "subscription_cancelled":
        await handle_paddle_subscription_cancelled(payload, db)
    elif alert_name == "subscription_payment_succeeded":
        await handle_paddle_payment_succeeded(payload, db)
    elif alert_name == "subscription_payment_failed":
        await handle_paddle_payment_failed(payload, db)
    
    return {"status": "success"}

async def handle_paddle_subscription_created(payload: dict, db: Session):
    """Handle Paddle subscription creation"""
    # Implementation for Paddle subscription creation
    pass

async def handle_paddle_subscription_updated(payload: dict, db: Session):
    """Handle Paddle subscription updates"""
    # Implementation for Paddle subscription updates
    pass

async def handle_paddle_subscription_cancelled(payload: dict, db: Session):
    """Handle Paddle subscription cancellation"""
    # Implementation for Paddle subscription cancellation
    pass

async def handle_paddle_payment_succeeded(payload: dict, db: Session):
    """Handle successful Paddle payments"""
    # Implementation for successful Paddle payments
    pass

async def handle_paddle_payment_failed(payload: dict, db: Session):
    """Handle failed Paddle payments"""
    # Implementation for failed Paddle payments
    pass

@router.get("/subscription")
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription details"""
    
    subscription = db.query(UserSubscription).filter(
        UserSubscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        return {
            "tier": "free",
            "status": "active",
            "monthly_limit": SUBSCRIPTION_TIERS["free"]["monthly_limit"],
            "features": SUBSCRIPTION_TIERS["free"]["features"]
        }
    
    plan_info = SUBSCRIPTION_TIERS.get(subscription.tier.value, SUBSCRIPTION_TIERS["free"])
    
    return {
        "tier": subscription.tier.value,
        "status": subscription.status,
        "monthly_limit": subscription.monthly_limit,
        "features": plan_info["features"],
        "current_period_end": subscription.current_period_end,
        "cancel_at_period_end": subscription.cancel_at_period_end
    }

@router.post("/contact-sales")
async def contact_sales(
    contact_info: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Submit enterprise sales contact form"""
    
    # Here you would integrate with your CRM or sales system
    # For now, we'll just return a success response
    
    required_fields = ["company_name", "contact_person", "email", "phone", "use_case"]
    
    for field in required_fields:
        if field not in contact_info:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # TODO: Integrate with CRM (HubSpot, Salesforce, etc.)
    # TODO: Send notification to sales team
    # TODO: Create lead in sales pipeline
    
    return {
        "message": "Thank you for your interest in Synthos Enterprise. Our sales team will contact you within 24 hours.",
        "contact_info": {
            "sales": "sales@genovo.ai",
            "phone": "+1 (555) 123-4567",
            "calendar": "https://calendly.com/synthos-sales"
        }
    } 