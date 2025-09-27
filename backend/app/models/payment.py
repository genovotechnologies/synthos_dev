"""
Payment Models for Synthos Platform
Stripe integration and billing management
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import json

from app.core.database import Base


class PaymentStatus(enum.Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentType(enum.Enum):
    SUBSCRIPTION = "subscription"
    ONE_TIME = "one_time"
    USAGE_BASED = "usage_based"
    REFUND = "refund"


class PaymentProvider(enum.Enum):
    STRIPE = "stripe"
    PADDLE = "paddle"


class StripeCustomer(Base):
    """Stripe customer information"""
    __tablename__ = "stripe_customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    stripe_customer_id = Column(String(255), nullable=False, unique=True, index=True)
    
    # Customer details
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Address information
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(100), nullable=True)
    address_postal_code = Column(String(20), nullable=True)
    address_country = Column(String(2), nullable=True)  # ISO country code
    
    # Tax information
    tax_id = Column(String(100), nullable=True)
    tax_exempt = Column(String(20), nullable=True)  # none, exempt, reverse
    
    # Stripe metadata
    stripe_metadata = Column(JSON, nullable=True)
    
    # Default payment method
    default_payment_method_id = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="stripe_customer")
    subscriptions = relationship("StripeSubscription", back_populates="customer")
    payment_events = relationship("PaymentEvent", back_populates="customer")

    def __repr__(self):
        return f"<StripeCustomer(user_id={self.user_id}, stripe_id={self.stripe_customer_id})>"

    def get_full_address(self) -> Optional[str]:
        """Get formatted full address"""
        address_line1 = getattr(self, 'address_line1', None)
        if not address_line1:
            return None
        
        parts = [address_line1]
        address_line2 = getattr(self, 'address_line2', None)
        if address_line2:
            parts.append(address_line2)
        address_city = getattr(self, 'address_city', None)
        if address_city:
            parts.append(address_city)
        address_state = getattr(self, 'address_state', None)
        if address_state:
            parts.append(address_state)
        address_postal_code = getattr(self, 'address_postal_code', None)
        if address_postal_code:
            parts.append(address_postal_code)
        address_country = getattr(self, 'address_country', None)
        if address_country:
            parts.append(address_country)
            
        return ", ".join(str(part) for part in parts if part)

    def update_from_stripe(self, stripe_customer: Dict[str, Any]):
        """Update customer information from Stripe customer object"""
        self.email = stripe_customer.get("email", self.email)
        self.name = stripe_customer.get("name", self.name)
        self.phone = stripe_customer.get("phone", self.phone)
        
        # Update address if present
        address = stripe_customer.get("address", {})
        if address:
            self.address_line1 = address.get("line1", self.address_line1)
            self.address_line2 = address.get("line2", self.address_line2)
            self.address_city = address.get("city", self.address_city)
            self.address_state = address.get("state", self.address_state)
            self.address_postal_code = address.get("postal_code", self.address_postal_code)
            self.address_country = address.get("country", self.address_country)
        
        # Update tax information
        if "tax" in stripe_customer:
            self.tax_exempt = stripe_customer["tax"].get("tax_exempt", self.tax_exempt)
        
        # Update default payment method
        self.default_payment_method_id = stripe_customer.get(
            "invoice_settings", {}
        ).get("default_payment_method", self.default_payment_method_id)
        
        # Store Stripe metadata
        self.stripe_metadata = stripe_customer.get("metadata", {})


class StripeSubscription(Base):
    """Stripe subscription tracking"""
    __tablename__ = "stripe_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("stripe_customers.id"), nullable=False)
    stripe_subscription_id = Column(String(255), nullable=False, unique=True, index=True)
    
    # Subscription details
    status = Column(String(50), nullable=False)  # active, canceled, incomplete, etc.
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    canceled_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    
    # Pricing
    price_id = Column(String(255), nullable=False)  # Stripe price ID
    product_id = Column(String(255), nullable=False)  # Stripe product ID
    unit_amount = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String(3), default="usd", nullable=False)
    interval = Column(String(20), nullable=False)  # month, year
    interval_count = Column(Integer, default=1, nullable=False)
    
    # Trial information
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    
    # Billing
    collection_method = Column(String(20), default="charge_automatically", nullable=False)
    days_until_due = Column(Integer, nullable=True)
    
    # Latest invoice
    latest_invoice_id = Column(String(255), nullable=True)
    
    # Stripe metadata
    stripe_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    customer = relationship("StripeCustomer", back_populates="subscriptions")

    def __repr__(self):
        return f"<StripeSubscription(id={self.stripe_subscription_id}, status={self.status})>"

    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active"""
        return self.status in ["active", "trialing"]

    @property
    def is_in_trial(self) -> bool:
        """Check if subscription is in trial period"""
        trial_end = getattr(self, 'trial_end', None)
        if not trial_end:
            return False
        return datetime.utcnow() < trial_end

    @property
    def amount_formatted(self) -> str:
        """Get formatted amount with currency"""
        amount = self.unit_amount / 100  # Convert cents to dollars
        return f"${amount:.2f} {self.currency.upper()}"

    @property
    def interval_formatted(self) -> str:
        """Get formatted billing interval"""
        interval_count = getattr(self, 'interval_count', 1)
        interval = getattr(self, 'interval', 'month')
        if interval_count == 1:
            return interval
        return f"{interval_count} {interval}s"

    def update_from_stripe(self, stripe_subscription: Dict[str, Any]):
        """Update subscription from Stripe subscription object"""
        self.status = stripe_subscription["status"]
        self.current_period_start = datetime.fromtimestamp(
            stripe_subscription["current_period_start"]
        )
        self.current_period_end = datetime.fromtimestamp(
            stripe_subscription["current_period_end"]
        )
        self.cancel_at_period_end = stripe_subscription["cancel_at_period_end"]
        
        if stripe_subscription.get("canceled_at"):
            self.canceled_at = datetime.fromtimestamp(stripe_subscription["canceled_at"])
        
        if stripe_subscription.get("ended_at"):
            self.ended_at = datetime.fromtimestamp(stripe_subscription["ended_at"])
        
        # Update trial information
        if stripe_subscription.get("trial_start"):
            self.trial_start = datetime.fromtimestamp(stripe_subscription["trial_start"])
        if stripe_subscription.get("trial_end"):
            self.trial_end = datetime.fromtimestamp(stripe_subscription["trial_end"])
        
        # Update pricing from items
        items = stripe_subscription.get("items", {}).get("data", [])
        if items:
            price = items[0]["price"]
            self.price_id = price["id"]
            self.product_id = price["product"]
            self.unit_amount = price["unit_amount"]
            self.currency = price["currency"]
            self.interval = price["recurring"]["interval"]
            self.interval_count = price["recurring"]["interval_count"]
        
        # Update billing settings
        self.collection_method = stripe_subscription.get("collection_method", self.collection_method)
        self.days_until_due = stripe_subscription.get("days_until_due", self.days_until_due)
        
        # Update latest invoice
        if stripe_subscription.get("latest_invoice"):
            if isinstance(stripe_subscription["latest_invoice"], dict):
                self.latest_invoice_id = stripe_subscription["latest_invoice"]["id"]
            else:
                self.latest_invoice_id = stripe_subscription["latest_invoice"]
        
        # Store metadata
        self.stripe_metadata = stripe_subscription.get("metadata", {})


