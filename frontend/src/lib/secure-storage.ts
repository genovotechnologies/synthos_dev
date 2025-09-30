// Secure storage implementation with encryption
export class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: string;
  
  private constructor() {
    // Generate or retrieve encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  private getOrCreateEncryptionKey(): string {
    let key = localStorage.getItem('_encryption_key');
    if (!key) {
      // Generate a new encryption key
      key = this.generateEncryptionKey();
      localStorage.setItem('_encryption_key', key);
    }
    return key;
  }

  private generateEncryptionKey(): string {
    // Generate a simple encryption key (in production, use proper crypto)
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private encrypt(data: string): string {
    // Simple XOR encryption (in production, use proper encryption)
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }
    return btoa(encrypted);
  }

  private decrypt(encryptedData: string): string {
    try {
      const data = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(
          data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  public setItem(key: string, value: string): void {
    try {
      const encrypted = this.encrypt(value);
      localStorage.setItem(`_secure_${key}`, encrypted);
    } catch (error) {
      console.error('Failed to store secure item:', error);
    }
  }

  public getItem(key: string): string | null {
    try {
      const encrypted = localStorage.getItem(`_secure_${key}`);
      if (!encrypted) return null;
      return this.decrypt(encrypted);
    } catch (error) {
      console.error('Failed to retrieve secure item:', error);
      return null;
    }
  }
  
  public removeItem(key: string): void {
    localStorage.removeItem(`_secure_${key}`);
  }

  public clear(): void {
    // Remove all secure items
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('_secure_')) {
        localStorage.removeItem(key);
      }
    });
  }

  // Authentication-specific methods
  public validateIntegrity(): boolean {
    try {
      // Check if encryption key exists and is valid
      const key = localStorage.getItem('_encryption_key');
      if (!key || key.length < 16) {
        return false;
      }
      
      // Check if we can decrypt a test value
      const testKey = '_secure_integrity_test';
      const testValue = 'integrity_check';
      this.setItem(testKey, testValue);
      const decrypted = this.getItem(testKey);
      this.removeItem(testKey);
      
      return decrypted === testValue;
    } catch (error) {
      console.error('Integrity validation failed:', error);
      return false;
    }
  }
  
  public getUser(): any | null {
    try {
      const userData = this.getItem('user');
      if (!userData) return null;
      return JSON.parse(userData);
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }
  
  public setUser(user: any): boolean {
    try {
      this.setItem('user', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Failed to set user:', error);
      return false;
    }
  }

  public getToken(): string | null {
    return this.getItem('access_token');
  }

  public setToken(token: string): boolean {
    try {
      this.setItem('access_token', token);
      return true;
    } catch (error) {
      console.error('Failed to set token:', error);
          return false;
        }
      }
      
  public clearAll(): void {
    // Clear all secure storage including encryption key
    this.clear();
    localStorage.removeItem('_encryption_key');
    
    // Also clear any legacy localStorage items
    const legacyKeys = ['user', 'access_token', 'refresh_token', 'auth_token'];
    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance();