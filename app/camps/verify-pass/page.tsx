'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, AlertCircle, CheckCircle2, XCircle,
  Utensils, Calendar, MapPin, User, Phone, Ticket,
  Search, ArrowLeft, Clock, RefreshCw, Home
} from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import CampPrasadamCard from '@/components/camps/CampPrasadamCard';
import { verifyCampRegistrationAction } from '@/app/dashboard/admin/camps/actions';
import { buildMealMatrix, checkCurrentMealEligibility } from '@/lib/camp-cost';

function VerifyPassContent() {
  const searchParams = useSearchParams();
  const passId = searchParams.get('id') || '';

  const [searchId, setSearchId] = useState(passId);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    registration: any;
    refund: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPass = async (idToFetch: string) => {
    const clean = (idToFetch || '').trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    try {
      const res = await verifyCampRegistrationAction(clean);
      if (res.success && res.registration) {
        setData({
          registration: res.registration,
          refund: res.refund,
        });
      } else {
        setData(null);
        setError(res.error || 'Pass not found.');
      }
    } catch (err: any) {
      setData(null);
      setError(err.message || 'Error verifying pass.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (passId) {
      setSearchId(passId);
      fetchPass(passId);
    }
  }, [passId]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId) {
      fetchPass(searchId);
    }
  };

  // Real-time meal evaluation
  const mealEvaluation = React.useMemo(() => {
    if (!data?.registration) return null;
    const reg = data.registration;
    const matrix = buildMealMatrix(
      reg.camp_meal_pricing || [],
      reg.first_meal_date,
      reg.first_meal_type,
      reg.last_meal_date,
      reg.last_meal_type,
      reg.camp_start_date,
      reg.camp_end_date
    );
    return checkCurrentMealEligibility(matrix, new Date());
  }, [data]);

  const reg = data?.registration;
  const refund = data?.refund;
  const isRefunded = refund?.status === 'refunded' || reg?.payment_status === 'refunded';
  const isRefundPending = refund?.status === 'pending';
  const isCancelled = reg?.is_cancelled || isRefunded;
  const isPaymentPending = reg?.payment_status === 'pending';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Official Camp Pass Verification Desk</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Prasadam &amp; Entry Pass Validator
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Scan QR Code or enter registration ID to instantly verify delegate identity and meal eligibility
        </p>
      </div>

      {/* Manual Search Bar */}
      <form onSubmit={handleManualSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Enter Registration ID or scan code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !searchId}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>Verify</span>
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-in fade-in">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <h4 className="font-bold">Pass Verification Failed</h4>
            <p className="text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Verifying pass record in database...</p>
        </div>
      )}

      {/* VERIFIED PASS DISPLAY */}
      {reg && !loading && (
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
          {/* 1. REAL-TIME MEAL VERIFICATION BANNER */}
          {isCancelled ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-1.5">
              <div className="flex items-center gap-2">
                <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                <h3 className="text-base font-black uppercase tracking-wide">
                  INVALID / CANCELLED PASS
                </h3>
              </div>
              <p className="text-xs text-rose-800">
                This registration has been marked as{' '}
                <span className="font-black font-mono">
                  {isRefunded ? 'REFUNDED' : 'CANCELLED'}
                </span>
                . Devotee is NOT eligible for Prasadam or entry.
              </p>
            </div>
          ) : isPaymentPending ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                <h3 className="text-base font-black uppercase tracking-wide">
                  PAYMENT VERIFICATION PENDING
                </h3>
              </div>
              <p className="text-xs text-amber-800">
                Payment for this registration is still under verification. Please check with registration desk.
              </p>
            </div>
          ) : mealEvaluation ? (
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 space-y-2 ${
                mealEvaluation.isEligible
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mealEvaluation.isEligible ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                      Current Meal Window • {mealEvaluation.currentSlot}
                    </span>
                    <h3 className="text-base sm:text-lg font-black">
                      {mealEvaluation.isEligible
                        ? `ELIGIBLE FOR ${mealEvaluation.currentSlot.toUpperCase()} PRASADAM ✅`
                        : `NOT INCLUDED IN PASS ❌`}
                    </h3>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    mealEvaluation.isEligible
                      ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-200 text-amber-900 border border-amber-300'
                  }`}
                >
                  {mealEvaluation.isEligible ? 'SERVE MEAL' : 'CHECK PASS'}
                </span>
              </div>
              <p className="text-xs opacity-90 pl-8">{mealEvaluation.message}</p>
            </div>
          ) : null}

          {/* 2. ATTENDEE & CAMP SUMMARY CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {reg.camp_track || 'Standard Track'}
                </span>
                <h2 className="text-lg font-black text-slate-900">{reg.participant_name}</h2>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  WhatsApp: <span className="font-bold text-slate-800">{reg.whatsapp || reg.poc_contact}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Accommodation
                </span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold mt-0.5 ${
                    reg.accommodation === 'Yes'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {reg.accommodation === 'Yes' ? 'Provided' : 'Day Scholar'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Camp Retreat</span>
                <div className="font-bold text-slate-800 line-clamp-1">{reg.camp_title}</div>
                <div className="text-[11px] text-slate-500">{reg.camp_venue}</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Counselor / VOICE</span>
                <div className="font-bold text-slate-800 line-clamp-1">
                  {reg.counselor_name || 'Not Specified'}
                </div>
                <div className="text-[11px] text-slate-500">{reg.voice_name || reg.parent_temple || 'VOICE'}</div>
              </div>
            </div>
          </div>

          {/* 3. FULL PRASADAM COUPON CARD WITH MEAL MATRIX */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-amber-600" />
              <span>Full Meal Schedule Pass</span>
            </h3>
            <CampPrasadamCard registration={reg} standalone={true} />
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="text-center pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPassPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <PublicNavbar />
      <main className="flex-1 py-4">
        <Suspense
          fallback={
            <div className="p-12 text-center text-xs font-bold text-slate-500">
              Loading verification desk...
            </div>
          }
        >
          <VerifyPassContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
