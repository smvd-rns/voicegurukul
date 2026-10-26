/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Ticket, Utensils, X, Download, Printer, CheckCircle2,
  Calendar, MapPin, User, Phone, Sparkles, AlertCircle,
  ShieldCheck, ExternalLink, QrCode as QrIcon
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
    setDownloading(true);
    try {
      const scale = 3;
      const w = 390;
      const h = tier2.length > 0 ? 320 : 250;

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
        const dpH = 260;
        canvas.width = dpW * scale;
        canvas.height = dpH * scale;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dpW, dpH);
        drawRoundRect(4, 4, dpW - 8, dpH - 8, 14, '#ffffff', '#cbd5e1', 1.5);

        // Header Gradient Banner
        const grad = ctx.createLinearGradient(12, 12, dpW - 24, 80);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#ea580c');
        drawRoundRect(12, 12, dpW - 24, 76, 10, grad as any);

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

        // Camp Title & Venue
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(campTitle, 20, 52, dpW - 60);

        ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`Venue: ${reg.camp_venue || 'Central VOICE, Pune'}`, 20, 72, dpW - 60);

        // Devotee Details Box
        drawRoundRect(12, 96, dpW - 120, 150, 10, '#f8fafc', '#e2e8f0', 1);

        const rows = [
          ['Attendee Name:', reg.participant_name, '#0f172a', true],
          ['Track:', reg.camp_track || 'Standard', '#c2410c', true],
          ['WhatsApp:', reg.whatsapp || reg.poc_contact || '-', '#334155', false],
          ['Center:', resolvedUserCenter, '#0f172a', false],
          ['Booking Group:', reg.group_id, '#1e293b', true],
          ['Accommodation:', reg.accommodation === 'Yes' ? 'Provided (Included)' : 'Day Scholar', '#334155', false],
          ['Payment Status:', (reg.payment_status || 'COMPLETED').toUpperCase(), '#047857', true],
        ];

        let currY = 110;
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
        drawRoundRect(dpW - 100, 96, 88, 150, 10, '#ffffff', '#e2e8f0', 1);
        if (qrImg) {
          ctx.drawImage(qrImg, dpW - 92, 106, 72, 72);
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '800 6.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('SCAN TO VERIFY', dpW - 56, 192);

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

      // Token Badge Circle
      drawRoundRect(14, 14, 38, 38, 19, '#fffbeb', '#0f172a', 1.5);
      ctx.fillStyle = '#020617';
      ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayToken, 33, 33);

      // Camp Title & Temple Banner
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '900 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(campTitle.toUpperCase(), 58, 15, 230);

      ctx.fillStyle = '#1e293b';
      ctx.font = '800 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(templeBanner.toUpperCase(), 58, 32, 230);

      // Devotee Name & Mobile
      ctx.fillStyle = '#020617';
      ctx.font = '900 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(reg.participant_name, 14, 56, 180);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.font = '700 9px monospace, sans-serif';
      ctx.fillText(`Mob: ${reg.whatsapp || reg.poc_contact || ''}`, 290, 57);

      // Center
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('CENTER:', 14, 73);
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(resolvedUserCenter, 60, 72, 230);

      // Track
      ctx.fillStyle = '#64748b';
      ctx.font = '800 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('TRACK:', 14, 87);
      ctx.fillStyle = '#92400e';
      ctx.font = '800 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const trackDateStr = (campStartDate && campEndDate)
        ? ` (${new Date(campStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(campEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`
        : '';
      ctx.fillText(`${reg.camp_track || 'Standard Track'}${trackDateStr}`, 56, 86, 234);

      // QR Code Box on right
      drawRoundRect(296, 14, 80, 88, 8, '#ffffff', '#94a3b8', 1);
      if (qrImg) {
        ctx.drawImage(qrImg, 302, 18, 68, 68);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 7px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SCAN PASS', 336, 94);

      // Divider line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(14, 108);
      ctx.lineTo(376, 108);
      ctx.stroke();

      // Meal Table Drawer
      const drawMealTable = (tierCols: MealMatrixColumn[], startY: number, headerLabel: string) => {
        const tableX = 14;
        const tableW = 362;
        const col0W = 94;
        const numDateCols = tierCols.length;
        const dateColW = (tableW - col0W) / Math.max(1, numDateCols);
        const rowH = 15;

        // Container
        drawRoundRect(tableX, startY, tableW, rowH * 4, 4, '#ffffff', '#94a3b8', 1);

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
        ctx.lineTo(tableX + col0W, startY + rowH * 4);
        ctx.stroke();

        // Date Headers
        tierCols.forEach((col, idx) => {
          const colX = tableX + col0W + idx * dateColW;
          if (idx > 0) {
            ctx.beginPath();
            ctx.moveTo(colX, startY);
            ctx.lineTo(colX, startY + rowH * 4);
            ctx.stroke();
          }
          ctx.fillStyle = '#0f172a';
          ctx.font = '900 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(col.label, colX + dateColW / 2, startY + rowH / 2, dateColW - 2);
        });

        // 3 Rows
        const rowDefs = [
          { key: 'breakfast' as const, label: 'BF' },
          { key: 'lunch' as const, label: 'Lunch' },
          { key: 'dinner' as const, label: 'Dinner' }
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
            const hasMeal = Boolean(col[rDef.key]);

            if (!hasMeal) {
              ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
              ctx.fillRect(cellX + 1, rY + 1, dateColW - 1, rowH - 1);
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (hasMeal) {
              ctx.fillStyle = '#065f46';
              ctx.font = '900 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillText(rDef.label, cellX + dateColW / 2, rY + rowH / 2);
            } else {
              ctx.fillStyle = '#94a3b8';
              ctx.font = '500 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillText('X', cellX + dateColW / 2, rY + rowH / 2);
            }
          });
        });
      };

      // Draw Tier 1 Table
      drawMealTable(tier1, 114, 'MEAL DATES');

      // Draw Tier 2 Table if present
      if (tier2.length > 0) {
        drawMealTable(tier2, 178, tier2Header);
      }

      // Footer Notes
      const footerY = h - 14;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748b';
      ctx.font = '600 7.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('* Show this pass at Prasadam Counter', 14, footerY);

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
    <div className="space-y-4">
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

      {/* Top Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl print:hidden text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('meal_card')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'meal_card'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-amber-600" />
          <span>Prasadam Card (8x5 cm)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('delegate_pass')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'delegate_pass'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          <Ticket className="w-3.5 h-3.5 text-orange-600" />
          <span>Official Delegate Pass</span>
        </button>
      </div>

      {/* VIEW 1: PRASADAM COUPON CARD (Unrestricted print height, left-aligned title, prominent QR) */}
      {activeTab === 'meal_card' && (
        <div className="flex justify-center px-1">
          <div
            id="prasadam-card-print-target"
            className="w-full max-w-[390px] bg-white border-2 border-slate-900 rounded-xl p-2 sm:p-2.5 shadow-sm font-sans text-slate-900 select-none space-y-1.5 mx-auto"
          >
            {/* Top Section: Left (Token + Camp Title + Devotee + Center) | Right (Dedicated Big Scannable QR) */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-300 pb-2">
              {/* Left Side: Title, Token, Devotee, Center */}
              <div className="flex-1 space-y-1 min-w-0 pr-1">
                {/* Row A: Token Circle + Camp Title & Temple */}
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-black text-base text-slate-950 bg-amber-50 shadow-inner shrink-0">
                    {displayToken}
                  </div>
                  <div className="leading-tight min-w-0 flex-1">
                    <div className="text-[12px] font-black text-blue-900 uppercase tracking-tight truncate">
                      {campTitle}
                    </div>
                    <div className="text-[9.5px] font-black text-slate-800 uppercase tracking-wide truncate">
                      {templeBanner}
                    </div>
                  </div>
                </div>

                {/* Row B: Devotee Name & Mobile */}
                <div className="flex items-baseline justify-between gap-1 text-[10px] leading-tight pt-0.5">
                  <div className="truncate font-black text-slate-950 max-w-[62%]">
                    {reg.participant_name}
                  </div>
                  <div className="truncate text-right shrink-0">
                    <span className="font-bold text-slate-500 uppercase text-[8px] mr-1">Mob:</span>
                    <span className="font-mono font-bold text-slate-900">{reg.whatsapp || reg.poc_contact}</span>
                  </div>
                </div>

                {/* Row C: Current Center & Track */}
                <div className="space-y-0.5 text-[9px] leading-tight">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-slate-500 uppercase text-[8px]">CENTER:</span>
                    <span className="font-bold text-slate-900 truncate">
                      {resolvedUserCenter}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-slate-500 uppercase text-[8px]">TRACK:</span>
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

              {/* Right Side: Dedicated Clean QR Code, completely free of text */}
              <div className="shrink-0 flex flex-col items-center justify-center p-1 bg-white border border-slate-400 rounded-lg shadow-2xs self-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan Pass QR"
                    className="w-16 h-16 sm:w-[68px] sm:h-[68px] object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] bg-slate-200 animate-pulse rounded" />
                )}
                <span className="block text-[7px] font-black text-slate-800 uppercase tracking-wider mt-0.5">
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
                        {tier1.map((col) => (
                          <td
                            key={col.date}
                            className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                              col.breakfast
                                ? 'bg-white text-emerald-900 font-black'
                                : 'bg-slate-200/80 text-slate-400 font-normal'
                            }`}
                          >
                            {col.breakfast ? 'BF' : 'X'}
                          </td>
                        ))}
                      </tr>
                      {/* Lunch */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Lunch
                        </td>
                        {tier1.map((col) => (
                          <td
                            key={col.date}
                            className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                              col.lunch
                                ? 'bg-white text-emerald-900 font-black'
                                : 'bg-slate-200/80 text-slate-400 font-normal'
                            }`}
                          >
                            {col.lunch ? 'Lunch' : 'X'}
                          </td>
                        ))}
                      </tr>
                      {/* Dinner */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Dinner
                        </td>
                        {tier1.map((col) => (
                          <td
                            key={col.date}
                            className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                              col.dinner
                                ? 'bg-white text-emerald-900 font-black'
                                : 'bg-slate-200/80 text-slate-400 font-normal'
                            }`}
                          >
                            {col.dinner ? 'Dinner' : 'X'}
                          </td>
                        ))}
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
                        {tier2.map((col) => (
                          <td
                            key={col.date}
                            className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                              col.breakfast
                                ? 'bg-white text-emerald-900 font-black'
                                : 'bg-slate-200/80 text-slate-400 font-normal'
                            }`}
                          >
                            {col.breakfast ? 'BF' : 'X'}
                          </td>
                        ))}
                      </tr>
                      {/* Lunch */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Lunch
                        </td>
                        {tier2.map((col) => (
                          <td
                            key={col.date}
                            className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                              col.lunch
                                ? 'bg-white text-emerald-900 font-black'
                                : 'bg-slate-200/80 text-slate-400 font-normal'
                            }`}
                          >
                            {col.lunch ? 'Lunch' : 'X'}
                          </td>
                        ))}
                      </tr>
                      {/* Dinner */}
                      <tr>
                        <td className="py-0.5 px-1 bg-slate-100 border-r border-slate-400 text-slate-800 font-black text-[8px]">
                          Dinner
                        </td>
                        {tier2.map((col) => (
                          <td
                            key={col.date}
                            className={`py-0.5 px-0.5 border-r border-slate-300 last:border-r-0 text-[9px] ${
                              col.dinner
                                ? 'bg-white text-emerald-900 font-black'
                                : 'bg-slate-200/80 text-slate-400 font-normal'
                            }`}
                          >
                            {col.dinner ? 'Dinner' : 'X'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Row 3: Footer Notes */}
            <div className="flex items-center justify-between text-[8px] text-slate-500 font-medium pt-0.5">
              <span>* Show this pass at Prasadam Counter</span>
              <span className="font-mono">#{displayToken}</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: OFFICIAL DELEGATE PASS (Original Gradient Card) */}
      {activeTab === 'delegate_pass' && (
        <div id="prasadam-card-print-target" className="space-y-3">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 text-white space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded">
                Official Delegate Pass
              </span>
              <span className="text-[10px] font-mono bg-black/20 px-2 py-0.5 rounded">
                Token: #{displayToken}
              </span>
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
                <span className="text-gray-500">Track:</span>
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

      {/* Action Buttons */}
      {!hideActions && (
        <div className="flex flex-wrap items-center gap-2 pt-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 min-w-[140px] py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save Pass</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHdPass}
            disabled={downloading}
            className="flex-1 min-w-[150px] py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Download razor-sharp, high-resolution pass image (300 DPI PNG)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Generating...' : 'Download Pass (HD)'}</span>
          </button>

          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`Camp-QR-${displayToken}.png`}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-all flex items-center justify-center gap-1"
              title="Download QR code image only"
            >
              <QrIcon className="w-3.5 h-3.5" />
              <span className="text-[11px]">QR</span>
            </a>
          )}
        </div>
      )}
    </div>
  );

  if (standalone) {
    return cardContent;
  }

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block print:z-auto">
      <div className="print-modal-container bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-gray-100 space-y-3 animate-in fade-in zoom-in-95 duration-200 my-8 print:my-0 print:p-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-auto print:static print:block">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-black text-gray-900">Camp Entry &amp; Prasadam Pass</h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {cardContent}
      </div>
    </div>
  );
}
