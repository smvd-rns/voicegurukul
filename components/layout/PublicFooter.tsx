'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Heart, ArrowUpRight } from 'lucide-react';

export default function PublicFooter() {
  const navItems = [
    { name: '1. Home', href: '/' },
    { name: '2. About Us', href: '/about' },
    { name: '3. Activities', href: '/programmes' },
    { name: '4. VOICE Centres', href: '/centres' },
    { name: '5. Testimonials', href: '/stories' },
    { name: '6. Collaborate & Partner', href: '/collaborate' },
  ];

  return (
    <footer className="bg-slate-950 text-slate-300 py-16 border-t border-slate-900 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-900/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4 sm:gap-6 md:gap-10">
          
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="group inline-block">
              <span className="text-xl font-black text-white font-display tracking-tight">VOICE Gurukul</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vedic Oasis for Inspiration, Culture & Education. Empowering university youth with character, leadership, mental resilience, and spiritual principles across 100+ centres.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center text-[11px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-3 py-1 rounded-full">
                Connected with ISKCON Youth Forum
              </span>
            </div>
          </div>

          {/* Quick Links with 7-page sequence */}
          <div className="col-span-1">
            <h4 className="text-xs font-black uppercase text-sky-400 tracking-wider mb-4">Website Pages</h4>
            <ul className="space-y-2 text-xs font-medium">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="hover:text-white transition-colors flex items-center space-x-1 group">
                    <span>{item.name}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-sky-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Policies */}
          <div className="col-span-1">
            <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider mb-4">Compliance & Policies</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition-colors">Cancellation &amp; Refund Policy</Link>
              </li>
              <li className="pt-2">
                <Link href="/dashboard/donations" className="text-amber-400 hover:text-amber-300 font-bold transition-colors flex items-center space-x-1">
                  <Heart className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
                  <span>Sponsor Yuva Meals (80G Tax-exempt)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-4">Contact & Support</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <a href="mailto:manager@voicepune.com" className="hover:text-white transition-colors">manager@voicepune.com</a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <a href="tel:+917378709688" className="hover:text-white transition-colors">+91 73787 09688</a>
              </div>
              <div className="flex items-start space-x-2 pt-1 text-slate-400">
                <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>VOICE Pune Headquarters, Maharashtra, India</span>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} VOICE Gurukul. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-serif italic text-indigo-300/80">Hare Krishna Hare Rama • Inspiring Youth Globally</p>
        </div>

      </div>
    </footer>
  );
}
