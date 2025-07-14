"""
Email Service
Enterprise-grade email sending with templates and SMTP support
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict, Any
from jinja2 import Environment, FileSystemLoader, Template
from pathlib import Path
import logging

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmailService:
    """Advanced email service with template support"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        
        # Initialize Jinja2 environment for templates
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        if template_dir.exists():
            self.jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))
        else:
            self.jinja_env = None
            logger.warning("Email template directory not found")

    async def send_verification_email(
        self, 
        email: str, 
        token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send email verification email
        
        Args:
            email: Recipient email address
            token: Verification token
            user_name: Optional user name for personalization
            
        Returns:
            True if sent successfully, False otherwise
        """
        subject = "Verify Your Synthos Account"
        
        # Create verification URL
        frontend_url = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000"
        verification_url = f"{frontend_url}/verify-email?token={token}"
        
        # Prepare template data
        template_data = {
            "user_name": user_name or email.split("@")[0],
            "verification_url": verification_url,
            "company_name": "Synthos",
            "support_email": self.from_email
        }
        
        # Generate email content
        html_content = self._render_template("verification.html", template_data)
        text_content = self._render_template("verification.txt", template_data)
        
        # Fallback if templates not available
        if not html_content:
            html_content = f"""
            <html>
                <body>
                    <h2>Welcome to Synthos!</h2>
                    <p>Hello {template_data['user_name']},</p>
                    <p>Please click the link below to verify your email address:</p>
                    <p><a href="{verification_url}">Verify Email</a></p>
                    <p>If you didn't create this account, please ignore this email.</p>
                    <p>Best regards,<br>The Synthos Team</p>
                </body>
            </html>
            """
        
        if not text_content:
            text_content = f"""
            Welcome to Synthos!
            
            Hello {template_data['user_name']},
            
            Please visit the following link to verify your email address:
            {verification_url}
            
            If you didn't create this account, please ignore this email.
            
            Best regards,
            The Synthos Team
            """
        
        return await self._send_email(
            to_email=email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

    async def send_password_reset_email(
        self, 
        email: str, 
        token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send password reset email
        
        Args:
            email: Recipient email address
            token: Reset token
            user_name: Optional user name for personalization
            
        Returns:
            True if sent successfully, False otherwise
        """
        subject = "Reset Your Synthos Password"
        
        # Create reset URL
        frontend_url = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000"
        reset_url = f"{frontend_url}/reset-password?token={token}"
        
        # Prepare template data
        template_data = {
            "user_name": user_name or email.split("@")[0],
            "reset_url": reset_url,
            "company_name": "Synthos",
            "support_email": self.from_email
        }
        
        # Generate email content
        html_content = self._render_template("password_reset.html", template_data)
        text_content = self._render_template("password_reset.txt", template_data)
        
        # Fallback if templates not available
        if not html_content:
            html_content = f"""
            <html>
                <body>
                    <h2>Password Reset Request</h2>
                    <p>Hello {template_data['user_name']},</p>
                    <p>You requested to reset your password. Click the link below to set a new password:</p>
                    <p><a href="{reset_url}">Reset Password</a></p>
                    <p>This link will expire in 1 hour for security reasons.</p>
                    <p>If you didn't request this reset, please ignore this email.</p>
                    <p>Best regards,<br>The Synthos Team</p>
                </body>
            </html>
            """
        
        if not text_content:
            text_content = f"""
            Password Reset Request
            
            Hello {template_data['user_name']},
            
            You requested to reset your password. Visit the following link to set a new password:
            {reset_url}
            
            This link will expire in 1 hour for security reasons.
            
            If you didn't request this reset, please ignore this email.
            
            Best regards,
            The Synthos Team
            """
        
        return await self._send_email(
            to_email=email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

    async def send_welcome_email(
        self, 
        email: str, 
        user_name: str
    ) -> bool:
        """
        Send welcome email to new users
        
        Args:
            email: Recipient email address
            user_name: User's name
            
        Returns:
            True if sent successfully, False otherwise
        """
        subject = "Welcome to Synthos - Get Started with Synthetic Data"
        
        template_data = {
            "user_name": user_name,
            "company_name": "Synthos",
            "dashboard_url": f"{settings.CORS_ORIGINS[0]}/dashboard" if settings.CORS_ORIGINS else "#",
            "support_email": self.from_email
        }
        
        html_content = self._render_template("welcome.html", template_data)
        text_content = self._render_template("welcome.txt", template_data)
        
        if not html_content:
            html_content = f"""
            <html>
                <body>
                    <h2>Welcome to Synthos!</h2>
                    <p>Hello {user_name},</p>
                    <p>Thank you for joining Synthos. You can now start generating high-quality synthetic data.</p>
                    <p><a href="{template_data['dashboard_url']}">Go to Dashboard</a></p>
                    <p>Best regards,<br>The Synthos Team</p>
                </body>
            </html>
            """
        
        return await self._send_email(
            to_email=email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

    async def send_subscription_notification(
        self, 
        email: str, 
        user_name: str,
        subscription_type: str,
        action: str = "upgraded"
    ) -> bool:
        """
        Send subscription change notification
        
        Args:
            email: Recipient email address
            user_name: User's name
            subscription_type: New subscription tier
            action: Type of change (upgraded, downgraded, cancelled)
            
        Returns:
            True if sent successfully, False otherwise
        """
        subject = f"Subscription {action.title()} - Synthos"
        
        template_data = {
            "user_name": user_name,
            "subscription_type": subscription_type.title(),
            "action": action,
            "company_name": "Synthos",
            "support_email": self.from_email
        }
        
        html_content = f"""
        <html>
            <body>
                <h2>Subscription {action.title()}</h2>
                <p>Hello {user_name},</p>
                <p>Your subscription has been {action} to {subscription_type.title()}.</p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Best regards,<br>The Synthos Team</p>
            </body>
        </html>
        """
        
        return await self._send_email(
            to_email=email,
            subject=subject,
            html_content=html_content
        )

    def _render_template(self, template_name: str, data: Dict[str, Any]) -> Optional[str]:
        """
        Render email template with data
        
        Args:
            template_name: Name of template file
            data: Template data
            
        Returns:
            Rendered template string or None if template not found
        """
        if not self.jinja_env:
            return None
        
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**data)
        except Exception as e:
            logger.warning(f"Failed to render email template {template_name}: {e}")
            return None

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """
        Send email via SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Optional plain text content
            attachments: Optional list of attachments
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.smtp_host or not self.smtp_user or not self.smtp_password:
            logger.warning("SMTP configuration incomplete, skipping email send")
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"Synthos <{self.from_email}>"
            message["To"] = to_email
            
            # Add text part
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            # Add HTML part
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    # Handle attachment logic here if needed
                    pass
            
            # Create SMTP connection
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_user, self.smtp_password)
                
                # Send email
                text = message.as_string()
                server.sendmail(self.from_email, to_email, text)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_bulk_email(
        self,
        recipients: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, bool]:
        """
        Send bulk emails
        
        Args:
            recipients: List of recipient email addresses
            subject: Email subject
            html_content: HTML email content
            text_content: Optional plain text content
            
        Returns:
            Dictionary mapping email addresses to success status
        """
        results = {}
        
        for email in recipients:
            success = await self._send_email(
                to_email=email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            results[email] = success
        
        return results 