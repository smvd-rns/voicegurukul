import { createClient } from '@supabase/supabase-js';
import { supabase } from './config';
import { SadhanaReport } from '@/types';

// Singleton client for Sadhana DB
let _sadhanaClient: ReturnType<typeof createClient> | null = null;

const cleanEnvVar = (val: string | undefined) => {
  if (!val) return undefined;
  // Remove whitespace and surrounding quotes
  return val.trim().replace(/^["']|["']$/g, '');
};

const getSadhanaClient = () => {
  // Try to use the specialized Sadhana DB credentials first
  const specializedUrl = cleanEnvVar(process.env.NEXT_PUBLIC_SADHANA_DB_URL);
  const url = specializedUrl || cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const isServer = typeof window === 'undefined';

  // Use Anon Key as primary to ensure compatibility. 
  // The Service Role Key provided for this project appears to be problematic, 
  // so we will rely on the Anon Key and an inclusive RLS policy (Option B).
  const key = cleanEnvVar(process.env.NEXT_PUBLIC_SADHANA_DB_ANON_KEY) ||
    cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (isServer && key) {
    console.log(`[SadhanaClient] Server-side initialization for ${url?.substring(0, 30)}... using ANON key.`);
  }

  // If we already have a client with this URL and Key, reuse it
  if (_sadhanaClient && (_sadhanaClient as any).supabaseUrl === url && (_sadhanaClient as any).supabaseKey === key) {
    return _sadhanaClient;
  }

  const baseClient = supabase;
  if (!url || !key) {
    if (isServer) console.warn('[SadhanaClient] Missing URL or Key. Falling back to default client.');
    return baseClient || null;
  }

  // Debug log (Safe: only first few chars)
  if (isServer) {
    console.log(`[SadhanaClient] Connecting to ${specializedUrl ? 'External' : 'Main'} DB. URL: ${url.substring(0, 30)}... Key starts with: ${key.substring(0, 10)}...`);
  }

  _sadhanaClient = createClient(url, key, {
    auth: {
      persistSession: !isServer,
      autoRefreshToken: !isServer,
    }
  });

  // Tag the client for easier debugging and reuse check
  (_sadhanaClient as any).supabaseUrl = url;
  (_sadhanaClient as any).supabaseKey = key;

  return _sadhanaClient;
};

// Singleton service-role client for Sadhana DB (bypasses RLS for writes)
let _sadhanaAdminClient: ReturnType<typeof createClient> | null = null;

const getSadhanaAdminClient = () => {
  const specializedUrl = cleanEnvVar(process.env.NEXT_PUBLIC_SADHANA_DB_URL);
  const url = specializedUrl || cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = cleanEnvVar(process.env.SADHANA_DB_SERVICE_ROLE_KEY);

  const isServer = typeof window === 'undefined';

  if (!url || !serviceKey) {
    if (isServer) console.warn('[SadhanaAdminClient] Missing URL or Service Role Key, falling back to anon client');
    return getSadhanaClient();
  }

  if (_sadhanaAdminClient) return _sadhanaAdminClient;

  _sadhanaAdminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return _sadhanaAdminClient;
};

// Use a getter to ensure we always have the correctly initialized client
export const getActiveSadhanaSupabase = () => getSadhanaClient();
// Use this for server-side write operations that need to bypass RLS
export const getAdminSadhanaSupabase = () => getSadhanaAdminClient();

// Helper function to normalize date to ISO string
const normalizeDate = (date: Date | string | any): string => {
  if (!date) return '';
  if (typeof date === 'string') return date.split('T')[0];
  if (date instanceof Date) return date.toISOString().split('T')[0];
  try {
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
  } catch (e) { console.error('Error normalizing date:', date, e); }
  return '';
};

// Calculate scores (weekly basis)
export const calculateSadhanaScores = (japa: number, hearing: number, reading: number, toBed: number, wakeUp: number, dailyFilling: number, daySleep: number) => {
  const bodyPercent = ((Math.min(70, toBed) + Math.min(70, wakeUp) + Math.min(70, dailyFilling) + Math.min(70, daySleep)) / 280) * 100;
  const soulPercent = ((Math.min(70, japa) + Math.min(70, hearing) + Math.min(70, reading)) / 210) * 100;
  return {
    bodyPercent: Math.min(100, Math.max(0, bodyPercent)),
    soulPercent: Math.min(100, Math.max(0, soulPercent)),
  };
};

export const getWeeklyTotals = async (userId: string, date: Date | string): Promise<{ japa: number; hearing: number; reading: number; toBed: number; wakeUp: number; dailyFilling: number; daySleep: number }> => {
  const totals = { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 };
  const freshClient = getActiveSadhanaSupabase();
  if (!freshClient) return totals;

  try {
    let year: number, month: number, dayVal: number;
    if (typeof date === 'string') {
      const parts = date.split('T')[0].split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      dayVal = parseInt(parts[2], 10);
    } else {
      year = date.getFullYear(); month = date.getMonth(); dayVal = date.getDate();
    }

    const inputDate = new Date(year, month, dayVal, 12, 0, 0);
    const dayOfWeek = inputDate.getDay();
    const diff = inputDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(year, month, diff, 0, 0, 0, 0);
    const endOfWeek = new Date(year, month, diff + 6, 23, 59, 59, 999);

    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const startDateStr = fmt(startOfWeek);
    const endDateStr = fmt(endOfWeek);

    const { data, error } = await (freshClient
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId) as any)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (error) { console.error('Error in getWeeklyTotals:', error); return totals; }

    if (data) {
      data.forEach((r: any) => {
        totals.japa += Number(r.japa || 0);
        totals.hearing += Number(r.hearing || 0);
        totals.reading += Number(r.reading || 0);
        totals.toBed += Number(r.to_bed || 0);
        totals.wakeUp += Number(r.wake_up || 0);
        totals.dailyFilling += Number(r.daily_filling || 0);
        totals.daySleep += Number(r.day_sleep || 0);
      });
    }
    return totals;
  } catch (error) { console.error('Error in getWeeklyTotals:', error); return totals; }
};

export const getMonthlyTotals = async (userId: string, date: Date | string): Promise<{ japa: number; hearing: number; reading: number; toBed: number; wakeUp: number; dailyFilling: number; daySleep: number; daysInMonth: number }> => {
  const totals = { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0, daysInMonth: 30 };
  const client = getActiveSadhanaSupabase();
  if (!client) return totals;

  try {
    let year: number, month: number;
    if (typeof date === 'string') {
      const parts = date.split('T')[0].split('-');
      year = parseInt(parts[0], 10); month = parseInt(parts[1], 10) - 1;
    } else {
      year = date.getFullYear(); month = date.getMonth();
    }

    const endOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { data, error } = await (client
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId) as any)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (error) { console.error('Error in getMonthlyTotals:', error); return totals; }

    if (data) {
      data.forEach((r: any) => {
        totals.japa += Number(r.japa || 0);
        totals.hearing += Number(r.hearing || 0);
        totals.reading += Number(r.reading || 0);
        totals.toBed += Number(r.to_bed || 0);
        totals.wakeUp += Number(r.wake_up || 0);
        totals.dailyFilling += Number(r.daily_filling || 0);
        totals.daySleep += Number(r.day_sleep || 0);
      });
    }
    totals.daysInMonth = daysInMonth;
    return totals;
  } catch (error) { console.error('Error in getMonthlyTotals:', error); return totals; }
};

