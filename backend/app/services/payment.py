"""
Unified Payment Service for Synthos Platform
Supports both Stripe and Paddle payment providers
"""

import stripe
import requests
import json
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging
from datetime import datetime

from app.core.config import settings, SUBSCRIPTION_TIERS
from app.models.user import User
from app.models.payment import (
    StripeCustomer, PaddleCustomer, PaymentEvent,
    PaymentProvider, PaymentStatus, PaymentType
)

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentProviderError(Exception):
    """Custom exception for payment provider errors"""
    pass


class UnifiedPaymentService:
    """Unified payment service that handles both Stripe and Paddle"""
    
    @staticmethod
    def get_available_plans() -> List[Dict[str, Any]]:
        """Get all available pricing plans with provider information"""
        plans = []
        
        for tier_key, tier_data in SUBSCRIPTION_TIERS.items():
            # Determine available providers
            providers = []
            if tier_data.get("stripe_price_id"):
                providers.append("stripe")
            if tier_data.get("paddle_product_id"):
                providers.append("paddle")
            
            plan = {
                "id": tier_key,
                "name": tier_data["name"],
                "price": tier_data["price"],
                "monthly_limit": tier_data["monthly_limit"],
                "features": tier_data["features"],
                "providers": providers,
                "stripe_price_id": tier_data.get("stripe_price_id"),
                "paddle_product_id": tier_data.get("paddle_product_id"),
                "most_popular": tier_key == "professional",
                "enterprise": tier_key == "enterprise"
            }
            plans.append(plan)
        
        return plans

    @staticmethod
    def create_stripe_checkout(user: User, plan_id: str, success_url: str, cancel_url: str, db: Session) -> Dict[str, Any]:
        """Create Stripe checkout session"""
        if plan_id not in SUBSCRIPTION_TIERS:
            raise PaymentProviderError("Invalid plan selected")
        
        plan = SUBSCRIPTION_TIERS[plan_id]
        if not plan.get("stripe_price_id"):
            raise PaymentProviderError("Plan not available for Stripe")
        
        try:
            # Get or create Stripe customer
            stripe_customer = db.query(StripeCustomer).filter(
                StripeCustomer.user_id == user.id
            ).first()
            
            if not stripe_customer:
                # Create new Stripe customer
                customer = stripe.Customer.create(
                    email=user.email,
                    name=user.full_name,
                    metadata={"user_id": str(user.id)}
                )
                
                stripe_customer = StripeCustomer(
                    user_id=user.id,
                    stripe_customer_id=customer.id,
                    email=user.email,
                    name=user.full_name
                )
                db.add(stripe_customer)
                db.commit()
            
            # Create checkout session
            session = stripe.checkout.Session.create(
                customer=stripe_customer.stripe_customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': plan["stripe_price_id"],
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "user_id": str(user.id),
                    "plan_id": plan_id,
                    "provider": "stripe"
                }
            )
            
            return {
                "provider": "stripe",
                "checkout_url": session.url,
                "session_id": session.id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe checkout creation failed: {str(e)}")
            raise PaymentProviderError(f"Failed to create Stripe checkout: {str(e)}")

    @staticmethod
    def create_paddle_checkout(user: User, plan_id: str, success_url: str, cancel_url: str, db: Session) -> Dict[str, Any]:
        """Create Paddle checkout session"""
        if plan_id not in SUBSCRIPTION_TIERS:
            raise PaymentProviderError("Invalid plan selected")
        
        plan = SUBSCRIPTION_TIERS[plan_id]
        if not plan.get("paddle_product_id"):
            raise PaymentProviderError("Plan not available for Paddle")
        
        try:
            # Get or create Paddle customer
            paddle_customer = db.query(PaddleCustomer).filter(
                PaddleCustomer.user_id == user.id
            ).first()
            
            if not paddle_customer:
                # Create Paddle customer via API
                base_url = "https://api.paddle.com" if settings.PADDLE_ENVIRONMENT == "production" else "https://sandbox-api.paddle.com"
                headers = {
                    "Authorization": f"Bearer {settings.PADDLE_VENDOR_AUTH_CODE}",
                    "Content-Type": "application/json"
                }
                
                customer_data = {
                    "name": user.full_name,
                    "email": user.email,
                    "custom_data": {"user_id": str(user.id)}
                }
                
                response = requests.post(f"{base_url}/customers", headers=headers, json=customer_data)
                response.raise_for_status()
                
                paddle_customer_data = response.json()["data"]
                
                paddle_customer = PaddleCustomer(
                    user_id=user.id,
                    paddle_customer_id=paddle_customer_data["id"],
                    email=user.email,
                    name=user.full_name
                )
                db.add(paddle_customer)
                db.commit()
            
            # Create Paddle checkout via Paddle.js (return data for frontend)
            return {
                "provider": "paddle",
                "product_id": plan["paddle_product_id"],
                "customer_id": paddle_customer.paddle_customer_id,
                "metadata": {
                    "user_id": str(user.id),
                    "plan_id": plan_id,
                    "provider": "paddle"
                }
            }
            
        except requests.RequestException as e:
            logger.error(f"Paddle checkout creation failed: {str(e)}")
            raise PaymentProviderError(f"Failed to create Paddle checkout: {str(e)}")

    @staticmethod
    def create_checkout_session(
        user: User,
        plan_id: str,
        provider: str,
        success_url: str,
        cancel_url: str,
        db: Session
    ) -> Dict[str, Any]:
        """Create checkout session using specified provider"""
        
        # Use primary provider if not specified
        if not provider:
            provider = settings.PRIMARY_PAYMENT_PROVIDER
        
        # Validate provider
        if provider not in ["stripe", "paddle"]:
            raise PaymentProviderError("Invalid payment provider")
        
        # Route to appropriate service
        if provider == "stripe":
            return UnifiedPaymentService.create_stripe_checkout(
                user, plan_id, success_url, cancel_url, db
            )
        else:
            return UnifiedPaymentService.create_paddle_checkout(
                user, plan_id, success_url, cancel_url, db
            )

    @staticmethod
    def get_customer_subscription_info(user: User, db: Session) -> Dict[str, Any]:
        """Get unified subscription information regardless of provider"""
        from app.models.user import UserSubscription
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.user_id == user.id
        ).first()
        
        if not subscription:
            return {
                "tier": "free",
                "status": "active",
                "provider": None,
                "monthly_limit": SUBSCRIPTION_TIERS["free"]["monthly_limit"],
                "features": SUBSCRIPTION_TIERS["free"]["features"]
            }
        
        # Determine provider
        provider = None
        if hasattr(subscription, 'stripe_subscription_id') and subscription.stripe_subscription_id:
            provider = "stripe"
        elif hasattr(subscription, 'paddle_subscription_id') and subscription.paddle_subscription_id:
            provider = "paddle"
        
        plan_info = SUBSCRIPTION_TIERS.get(subscription.tier.value, SUBSCRIPTION_TIERS["free"])
        
        return {
            "tier": subscription.tier.value,
            "status": subscription.status,
            "provider": provider,
            "monthly_limit": subscription.monthly_limit,
            "features": plan_info["features"],
            "current_period_end": getattr(subscription, 'current_period_end', None),
            "cancel_at_period_end": getattr(subscription, 'cancel_at_period_end', False)
        } 