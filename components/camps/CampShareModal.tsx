'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Mail,
  ExternalLink,
  X,
  FileText,
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  Send,
  MessageCircle,
  HelpCircle,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { Camp } from '@/types';

interface CampShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  camp: Camp | null;
  isSuperAdmin?: boolean;
}

export default function CampShareModal({ isOpen, onClose, camp, isSuperAdmin }: CampShareModalProps) {
  const { userData } = useAuth();
  const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const isUserSuperAdmin = isSuperAdmin !== undefined
    ? isSuperAdmin
    : userRoles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin' || String(r) === 'superadmin');

  const [templateType, setTemplateType] = useState<'detailed' | 'crisp'>('detailed');
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Editable fields in modal
  const [guideUrl, setGuideUrl] = useState('https://drive.google.com/file/d/1Rj03YmNXdaQvE41yL5AZOxVPoGsx9fr3/view?usp=drive_link');
  const [contactEmail, setContactEmail] = useState('adas@voicepune.com');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [customNote, setCustomNote] = useState('');

  // Extract initial guide/whatsapp links from camp.email_links if present
  useEffect(() => {
    if (camp) {
      const emailLinks = (camp as any).email_links || [];
      const docLink = emailLinks.find((l: any) => l.type === 'document' || l.url?.includes('drive.google.com'));
      if (docLink && docLink.url) {
        setGuideUrl(docLink.url);
      } else {
        setGuideUrl('https://drive.google.com/file/d/1Rj03YmNXdaQvE41yL5AZOxVPoGsx9fr3/view?usp=drive_link');
      }

      const waLink = emailLinks.find((l: any) => l.type === 'whatsapp' || l.url?.includes('chat.whatsapp.com'));
      if (waLink && waLink.url) {
        setWhatsappGroupUrl(waLink.url);
      } else {
        setWhatsappGroupUrl('');
      }

      setContactEmail('adas@voicepune.com');
      setCustomNote('');
      setCopied(false);
      setEmailCopied(false);
    }
  }, [camp]);

  // Date formatters
  const formatDate = (val?: string) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return val;
    }
  };

  const formatShortDate = (val?: string) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return val;
    }
  };

  // Base portal registration link
  const registrationUrl = useMemo(() => {
    if (!camp) return 'https://voicegurukul.org/dashboard/camp';
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://voicegurukul.org';
    return `${origin}/camps/${camp.slug || ''}`;
  }, [camp]);

  // Generate WhatsApp Message text
  const generatedWhatsAppMessage = useMemo(() => {
    if (!camp) return '';

    const titleUpper = (camp.title || 'CAMP REGISTRATION').toUpperCase();
    const description = camp.description || 'Spiritual Retreat & Devotee Leadership Camp';
    const venue = camp.venue || 'Central VOICE, Pune (NVCC)';
    
    const startDate = formatDate(camp.start_date);
    const endDate = formatDate(camp.end_date);
    const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : (startDate || endDate || 'Coming Soon');

    // Tracks / Sub-camps
    const tracks = (camp.tracks || []).filter(Boolean);
    const tracksFormatted = tracks.length > 0 
      ? tracks.map(t => `   • ${t}`).join('\n')
      : '   • Spiritual Retreat & Seminars';

    // Important dates & deadlines
    const deadlineStr = camp.registration_deadline ? formatDate(camp.registration_deadline) : '';
    const lateFeeStr = camp.late_fee && camp.late_fee > 0 && camp.late_fee_start_date 
      ? `${formatShortDate(camp.late_fee_start_date)} (₹${camp.late_fee} extra, subject to room availability)`
      : '';
    
    let refundStr = '';
    const refundConfig = camp.refund_config;
    if (refundConfig?.enable_refunds && refundConfig.refund_policy_rules && refundConfig.refund_policy_rules.length > 0) {
      const rules = refundConfig.refund_policy_rules;
      const fullRefundRule = rules.find(r => r.refund_percent === 100);
      const partialRule = rules.find(r => r.refund_percent > 0 && r.refund_percent < 100);
      if (fullRefundRule?.cutoff_date) {
        const fullDate = formatShortDate(fullRefundRule.cutoff_date);
        if (partialRule?.cutoff_date) {
          refundStr = `100% refund until ${fullDate}; ${partialRule.refund_percent}% refund until ${formatShortDate(partialRule.cutoff_date)}`;
        } else {
          refundStr = `Full refund until ${fullDate} (post ${fullDate}: deductions apply)`;
        }
      } else {
        refundStr = rules.map(r => r.label || `${r.refund_percent}% refund`).slice(0, 2).join(' • ');
      }
    }

    if (templateType === 'crisp') {
      return `✨ *REGISTRATIONS OPEN: ${camp.title}* ✨
_${description} | ${venue}_ 🏕️

📅 *Dates:* ${dateRange}
📍 *Venue:* ${venue}
${tracks.length > 0 ? `🎯 *Tracks / Camps:* ${tracks.join(' | ')}\n` : ''}
${lateFeeStr ? `⏳ *Late Fee Starts:* ${lateFeeStr}\n` : ''}${refundStr ? `❌ *Cancellation:* ${refundStr}\n` : ''}${deadlineStr ? `🛑 *Registration Deadline:* ${deadlineStr}\n` : ''}
${guideUrl ? `📲 *Step-by-Step Registration Guide:*
👉 ${guideUrl}\n\n` : ''}🔗 *Register directly at:*
👉 ${registrationUrl}
${whatsappGroupUrl ? `\n💬 *Official WhatsApp Group:* ${whatsappGroupUrl}` : ''}

_Limited accommodations available — please register soon!_ 🙏`;
    }

    // Detailed Template (Option 1)
    let msg = `🌸 *HARE KRISHNA! DEAR DEVOTEES* 🌸
*Please accept our humble obeisances. All glories to Srila Prabhupada!* 🙏✨

We are delighted to announce that registrations are now officially *OPEN* for:

🏕️ *${titleUpper}* 🏕️
_${description}_

Get ready for days filled with deep chanting, profound shastric seminars, soul-stirring kirtans, delicious prasadam, and blissful devotee association!

━━━━━━━━━━━━━━━━━━━━
📅 *CAMP SCHEDULE & DETAILS:*
━━━━━━━━━━━━━━━━━━━━
📅 *Dates:* ${dateRange}
📍 *Venue:* ${venue}

🔹 *Participating Camps / Tracks:*
${tracksFormatted}

━━━━━━━━━━━━━━━━━━━━
⚠️ *IMPORTANT DATES & POLICIES:*
━━━━━━━━━━━━━━━━━━━━
`;

    if (lateFeeStr) {
      msg += `⏰ *Late Fee Starts:* ${lateFeeStr}\n`;
    }
    if (refundStr) {
      msg += `❌ *Cancellation Policy:* ${refundStr}\n`;
    }
    if (deadlineStr) {
      msg += `🛑 *Registration Deadline:* ${deadlineStr}\n`;
    }
    if (!lateFeeStr && !refundStr && !deadlineStr) {
      msg += `ℹ️ *Accommodation & Seats:* Allocated on a first-come, first-served basis.\n`;
    }

    if (customNote.trim()) {
      msg += `\n📌 *Special Announcement:*\n${customNote.trim()}\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━
📖 *STEP-BY-STEP REGISTRATION GUIDE:*
━━━━━━━━━━━━━━━━━━━━
To ensure a smooth registration without any issues, please refer to the visual PDF guide:
👉 *Click here to view the Guide:*
${guideUrl}

🌐 *Register now on VOICE Gurukul:*
👉 ${registrationUrl}
`;

    if (whatsappGroupUrl.trim()) {
      msg += `\n💬 *Join Official Camp WhatsApp Community:*
👉 ${whatsappGroupUrl.trim()}
`;
    }

    msg += `\n_Seats and accommodations are limited. Register early to confirm your pass!_ 🏃‍♂️💨

For any queries, please reach out to your local VOICE coordinator${contactEmail ? ` or email: *${contactEmail}*` : ''}.

Your servants,
*VOICE Gurukul Camp Coordination Team* 🌸`;

    return msg;
  }, [camp, templateType, guideUrl, contactEmail, whatsappGroupUrl, customNote, registrationUrl]);

  if (!isOpen || !camp) return null;

  const handleCopyWhatsApp = () => {
    if (!generatedWhatsAppMessage) return;
    navigator.clipboard.writeText(generatedWhatsAppMessage);
    setCopied(true);
    toast.success('WhatsApp announcement copied to clipboard! 📋');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!generatedWhatsAppMessage) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(generatedWhatsAppMessage)}`;
    window.open(url, '_blank');
  };

  const handleOpenEmail = () => {
    if (!camp || !generatedWhatsAppMessage) return;
    const subject = encodeURIComponent(`Camp Registration Open: ${camp.title}`);
    const body = encodeURIComponent(generatedWhatsAppMessage.replace(/\*/g, ''));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyEmail = () => {
    if (!generatedWhatsAppMessage) return;
    // Strip WhatsApp markdown asterisks for plain text email
    const cleanEmail = generatedWhatsAppMessage.replace(/\*/g, '');
    navigator.clipboard.writeText(cleanEmail);
    setEmailCopied(true);
    toast.success('Clean text copied for Email broadcast! ✉️');
    setTimeout(() => setEmailCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Share Camp Announcement
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Ready to Send
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Auto-generated WhatsApp & Email circular for <span className="font-bold text-slate-700">{camp.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Top Options Bar: Template Switcher & Quick Links */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Choose Announcement Format:
              </label>
              <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTemplateType('detailed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    templateType === 'detailed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Option 1: Complete & Detailed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('crisp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    templateType === 'crisp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Option 2: Crisp & Quick</span>
                </button>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-[10.5px] text-slate-400 block font-medium">Camp Registration Link</span>
              <a
                href={registrationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline truncate max-w-[260px]"
                title={registrationUrl}
              >
                <LinkIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{registrationUrl}</span>
              </a>
            </div>
          </div>

          {/* Superadmin Only: Editable Dynamic Parameters */}
          {isUserSuperAdmin && (
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Customize Announcement Parameters</span>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                    Superadmin Only
                  </span>
                </h3>
                <span className="text-[10.5px] text-emerald-700 font-medium">
                  Changes update the preview live below
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Registration Procedure Guide Link (Google Drive / PDF)
                  </label>
                  <input
                    type="url"
                    value={guideUrl}
                    onChange={(e) => setGuideUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-white font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Support / Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="adas@voicepune.com"
                    className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Official WhatsApp Group Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={whatsappGroupUrl}
                    onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-white font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Custom Note / Announcement (Optional)
                  </label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Special bus arranged from Pune station"
                    className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Message Preview</span>
                <span className="text-[10px] font-semibold text-slate-400">
                  ({templateType === 'detailed' ? 'Option 1' : 'Option 2'})
                </span>
              </label>
              <span className="text-[10.5px] text-slate-400">
                Formatted with WhatsApp markdown (*bold*, _italic_)
              </span>
            </div>

            <div className="relative">
              <textarea
                readOnly
                value={generatedWhatsAppMessage}
                rows={12}
                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-900 text-emerald-300 font-mono text-xs leading-relaxed focus:outline-none resize-none shadow-inner selection:bg-emerald-500 selection:text-white"
              />
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer shadow-sm hover:scale-[1.02]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-200" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Copy plain text suitable for email newsletters"
            >
              {emailCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Mail className="w-3.5 h-3.5 text-slate-500" />}
              <span>{emailCopied ? 'Email Text Copied!' : 'Copy Email Text'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenEmail}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Open default email client"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Send via Email</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
              <span>{copied ? 'Copied WhatsApp Msg!' : 'Copy WhatsApp Message'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
