'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { secureStorage } from '../lib/secure-storage';
import { apiClient } from '@/lib/api';

const AuthContext = createContext<any>(null);

export const useAuth = () => useContext(AuthContext) || {};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Prefer server session via HttpOnly cookie
        const profile = await apiClient.getProfile();
        if (profile && profile.email) {
          setUser(profile);
          setIsAuthenticated(true);
          return;
        }

        // Fallback to legacy local storage if present
        if (secureStorage.validateIntegrity()) {
          const storedUser = secureStorage.getUser();
          if (storedUser) {
            setUser(storedUser);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const validateTokenWithServer = async (): Promise<boolean> => {
    try {
      const profile = await apiClient.getProfile();
      return !!profile?.email;
    } catch (error) {
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Use backend JSON signin which sets HttpOnly cookie
      await apiClient.signIn(email, password);
      const profile = await apiClient.getProfile();
      if (profile && profile.email) {
        setUser(profile);
        setIsAuthenticated(true);
        // Optional: store minimal user data for UX only (not auth)
        secureStorage.setUser(profile);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Input validation
      if (!userData.email || !userData.password || !userData.full_name) {
        throw new Error('All required fields must be provided');
      }

      // Password strength validation
      if (userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Use backend signup which returns user and sets cookie via signin flow afterward
      await apiClient.signUp({
        email: userData.email,
        password: userData.password,
        full_name: userData.full_name,
        company_name: userData.company_name,
      });
      // Auto-login after signup
      await apiClient.signIn(userData.email, userData.password);
      const profile = await apiClient.getProfile();
      if (profile && profile.email) {
        setUser(profile);
        setIsAuthenticated(true);
        secureStorage.setUser(profile);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear secure storage
    secureStorage.clearAll();
    
    // Clear state
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear any remaining localStorage items (legacy cleanup)
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      // Ignore localStorage errors
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const currentToken = secureStorage.getToken();
      if (!currentToken) {
        logout();
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { access_token } = await response.json();
        
        // Secure token storage
        const tokenStored = secureStorage.setToken(access_token);
        if (!tokenStored) {
          throw new Error('Failed to store refreshed token securely');
        }
        
        setUser(user);
        setIsAuthenticated(true);
        return true;
      }

      logout();
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  const updateUser = (updates: Partial<any>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      // Secure user data storage
      secureStorage.setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  const AuthenticatedComponent = (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/signin');
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  return AuthenticatedComponent;
};

// Hook for API calls with authentication
export const useAuthenticatedFetch = () => {
  const { token, refreshToken, logout } = useAuth();

  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Handle different header types
    if (options.headers) {
      if (options.headers instanceof Headers) {
        // Convert Headers object to plain object
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else {
        // Handle plain object headers
        Object.assign(headers, options.headers);
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // If unauthorized, try to refresh token
    if (response.status === 401 && token) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(fullUrl, {
          ...options,
          headers,
        });
      } else {
        logout();
        throw new Error('Authentication failed');
      }
    }

    return response;
  };

  return authenticatedFetch;
}; 