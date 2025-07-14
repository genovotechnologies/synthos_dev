/**
 * SafeHTML Component
 * Secure replacement for dangerouslySetInnerHTML to prevent XSS attacks
 */

import React from 'react';
import DOMPurify from 'dompurify';

interface SafeHTMLProps {
  html: string;
  tag?: keyof JSX.IntrinsicElements;
  allowedTags?: string[];
  allowedAttributes?: string[];
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
  onClick?: React.MouseEventHandler<Element>;
  onMouseEnter?: React.MouseEventHandler<Element>;
  onMouseLeave?: React.MouseEventHandler<Element>;
}

// Default allowed tags (very restrictive)
const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre'
];

// Default allowed attributes (very restrictive)
const DEFAULT_ALLOWED_ATTRIBUTES = [
  'class', 'id', 'data-*'
];

const SafeHTML: React.FC<SafeHTMLProps> = ({
  html,
  tag = 'div',
  allowedTags = DEFAULT_ALLOWED_TAGS,
  allowedAttributes = DEFAULT_ALLOWED_ATTRIBUTES,
  className,
  style,
  ...props
}) => {
  // Memoize the sanitization process
  const sanitizedHTML = React.useMemo(() => {
    if (!html) return '';
    
    try {
      // Configure DOMPurify with strict settings
      const config = {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: allowedAttributes,
        KEEP_CONTENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false,
        SANITIZE_DOM: true,
        WHOLE_DOCUMENT: false,
        // Remove all script-related attributes
        FORBID_ATTR: [
          'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
          'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup', 'onkeypress',
          'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
          'onscroll', 'onresize', 'oncontextmenu', 'ondrag', 'ondrop'
        ],
        // Remove script tags and other dangerous elements
        FORBID_TAGS: [
          'script', 'object', 'embed', 'iframe', 'frame', 'frameset',
          'meta', 'link', 'style', 'form', 'input', 'button', 'textarea',
          'select', 'option', 'base', 'noscript'
        ]
      };
      
      // Sanitize the HTML
      const sanitized = DOMPurify.sanitize(html, config);
      
      // Additional validation - check if sanitization removed too much content
      if (html.length > 0 && sanitized.length === 0) {
        console.warn('SafeHTML: All content was removed during sanitization');
        return '';
      }
      
      return sanitized;
    } catch (error) {
      console.error('SafeHTML: Sanitization failed:', error);
      return '';
    }
  }, [html, allowedTags, allowedAttributes]);
  
  // Validate that we're not dealing with script content
  React.useEffect(() => {
    if (html && typeof html === 'string') {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script[^>]*>/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /<iframe[^>]*>/i,
        /<object[^>]*>/i,
        /<embed[^>]*>/i
      ];
      
      const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
        pattern.test(html)
      );
      
      if (hasSuspiciousContent) {
        console.warn('SafeHTML: Suspicious content detected in HTML input');
      }
    }
  }, [html]);
  
  // Extract valid HTML attributes from props
  const {
    id,
    role,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'data-testid': dataTestId,
    onClick,
    onMouseEnter,
    onMouseLeave
  } = props;

  // Create element props
  const elementProps: any = {
    className,
    style,
    dangerouslySetInnerHTML: { __html: sanitizedHTML }
  };

  // Add optional props only if they exist
  if (id) elementProps.id = id;
  if (role) elementProps.role = role;
  if (ariaLabel) elementProps['aria-label'] = ariaLabel;
  if (ariaLabelledby) elementProps['aria-labelledby'] = ariaLabelledby;
  if (ariaDescribedby) elementProps['aria-describedby'] = ariaDescribedby;
  if (dataTestId) elementProps['data-testid'] = dataTestId;
  if (onClick) elementProps.onClick = onClick;
  if (onMouseEnter) elementProps.onMouseEnter = onMouseEnter;
  if (onMouseLeave) elementProps.onMouseLeave = onMouseLeave;

  // Return sanitized content using React.createElement to avoid type conflicts
  return React.createElement(tag, elementProps);
};

export default SafeHTML;

// Helper component for commonly used safe text display
export const SafeText: React.FC<{
  text: string;
  tag?: keyof JSX.IntrinsicElements;
  className?: string;
  maxLength?: number;
}> = ({ text, tag = 'span', className, maxLength }) => {
  const safeText = React.useMemo(() => {
    if (!text) return '';
    
    // Basic HTML encoding to prevent XSS
    const encoded = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    // Truncate if needed
    if (maxLength && encoded.length > maxLength) {
      return encoded.substring(0, maxLength) + '...';
    }
    
    return encoded;
  }, [text, maxLength]);
  
  const Tag = tag as any;
  
  return (
    <Tag 
      className={className}
      dangerouslySetInnerHTML={{ __html: safeText }}
    />
  );
};

// Helper component for rendering markdown safely
export const SafeMarkdown: React.FC<{
  markdown: string;
  className?: string;
}> = ({ markdown, className }) => {
  const sanitizedMarkdown = React.useMemo(() => {
    if (!markdown) return '';
    
    try {
      // Basic markdown to HTML conversion (very limited for security)
      let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/__(.*?)__/gim, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/_(.*?)_/gim, '<em>$1</em>')
        // Code
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        // Line breaks
        .replace(/\n/gim, '<br>');
      
      // Sanitize the resulting HTML
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'code', 'br', 'p'],
        ALLOWED_ATTR: []
      });
    } catch (error) {
      console.error('SafeMarkdown: Processing failed:', error);
      return '';
    }
  }, [markdown]);
  
  return (
    <SafeHTML
      html={sanitizedMarkdown}
      className={className}
      allowedTags={['h1', 'h2', 'h3', 'strong', 'em', 'code', 'br', 'p']}
      allowedAttributes={[]}
    />
  );
}; 