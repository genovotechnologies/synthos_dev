'use client'

import React, { useState } from 'react'
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
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/AuthContext'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">Synthos</span>
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden sm:flex"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    Dashboard
                  </Link>
                  <Link href="/datasets" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    Datasets
                  </Link>
                  <Link href="/api" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    API
                  </Link>
                  {user?.subscription_tier !== 'free' && (
                    <Link href="/custom-models" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                      Models
                    </Link>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="hidden lg:inline max-w-32 truncate">{user?.full_name || user?.email}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="w-full">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="w-full">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/billing" className="w-full">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Billing
                        </Link>
                      </DropdownMenuItem>
                      {user?.role === 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="w-full">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    Features
                  </Link>
                  <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    Pricing
                  </Link>
                  <Link href="/auth/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    Sign In
                  </Link>
                  <Link href="/auth/signup">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

                  {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t bg-background/95 backdrop-blur">
              <div className="py-4 space-y-2">
                {isAuthenticated ? (
                  <>
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium">{user?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground">{user?.subscription_tier || 'Free'} Plan</p>
                    </div>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Dashboard
                    </Link>
                    <Link href="/profile" className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Profile
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Settings
                    </Link>
                    <Link href="/api" className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                      API
                    </Link>
                    <div className="px-4 py-2">
                      <Button onClick={logout} variant="outline" className="w-full">
                        Sign Out
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/features" className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Features
                    </Link>
                    <Link href="/pricing" className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Pricing
                    </Link>
                    <Link href="/auth/signin" className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Sign In
                    </Link>
                    <Link href="/auth/signup" className="block px-4 py-2">
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
      </div>
    </header>
  )
} 