class PaymentEvent(Base):
    """Universal payment event tracking for billing audit (supports both Stripe and Paddle)"""
    __tablename__ = "payment_events"

    id = Column(Integer, primary_key=True, index=True)
    
    # Payment provider
    provider = Column(Enum(PaymentProvider), nullable=False)
    
    # Customer references (nullable to support both providers)
    stripe_customer_id = Column(Integer, ForeignKey("stripe_customers.id"), nullable=True)
    paddle_customer_id = Column(Integer, ForeignKey("paddle_customers.id"), nullable=True)
    
    # Provider-specific identifiers
    # Stripe identifiers
    stripe_payment_intent_id = Column(String(255), nullable=True, index=True)
    stripe_invoice_id = Column(String(255), nullable=True, index=True)
    stripe_charge_id = Column(String(255), nullable=True, index=True)
    
    # Paddle identifiers
    paddle_transaction_id = Column(String(255), nullable=True, index=True)
    paddle_subscription_id = Column(String(255), nullable=True, index=True)
    paddle_invoice_id = Column(String(255), nullable=True, index=True)
    
    # Payment details
    payment_type = Column(Enum(PaymentType), nullable=False)
    status = Column(Enum(PaymentStatus), nullable=False)
    amount = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String(3), default="usd", nullable=False)
    
    # Payment method
    payment_method_type = Column(String(50), nullable=True)  # card, bank_account, paypal, etc.
    payment_method_last4 = Column(String(4), nullable=True)
    payment_method_brand = Column(String(20), nullable=True)  # visa, mastercard, etc.
    
    # Transaction details
    description = Column(Text, nullable=True)
    statement_descriptor = Column(String(100), nullable=True)
    receipt_url = Column(String(500), nullable=True)
    
    # Fees and taxes
    application_fee = Column(Integer, nullable=True)  # In cents
    processing_fee = Column(Integer, nullable=True)  # In cents
    tax_amount = Column(Integer, nullable=True)  # In cents
    
    # Failure information
    failure_code = Column(String(100), nullable=True)
    failure_message = Column(Text, nullable=True)
    
    # Refund information
    refunded_amount = Column(Integer, default=0, nullable=False)  # In cents
    refund_reason = Column(String(100), nullable=True)
    
    # Timestamps
    stripe_created = Column(DateTime, nullable=True)  # When created in Stripe
    processed_at = Column(DateTime, nullable=True)  # When payment was processed
    
    # Metadata
    stripe_metadata = Column(JSON, nullable=True)
    internal_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    stripe_customer = relationship("StripeCustomer", back_populates="payment_events", foreign_keys=[stripe_customer_id])

    def __repr__(self):
        return f"<PaymentEvent(type={self.payment_type}, status={self.status}, amount={self.amount})>"

    @property
    def amount_formatted(self) -> str:
        """Get formatted amount with currency"""
        amount = self.amount / 100  # Convert cents to dollars
        return f"${amount:.2f} {self.currency.upper()}"

    @property
    def net_amount(self) -> int:
        """Get net amount after fees (in cents)"""
        amount = getattr(self, 'amount', 0)
        application_fee = getattr(self, 'application_fee', None) or 0
        processing_fee = getattr(self, 'processing_fee', None) or 0
        fees = application_fee + processing_fee
        return amount - fees

    @property
    def net_amount_formatted(self) -> str:
        """Get formatted net amount with currency"""
        amount = self.net_amount / 100
        return f"${amount:.2f} {self.currency.upper()}"

    @property
    def is_successful(self) -> bool:
        """Check if payment was successful"""
        status = getattr(self, 'status', None)
        return status == PaymentStatus.SUCCEEDED

    @property
    def is_refunded(self) -> bool:
        """Check if payment was (partially) refunded"""
        refunded_amount = getattr(self, 'refunded_amount', 0)
        return refunded_amount > 0

    def update_from_stripe_payment_intent(self, payment_intent: Dict[str, Any]):
        """Update from Stripe PaymentIntent object"""
        self.stripe_payment_intent_id = payment_intent["id"]
        self.status = PaymentStatus(payment_intent["status"])
        self.amount = payment_intent["amount"]
        self.currency = payment_intent["currency"]
        self.description = payment_intent.get("description")
        self.statement_descriptor = payment_intent.get("statement_descriptor")
        self.receipt_url = payment_intent.get("receipt_email")
        
        if payment_intent.get("created"):
            self.stripe_created = datetime.fromtimestamp(payment_intent["created"])
        
        # Update payment method information
        if payment_intent.get("payment_method"):
            pm = payment_intent["payment_method"]
            self.payment_method_type = pm.get("type")
            if pm.get("card"):
                self.payment_method_last4 = pm["card"].get("last4")
                self.payment_method_brand = pm["card"].get("brand")
        
        # Update failure information
        if payment_intent.get("last_payment_error"):
            error = payment_intent["last_payment_error"]
            self.failure_code = error.get("code")
            self.failure_message = error.get("message")
        
        # Store metadata
        self.stripe_metadata = payment_intent.get("metadata", {})

    def update_from_stripe_charge(self, charge: Dict[str, Any]):
        """Update from Stripe Charge object"""
        self.stripe_charge_id = charge["id"]
        self.amount = charge["amount"]
        self.currency = charge["currency"]
        self.description = charge.get("description")
        self.statement_descriptor = charge.get("statement_descriptor")
        self.receipt_url = charge.get("receipt_url")
        
        if charge.get("created"):
            self.stripe_created = datetime.fromtimestamp(charge["created"])
        
        # Update fees
        if charge.get("application_fee_amount"):
            self.application_fee = charge["application_fee_amount"]
        
        # Update refund information
        self.refunded_amount = charge.get("amount_refunded", 0)
        
        # Update failure information
        if charge.get("failure_code"):
            self.failure_code = charge["failure_code"]
            self.failure_message = charge.get("failure_message")
        
        # Store metadata
        self.stripe_metadata = charge.get("metadata", {})


