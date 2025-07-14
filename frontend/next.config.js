/** @type {import('next').NextConfig} */
// Temporarily disable Sentry for smoother development
// const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Experimental features
  experimental: {
    scrollRestoration: true,
    // optimizeCss: true, // Disabled due to critters module conflict
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'Synthos',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },

  // Optimized image configuration
  images: {
    domains: [
      'localhost',
      'synthos.dev',
      'd123456789.cloudfront.net',
      'images.unsplash.com',
      'github.com',
    ],
    // Re-enable image optimization with proper formats
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security headers - CRITICAL for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com; worker-src 'self' blob:; child-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:;"
          }
        ]
      }
    ];
  },

  // Optimized redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: false,
      },
      // Add more redirects as needed
      {
        source: '/docs',
        destination: '/documentation',
        permanent: true,
      },
    ];
  },

  // Add rewrites for API optimization
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health-check',
      },
      // Add more rewrites for cleaner URLs
    ];
  },

  // Enhanced webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Path resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').join(__dirname, 'src'),
    };

    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              chunks: 'all',
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: false,
        })
      );
    }

    return config;
  },

  // Enable standalone output for containerized deployments
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Enable compression for production
  compress: process.env.NODE_ENV === 'production',

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,
  
  // Optimized build settings
  distDir: '.next',
  
  // TypeScript configuration - ENABLE ERROR CHECKING
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development', // Only ignore in dev
  },

  // ESLint configuration - ENABLE ERROR CHECKING  
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development', // Only ignore in dev
    dirs: ['src', 'pages', 'components'],
  },

  // Internationalization - uncomment when needed
  // i18n: {
  //   locales: ['en', 'es', 'fr', 'de'],
  //   defaultLocale: 'en',
  //   localeDetection: true,
  // },

  // Optimized compilation - Remove Turbopack incompatible options
  compiler: {
    // These options are not yet supported by Turbopack, so we disable them
    // removeConsole: process.env.NODE_ENV === 'production',
    // reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Removed invalid logging configuration - use Next.js built-in logging instead
};

// Export configuration directly (Sentry disabled for development)
module.exports = nextConfig;