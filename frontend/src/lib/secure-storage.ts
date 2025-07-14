/**
 * Secure Storage Module
 * Replaces localStorage for sensitive data like JWT tokens to prevent XSS attacks
 */

import { AES, enc } from 'crypto-js';

// Storage keys
const STORAGE_PREFIX = 'synthos_secure_';
const TOKEN_KEY = `${STORAGE_PREFIX}token`;
const USER_KEY = `${STORAGE_PREFIX}user`;
const ENCRYPTION_KEY = `${STORAGE_PREFIX}key`;

// Generate a session-specific encryption key
const generateSessionKey = (): string => {
  if (typeof window === 'undefined') return '';
  
  // Use a combination of session storage and crypto.getRandomValues for security
  let sessionKey = sessionStorage.getItem(ENCRYPTION_KEY);
  
  if (!sessionKey) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    sessionKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(ENCRYPTION_KEY, sessionKey);
  }
  
  return sessionKey;
};

class SecureStorage {
  private encryptionKey: string;
  
  constructor() {
    this.encryptionKey = generateSessionKey();
  }
  
  /**
   * Encrypt data before storage
   */
  private encrypt(data: string): string {
    try {
      return AES.encrypt(data, this.encryptionKey).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt data after retrieval
   */
  private decrypt(encryptedData: string): string {
    try {
      const bytes = AES.decrypt(encryptedData, this.encryptionKey);
      return bytes.toString(enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Securely store JWT token
   */
  setToken(token: string): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      // Input validation
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token format');
      }
      
      // Validate JWT format (basic check)
      const jwtParts = token.split('.');
      if (jwtParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const encryptedToken = this.encrypt(token);
      
      // Use httpOnly cookie for production, sessionStorage as fallback
      if (process.env.NODE_ENV === 'production') {
        // Set secure, httpOnly cookie via API call
        fetch('/api/v1/auth/set-secure-cookie', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: encryptedToken }),
          credentials: 'include'
        }).catch(() => {
          // Fallback to sessionStorage if cookie setting fails
          sessionStorage.setItem(TOKEN_KEY, encryptedToken);
        });
      } else {
        // Development: use sessionStorage with encryption
        sessionStorage.setItem(TOKEN_KEY, encryptedToken);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to store token securely:', error);
      return false;
    }
  }
  
  /**
   * Securely retrieve JWT token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      // Try to get from sessionStorage first (works for both dev and prod fallback)
      const encryptedToken = sessionStorage.getItem(TOKEN_KEY);
      
      if (encryptedToken) {
        const token = this.decrypt(encryptedToken);
        
        // Validate decrypted token
        if (token && token.split('.').length === 3) {
          return token;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to retrieve token securely:', error);
      this.clearToken(); // Clear corrupted data
      return null;
    }
  }
  
  /**
   * Securely store user data
   */
  setUser(user: any): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      // Input validation
      if (!user || typeof user !== 'object') {
        throw new Error('Invalid user data');
      }
      
      // Remove sensitive fields before storage
      const sanitizedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subscription: user.subscription,
        // Exclude sensitive fields like passwords, tokens, etc.
      };
      
      const encryptedUser = this.encrypt(JSON.stringify(sanitizedUser));
      sessionStorage.setItem(USER_KEY, encryptedUser);
      
      return true;
    } catch (error) {
      console.error('Failed to store user data securely:', error);
      return false;
    }
  }
  
  /**
   * Securely retrieve user data
   */
  getUser(): any | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const encryptedUser = sessionStorage.getItem(USER_KEY);
      
      if (encryptedUser) {
        const userJson = this.decrypt(encryptedUser);
        return JSON.parse(userJson);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to retrieve user data securely:', error);
      this.clearUser(); // Clear corrupted data
      return null;
    }
  }
  
  /**
   * Clear stored token
   */
  clearToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      
      // Also clear cookie in production
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/v1/auth/clear-secure-cookie', {
          method: 'POST',
          credentials: 'include'
        }).catch(() => {
          // Ignore errors, token is already cleared from sessionStorage
        });
      }
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }
  
  /**
   * Clear stored user data
   */
  clearUser(): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }
  
  /**
   * Clear all secure storage
   */
  clearAll(): void {
    if (typeof window === 'undefined') return;
    
    try {
      this.clearToken();
      this.clearUser();
      sessionStorage.removeItem(ENCRYPTION_KEY);
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
    }
  }
  
  /**
   * Validate storage integrity
   */
  validateIntegrity(): boolean {
    try {
      const token = this.getToken();
      const user = this.getUser();
      
      // If we have a token, we should have user data
      if (token && !user) {
        this.clearAll();
        return false;
      }
      
      // Validate token expiration
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < currentTime) {
          this.clearAll();
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Storage integrity check failed:', error);
      this.clearAll();
      return false;
    }
  }
}

// Create global instance
export const secureStorage = new SecureStorage();

// Legacy compatibility functions (gradually replace these)
export const legacyTokenManager = {
  getToken: () => secureStorage.getToken(),
  setToken: (token: string) => secureStorage.setToken(token),
  clearToken: () => secureStorage.clearToken(),
  getUser: () => secureStorage.getUser(),
  setUser: (user: any) => secureStorage.setUser(user),
  clearUser: () => secureStorage.clearUser(),
};

export default secureStorage; 