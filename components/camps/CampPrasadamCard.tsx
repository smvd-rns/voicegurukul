/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Ticket, Utensils, X, Download, Printer, CheckCircle2,
  Calendar, MapPin, User, Phone, Sparkles, AlertCircle,
  ShieldCheck, ExternalLink, QrCode as QrIcon, Ban, Clock
} from 'lucide-react';
import { buildMealMatrix, MealMatrixColumn } from '@/lib/camp-cost';

interface CampPrasadamCardProps {
  registration: any;
  userProfile?: any;
  onClose?: () => void;
  // If true, shows standalone without modal wrapper
  standalone?: boolean;
  // If true, hides print and download action buttons
  hideActions?: boolean;
}

export default function CampPrasadamCard({
  registration,
  userProfile,
  onClose,
  standalone = false,
  hideActions = false,
}: CampPrasadamCardProps) {
  const [activeTab, setActiveTab] = useState<'meal_card' | 'delegate_pass'>('meal_card');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  const reg = registration;
  const isCancelled = Boolean(
    reg.is_cancelled ||
    reg.payment_status === 'cancelled' ||
    reg.payment_status === 'refunded' ||
    reg.refund_status === 'refunded'
  );
  const isPendingApproval = Boolean(
    !isCancelled &&
    (reg.payment_status === 'processing' ||
     reg.payment_status === 'pending' ||
     (reg.payment_status !== 'completed' && reg.payment_method !== 'FREE' && reg.payment_method !== 'ROLE_WAIVER'))
  );
  const campTitle = (reg.camp_title || 'Camp Retreat').trim();
  const campStartDate = reg.camp_start_date;
  const campEndDate = reg.camp_end_date;

  // Resolve user's center strictly from the frozen registration snapshot record!
  // It NEVER reads live profile state, ensuring complete audit immutability over years.
  const resolvedUserCenter = React.useMemo(() => {
    const rawCenter = (reg.current_center || reg.voice_name || reg.center || '').trim();
    if (rawCenter && !['none', 'null', 'undefined', 'n/a', '-'].includes(rawCenter.toLowerCase())) {
      const regOther = (reg.other_center || '').trim();
      if (rawCenter.toLowerCase() === 'other') return regOther || 'Other';
      return rawCenter;
    }

    // Only if registration has no center saved at all (very old legacy test rows)
    const dbHierarchy = reg.user_hierarchy || {};
    const dbCenter = (reg.user_current_center || reg.user_center || dbHierarchy.currentCenter || dbHierarchy.center || '').trim();
    if (dbCenter && !['none', 'null', 'undefined', 'n/a', '-'].includes(dbCenter.toLowerCase())) {
      return dbCenter;
    }

    return 'Central VOICE';
  }, [reg]);

  // Temple / Center Banner for header: strictly from registration record snapshot (current_temple / parent_temple)
  const templeBanner = React.useMemo(() => {
    const rawTemple = (reg.current_temple || reg.parent_temple || '').trim();
    if (rawTemple && !['none', 'null', 'undefined', 'n/a', '-'].includes(rawTemple.toLowerCase())) {
      const regOther = (reg.other_temple || '').trim();
      if (rawTemple.toLowerCase() === 'other') return regOther || 'Other';
      return rawTemple;
    }
    return 'ISKCON NVCC • PUNE';
  }, [reg]);

  // Sequential Token Number: use true serial_no (e.g. 1, 2, 651), fallback to token_no or 1
  const displayToken = String(reg.serial_no || reg.token_no || 1);

  // Compute meal matrix columns
  const mealMatrix: MealMatrixColumn[] = React.useMemo(() => {
    return buildMealMatrix(
      reg.camp_meal_pricing || [],
      reg.first_meal_date,
      reg.first_meal_type,
      reg.last_meal_date,
      reg.last_meal_type,
      campStartDate,
      campEndDate
    );
  }, [
    reg.camp_meal_pricing,
    reg.first_meal_date,
    reg.first_meal_type,
    reg.last_meal_date,
    reg.last_meal_type,
    campStartDate,
    campEndDate,
  ]);

  // Split matrix into 2 tiers if more than 5 dates, so all dates fit in 8.5cm width with NO scrollbar
  const tier1 = React.useMemo(() => {
    if (mealMatrix.length <= 5) return mealMatrix;
    return mealMatrix.slice(0, 5);
  }, [mealMatrix]);

  const tier2 = React.useMemo(() => {
    if (mealMatrix.length <= 5) return [];
    return mealMatrix.slice(5, 10);
  }, [mealMatrix]);

  // Tier 2 header text: shows devotee's center if specified and not 'None', else 'MEAL DATES (Contd.)'
  const tier2Header = (resolvedUserCenter && !['none', 'null', 'undefined', '-', ''].includes(resolvedUserCenter.toLowerCase()))
    ? resolvedUserCenter
    : 'MEAL DATES (Contd.)';

  // Check whether devotee is eligible for this specific meal on the column date
  const isMealEligible = (col: MealMatrixColumn, mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Milk') => {
    if (mealType === 'Breakfast') return Boolean(col.breakfast);
    if (mealType === 'Lunch') return Boolean(col.lunch);
    if (!col.dinner) return false;
    const dType = String(reg.dinner_type || '').toLowerCase();
    if (dType.includes('both')) return true;
    if (dType.includes('milk')) return mealType === 'Milk';
    return mealType === 'Dinner';
  };

  // Check whether a specific meal on a date column was scanned/served at the desk
  const isMealServed = (col: MealMatrixColumn, mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Milk') => {
    if (!reg?.meals_served || typeof reg.meals_served !== 'object') return false;
    const meals = reg.meals_served as Record<string, string>;

    // 1. Direct key lookups (matching how verifyAndPunchMealPassAction saves it)
    if (col.full_date && meals[`${col.full_date}_${mealType}`]) return true;
    if (col.date && meals[`${col.date}_${mealType}`]) return true;
    if (col.label && meals[`${col.label}_${mealType}`]) return true;

    // 2. Case-insensitive or normalized key lookups
    const targetMealLower = mealType.toLowerCase();
    for (const key of Object.keys(meals)) {
      if (meals[key]) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.endsWith(`_${targetMealLower}`)) {
          const datePart = lowerKey.slice(0, -(targetMealLower.length + 1));
          if (
            (col.full_date && datePart === col.full_date.toLowerCase()) ||
            (col.date && datePart === col.date.toLowerCase()) ||
            (col.label && datePart === col.label.toLowerCase()) ||
            (col.full_date && (col.full_date.endsWith(`-${datePart}`) || col.full_date.endsWith(`-${datePart.padStart(2, '0')}`)))
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Generate QR Code data URL at high resolution (600px width for vector-crisp scan)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const verifyUrl = `${origin}/camps/verify-pass?id=${encodeURIComponent(reg.id)}`;

    QRCode.toDataURL(verifyUrl, {
      width: 600,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [reg.id]);

  // Robust isolated iframe printing: renders ONLY the pass on Page 1, never blank
  const handlePrint = () => {
    if (isCancelled) {
      alert('This pass has been cancelled/refunded and cannot be printed.');
      return;
    }
    if (isPendingApproval) {
      alert('This pass is pending payment verification and cannot be printed.');
      return;
    }
    const cardEl = document.getElementById('prasadam-card-print-target');
    if (!cardEl) {
      window.print();
      return;
    }

    try {
      let iframe = document.getElementById('camp-pass-print-iframe') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'camp-pass-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      // Collect all stylesheet rules from page so Tailwind classes work inside iframe
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n');

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Camp Pass #${displayToken} - ${campTitle}</title>
              <meta charset="utf-8" />
              ${styles}
              <style>
                @page {
                  size: auto;
                  margin: 6mm;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                .print-outer {
                  display: flex;
                  justify-content: flex-start;
                  align-items: flex-start;
                  padding: 6px;
                }
                #prasadam-card-print-target {
                  position: relative !important;
                  left: auto !important;
                  top: auto !important;
                  width: 9.6cm !important;
                  max-width: 9.6cm !important;
                  height: auto !important;
                  max-height: none !important;
                  border: 2px solid #000000 !important;
                  border-radius: 8px !important;
                  padding: 8px 10px !important;
                  background: #ffffff !important;
                  margin: 0 !important;
                  display: block !important;
                  overflow: visible !important;
                  box-sizing: border-box !important;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                }
              </style>
            </head>
            <body>
              <div class="print-outer">
                ${cardEl.outerHTML}
              </div>
            </body>
          </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        }, 250);
        return;
      }
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print', err);
    }

    window.print();
  };

  // High-Resolution 300+ DPI PNG Pass Card Generator (No Blur, Ultra-Sharp!)
  const handleDownloadHdPass = async () => {
    if (isCancelled) {
      alert('This pass has been cancelled/refunded and cannot be downloaded.');
      return;
    }
    if (isPendingApproval) {
      alert('This pass is pending payment verification and cannot be downloaded.');
      return;
    }
    setDownloading(true);
    try {
      const scale = 3;
      const w = 390;
      const h = tier2.length > 0 ? 360 : 285;

      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Pre-load QR image if available
      let qrImg: HTMLImageElement | null = null;
      if (qrDataUrl) {
        qrImg = await new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = qrDataUrl;
        });
      }

      // Pre-load VOICE Logo image
      let logoImg: HTMLImageElement | null = null;
      try {
        logoImg = await new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = '/images/voice-logo.png';
        });
      } catch {
        // Fallback gracefully to text if offline
      }

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      const drawRoundRect = (
        x: number, y: number, rw: number, rh: number, rad: number,
        fillColor?: string, strokeColor?: string, strokeWidth = 1
      ) => {
        ctx.beginPath();
        ctx.roundRect(x, y, rw, rh, rad);
        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }
      };

      // Card outer border
      if (activeTab === 'delegate_pass') {
        const dpW = 400;
        const dpH = 275;
        canvas.width = dpW * scale;
        canvas.height = dpH * scale;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dpW, dpH);
        drawRoundRect(4, 4, dpW - 8, dpH - 8, 14, '#ffffff', '#cbd5e1', 1.5);

        // Header Gradient Banner
        const grad = ctx.createLinearGradient(12, 12, dpW - 24, 95);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#ea580c');
        drawRoundRect(12, 12, dpW - 24, 90, 10, grad as any);

        // Header Tag & Token
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(20, 20, 130, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OFFICIAL DELEGATE PASS', 85, 29);

        // Token Pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(dpW - 84, 20, 64, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 9px monospace, sans-serif';
        ctx.fillText(`Token: #${displayToken}`, dpW - 52, 29);

        // VOICE Institutional Branding
        if (logoImg && logoImg.width > 0) {
          const dpLogoH = 22;
          const dpLogoW = (logoImg.width / logoImg.height) * dpLogoH;
          drawRoundRect(20, 44, dpLogoW + 8, dpLogoH + 6, 4, '#ffffff');
          ctx.drawImage(logoImg, 24, 47, dpLogoW, dpLogoH);
        } else {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif';
          ctx.fillText('V O I C E', 20, 48);

          ctx.fillStyle = '#fef3c7';
          ctx.font = '700 7px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText('Rekindling Wisdom, Reviving Love', 20, 59);
        }

        // Camp Title & Venue
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(campTitle, 20, 77, dpW - 60);

        ctx.font = '600 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`Venue: ${reg.camp_venue || 'Central VOICE, Pune'}`, 20, 93, dpW - 60);

        // Devotee Details Box
        drawRoundRect(12, 110, dpW - 120, 150, 10, '#f8fafc', '#e2e8f0', 1);

        const rows = [
          ['Attendee Name:', reg.participant_name, '#0f172a', true],
          ['Camp:', reg.camp_track || 'Standard', '#c2410c', true],
          ['WhatsApp:', reg.whatsapp || reg.poc_contact || '-', '#334155', false],
          ['Center:', resolvedUserCenter, '#0f172a', false],
          ['Booking Group:', reg.group_id, '#1e293b', true],
          ['Accommodation:', reg.accommodation === 'Yes' ? 'Provided (Included)' : 'Day Scholar', '#334155', false],
          ['Payment Status:', (reg.payment_status || 'COMPLETED').toUpperCase(), '#047857', true],
        ];

        let currY = 124;
        rows.forEach(([label, val, color, isBold]) => {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#64748b';
          ctx.font = '600 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(label as string, 22, currY);

          ctx.textAlign = 'right';
          ctx.fillStyle = color as string;
          ctx.font = `${isBold ? '800' : '600'} 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillText(String(val), dpW - 130, currY, 150);
          currY += 19;
        });

        // QR Box
        drawRoundRect(dpW - 100, 110, 88, 150, 10, '#ffffff', '#e2e8f0', 1);
        if (qrImg) {
          ctx.drawImage(qrImg, dpW - 92, 120, 72, 72);
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '800 6.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('SCAN TO VERIFY', dpW - 56, 206);

        // Download
        const a = document.createElement('a');
        a.download = `${campTitle.replace(/\s+/g, '-')}-Official-Delegate-Pass-${displayToken}.png`;
        a.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloading(false);
        return;
      }

      drawRoundRect(4, 4, w - 8, h - 8, 12, '#ffffff', '#0f172a', 2);

      // VOICE Institutional Branding Header
      if (logoImg && logoImg.width > 0) {
        const logoH = 28;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        const logoX = (w - logoW) / 2;
        ctx.drawImage(logoImg, logoX, 9, logoW, logoH);
      } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif';
        ctx.fillText('V O I C E', w / 2, 12);

        ctx.fillStyle = '#b45309';
        ctx.font = '700 8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Rekindling Wisdom, Reviving Love', w / 2, 30);
      }

      // Header divider line below branding
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(14, 42);
      ctx.lineTo(w - 14, 42);
      ctx.stroke();

      // Token Badge Circle
      drawRoundRect(14, 48, 38, 38, 19, '#fffbeb', '#0f172a', 1.5);
      ctx.fillStyle = '#020617';
      ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayToken, 33, 67);

      // Camp Title & Temple Banner
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '900 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(campTitle.toUpperCase(), 58, 49, 230);

      ctx.fillStyle = '#1e293b';
      ctx.font = '800 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(templeBanner.toUpperCase(), 58, 66, 230);

      // Devotee Name & Mobile
      ctx.fillStyle = '#020617';
      ctx.font = '900 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(reg.participant_name, 14, 90, 180);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.font = '700 9px monospace, sans-serif';
      ctx.fillText(`Mob: ${reg.whatsapp || reg.poc_contact || ''}`, 290, 91);

      // Center
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('CENTER:', 14, 107);
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(resolvedUserCenter, 60, 106, 230);

      // Camp
      ctx.fillStyle = '#64748b';
      ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('CAMP:', 14, 121);
      ctx.fillStyle = '#92400e';
      ctx.font = '800 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const trackDateStr = (campStartDate && campEndDate)
        ? ` (${new Date(campStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(campEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`
        : '';
      ctx.fillText(`${reg.camp_track || 'Standard Track'}${trackDateStr}`, 56, 120, 234);

      // QR Code Box on right
      drawRoundRect(296, 48, 80, 88, 8, '#ffffff', '#94a3b8', 1);
      if (qrImg) {
        ctx.drawImage(qrImg, 302, 52, 68, 68);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 7px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SCAN PASS', 336, 128);

      // Divider line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(14, 142);
      ctx.lineTo(376, 142);
      ctx.stroke();

      // Meal Table Drawer
      const drawMealTable = (tierCols: MealMatrixColumn[], startY: number, headerLabel: string) => {
        const tableX = 14;
        const tableW = 362;
        const col0W = 94;
        const numDateCols = tierCols.length;
        const dateColW = (tableW - col0W) / Math.max(1, numDateCols);
        const rowH = 14;

        // Container (1 header row + 4 meal rows = 5 rows)
        drawRoundRect(tableX, startY, tableW, rowH * 5, 4, '#ffffff', '#94a3b8', 1);

        // Header Background (Amber-400)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(tableX + 1, startY + 1, tableW - 2, rowH);

        // Header Label
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(headerLabel.toUpperCase(), tableX + col0W / 2, startY + rowH / 2, col0W - 6);

        // Vertical divider for col0
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tableX + col0W, startY);
        ctx.lineTo(tableX + col0W, startY + rowH * 5);
        ctx.stroke();

        // Date Headers
        tierCols.forEach((col, idx) => {
          const colX = tableX + col0W + idx * dateColW;
          if (idx > 0) {
            ctx.beginPath();
            ctx.moveTo(colX, startY);
            ctx.lineTo(colX, startY + rowH * 5);
            ctx.stroke();
          }
          ctx.fillStyle = '#0f172a';
          ctx.font = '900 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(col.label, colX + dateColW / 2, startY + rowH / 2, dateColW - 2);
        });

        // 4 Rows: Breakfast, Lunch, Dinner, Milk
        const rowDefs: { mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Milk'; label: string }[] = [
          { mealType: 'Breakfast', label: 'BF' },
          { mealType: 'Lunch', label: 'Lunch' },
          { mealType: 'Dinner', label: 'Dinner' },
          { mealType: 'Milk', label: 'Milk' },
        ];

        rowDefs.forEach((rDef, rIdx) => {
          const rY = startY + (rIdx + 1) * rowH;

          // Row line
          ctx.strokeStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.moveTo(tableX, rY);
          ctx.lineTo(tableX + tableW, rY);
          ctx.stroke();

          // Row Label
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(tableX + 1, rY + 1, col0W - 1, rowH - 1);
          ctx.fillStyle = '#1e293b';
          ctx.font = '900 8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(rDef.label, tableX + col0W / 2, rY + rowH / 2);

          // Meal status cells
          tierCols.forEach((col, cIdx) => {
            const cellX = tableX + col0W + cIdx * dateColW;
            const isEligible = isMealEligible(col, rDef.mealType);
            const isServed = isEligible && isMealServed(col, rDef.mealType);

            if (!isEligible) {
              ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
              ctx.fillRect(cellX + 1, rY + 1, dateColW - 1, rowH - 1);
            } else if (isServed) {
              // Highlight scanned/collected meal with soft emerald tint
              ctx.fillStyle = '#ecfdf5';
              ctx.fillRect(cellX + 1, rY + 1, dateColW - 1, rowH - 1);
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (!isEligible) {
              ctx.fillStyle = '#94a3b8';
              ctx.font = '500 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillText('X', cellX + dateColW / 2, rY + rowH / 2);
            } else if (isServed) {
              ctx.fillStyle = '#047857';
              ctx.font = '900 8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillText(`✓ ${rDef.label}`, cellX + dateColW / 2, rY + rowH / 2, dateColW - 2);
            } else {
              ctx.fillStyle = '#1e293b';
              ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillText(rDef.label, cellX + dateColW / 2, rY + rowH / 2, dateColW - 2);
            }
          });
        });
      };

      // Draw Tier 1 Table
      drawMealTable(tier1, 148, 'MEAL DATES');

      // Draw Tier 2 Table if present (148 + 5 * 14 = 218, plus 6px gap = 224)
      if (tier2.length > 0) {
        drawMealTable(tier2, 224, tier2Header);
      }

      // Footer Notes
      const footerY = h - 14;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748b';
      ctx.font = '600 7.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('* Show at Counter • ✓ = Collected', 14, footerY);

      ctx.textAlign = 'right';
      ctx.font = '700 8px monospace, sans-serif';
      ctx.fillText(`#${displayToken}`, 376, footerY);

      // Download clean HD PNG
      const pngUrl = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `Camp-Pass-${displayToken}-${reg.participant_name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to generate HD card image', err);
    } finally {
      setDownloading(false);
    }
  };

  const cardContent = (
    <div className="space-y-2.5 sm:space-y-4">
      {/* Print isolation stylesheet: fixed positioning directly at top of Page 1 */}
      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 6mm;
          }
          html, body {
            overflow: visible !important;
            height: auto !important;
            min-height: 100% !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #prasadam-card-print-target,
          #prasadam-card-print-target * {
            visibility: visible !important;
          }
          #prasadam-card-print-target {
            position: fixed !important;
            left: 0.5cm !important;
            top: 0.5cm !important;
            display: block !important;
            width: 9.6cm !important;
            max-width: 9.6cm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 6px 8px !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
            z-index: 999999999 !important;
          }
        }
      `}</style>

      {/* Cancelled / Refunded Alert Banner */}
      {isCancelled && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 text-rose-950 shadow-xs print:hidden">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0 text-rose-600">
            <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-rose-700">Pass Cancelled / Refunded</div>
            <div className="text-[10px] sm:text-[11px] text-rose-800 leading-snug mt-0.5">
              This registration is void. Meals and camp entry cannot be collected with this pass, and pass downloading has been disabled.
            </div>
          </div>
        </div>
      )}

      {/* Pending Payment Approval Alert Banner */}
      {isPendingApproval && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 text-amber-950 shadow-xs print:hidden">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-800">Pass Inactive • Payment Approval Pending</div>
            <div className="text-[10px] sm:text-[11px] text-amber-900 leading-snug mt-0.5">
              Payment verification for this registration ({reg.payment_method || 'Transfer'}) is in progress. Entry and meals will be activated once approved by administration.
            </div>
          </div>
        </div>
      )}

      {/* Top Selector Tabs */}
      <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-slate-100 rounded-lg sm:rounded-xl print:hidden text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('meal_card')}
          className={`flex-1 py-1 sm:py-1.5 px-2 sm:px-3 rounded-md sm:rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-[10.5px] sm:text-xs ${
            activeTab === 'meal_card'
              ? 'bg-white text-slate-900 shadow-2xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          <Utensils className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
          <span className="sm:hidden">Prasadam Card</span>
          <span className="hidden sm:inline">Prasadam Card (8×5 cm)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('delegate_pass')}
          className={`flex-1 py-1 sm:py-1.5 px-2 sm:px-3 rounded-md sm:rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-[10.5px] sm:text-xs ${
            activeTab === 'delegate_pass'
              ? 'bg-white text-slate-900 shadow-2xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600 shrink-0" />
          <span className="sm:hidden">Delegate Pass</span>
          <span className="hidden sm:inline">Official Delegate Pass</span>
        </button>
      </div>

      {/* VIEW 1: PRASADAM COUPON CARD (Unrestricted print height, left-aligned title, prominent QR) */}
      {activeTab === 'meal_card' && (
        <div className="flex justify-center px-0 sm:px-1">
          <div
            id="prasadam-card-print-target"
            className="relative w-full max-w-[390px] bg-white border-2 border-slate-900 rounded-xl p-2 sm:p-2.5 shadow-sm font-sans text-slate-900 select-none space-y-1.5 mx-auto overflow-hidden"
          >
            {/* Cancelled / Void Overlay */}
            {isCancelled && (
              <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] rounded-xl z-20 flex flex-col items-center justify-center p-4 text-center">
                <div className="px-4 py-1.5 bg-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-lg shadow-md -rotate-6 border-2 border-white">
                  CANCELLED / VOID
                </div>
                <p className="text-[10px] text-rose-800 font-black mt-2 max-w-[220px]">
                  Pass is cancelled/refunded. Not valid for camp entry or prasadam.
                </p>
              </div>
            )}

            {/* Pending Approval / Inactive Overlay */}
            {isPendingApproval && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-xl z-20 flex flex-col items-center justify-center p-4 text-center">
                <div className="px-3.5 py-1.5 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md -rotate-6 border-2 border-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>AWAITING APPROVAL</span>
                </div>
                <p className="text-[10px] text-amber-900 font-bold mt-2 max-w-[240px]">
                  Pass is currently inactive. Awaiting payment verification by camp accounts desk.
                </p>
              </div>
            )}

            {/* VOICE Institutional Branding Header with Official Logo */}
            <div className="flex justify-center items-center pb-1 border-b border-slate-200/90 -mt-0.5">
              <img
                src="/images/voice-logo.png"
                alt="VOICE - Rekindling Wisdom, Reviving Love"
                className="h-7 sm:h-8 w-auto object-contain max-w-[210px]"
              />
            </div>

            {/* Top Section: Left (Token + Camp Title + Devotee + Center) | Right (Dedicated Big Scannable QR) */}
            <div className="flex items-start justify-between gap-1.5 sm:gap-2 border-b border-slate-300 pb-1.5 sm:pb-2">
              {/* Left Side: Title, Token, Devotee, Center */}
              <div className="flex-1 space-y-0.5 sm:space-y-1 min-w-0 pr-1">
                {/* Row A: Token Circle + Camp Title & Temple */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-black text-sm sm:text-base text-slate-950 bg-amber-50 shadow-inner shrink-0">
                    {displayToken}
                  </div>
                  <div className="leading-tight min-w-0 flex-1">
                    <div className="text-[11.5px] sm:text-[12px] font-black text-blue-900 uppercase tracking-tight truncate">
                      {campTitle}
                    </div>
                    <div className="text-[9px] sm:text-[9.5px] font-black text-slate-800 uppercase tracking-wide truncate">
                      {templeBanner}
                    </div>
                  </div>
                </div>

                {/* Row B: Devotee Name & Mobile */}
                <div className="flex items-baseline justify-between gap-1 text-[9.5px] sm:text-[10px] leading-tight pt-0.5">
                  <div className="truncate font-black text-slate-950 max-w-[62%]">
                    {reg.participant_name}
                  </div>
                  <div className="truncate text-right shrink-0">
                    <span className="font-bold text-slate-500 uppercase text-[7.5px] sm:text-[8px] mr-0.5 sm:mr-1">Mob:</span>
                    <span className="font-mono font-bold text-slate-900">{reg.whatsapp || reg.poc_contact}</span>
                  </div>
                </div>

                {/* Row C: Current Center & Track */}
                <div className="space-y-0.5 text-[8.5px] sm:text-[9px] leading-tight">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-slate-500 uppercase text-[7.5px] sm:text-[8px]">CENTER:</span>
                    <span className="font-bold text-slate-900 truncate">
                      {resolvedUserCenter}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-slate-500 uppercase text-[7.5px] sm:text-[8px]">CAMP:</span>
                    <span className="font-bold text-amber-800 truncate">
                      {reg.camp_track || 'Standard Track'}
                      {campStartDate && campEndDate && (
                        <span className="text-slate-500 font-normal ml-1">
                          ({new Date(campStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(campEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Dedicated Clean QR Code */}
              <div className="shrink-0 flex flex-col items-center justify-center p-0.5 sm:p-1 bg-white border border-slate-400 rounded-lg shadow-2xs self-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan Pass QR"
                    className="w-14 h-14 sm:w-[68px] sm:h-[68px] object-contain"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-[68px] sm:h-[68px] bg-slate-200 animate-pulse rounded" />
                )}
                <span className="block text-[6.5px] sm:text-[7px] font-black text-slate-800 uppercase tracking-wider mt-0.5">
                  Scan Pass
                </span>
              </div>
            </div>

            {/* Row 2: MEAL MATRIX TABLE (Compact 2-tier Grid, NO SCROLLBAR!) */}
            <div className="space-y-1">
              {/* TIER 1: Days 1 to 5 */}
              {tier1.length > 0 && (
                <div className="border border-slate-400 rounded overflow-hidden">
                  <table className="w-full text-center text-[9px] border-collapse table-fixed">
                    <thead>
                      <tr className="bg-amber-400 text-slate-950 font-black border-b border-slate-400">
                        <th className="py-0.5 px-1 w-[26%] bg-amber-400 text-[8px] uppercase tracking-tight border-r border-slate-400 truncate">
                          Meal Dates
                        </th>
                        {tier1.map((col) => (
                          <th
                            key={col.date}
                            className="py-0.5 px-0.5 border-r border-slate-400 last:border-r-0 truncate"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-bold">
                      {/* Breakfast */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          BF
                        </td>
                        {tier1.map((col) => {
                          const isEligible = isMealEligible(col, 'Breakfast');
                          const isServed = isEligible && isMealServed(col, 'Breakfast');
                          return (
                            <td
                              key={col.date}
                              className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                                !isEligible
                                  ? 'bg-slate-200/80 text-slate-400 font-normal'
                                  : isServed
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : 'bg-white text-slate-700 font-bold'
                              }`}
                            >
                              {!isEligible ? (
                                'X'
                              ) : isServed ? (
                                <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 font-black">
                                  <span>✓</span>
                                  <span>BF</span>
                                </span>
                              ) : (
                                'BF'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Lunch */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Lunch
                        </td>
                        {tier1.map((col) => {
                          const isEligible = isMealEligible(col, 'Lunch');
                          const isServed = isEligible && isMealServed(col, 'Lunch');
                          return (
                            <td
                              key={col.date}
                              className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                                !isEligible
                                  ? 'bg-slate-200/80 text-slate-400 font-normal'
                                  : isServed
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : 'bg-white text-slate-700 font-bold'
                              }`}
                            >
                              {!isEligible ? (
                                'X'
                              ) : isServed ? (
                                <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 font-black">
                                  <span>✓</span>
                                  <span>Lunch</span>
                                </span>
                              ) : (
                                'Lunch'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Dinner */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Dinner
                        </td>
                        {tier1.map((col) => {
                          const isEligible = isMealEligible(col, 'Dinner');
                          const isServed = isEligible && isMealServed(col, 'Dinner');
                          return (
                            <td
                              key={col.date}
                              className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                                !isEligible
                                  ? 'bg-slate-200/80 text-slate-400 font-normal'
                                  : isServed
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : 'bg-white text-slate-700 font-bold'
                              }`}
                            >
                              {!isEligible ? (
                                'X'
                              ) : isServed ? (
                                <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 font-black">
                                  <span>✓</span>
                                  <span>Dinner</span>
                                </span>
                              ) : (
                                'Dinner'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Milk */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Milk
                        </td>
                        {tier1.map((col) => {
                          const isEligible = isMealEligible(col, 'Milk');
                          const isServed = isEligible && isMealServed(col, 'Milk');
                          return (
                            <td
                              key={col.date}
                              className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                                !isEligible
                                  ? 'bg-slate-200/80 text-slate-400 font-normal'
                                  : isServed
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : 'bg-white text-slate-700 font-bold'
                              }`}
                            >
                              {!isEligible ? (
                                'X'
                              ) : isServed ? (
                                <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 font-black">
                                  <span>✓</span>
                                  <span>Milk</span>
                                </span>
                              ) : (
                                'Milk'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* TIER 2: Days 6 to 10 (If camp exceeds 5 days) */}
              {tier2.length > 0 && (
                <div className="border border-slate-400 rounded overflow-hidden">
                  <table className="w-full text-center text-[9px] border-collapse table-fixed">
                    <thead>
                      <tr className="bg-amber-400 text-slate-950 font-black border-b border-slate-400">
                        <th className="py-0.5 px-1 w-[26%] bg-amber-400 text-[8px] uppercase tracking-tight border-r border-slate-400 truncate">
                          {tier2Header}
                        </th>
                        {tier2.map((col) => (
                          <th
                            key={col.date}
                            className="py-0.5 px-0.5 border-r border-slate-400 last:border-r-0 truncate"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-bold">
                      {/* Breakfast */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          BF
                        </td>
                        {tier2.map((col) => {
                          const isEligible = isMealEligible(col, 'Breakfast');
                          const isServed = isEligible && isMealServed(col, 'Breakfast');
                          return (
                            <td
                              key={col.date}
                              className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                                !isEligible
                                  ? 'bg-slate-200/80 text-slate-400 font-normal'
                                  : isServed
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : 'bg-white text-slate-700 font-bold'
                              }`}
                            >
                              {!isEligible ? (
                                'X'
                              ) : isServed ? (
                                <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 font-black">
                                  <span>✓</span>
                                  <span>BF</span>
                                </span>
                              ) : (
                                'BF'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Lunch */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Lunch
                        </td>
                        {tier2.map((col) => {
                          const isEligible = isMealEligible(col, 'Lunch');
                          const isServed = isEligible && isMealServed(col, 'Lunch');
                          return (
                            <td
                              key={col.date}
                              className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                                !isEligible
                                  ? 'bg-slate-200/80 text-slate-400 font-normal'
                                  : isServed
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : 'bg-white text-slate-700 font-bold'
                              }`}
                            >
                              {!isEligible ? (
                                'X'
                              ) : isServed ? (
                                <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 font-black">
                                  <span>✓</span>
                                  <span>Lunch</span>
                                </span>
                              ) : (
                                'Lunch'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Dinner */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Dinner
                        </td>
                        {tier2.map((col) => {
                          const isEligible = isMealEligible(col, 'Dinner');
                          const isServed = isEligible && isMealServed(col, 'Dinner');
                          return (
                            <td
                              key={col.date}
                              className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                                !isEligible
                                  ? 'bg-slate-200/80 text-slate-400 font-normal'
                                  : isServed
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : 'bg-white text-slate-700 font-bold'
                              }`}
                            >
                              {!isEligible ? (
                                'X'
                              ) : isServed ? (
                                <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 font-black">
                                  <span>✓</span>
                                  <span>Dinner</span>
                                </span>
                              ) : (
                                'Dinner'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Milk */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Milk
                        </td>
                        {tier2.map((col) => {
                          const isEligible = isMealEligible(col, 'Milk');
                          const isServed = isEligible && isMealServed(col, 'Milk');
                          return (
                            <td
                              key={col.date}
                              className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                                !isEligible
                                  ? 'bg-slate-200/80 text-slate-400 font-normal'
                                  : isServed
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : 'bg-white text-slate-700 font-bold'
                              }`}
                            >
                              {!isEligible ? (
                                'X'
                              ) : isServed ? (
                                <span className="inline-flex items-center justify-center gap-0.5 text-emerald-700 font-black">
                                  <span>✓</span>
                                  <span>Milk</span>
                                </span>
                              ) : (
                                'Milk'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Row 3: Footer Notes */}
            <div className="flex items-center justify-between text-[8px] text-slate-500 font-medium pt-0.5">
              <span>* Show at Prasadam Counter • <strong className="text-emerald-700 font-black">✓ = Collected</strong></span>
              <span className="font-mono">#{displayToken}</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: OFFICIAL DELEGATE PASS (Original Gradient Card) */}
      {activeTab === 'delegate_pass' && (
        <div id="prasadam-card-print-target" className="relative space-y-3 overflow-hidden rounded-2xl">
          {/* Cancelled / Void Overlay */}
          {isCancelled && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] rounded-2xl z-20 flex flex-col items-center justify-center p-4 text-center">
              <div className="px-4 py-1.5 bg-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-lg shadow-md -rotate-6 border-2 border-white">
                CANCELLED / VOID
              </div>
              <p className="text-[10px] text-rose-800 font-black mt-2 max-w-[220px]">
                Pass is cancelled/refunded. Not valid for camp entry.
              </p>
            </div>
          )}

          {/* Pending Approval / Inactive Overlay */}
          {isPendingApproval && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-2xl z-20 flex flex-col items-center justify-center p-4 text-center">
              <div className="px-4 py-1.5 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md -rotate-6 border-2 border-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>AWAITING APPROVAL</span>
              </div>
              <p className="text-[10px] text-amber-900 font-bold mt-2 max-w-[240px]">
                Pass is currently inactive. Awaiting payment verification by camp accounts desk.
              </p>
            </div>
          )}

          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 text-white space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded">
                Official Delegate Pass
              </span>
              <span className="text-[10px] font-mono bg-black/20 px-2 py-0.5 rounded">
                Token: #{displayToken}
              </span>
            </div>
            <div className="pt-0.5 border-b border-white/20 pb-1.5 flex items-center justify-start">
              <div className="bg-white/95 rounded-lg px-2 py-1 shadow-xs inline-flex items-center">
                <img
                  src="/images/voice-logo.png"
                  alt="VOICE - Rekindling Wisdom, Reviving Love"
                  className="h-6 sm:h-7 w-auto object-contain"
                />
              </div>
            </div>
            <h4 className="text-lg font-black">{campTitle}</h4>
            <p className="text-xs text-white/90">Venue: {reg.camp_venue || 'Central VOICE, Pune'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center border border-gray-100 rounded-xl p-3 sm:p-4 bg-gray-50">
            <div className="col-span-1 sm:col-span-2 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Attendee Name:</span>
                <span className="font-bold text-gray-800">{reg.participant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Camp:</span>
                <span className="font-bold text-amber-700">{reg.camp_track || 'Standard'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">WhatsApp:</span>
                <span className="font-mono text-gray-700">{reg.whatsapp || reg.poc_contact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Booking Group:</span>
                <span className="font-mono font-bold text-gray-800">{reg.group_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Accommodation:</span>
                <span className="font-medium text-gray-800">
                  {reg.accommodation === 'Yes' ? 'Provided (Included)' : 'Day Scholar'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className="font-bold text-emerald-700 uppercase">{reg.payment_status}</span>
              </div>
            </div>

            {/* QR Code in Delegate Pass */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-gray-200 text-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan to verify pass"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-md"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 animate-pulse rounded-md" />
              )}
              <span className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                Scan to Verify
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons: Compact & Balanced Layout */}
      {!hideActions && (
        isCancelled ? (
          <div className="w-full py-2 px-3 bg-rose-50 border border-rose-200 rounded-xl text-center text-[10.5px] sm:text-xs font-bold text-rose-700 flex items-center justify-center gap-1.5 print:hidden shadow-2xs">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            <span>Pass Cancelled &bull; Download Disabled</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 print:hidden">
            <button
              type="button"
              onClick={handleDownloadHdPass}
              disabled={downloading}
              className="col-span-2 sm:col-span-1 py-2 sm:py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black rounded-xl text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 order-1"
              title="Download razor-sharp, high-resolution pass image (300 DPI PNG)"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{downloading ? 'Generating...' : 'Download Pass (HD)'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="py-2 sm:py-2.5 px-2 bg-slate-900 hover:bg-black active:scale-[0.98] text-white font-bold rounded-xl text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm order-2"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Print / Save Pass</span>
            </button>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`Camp-QR-${displayToken}.png`}
                className="py-2 sm:py-2.5 px-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold rounded-xl text-[11px] sm:text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 order-3 text-center"
                title="Download QR code image only"
              >
                <QrIcon className="w-3.5 h-3.5 shrink-0" />
                <span>QR Image</span>
              </a>
            )}
          </div>
        )
      )}
    </div>
  );

  if (standalone) {
    return cardContent;
  }

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block print:z-auto">
      <div className="print-modal-container bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-3 sm:p-5 shadow-2xl border border-gray-100 space-y-2.5 sm:space-y-3 animate-in fade-in zoom-in-95 duration-200 my-2 sm:my-8 print:my-0 print:p-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-auto print:static print:block">
        <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            <h3 className="text-sm sm:text-base font-black text-gray-900">Camp Entry &amp; Prasadam Pass</h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        {cardContent}
      </div>
    </div>
  );
}
