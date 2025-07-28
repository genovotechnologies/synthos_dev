'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  Menu,
  X,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  BarChart3,
  Key,
  CreditCard,
  Shield,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/AuthContext'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const navigation = [
    { name: 'Features', href: '/features', show: !isAuthenticated },
    { name: 'Pricing', href: '/pricing', show: !isAuthenticated },
    { name: 'Dashboard', href: '/dashboard', show: isAuthenticated },
    { name: 'Datasets', href: '/datasets', show: isAuthenticated },
    { name: 'API', href: '/api', show: isAuthenticated },
    { name: 'Models', href: '/custom-models', show: isAuthenticated && user?.subscription_tier !== 'free' },
  ]

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg animate-pulse" />
            <div className="w-24 h-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-top">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 touch-target">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center transition-transform hover:scale-105">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gradient hidden sm:block">Synthos</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              {navigation.filter(item => item.show).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary relative ${
                    pathname === item.href 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.name}
                  {pathname === item.href && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`touch-target relative transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:outline-none ${theme === 'dark' ? 'glow-primary' : 'glow-secondary'} group`}
                aria-label="Toggle theme"
                aria-pressed={theme === 'dark'}
              >
                <span className="sr-only">Toggle {theme === 'dark' ? 'light' : 'dark'} mode</span>
                <Sun className={`h-5 w-5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-0' : 'rotate-0 scale-100 opacity-100'} group-hover:scale-110 group-active:scale-95`} />
                <Moon className={`h-5 w-5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'} group-hover:scale-110 group-active:scale-95`} />
                <span className="absolute inset-0 rounded-full pointer-events-none animate-pulse opacity-20 group-hover:opacity-40" style={{boxShadow: theme === 'dark' ? '0 0 16px 4px #3b82f6' : '0 0 16px 4px #fbbf24'}} />
              </Button>

              {isAuthenticated ? (
                <>
                  {/* User Menu - Desktop */}
                  <div className="hidden sm:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 touch-target">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                          </div>
                          <span className="hidden lg:inline max-w-32 truncate text-sm">
                            {user?.full_name || user?.email}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          <div className="font-medium text-foreground">{user?.full_name || user?.email}</div>
                          <div className="text-xs">{user?.subscription_tier || 'Free'} Plan</div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="w-full cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/settings" className="w-full cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/billing" className="w-full cursor-pointer">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Billing
                          </Link>
                        </DropdownMenuItem>
                        {user?.role === 'admin' && (
                          <DropdownMenuItem asChild>
                            <Link href="/admin" className="w-full cursor-pointer">
                              <Shield className="mr-2 h-4 w-4" />
                              Admin
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={logout} 
                          className="text-red-600 dark:text-red-400 cursor-pointer"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <>
                  {/* Auth Buttons - Desktop */}
                  <div className="hidden sm:flex items-center space-x-4">
                    <Link href="/auth/signin">
                      <Button variant="ghost" size="sm" className="touch-target">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button size="sm" className="glow-primary touch-target">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden touch-target"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-background/95 backdrop-blur-lg border-l shadow-xl animate-fade-in-up safe-top safe-bottom">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gradient">Synthos</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="touch-target"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-2 px-4">
                  {isAuthenticated && (
                    <div className="px-4 py-3 bg-muted/50 rounded-lg mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{user?.full_name || user?.email}</div>
                          <div className="text-xs text-muted-foreground">{user?.subscription_tier || 'Free'} Plan</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {navigation.filter(item => item.show).map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-target ${
                        pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}

                  {isAuthenticated ? (
                    <>
                      <div className="border-t border-border/50 my-4" />
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-target"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="mr-3 h-4 w-4" />
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-target"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Settings
                      </Link>
                      <Link
                        href="/billing"
                        className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-target"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <CreditCard className="mr-3 h-4 w-4" />
                        Billing
                      </Link>
                      {user?.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-target"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Shield className="mr-3 h-4 w-4" />
                          Admin
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="border-t border-border/50 my-4" />
                      <Link
                        href="/auth/signin"
                        className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-target"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/auth/signup"
                        className="flex items-center px-4 py-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 touch-target"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </nav>
              </div>

              {/* Footer */}
              <div className="border-t border-border/50 p-4">
                {isAuthenticated && (
                  <Button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full touch-target text-red-600 dark:text-red-400 border-red-600/20 hover:bg-red-600/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