class PaddleCustomer(Base):
    """Paddle customer information"""
    __tablename__ = "paddle_customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    paddle_customer_id = Column(String(255), nullable=False, unique=True, index=True)
    
    # Customer details
    email = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    
    # Address information
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(100), nullable=True)
    address_postal_code = Column(String(20), nullable=True)
    address_country = Column(String(2), nullable=True)  # ISO country code
    
    # Tax information
    tax_id = Column(String(100), nullable=True)
    
    # Paddle metadata
    paddle_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="paddle_customer")
    subscriptions = relationship("PaddleSubscription", back_populates="customer")
    payment_events = relationship("PaddlePaymentEvent", back_populates="customer")

    def __repr__(self):
        return f"<PaddleCustomer(user_id={self.user_id}, paddle_id={self.paddle_customer_id})>"

    def get_full_address(self) -> Optional[str]:
        """Get formatted full address"""
        address_line1 = getattr(self, 'address_line1', None)
        if not address_line1:
            return None
        
        parts = [address_line1]
        address_line2 = getattr(self, 'address_line2', None)
        if address_line2:
            parts.append(address_line2)
        address_city = getattr(self, 'address_city', None)
        if address_city:
            parts.append(address_city)
        address_state = getattr(self, 'address_state', None)
        if address_state:
            parts.append(address_state)
        address_postal_code = getattr(self, 'address_postal_code', None)
        if address_postal_code:
            parts.append(address_postal_code)
        address_country = getattr(self, 'address_country', None)
        if address_country:
            parts.append(address_country)
            
        return ", ".join(str(part) for part in parts if part)

    def update_from_paddle(self, paddle_customer: Dict[str, Any]):
        """Update customer information from Paddle customer object"""
        self.email = paddle_customer.get("email", self.email)
        self.name = paddle_customer.get("name", self.name)
        
        # Update address if present
        address = paddle_customer.get("address", {})
        if address:
            self.address_line1 = address.get("line1", self.address_line1)
            self.address_line2 = address.get("line2", self.address_line2)
            self.address_city = address.get("city", self.address_city)
            self.address_state = address.get("state", self.address_state)
            self.address_postal_code = address.get("postal_code", self.address_postal_code)
            self.address_country = address.get("country_code", self.address_country)
        
        # Update tax information
        self.tax_id = paddle_customer.get("tax_identifier", self.tax_id)
        
        # Store Paddle metadata
        self.paddle_metadata = paddle_customer.get("custom_data", {})


