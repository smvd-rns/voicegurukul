'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Zap,
  Lock,
  HeartHandshake,
  Award,
  Heart,
  Users
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';

import Script from 'next/script';

const MOCK_MODE = false;
const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Counter component for smooth number animation
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = target;
    const duration = 2000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>{count.toLocaleString()}{suffix}</span>
  );
}

export default function DonationPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [paymentForParam, setPaymentForParam] = useState('Donation');

  const [targetUser, setTargetUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeGateway, setActiveGateway] = useState('razorpay');
  const [imageError, setImageError] = useState(false);

  const [formData, setFormData] = useState(() => {
    let initialAmount = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const a = params.get('amount');
      if (a && !isNaN(Number(a))) initialAmount = a;
    }
    return {
      amount: initialAmount,
      donorName: '',
      donorEmail: '',
      donorMobile: '',
      donorAddress: '',
      donorPan: ''
    };
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, name, email, phone, profile_image, parent_center, other_parent_center, parent_temple, other_parent_temple, current_center, other_center, current_temple, other_temple, center, ashram')
          .eq('donation_slug', slug)
          .single();

        if (fetchError || !data) {
          setError('This donation link is invalid or has expired.');
        } else {
          // 1. Resolve Parent Center
          let resolvedParentCenter = 'None';
          if (data.parent_center && data.parent_center !== 'None' && data.parent_center !== 'General') {
            if (data.parent_center === 'Other') {
              resolvedParentCenter = data.other_parent_center ? data.other_parent_center.trim() : 'Other';
            } else {
              resolvedParentCenter = data.parent_center.trim();
            }
          }
          
          // 2. Resolve Parent Temple
          let resolvedParentTemple = 'None';
          if (data.parent_temple && data.parent_temple !== 'None' && data.parent_temple !== 'General') {
            if (data.parent_temple === 'Other') {
              resolvedParentTemple = data.other_parent_temple ? data.other_parent_temple.trim() : 'Other';
            } else {
              resolvedParentTemple = data.parent_temple.trim();
            }
          }

          // 3. Resolve Current Center
          let resolvedCurrentCenter = 'None';
          if (data.current_center && data.current_center !== 'None' && data.current_center !== 'General') {
            if (data.current_center === 'Other') {
              resolvedCurrentCenter = data.other_center ? data.other_center.trim() : 'Other';
            } else {
              resolvedCurrentCenter = data.current_center.trim();
            }
          } else if (data.center && data.center !== 'None') {
            resolvedCurrentCenter = data.center.trim();
          }

          // 4. Resolve Current Temple
          let resolvedCurrentTemple = 'None';
          if (data.current_temple && data.current_temple !== 'None' && data.current_temple !== 'General') {
            if (data.current_temple === 'Other') {
              resolvedCurrentTemple = data.other_temple ? data.other_temple.trim() : 'Other';
            } else {
              resolvedCurrentTemple = data.current_temple.trim();
            }
          }

          setTargetUser({
            ...data,
            resolvedParentCenter,
            resolvedParentTemple,
            resolvedCurrentCenter,
            resolvedCurrentTemple,
            resolvedCenter: resolvedParentCenter, // backward compatibility
            resolvedTemple: resolvedParentTemple, // backward compatibility
            ashram: data.ashram || 'N/A'
          });

          const { data: settings } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('id', 'active_payment_gateway')
            .single();

          if (settings?.value) {
            const normalized = String(settings.value).replace(/^["']|["']$/g, '');
            setActiveGateway(normalized);
          }
        }
      } catch (err) {
        setError('Something went wrong. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const camp = params.get('camp') || params.get('for') || params.get('activity');
      if (camp) {
        setPaymentForParam(camp);
      }
      const amountParam = params.get('amount');
      if (amountParam && !isNaN(Number(amountParam))) {
        setFormData(prev => ({ ...prev, amount: amountParam }));
      }
      const mode = params.get('mode');
      const msg = params.get('message');

      if (mode === 'success') {
        setIsSuccess(true);
      } else if (mode === 'error') {
        setError(msg === 'payment_failed' ? 'Your payment failed or was cancelled.' : 'A security error occurred processing your payment.');
      }
    }
  }, [slug]);

  const handlePayment = async () => {
    if (!targetUser) return;
    setIsProcessing(true);
    setError('');

    const websiteHost = typeof window !== 'undefined' ? window.location.host : 'voicegurukul.com';
    const websiteUrl = typeof window !== 'undefined' ? window.location.href : '';

    try {
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSuccess(true);
      } else if (activeGateway === 'razorpay') {
        if (!window.Razorpay) {
          throw new Error('Payment gateway failed to load. Please refresh.');
        }

        const orderRes = await fetch('/api/donations/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...formData, 
            targetUserId: targetUser.id,
            collectorName: targetUser.name,
            collectorEmail: targetUser.email,
            collectorMobile: targetUser.phone,
            collectorSlug: slug,
            parentCenter: targetUser.resolvedParentCenter,
            parentTemple: targetUser.resolvedParentTemple,
            currentCenter: targetUser.resolvedCurrentCenter,
            currentTemple: targetUser.resolvedCurrentTemple,
            center: targetUser.resolvedCenter,
            temple: targetUser.resolvedTemple,
            ashram: targetUser.ashram,
            website: websiteHost,
            websiteUrl: websiteUrl,
            paymentFor: paymentForParam
          })
        });
        const orderData = await orderRes.json();

        if (!orderRes.ok || !orderData.success) {
          throw new Error(orderData.error || 'Failed to initialize secure payment order.');
        }

        const keyToUse = orderData.keyId || RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!keyToUse) {
          throw new Error('Payment configuration missing (Key ID). Please contact admin.');
        }

        const options = {
          key: keyToUse,
          amount: orderData.amount,
          currency: "INR",
          name: "Voice Gurukul",
          description: `${paymentForParam} via ${targetUser.name || 'Voice Gurukul'}`,
          image: targetUser.profile_image || "",
          order_id: orderData.orderId,
          handler: async function (response: any) {
            try {
              setIsProcessing(true);
              const verifyRes = await fetch('/api/donations/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });
              const verifyData = await verifyRes.json();

              if (!verifyRes.ok || !verifyData.success) {
                throw new Error("Payment verification failed.");
              }

              setIsSuccess(true);
            } catch (err: any) {
              setError(err.message || "An error occurred verifying your payment.");
            } finally {
              setIsProcessing(false);
            }
          },
          prefill: {
            name: formData.donorName,
            email: formData.donorEmail,
            contact: formData.donorMobile,
          },
          notes: {
            payment_for: String(paymentForParam).substring(0, 50),
            website: websiteHost.substring(0, 40),
            donor_name: String(formData.donorName || "").substring(0, 50),
            donor_phone: String(formData.donorMobile || "").substring(0, 20),
            donor_email: String(formData.donorEmail || "").substring(0, 50),
            donor_address: String(formData.donorAddress || "N/A").substring(0, 100),
            donor_pan: String(formData.donorPan || "N/A").substring(0, 20),
            collector_parent_temple: String(targetUser.resolvedParentTemple || "None").substring(0, 50),
            collector_parent_center: String(targetUser.resolvedParentCenter || "None").substring(0, 50),
            collector_slug: String(slug || "").substring(0, 30)
          },
          theme: {
            color: "#4f46e5", // indigo-600
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (activeGateway === 'easebuzz') {
        const orderRes = await fetch('/api/donations/easebuzz/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...formData, 
            targetUserId: targetUser.id, 
            collectorName: targetUser.name,
            collectorEmail: targetUser.email,
            collectorMobile: targetUser.phone,
            collectorSlug: slug,
            slug, 
            parentCenter: targetUser.resolvedParentCenter,
            parentTemple: targetUser.resolvedParentTemple,
            currentCenter: targetUser.resolvedCurrentCenter,
            currentTemple: targetUser.resolvedCurrentTemple,
            center: targetUser.resolvedCenter,
            temple: targetUser.resolvedTemple,
            ashram: targetUser.ashram,
            website: websiteHost,
            websiteUrl: websiteUrl,
            paymentFor: paymentForParam
          })
        });
        const orderData = await orderRes.json();

        if (!orderRes.ok || !orderData.success) {
          throw new Error(orderData.error || 'Failed to initialize Easebuzz order.');
        }

        window.location.href = orderData.paymentUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
      setIsProcessing(false);
    }
  };

  const isFormValid = formData.amount && parseFloat(formData.amount) > 0 && formData.donorName && formData.donorEmail && formData.donorMobile;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Success view
  if (isSuccess) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-amber-600 p-4 font-sans overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-400/30 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 mix-blend-screen" />
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[30px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full max-w-[400px] text-center border border-slate-100 relative z-10"
        >
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </motion.div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Successful</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Thank you! Your contribution of <strong className="text-slate-900">₹{formData.amount}</strong> was successful.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-amber-600 py-10 sm:py-20 px-4 relative flex flex-col items-center justify-center font-sans overflow-x-hidden">

      {/* Immersive Colorful Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-blue-400/30 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-amber-400/30 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[30px]" />
      </div>

      <div className="w-full max-w-[1050px] z-10 relative grid grid-cols-1 lg:grid-cols-2 items-center lg:items-stretch gap-12 lg:gap-20 lg:py-4">

        {/* Left Side: Inspiration */}
        <div className="w-full text-white flex flex-col justify-between self-stretch gap-10 max-w-lg mx-auto lg:max-w-none text-left lg:py-2">

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl lg:text-6xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 pb-1">
                A Purposeful Journey
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed opacity-90 max-w-md">
                Your contribution directly empowers true growth, cultivating values that transform society at its core.
              </p>
            </motion.div>
          </div>

          {/* Impact Stats - Single Row Left Aligned on Mobile */}
          <div className="flex justify-start py-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 flex flex-row items-center gap-3 shadow-[0_15px_40px_rgba(251,191,36,0.1)] transition-transform hover:scale-[1.02]"
            >
              <div className="bg-amber-400/20 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex flex-row items-baseline gap-2">
                <span className="text-amber-400 text-2xl lg:text-3xl font-black tracking-tight leading-none">
                  <Counter target={50000} suffix="+" />
                </span>
                <span className="text-blue-100 text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 whitespace-nowrap align-baseline">Lives Transformed</span>
              </div>
            </motion.div>
          </div>

          {/* Pillars */}
          <div className="space-y-4 text-left">
            {[
              {
                title: "Character",
                desc: "In the symphony of life, let your character play the melody of integrity and virtue.",
                icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
                accent: "from-emerald-400 to-emerald-600"
              },
              {
                title: "Competence",
                desc: "Empower yourself with knowledge, skills, and dedication to thrive in every endeavor.",
                icon: <Award className="w-6 h-6 text-amber-400" />,
                accent: "from-amber-400 to-yellow-600"
              },
              {
                title: "Devotion",
                desc: "With a heart devoted to higher ideals, find purpose and joy in the service of others.",
                icon: <Heart className="w-6 h-6 text-rose-400" />,
                accent: "from-rose-400 to-rose-600"
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
                className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all cursor-default"
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${item.accent} opacity-90`} />
                <div className="flex items-start gap-4 pl-2">
                  <div className="shrink-0 pt-0.5 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-[17px] mb-1 tracking-wide uppercase">
                      {item.title}
                    </h3>
                    <p className="text-blue-50 text-[14px] leading-relaxed font-medium opacity-85">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-3 px-6 py-4 bg-amber-400/10 rounded-[2rem] border border-amber-400/20 w-fit mx-0"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-blue-900 bg-blue-800 flex items-center justify-center text-[10px] font-bold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-[13px] font-semibold text-amber-200 tracking-wide">
              Real Impact, Real People, Real Change.
            </p>
          </motion.div>
        </div>

        {/* Right Side: Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-[440px] z-10 relative shrink-0 lg:ml-auto"
        >
          <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden flex flex-col rounded-[1.5rem]">

            {/* Header Section */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
              {(targetUser?.profile_image && !imageError) ? (
                <img
                  src={targetUser.profile_image}
                  alt=""
                  onError={() => setImageError(true)}
                  className="w-12 h-12 rounded-full border-2 border-indigo-100 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-400" />
                </div>
              )}
              <div>
                <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Payment Details</h1>
                <p className="text-slate-500 font-medium text-[12px] flex items-center gap-1">
                  Supporting <span className="text-indigo-600 font-bold">Voice Gurukul</span>
                </p>
              </div>
            </div>
            <div className="px-6 py-5 bg-white">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[13px] font-medium flex gap-2.5 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </motion.div>
              )}
              <div className="flex flex-col gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Amount <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-indigo-600 text-[14px]">₹</span>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="Enter amount to contribute"
                      className="w-full pl-8 pr-3.5 h-12 bg-white border-2 border-slate-100 rounded-xl text-black text-[15px] font-semibold outline-none focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-300 placeholder:font-normal"
                    />
                  </div>
                  {/* Preset Amount Badges */}
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5">
                    {[1500, 5000, 15000, 50000].map((preset) => {
                      const isSelected = formData.amount === String(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData({ ...formData, amount: String(preset) })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          ₹{preset.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legal Name */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Legal Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.donorName}
                    onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                    placeholder="Full Name as per PAN"
                    className="w-full px-4 h-11 bg-slate-50/50 border border-slate-200 rounded-lg text-black text-[14px] font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Phone <span className="text-red-500">*</span></label>
                  <div className="flex bg-slate-50/50 border border-slate-200 rounded-lg focus-within:bg-white focus-within:border-indigo-500 transition-all overflow-hidden h-11">
                    <div className="bg-slate-100 px-3 text-slate-500 font-bold border-r border-slate-200 text-[11px] flex items-center shrink-0">
                      +91
                    </div>
                    <input
                      type="tel"
                      value={formData.donorMobile}
                      onChange={(e) => setFormData({ ...formData, donorMobile: e.target.value })}
                      placeholder="Mobile Number"
                      className="flex-1 px-3 text-[14px] text-black outline-none border-none min-w-0 bg-transparent placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={formData.donorEmail}
                    onChange={(e) => setFormData({ ...formData, donorEmail: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 h-11 bg-slate-50/50 border border-slate-200 rounded-lg text-black text-[14px] font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Address</label>
                  <textarea
                    rows={1}
                    value={formData.donorAddress}
                    onChange={(e) => setFormData({ ...formData, donorAddress: e.target.value })}
                    placeholder="Optional address details"
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-black text-[14px] font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* PAN */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">PAN Card Number</label>
                  <input
                    type="text"
                    value={formData.donorPan}
                    onChange={(e) => setFormData({ ...formData, donorPan: e.target.value })}
                    placeholder="ABCDE1234F"
                    className="w-full px-4 h-11 bg-slate-50/50 border border-slate-200 rounded-lg text-black text-[14px] font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all uppercase placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal"
                  />
                </div>
              </div>
            </div>

            {/* Footer Area with Pay Button matching image layout */}
            <div className="bg-slate-50 border-t border-slate-100 flex flex-col w-full relative z-10">
              <div className="px-6 py-3 flex items-center justify-between gap-4 border-b border-slate-100">
                <div className="flex items-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all">
                  <div className="font-black text-slate-600 italic text-[12px]">UPI</div>
                  <div className="font-black text-[#1434CB] text-[13px] tracking-tight">VISA</div>
                  <div className="relative flex items-center h-[12px] w-[20px]">
                    <div className="absolute left-0 w-[12px] h-[12px] rounded-full bg-[#EB001B]"></div>
                    <div className="absolute right-0 w-[12px] h-[12px] rounded-full bg-[#F79E1B]"></div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase">Secure</span>
                </div>
              </div>

              {/* Premium Pay Button */}
              <div className="p-4">
                <button
                  onClick={handlePayment}
                  disabled={!isFormValid || isProcessing}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-[16px] h-14 rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-300 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 active:scale-[0.99]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-indigo-200" />
                      <span>Proceed to Pay ₹{formData.amount || '0'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Global Footer */}
      <div className="mt-12 w-full text-center flex flex-col items-center relative z-20">
        <div className="flex flex-col items-center gap-1 opacity-60">
          <div className="flex items-center gap-1.5 text-white">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Support Excellence • Transform Lives</span>
          </div>
          <p className="text-[9px] text-white/50 font-medium uppercase tracking-widest">
            ISKCON Sadhana Platform • Voice Gurukul
          </p>
        </div>
      </div>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
    </div>
  );
}
