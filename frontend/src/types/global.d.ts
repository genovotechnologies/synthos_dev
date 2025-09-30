// Global type declarations for the application

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string,
      config?: {
        event_category?: string;
        event_label?: string;
        value?: number;
        custom_map?: Record<string, any>;
        [key: string]: any;
      }
    ) => void;
    
    // Google Analytics 4
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    
    // Google Tag Manager
    dataLayer?: any[];
  }
}

export {};
