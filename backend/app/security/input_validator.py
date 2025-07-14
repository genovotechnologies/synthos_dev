"""
Input Validation and Sanitization Module
Prevents XSS, SQL injection, and other input-based attacks
"""

import re
import html
import json
import logging
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse
import bleach
from email_validator import validate_email, EmailNotValidError

logger = logging.getLogger(__name__)

class InputValidator:
    """
    Comprehensive input validation and sanitization
    """
    
    # XSS prevention patterns
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'onload\s*=',
        r'onerror\s*=',
        r'onclick\s*=',
        r'onmouseover\s*=',
        r'<iframe[^>]*>.*?</iframe>',
        r'<object[^>]*>.*?</object>',
        r'<embed[^>]*>.*?</embed>',
        r'<link[^>]*>',
        r'<meta[^>]*>',
        r'expression\s*\(',
        r'url\s*\(',
        r'@import',
    ]
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r'(?i)(union\s+select)',
        r'(?i)(insert\s+into)',
        r'(?i)(delete\s+from)',
        r'(?i)(drop\s+table)',
        r'(?i)(update\s+\w+\s+set)',
        r'(?i)(exec\s*\()',
        r'(?i)(execute\s*\()',
        r'(?i)(sp_)',
        r'(?i)(xp_)',
        r'--',
        r'/\*.*?\*/',
        r"';\s*(drop|delete|insert|update|create|alter)",
    ]
    
    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        r';\s*rm\s',
        r';\s*cat\s',
        r';\s*ls\s',
        r';\s*pwd',
        r';\s*id\s',
        r';\s*whoami',
        r';\s*ps\s',
        r';\s*kill\s',
        r'\|\s*nc\s',
        r'\|\s*netcat\s',
        r'`.*`',
        r'\$\(.*\)',
        r'&&\s*(rm|cat|ls|pwd|id|whoami)',
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r'\.\./',
        r'\.\.\\',
        r'%2e%2e%2f',
        r'%252e%252e%252f',
        r'..%2f',
        r'..%5c',
    ]
    
    def __init__(self):
        """Initialize validator with secure defaults"""
        # Allowed HTML tags for rich text (very restrictive)
        self.allowed_tags = [
            'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'span', 'div',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
            'blockquote', 'code', 'pre'
        ]
        
        # Allowed attributes (very restrictive)
        self.allowed_attributes = {
            '*': ['class', 'id'],
            'a': ['href', 'title'],
            'img': ['src', 'alt', 'width', 'height'],
        }
        
        # Compile regex patterns for performance
        self.xss_regex = re.compile('|'.join(self.XSS_PATTERNS), re.IGNORECASE | re.DOTALL)
        self.sql_regex = re.compile('|'.join(self.SQL_INJECTION_PATTERNS), re.IGNORECASE)
        self.cmd_regex = re.compile('|'.join(self.COMMAND_INJECTION_PATTERNS), re.IGNORECASE)
        self.path_regex = re.compile('|'.join(self.PATH_TRAVERSAL_PATTERNS), re.IGNORECASE)
    
    def sanitize_html(self, input_text: str, allow_tags: bool = False) -> str:
        """
        Sanitize HTML input to prevent XSS attacks
        
        Args:
            input_text: Raw HTML input
            allow_tags: Whether to allow safe HTML tags
            
        Returns:
            Sanitized HTML string
        """
        if not isinstance(input_text, str):
            return str(input_text)
        
        if not allow_tags:
            # Strip all HTML tags and encode entities
            return html.escape(input_text, quote=True)
        
        # Use bleach for advanced HTML sanitization
        sanitized = bleach.clean(
            input_text,
            tags=self.allowed_tags,
            attributes=self.allowed_attributes,
            strip=True,
            strip_comments=True
        )
        
        return sanitized
    
    def validate_email(self, email: str) -> tuple[bool, str]:
        """
        Validate email address
        
        Args:
            email: Email address to validate
            
        Returns:
            Tuple of (is_valid, normalized_email)
        """
        try:
            # Basic format check
            if not isinstance(email, str) or len(email) > 254:
                return False, ""
            
            # Advanced validation
            valid = validate_email(email)
            return True, valid.email
        except EmailNotValidError:
            return False, ""
    
    def validate_password(self, password: str) -> Dict[str, Any]:
        """
        Validate password strength
        
        Args:
            password: Password to validate
            
        Returns:
            Dictionary with validation results
        """
        result = {
            'valid': False,
            'score': 0,
            'issues': [],
            'suggestions': []
        }
        
        if not isinstance(password, str):
            result['issues'].append('Password must be a string')
            return result
        
        # Length check
        if len(password) < 8:
            result['issues'].append('Password must be at least 8 characters long')
        elif len(password) >= 12:
            result['score'] += 2
        else:
            result['score'] += 1
        
        # Character variety checks
        if re.search(r'[a-z]', password):
            result['score'] += 1
        else:
            result['suggestions'].append('Add lowercase letters')
        
        if re.search(r'[A-Z]', password):
            result['score'] += 1
        else:
            result['suggestions'].append('Add uppercase letters')
        
        if re.search(r'\d', password):
            result['score'] += 1
        else:
            result['suggestions'].append('Add numbers')
        
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            result['score'] += 2
        else:
            result['suggestions'].append('Add special characters')
        
        # Common password check
        common_passwords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890'
        ]
        
        if password.lower() in common_passwords:
            result['issues'].append('Password is too common')
            result['score'] = 0
        
        # Repeated characters check
        if re.search(r'(.)\1{2,}', password):
            result['issues'].append('Avoid repeating characters')
            result['score'] -= 1
        
        result['valid'] = len(result['issues']) == 0 and result['score'] >= 4
        return result
    
    def detect_xss(self, input_text: str) -> bool:
        """
        Detect potential XSS attacks
        
        Args:
            input_text: Text to check
            
        Returns:
            True if XSS detected
        """
        if not isinstance(input_text, str):
            return False
        
        # Check for XSS patterns
        if self.xss_regex.search(input_text):
            logger.warning(f"XSS attempt detected: {input_text[:100]}...")
            return True
        
        # Check for encoded XSS attempts
        try:
            # URL decode
            import urllib.parse
            decoded = urllib.parse.unquote(input_text)
            if self.xss_regex.search(decoded):
                logger.warning(f"Encoded XSS attempt detected: {input_text[:100]}...")
                return True
            
            # Base64 decode attempts
            import base64
            try:
                base64_decoded = base64.b64decode(input_text).decode('utf-8', errors='ignore')
                if self.xss_regex.search(base64_decoded):
                    logger.warning(f"Base64 encoded XSS attempt detected: {input_text[:100]}...")
                    return True
            except:
                pass
                
        except:
            pass
        
        return False
    
    def detect_sql_injection(self, input_text: str) -> bool:
        """
        Detect potential SQL injection attacks
        
        Args:
            input_text: Text to check
            
        Returns:
            True if SQL injection detected
        """
        if not isinstance(input_text, str):
            return False
        
        if self.sql_regex.search(input_text):
            logger.warning(f"SQL injection attempt detected: {input_text[:100]}...")
            return True
        
        return False
    
    def detect_command_injection(self, input_text: str) -> bool:
        """
        Detect potential command injection attacks
        
        Args:
            input_text: Text to check
            
        Returns:
            True if command injection detected
        """
        if not isinstance(input_text, str):
            return False
        
        if self.cmd_regex.search(input_text):
            logger.warning(f"Command injection attempt detected: {input_text[:100]}...")
            return True
        
        return False
    
    def detect_path_traversal(self, input_text: str) -> bool:
        """
        Detect potential path traversal attacks
        
        Args:
            input_text: Text to check
            
        Returns:
            True if path traversal detected
        """
        if not isinstance(input_text, str):
            return False
        
        if self.path_regex.search(input_text):
            logger.warning(f"Path traversal attempt detected: {input_text[:100]}...")
            return True
        
        return False
    
    def validate_json(self, json_string: str, max_depth: int = 10) -> tuple[bool, Any]:
        """
        Safely validate and parse JSON
        
        Args:
            json_string: JSON string to validate
            max_depth: Maximum nesting depth allowed
            
        Returns:
            Tuple of (is_valid, parsed_data)
        """
        try:
            if not isinstance(json_string, str):
                return False, None
            
            # Size check
            if len(json_string) > 1024 * 1024:  # 1MB limit
                logger.warning("JSON payload too large")
                return False, None
            
            # Parse JSON
            data = json.loads(json_string)
            
            # Check nesting depth
            def check_depth(obj, depth=0):
                if depth > max_depth:
                    return False
                if isinstance(obj, dict):
                    return all(check_depth(v, depth + 1) for v in obj.values())
                elif isinstance(obj, list):
                    return all(check_depth(item, depth + 1) for item in obj)
                return True
            
            if not check_depth(data):
                logger.warning("JSON nesting too deep")
                return False, None
            
            return True, data
            
        except json.JSONDecodeError:
            return False, None
    
    def validate_url(self, url: str, allowed_schemes: List[str] = None) -> bool:
        """
        Validate URL format and scheme
        
        Args:
            url: URL to validate
            allowed_schemes: List of allowed URL schemes
            
        Returns:
            True if URL is valid
        """
        if not isinstance(url, str):
            return False
        
        if allowed_schemes is None:
            allowed_schemes = ['http', 'https']
        
        try:
            parsed = urlparse(url)
            
            # Check scheme
            if parsed.scheme not in allowed_schemes:
                return False
            
            # Check for suspicious patterns
            if self.detect_xss(url) or self.detect_command_injection(url):
                return False
            
            # Basic format validation
            if not parsed.netloc:
                return False
            
            return True
            
        except Exception:
            return False
    
    def sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to prevent path traversal and injection
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        if not isinstance(filename, str):
            return "invalid_file"
        
        # Remove path components
        filename = filename.split('/')[-1].split('\\')[-1]
        
        # Remove dangerous characters
        filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        
        # Prevent hidden files
        if filename.startswith('.'):
            filename = 'file_' + filename[1:]
        
        # Ensure reasonable length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:250] + ('.' + ext if ext else '')
        
        # Prevent empty names
        if not filename or filename == '.' or filename == '..':
            filename = 'unnamed_file'
        
        return filename
    
    def validate_input(self, input_data: Any, field_name: str = "input") -> Dict[str, Any]:
        """
        Comprehensive input validation
        
        Args:
            input_data: Data to validate
            field_name: Name of the field for logging
            
        Returns:
            Validation results
        """
        result = {
            'valid': True,
            'sanitized': input_data,
            'issues': [],
            'field': field_name
        }
        
        if isinstance(input_data, str):
            # Check for various attack patterns
            if self.detect_xss(input_data):
                result['issues'].append(f"XSS attempt in {field_name}")
                result['valid'] = False
            
            if self.detect_sql_injection(input_data):
                result['issues'].append(f"SQL injection attempt in {field_name}")
                result['valid'] = False
            
            if self.detect_command_injection(input_data):
                result['issues'].append(f"Command injection attempt in {field_name}")
                result['valid'] = False
            
            if self.detect_path_traversal(input_data):
                result['issues'].append(f"Path traversal attempt in {field_name}")
                result['valid'] = False
            
            # Sanitize if valid
            if result['valid']:
                result['sanitized'] = self.sanitize_html(input_data)
        
        return result

# Global validator instance
input_validator = InputValidator()

# Convenience functions
def sanitize_html(text: str, allow_tags: bool = False) -> str:
    """Sanitize HTML content"""
    return input_validator.sanitize_html(text, allow_tags)

def validate_email(email: str) -> tuple[bool, str]:
    """Validate email address"""
    return input_validator.validate_email(email)

def validate_password(password: str) -> Dict[str, Any]:
    """Validate password strength"""
    return input_validator.validate_password(password)

def validate_input(data: Any, field_name: str = "input") -> Dict[str, Any]:
    """Validate input data"""
    return input_validator.validate_input(data, field_name)

def sanitize_filename(filename: str) -> str:
    """Sanitize filename"""
    return input_validator.sanitize_filename(filename) 