export const submitSadhanaReport = async (report: Omit<SadhanaReport, 'id' | 'submittedAt' | 'bodyPercent' | 'soulPercent' | 'updatedAt'>) => {
  const client = getActiveSadhanaSupabase();
  if (!client) throw new Error('Supabase is not initialized');

  try {
    const dateStr = normalizeDate(report.date);
    const existingReport = await getSadhanaReportByDate(report.userId, dateStr);
    const weeklyTotals = await getWeeklyTotals(report.userId, dateStr);

    const currentJapaTotal = weeklyTotals.japa - (existingReport?.japa || 0) + report.japa;
    const currentHearingTotal = weeklyTotals.hearing - (existingReport?.hearing || 0) + report.hearing;
    const currentReadingTotal = weeklyTotals.reading - (existingReport?.reading || 0) + report.reading;
    const currentToBedTotal = weeklyTotals.toBed - (existingReport?.toBed || 0) + report.toBed;
    const currentWakeUpTotal = weeklyTotals.wakeUp - (existingReport?.wakeUp || 0) + report.wakeUp;
    const currentDailyFillingTotal = weeklyTotals.dailyFilling - (existingReport?.dailyFilling || 0) + report.dailyFilling;
    const currentDaySleepTotal = weeklyTotals.daySleep - (existingReport?.daySleep || 0) + report.daySleep;

    const cappedSoulTotal = Math.min(70, currentJapaTotal) + Math.min(70, currentHearingTotal) + Math.min(70, currentReadingTotal);
    const soulPercent = (cappedSoulTotal / 210) * 100;
    const cappedBodyTotal = Math.min(70, currentToBedTotal) + Math.min(70, currentWakeUpTotal) + Math.min(70, currentDailyFillingTotal) + Math.min(70, currentDaySleepTotal);
    const bodyPercent = (cappedBodyTotal / 280) * 100;

    const reportData = {
      user_id: report.userId,
      date: dateStr,
      japa: report.japa,
      hearing: report.hearing,
      reading: report.reading,
      book_name: report.bookName || null,
      to_bed: report.toBed,
      wake_up: report.wakeUp,
      daily_filling: report.dailyFilling,
      day_sleep: report.daySleep,
      study: report.study || 0,
      body_percent: Math.min(100, Math.max(0, bodyPercent)),
      soul_percent: Math.min(100, Math.max(0, soulPercent)),
      submitted_at: existingReport ? (existingReport.submittedAt ? new Date(existingReport.submittedAt).toISOString() : new Date().toISOString()) : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingReport) {
      const { error } = await client.from('sadhana_reports').update(reportData).eq('id', existingReport.id);
      if (error) throw error;
      return existingReport.id;
    } else {
      const { data, error } = await client.from('sadhana_reports').insert(reportData).select().single();
      if (error) throw error;
      return data.id;
    }
  } catch (error: any) {
    console.error('Error submitting sadhana report:', error);
    throw new Error(error.message || 'Failed to submit sadhana report');
  }
};