class PaddleSubscription(Base):
    """Paddle subscription tracking"""
    __tablename__ = "paddle_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("paddle_customers.id"), nullable=False)
    paddle_subscription_id = Column(String(255), nullable=False, unique=True, index=True)
    
    # Subscription details
    status = Column(String(50), nullable=False)  # active, canceled, paused, etc.
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    canceled_at = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    
    # Product details
    product_id = Column(String(255), nullable=False)  # Paddle product ID
    price_id = Column(String(255), nullable=False)  # Paddle price ID
    unit_price = Column(Integer, nullable=False)  # Price in cents
    currency = Column(String(3), default="USD", nullable=False)
    billing_cycle = Column(String(20), nullable=False)  # month, year
    
    # Trial information
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    
    # Collection mode
    collection_mode = Column(String(20), default="automatic", nullable=False)
    
    # Next billing date
    next_billing_date = Column(DateTime, nullable=True)
    
    # Paddle metadata
    paddle_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    customer = relationship("PaddleCustomer", back_populates="subscriptions")

    def __repr__(self):
        return f"<PaddleSubscription(id={self.paddle_subscription_id}, status={self.status})>"

    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active"""
        status = getattr(self, 'status', None)
        return status in ["active", "trialing"]

    @property
    def is_in_trial(self) -> bool:
        """Check if subscription is in trial period"""
        trial_end = getattr(self, 'trial_end', None)
        if not trial_end:
            return False
        return datetime.utcnow() < trial_end

    @property
    def price_formatted(self) -> str:
        """Get formatted price with currency"""
        unit_price = getattr(self, 'unit_price', 0)
        currency = getattr(self, 'currency', 'USD')
        price = unit_price / 100  # Convert cents to dollars
        return f"${price:.2f} {currency.upper()}"

    @property
    def billing_cycle_formatted(self) -> str:
        """Get formatted billing cycle"""
        billing_cycle = getattr(self, 'billing_cycle', 'month')
        return billing_cycle

    def update_from_paddle(self, paddle_subscription: Dict[str, Any]):
        """Update subscription from Paddle subscription object"""
        self.status = paddle_subscription["status"]
        
        # Update billing period
        if paddle_subscription.get("current_period_start"):
            self.current_period_start = datetime.fromisoformat(
                paddle_subscription["current_period_start"].replace('Z', '+00:00')
            )
        if paddle_subscription.get("current_period_end"):
            self.current_period_end = datetime.fromisoformat(
                paddle_subscription["current_period_end"].replace('Z', '+00:00')
            )
        
        # Update cancellation info
        self.cancel_at_period_end = paddle_subscription.get("cancel_at_period_end", False)
        if paddle_subscription.get("canceled_at"):
            self.canceled_at = datetime.fromisoformat(
                paddle_subscription["canceled_at"].replace('Z', '+00:00')
            )
        
        # Update pause info
        if paddle_subscription.get("paused_at"):
            self.paused_at = datetime.fromisoformat(
                paddle_subscription["paused_at"].replace('Z', '+00:00')
            )
        
        # Update trial information
        if paddle_subscription.get("trial_dates", {}).get("starts_at"):
            self.trial_start = datetime.fromisoformat(
                paddle_subscription["trial_dates"]["starts_at"].replace('Z', '+00:00')
            )
        if paddle_subscription.get("trial_dates", {}).get("ends_at"):
            self.trial_end = datetime.fromisoformat(
                paddle_subscription["trial_dates"]["ends_at"].replace('Z', '+00:00')
            )
        
        # Update product and pricing
        items = paddle_subscription.get("items", [])
        if items:
            item = items[0]
            self.product_id = item["price"]["product_id"]
            self.price_id = item["price"]["id"]
            self.unit_price = int(float(item["price"]["unit_price"]["amount"]) * 100)  # Convert to cents
            self.currency = item["price"]["unit_price"]["currency_code"]
            self.billing_cycle = item["price"]["billing_cycle"]["interval"]
        
        # Update collection mode
        self.collection_mode = paddle_subscription.get("collection_mode", self.collection_mode)
        
        # Update next billing date
        if paddle_subscription.get("next_billed_at"):
            self.next_billing_date = datetime.fromisoformat(
                paddle_subscription["next_billed_at"].replace('Z', '+00:00')
            )
        
        # Store metadata
        self.paddle_metadata = paddle_subscription.get("custom_data", {})


class PaddlePaymentEvent(Base):
    """Paddle payment event tracking for billing audit"""
    __tablename__ = "paddle_payment_events"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("paddle_customers.id"), nullable=False)
    
    # Paddle identifiers
    paddle_transaction_id = Column(String(255), nullable=True, index=True)
    paddle_subscription_id = Column(String(255), nullable=True, index=True)
    paddle_invoice_id = Column(String(255), nullable=True, index=True)
    
    # Payment details
    payment_type = Column(Enum(PaymentType), nullable=False)
    status = Column(Enum(PaymentStatus), nullable=False)
    amount = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String(3), default="USD", nullable=False)
    
    # Payment method
    payment_method_type = Column(String(50), nullable=True)  # card, paypal, etc.
    
    # Transaction details
    description = Column(Text, nullable=True)
    receipt_url = Column(String(500), nullable=True)
    
    # Fees and taxes
    paddle_fee = Column(Integer, nullable=True)  # In cents
    tax_amount = Column(Integer, nullable=True)  # In cents
    
    # Failure information
    failure_code = Column(String(100), nullable=True)
    failure_message = Column(Text, nullable=True)
    
    # Refund information
    refunded_amount = Column(Integer, default=0, nullable=False)  # In cents
    refund_reason = Column(String(100), nullable=True)
    
    # Timestamps
    paddle_created = Column(DateTime, nullable=True)  # When created in Paddle
    processed_at = Column(DateTime, nullable=True)  # When payment was processed
    
    # Metadata
    paddle_metadata = Column(JSON, nullable=True)
    internal_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    customer = relationship("PaddleCustomer", back_populates="payment_events")

    def __repr__(self):
        return f"<PaddlePaymentEvent(type={self.payment_type}, status={self.status}, amount={self.amount})>"

    @property
    def amount_formatted(self) -> str:
        """Get formatted amount with currency"""
        amount = getattr(self, 'amount', 0)
        currency = getattr(self, 'currency', 'USD')
        formatted_amount = amount / 100  # Convert cents to dollars
        return f"${formatted_amount:.2f} {currency.upper()}"

    @property
    def net_amount(self) -> int:
        """Get net amount after fees (in cents)"""
        amount = getattr(self, 'amount', 0)
        paddle_fee = getattr(self, 'paddle_fee', None) or 0
        return amount - paddle_fee

    @property
    def net_amount_formatted(self) -> str:
        """Get formatted net amount with currency"""
        net_amount = self.net_amount
        currency = getattr(self, 'currency', 'USD')
        formatted_amount = net_amount / 100
        return f"${formatted_amount:.2f} {currency.upper()}"

    @property
    def is_successful(self) -> bool:
        """Check if payment was successful"""
        status = getattr(self, 'status', None)
        return status == PaymentStatus.SUCCEEDED

    @property
    def is_refunded(self) -> bool:
        """Check if payment was (partially) refunded"""
        refunded_amount = getattr(self, 'refunded_amount', 0)
        return refunded_amount > 0

    def update_from_paddle_transaction(self, transaction: Dict[str, Any]):
        """Update from Paddle Transaction object"""
        self.paddle_transaction_id = transaction["id"]
        self.status = PaymentStatus(transaction["status"])
        
        # Update amount and currency
        total = transaction.get("details", {}).get("totals", {})
        if total:
            self.amount = int(float(total.get("total", "0")) * 100)  # Convert to cents
            self.currency = total.get("currency_code", "USD")
            self.tax_amount = int(float(total.get("tax", "0")) * 100)  # Convert to cents
        
        # Update payment method
        if transaction.get("payments"):
            payment = transaction["payments"][0]
            self.payment_method_type = payment.get("method_details", {}).get("type")
        
        # Update timestamps
        if transaction.get("created_at"):
            self.paddle_created = datetime.fromisoformat(
                transaction["created_at"].replace('Z', '+00:00')
            )
        
        # Update subscription reference
        subscription_id = transaction.get("subscription_id")
        if subscription_id:
            self.paddle_subscription_id = subscription_id
        
        # Store metadata
        self.paddle_metadata = transaction.get("custom_data", {}) 