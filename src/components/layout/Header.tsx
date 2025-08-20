'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/types/auth';

/**
 * Props for Header component
 */
interface HeaderProps {
  className?: string;
  showLogo?: boolean;
  showThemeToggle?: boolean;
  transparent?: boolean;
  checkAuth?: boolean;
}

/**
 * Sticky header component with theme toggle and logo
 * Provides consistent navigation across all pages
 */
export function Header({ 
  className,
  showLogo = true,
  showThemeToggle = true,
  transparent = false,
  checkAuth = false
}: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(checkAuth);

  useEffect(() => {
    if (!checkAuth) return;

    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/validate-session');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [checkAuth]);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        setUser(null);
        router.push('/');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full',
        'border-b border-border/40',
        'backdrop-blur supports-[backdrop-filter]:bg-background/60',
        transparent ? 'bg-transparent' : 'bg-background/95',
        'transition-all duration-200 ease-in-out',
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          {showLogo && (
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/Udaman_Logo.webp"
                alt="Udaman"
                width={32}
                height={32}
                className="h-8 w-auto"
                priority
              />
              <span className="text-xl font-bold text-foreground">
                Udaman
              </span>
            </Link>
          )}

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            
            {/* Conditional navigation based on auth status */}
            {!isLoading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/register"
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Theme Toggle */}
          {showThemeToggle && (
            <div className="flex items-center space-x-4">
              <ThemeToggle size="md" aria-label="Toggle theme" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Simple header variant for auth pages
 * Minimal header with just logo and theme toggle
 */
export function AuthHeader({ className }: { className?: string }) {
  return (
    <Header
      className={className}
      showLogo={true}
      showThemeToggle={true}
      transparent={false}
    />
  );
}

/**
 * Landing page header variant
 * Transparent background with full navigation
 */
export function LandingHeader({ className }: { className?: string }) {
  return (
    <Header
      className={className}
      showLogo={true}
      showThemeToggle={true}
      transparent={true}
    />
  );
}