export const getUserSadhanaReports = async (userId: string, limitCount: number = 30) => {
  const client = getActiveSadhanaSupabase();
  if (!client) { console.error('Supabase is not initialized'); return []; }

  try {
    const { data, error } = await client.from('sadhana_reports').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(limitCount);
    if (error) { console.error('Error fetching sadhana reports:', error); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, userId: r.user_id, date: normalizeDate(r.date),
      japa: r.japa, hearing: r.hearing, reading: r.reading, bookName: r.book_name,
      toBed: r.to_bed, wakeUp: r.wake_up, dailyFilling: r.daily_filling, daySleep: r.day_sleep,
      study: r.study,
      bodyPercent: r.body_percent, soulPercent: r.soul_percent,
      submittedAt: new Date(r.submitted_at), updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
    })) as SadhanaReport[];
  } catch (error) { console.error('Error fetching sadhana reports:', error); return []; }
};

export const getSadhanaReportsByRange = async (userId: string, fromDate: string, toDate: string) => {
  const client = getActiveSadhanaSupabase();
  if (!client) { console.error('Supabase is not initialized'); return []; }

  try {
    const { data, error } = await (client.from('sadhana_reports').select('*').eq('user_id', userId) as any).gte('date', fromDate).lte('date', toDate).order('date', { ascending: false });
    if (error) { console.error('Error fetching sadhana reports range:', error); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, userId: r.user_id, date: normalizeDate(r.date),
      japa: r.japa, hearing: r.hearing, reading: r.reading, bookName: r.book_name,
      toBed: r.to_bed, wakeUp: r.wake_up, dailyFilling: r.daily_filling, daySleep: r.day_sleep,
      study: r.study,
      bodyPercent: r.body_percent, soulPercent: r.soul_percent,
      submittedAt: new Date(r.submitted_at), updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
    })) as SadhanaReport[];
  } catch (error) { console.error('Error fetching sadhana reports range:', error); return []; }
};

export const getSadhanaReportByDate = async (userId: string, date: Date | string) => {
  const client = getActiveSadhanaSupabase();
  if (!client) { console.error('Supabase is not initialized'); return null; }

  try {
    const dateStr = normalizeDate(date);
    const { data, error } = await client.from('sadhana_reports').select('*').eq('user_id', userId).eq('date', dateStr).maybeSingle();
    if (error) { console.error('Error fetching sadhana report by date:', error); return null; }
    if (!data) return null;
    return {
      id: data.id, userId: data.user_id, date: normalizeDate(data.date),
      japa: data.japa, hearing: data.hearing, reading: data.reading, bookName: data.book_name,
      toBed: data.to_bed, wakeUp: data.wake_up, dailyFilling: data.daily_filling, daySleep: data.day_sleep,
      study: data.study,
      bodyPercent: data.body_percent, soulPercent: data.soul_percent,
      submittedAt: new Date(data.submitted_at), updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    } as SadhanaReport;
  } catch (error) { console.error('Error fetching sadhana report:', error); return null; }
};

export const getBulkSadhanaReportsByRange = async (userIds: string[], fromDate: string, toDate: string) => {
  const client = getActiveSadhanaSupabase();
  if (!client || !userIds || userIds.length === 0) return [];

  try {
    const { data, error } = await (client.from('sadhana_reports').select('*').in('user_id', userIds) as any).gte('date', fromDate).lte('date', toDate).order('date', { ascending: false });
    if (error) { console.error('Error fetching bulk sadhana reports:', error); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, userId: r.user_id, date: normalizeDate(r.date),
      japa: r.japa, hearing: r.hearing, reading: r.reading, bookName: r.book_name,
      toBed: r.to_bed, wakeUp: r.wake_up, dailyFilling: r.daily_filling, daySleep: r.day_sleep,
      study: r.study,
      bodyPercent: r.body_percent, soulPercent: r.soul_percent,
      submittedAt: new Date(r.submitted_at), updatedAt: r.updated_at ? new Date(r.updated_at) : undefined,
    })) as SadhanaReport[];
  } catch (error) { console.error('Error fetching bulk sadhana reports:', error); return []; }
};
