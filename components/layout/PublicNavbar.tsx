'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { signInWithGoogle } from '@/lib/supabase/auth';
import { 
  Compass, 
  Loader2, 
  Menu, 
  X,
  ArrowRight,
  UserCheck,
  Heart
} from 'lucide-react';

export default function PublicNavbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      setGoogleLoading(false);
    }
  };

  // Clean 6-page sequence with unified Collaborate section
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Activities', href: '/programmes' },
    { name: 'Centres', href: '/centres' },
    { name: 'Testimonials', href: '/stories' },
    { name: 'Collaborate', href: '/collaborate' },
  ];

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href === '/collaborate' && (pathname === '/for-colleges' || pathname === '/get-involved')) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-sky-100/80 shadow-[0_4px_30px_rgba(30,41,59,0.03)] transition-all">
      <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-16 lg:h-16 xl:h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Name */}
        <Link href="/" className="group shrink-0 block">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-950 to-sky-900 font-display whitespace-nowrap block">
            VOICE Gurukul
          </span>
          <p className="text-[10px] font-bold text-sky-600 tracking-wider uppercase -mt-0.5 whitespace-nowrap">
            Rekindling Wisdom | Reviving Love
          </p>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2 text-sm font-semibold text-slate-600 shrink-0">
          {navItems.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3.5 py-2 rounded-full transition-all duration-200 text-xs xl:text-sm whitespace-nowrap ${
                  isActive 
                    ? 'bg-gradient-to-r from-sky-50 to-indigo-50 text-indigo-700 font-bold border border-sky-200/60 shadow-sm' 
                    : 'hover:text-indigo-600 hover:bg-slate-50'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Top Right Action Button (Donate + Login / Dashboard) */}
        <div className="hidden sm:flex items-center space-x-2.5 shrink-0">
          <Link
            href="/donate/2026GUW00001"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 hover:scale-105 transition-all"
          >
            <Heart className="w-3.5 h-3.5 fill-slate-950" />
            <span>Donate</span>
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              <Compass className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
          ) : (
            <div className="flex items-center space-x-2.5">
              <Link
                href="/auth/login"
                className="px-4 py-2.5 rounded-full text-slate-700 hover:text-indigo-700 font-bold text-xs sm:text-sm hover:bg-slate-100/70 transition-all"
              >
                Sign In
              </Link>
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:shadow-md"
              >
                {googleLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span>Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-2xl border-b border-sky-100 px-6 py-6 space-y-3 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl font-semibold transition-colors ${
                isItemActive(item.href) 
                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-100 flex flex-col space-y-3">
            <Link
              href="/donate/2026GUW00001"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md text-center"
            >
              <Heart className="w-4 h-4 fill-slate-950" />
              <span>Donate (80G Tax-Exempt)</span>
            </Link>

            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-3 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white font-bold shadow-md"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold hover:bg-slate-50"
                >
                  Sign In with Email
                </Link>
                <button
                  onClick={handleGoogleSignIn}
                  className="py-2.5 rounded-xl bg-slate-900 text-white font-bold flex justify-center items-center space-x-2 shadow-sm"
                >
                  <span>Sign In with Google</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
