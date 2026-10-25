'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode, Camera, X, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Utensils, User, MapPin, Phone, Ticket, ShieldCheck,
  Check, ArrowRight, Loader2, Sparkles, LogIn, ChevronDown,
  Calendar, Layers, Volume2, VolumeX, Shield, Lock, Clock,
  Zap, History, UserPlus, Plus, Minus
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  getUserAllocatedCampsAction,
  verifyAndPunchMealPassAction,
  verifyCampRegistrationAction,
  recordExtraGuestMealPunchAction,
  getSessionMealStatsAction,
} from '@/app/dashboard/admin/camps/actions';
import { Camp } from '@/types';
import { parseMealDayToIso, sortMealDays } from '@/lib/camp-cost';
import CampPrasadamCard from './CampPrasadamCard';

interface AdminCampQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCampId?: string;
  defaultCampTitle?: string;
}

// Web Audio API Synthesizer for instant verification chimes without audio files
function playVerificationSound(type: 'success' | 'warning' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Pleasant double chime (880Hz -> 1320Hz)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);
    } else {
      // Warning / Error double low buzz (240Hz -> 180Hz)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.setValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio context may be restricted by browser until first interaction
  }
}

export default function AdminCampQrScannerModal({
  isOpen,
  onClose,
  defaultCampId,
  defaultCampTitle,
}: AdminCampQrScannerModalProps) {
  // Allocated Camps State
  const [allocatedCamps, setAllocatedCamps] = useState<(Camp & { user_role?: string })[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string>(defaultCampId || '');
  const [loadingCamps, setLoadingCamps] = useState(true);

  // Date & Meal Configuration
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMeal, setSelectedMeal] = useState<'Breakfast' | 'Lunch' | 'Dinner'>('Lunch');
  const [sessionServedCount, setSessionServedCount] = useState<number>(0);
  const [devoteeServedCount, setDevoteeServedCount] = useState<number>(0);
  const [extraGuestsServed, setExtraGuestsServed] = useState<number>(0);
  const [savingGuestMeal, setSavingGuestMeal] = useState<boolean>(false);

  // Scanner Mode & Camera Devices
  const [activeInputMode, setActiveInputMode] = useState<'camera' | 'manual'>('camera');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  const cameraMenuRef = useRef<HTMLDivElement | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);

  // Scan Result State
  const [processingScan, setProcessingScan] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: string;
    message: string;
    servedAt?: string;
    attendee?: any;
    totalServed?: number;
    rawRegistration?: any;
  } | null>(null);

  // Recent scans feed for high-speed POS mode
  const [recentScans, setRecentScans] = useState<{
    id: string;
    name: string;
    token?: string;
    track?: string;
    center?: string;
    meal: string;
    time: string;
    status: 'ALLOWED' | 'ALREADY_SERVED' | 'NOT_ELIGIBLE' | 'ERROR';
  }[]>([]);

  // Viewfinder flash status
  const [scanStatusFlash, setScanStatusFlash] = useState<'success' | 'warning' | 'error' | null>(null);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  // View full pass modal
  const [fullPassReg, setFullPassReg] = useState<any | null>(null);

  const handleCloseModal = () => {
    stopCamera();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('camp-attendance-updated'));
    }
    onClose();
  };

  // Html5Qrcode instance ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const cameraSwitchLockRef = useRef(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedAtRef = useRef<number>(0);
  const scannerContainerId = 'admin-qr-reader-viewport';

  // Synchronized refs to guarantee camera callbacks always see latest session configuration
  const selectedCampIdRef = useRef(selectedCampId);
  selectedCampIdRef.current = selectedCampId;
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const selectedMealRef = useRef(selectedMeal);
  selectedMealRef.current = selectedMeal;
  const handleExecuteScanRef = useRef<(input: string) => Promise<void>>((() => {}) as any);

  // 1. Initial Load: Fetch allocated camps for this user
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCamps = async () => {
      setLoadingCamps(true);
      try {
        const res = await getUserAllocatedCampsAction();
        if (res.success && res.camps && res.camps.length > 0) {
          if (!isMounted) return;
          setAllocatedCamps(res.camps);
          
          // Select default or first camp
          const initialCamp = defaultCampId
            ? res.camps.find((c: any) => c.id === defaultCampId) || res.camps[0]
            : res.camps[0];
          
          setSelectedCampId(initialCamp.id);
        }
      } catch (err) {
        console.error('Error fetching allocated camps', err);
      } finally {
        if (isMounted) setLoadingCamps(false);
      }
    };

    fetchCamps();
    return () => {
      isMounted = false;
    };
  }, [isOpen, defaultCampId]);

  // Selected Camp Object
  const currentCamp = React.useMemo(() => {
    return allocatedCamps.find((c) => c.id === selectedCampId) || null;
  }, [allocatedCamps, selectedCampId]);

  // Helper to extract canonical local YYYY, MM, DD without UTC skew
  const getCanonicalLocalDateParts = (input: string | Date | undefined) => {
    if (!input) return null;
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
      const [y, m, d] = input.trim().split('-').map(Number);
      return { year: y, month: m, day: d, iso: input.trim() };
    }
    const dt = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const d = dt.getDate();
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { year: y, month: m, day: d, iso };
  };

  // Camp Dates List: derives from currentCamp.meal_pricing (including pre-camp dates)
  // or falls back to start_date -> end_date range if no meal_pricing is configured.
  const campDates = React.useMemo(() => {
    if (!currentCamp) return [];
    const dates: {
      date: string;
      mealDateKey: string;
      label: string;
      displayDate: string;
      isToday: boolean;
    }[] = [];

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const campStartParts = getCanonicalLocalDateParts(currentCamp.start_date);
    const campStartIso = campStartParts?.iso || '';

    const mealPricing = currentCamp.meal_pricing || [];
    if (mealPricing.length > 0) {
      const sortedMeals = sortMealDays(mealPricing, currentCamp.start_date);

      sortedMeals.forEach((m) => {
        let iso = (m.full_date && /^\d{4}-\d{2}-\d{2}$/.test(m.full_date))
          ? m.full_date
          : parseMealDayToIso(m, currentCamp.start_date);

        if (!iso && /^\d{4}-\d{2}-\d{2}$/.test(String(m.date))) {
          iso = String(m.date);
        }

        let formattedDate = '';
        if (iso) {
          const [y, mon, d] = iso.split('-').map(Number);
          const dt = new Date(y, mon - 1, d);
          formattedDate = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        } else {
          formattedDate = (m.label || m.date).replace(/\s*-\s*/g, ' ');
        }

        // Determine prefix (Pre-Camp / Day 1 / Day 2 / etc.)
        let prefix = '';
        if (iso && campStartIso) {
          if (iso < campStartIso) {
            prefix = 'Pre-Camp';
          } else if (iso === campStartIso) {
            prefix = 'Day 1';
          } else {
            const [y1, m1, d1] = campStartIso.split('-').map(Number);
            const [y2, m2, d2] = iso.split('-').map(Number);
            const dtStart = new Date(y1, m1 - 1, d1);
            const dtCurr = new Date(y2, m2 - 1, d2);
            const diffDays = Math.round((dtCurr.getTime() - dtStart.getTime()) / (1000 * 60 * 60 * 24));
            prefix = `Day ${diffDays + 1}`;
          }
        } else {
          prefix = m.label || `Day ${dates.length + 1}`;
        }

        const isToday = iso ? iso === todayIso : false;
        const fullLabel = `${prefix} • ${formattedDate}${isToday ? ' (Today)' : ''}`;

        dates.push({
          date: iso || String(m.date),
          mealDateKey: String(m.date),
          label: fullLabel,
          displayDate: formattedDate,
          isToday,
        });
      });
    } else if (campStartParts) {
      // Fallback: iterate start_date to end_date using local dates
      const campEndParts = getCanonicalLocalDateParts(currentCamp.end_date) || campStartParts;
      const startDt = new Date(campStartParts.year, campStartParts.month - 1, campStartParts.day);
      const endDt = new Date(campEndParts.year, campEndParts.month - 1, campEndParts.day);

      let dayNum = 1;
      const curr = new Date(startDt);
      while (curr <= endDt) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;
        const isToday = dStr === todayIso;
        const formatted = curr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        dates.push({
          date: dStr,
          mealDateKey: String(curr.getDate()),
          label: `Day ${dayNum} • ${formatted}${isToday ? ' (Today)' : ''}`,
          displayDate: formatted,
          isToday,
        });
        curr.setDate(curr.getDate() + 1);
        dayNum++;
      }
    }

    return dates;
  }, [currentCamp]);

  // Set default date & default meal slot based on current time
  useEffect(() => {
    if (campDates.length > 0) {
      const todayMatch = campDates.find((d) => d.isToday);
      if (todayMatch) {
        setSelectedDate(todayMatch.date);
      } else if (!selectedDate || !campDates.some((d) => d.date === selectedDate)) {
        // Default to Day 1 (camp start) if present, else first date
        const day1Match = campDates.find((d) => d.label.startsWith('Day 1'));
        setSelectedDate(day1Match ? day1Match.date : campDates[0].date);
      }
    }

    // Auto-select meal based on current hour
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) {
      setSelectedMeal('Breakfast');
    } else if (hour >= 11 && hour < 17) {
      setSelectedMeal('Lunch');
    } else {
      setSelectedMeal('Dinner');
    }
  }, [currentCamp, campDates]);

  // Close camera dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target as Node)) {
        setIsCameraMenuOpen(false);
      }
    };
    if (isCameraMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCameraMenuOpen]);

  // Helper: enumerate ALL cameras with real labels.
  // KEY: keeps a stream alive during enumerateDevices() so Chrome reveals real device labels.
  // If the QR scanner is already running, it keeps labels unlocked — no extra stream needed.
  const enumerateAllCamerasWithLabels = async (): Promise<{ id: string; label: string }[]> => {
    let stream: MediaStream | null = null;
    const scannerIsRunning = !!(html5QrCodeRef.current?.isScanning);

    if (!scannerIsRunning) {
      // Scanner is not yet running — open a temporary stream to reveal labels
      let firstError: any = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (e: any) {
        firstError = e;
        // If explicitly denied, propagate immediately — don't silently swallow
        if (e?.name === 'NotAllowedError') throw e;

        // For other errors (NotReadableError, busy camera, etc.):
        // Try each enumerated deviceId individually
        const preList = await navigator.mediaDevices.enumerateDevices();
        for (const dev of preList.filter((d) => d.kind === 'videoinput')) {
          if (!dev.deviceId) continue;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: dev.deviceId } },
            });
            if (stream) { firstError = null; break; }
          } catch (devErr: any) {
            if (devErr?.name === 'NotAllowedError') throw devErr; // propagate denial
            // otherwise try next device
          }
        }
      }
      // If all devices failed but it wasn't a denial, log and continue
      // (we'll still enumerate devices and show generic names)
      if (!stream && firstError) {
        console.warn('Could not open any camera for label-unlock:', firstError?.message);
      }
    }

    // Enumerate while stream is live OR scanner is already running (both reveal real labels)
    const allDevices = await navigator.mediaDevices.enumerateDevices();

    // Stop the temporary unlock stream AFTER enumeration
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    // Include ALL video input devices, including those with empty labels (show as Camera N)
    const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');

    return videoDevices
      .filter((d) => d.deviceId !== undefined) // include even empty-string deviceIds
      .map((d, index) => {
        let cleanLabel = (d.label || '').trim();
        cleanLabel = cleanLabel.replace(/\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)/g, '').trim();
        return {
          id: d.deviceId || `device-${index}`,
          label: cleanLabel || `Camera ${index + 1}`,
        };
      });
  };



  // 2. Camera Enumeration & Zoom/Meet-style Device Detection
  const initCameras = async () => {
    if (cameraSwitchLockRef.current) return;
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) {
        setScanError('Camera devices not accessible in this browser. Please use manual / barcode mode.');
        return;
      }

      // NOTE: We intentionally do NOT use navigator.permissions.query here.
      // It returns 'denied' on localhost even when Chrome site permissions say "Allowed",
      // and is generally unreliable across browsers. getUserMedia is the real authority.
      let mapped: { id: string; label: string }[] = [];
      try {
        mapped = await enumerateAllCamerasWithLabels();
      } catch (enumErr: any) {
        if (enumErr?.name === 'NotAllowedError') {
          // Only show "permission denied" if getUserMedia itself explicitly refused
          setCameraPermissionGranted(false);
          setScanError('Camera permission was denied. Please click the 🔒 lock icon in the address bar and choose "Allow".');
          return;
        }
        // Any other error (NotReadableError, etc.) — still attempt to show what we found
        console.warn('enumerateAllCamerasWithLabels error:', enumErr);
      }

      if (mapped.length > 0) {
        setCameras(mapped);
        setCameraPermissionGranted(true);
        setScanError(null);

        // Pick preferred or best physical camera
        const savedCam = localStorage.getItem('voice_preferred_cam');
        let targetCamId: string;
        if (savedCam && mapped.some((c) => c.id === savedCam)) {
          targetCamId = savedCam;
        } else {
          // Prefer physical webcam (Integrated/USB); avoid virtual cameras as default
          const physicalCam = mapped.find(
            (c) =>
              c.label.toLowerCase().includes('integrated') ||
              c.label.toLowerCase().includes('webcam') ||
              c.label.toLowerCase().includes('usb') ||
              c.label.toLowerCase().includes('hd camera') ||
              c.label.toLowerCase().includes('hd webcam')
          );
          targetCamId = physicalCam ? physicalCam.id : mapped[0].id;
        }
        setSelectedCameraId(targetCamId);

        // Small delay to ensure the scanner DOM element has been rendered before starting
        if (activeInputMode === 'camera') {
          await new Promise<void>((resolve) => setTimeout(resolve, 200));
          await startCamera(targetCamId);
        }
      } else {
        // 0 cameras returned — most likely no camera present or permission was fully blocked
        // Show the "Allow Camera Access" button (don't force the full permission-denied screen)
        setCameraPermissionGranted(true); // keep UI in camera mode so user can click Allow
        setScanError(
          'No cameras detected. Click "Allow Camera Access" in the top-right camera menu to grant access, or switch to USB / Barcode mode.'
        );
      }
    } catch (err: any) {
      console.warn('Camera enumeration error:', err);
      if (err?.name === 'NotAllowedError') {
        setCameraPermissionGranted(false);
        setScanError('Camera permission was denied. Please click the 🔒 lock icon in the address bar and choose "Allow".');
      } else {
        setCameraPermissionGranted(true);
        setScanError('Camera initialization encountered an issue. Click "Allow Camera Access" or select a camera from the top menu.');
      }
    }
  };

  // Request explicit camera permission
  const requestCameraPermission = async () => {
    setScanError(null);
    try {
      // Use the shared helper which keeps the stream alive during enumeration
      const mapped = await enumerateAllCamerasWithLabels();

      setCameraPermissionGranted(true);

      if (mapped.length > 0) {
        setCameras(mapped);
        const savedCam = localStorage.getItem('voice_preferred_cam');
        const physicalCam = mapped.find(
          (c) =>
            c.label.toLowerCase().includes('integrated') ||
            c.label.toLowerCase().includes('webcam') ||
            c.label.toLowerCase().includes('usb')
        );
        const targetId =
          savedCam && mapped.some((c) => c.id === savedCam)
            ? savedCam
            : physicalCam
            ? physicalCam.id
            : mapped[0].id;
        setSelectedCameraId(targetId);
        await startCamera(targetId);
      }
    } catch (err: any) {
      console.warn('Camera permission request error:', err);
      if (err?.name === 'NotAllowedError') {
        setCameraPermissionGranted(false);
        setScanError(
          'Camera permission was blocked. Please click the 🔒 lock icon in your browser address bar and choose "Allow".'
        );
      } else if (err?.name === 'NotReadableError') {
        setCameraPermissionGranted(true);
        setScanError(
          'Camera hardware is in use by another app. Please close other camera windows and select your camera from the top menu.'
        );
      } else {
        setCameraPermissionGranted(true);
        setScanError(
          err?.message || 'Could not access camera. Please select another camera from the menu above.'
        );
      }
    }
  };

  // Fully release scanner + hardware so the next device can bind cleanly
  const stopCamera = async () => {
    const scanner = html5QrCodeRef.current;
    html5QrCodeRef.current = null;
    setIsScanning(false);

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (err) {
        console.warn('Error stopping camera', err);
      }
      try {
        scanner.clear();
      } catch {
        // ignore — container may already be empty
      }
    }

    const containerElem = document.getElementById(scannerContainerId);
    if (containerElem) {
      containerElem.innerHTML = '';
    }
  };

  // 3. Start Camera Scanner
  const startCamera = async (deviceIdToUse?: string) => {
    setScanError(null);
    try {
      // Always tear down previous instance before binding a new device
      await stopCamera();
      // Give the OS a beat to release the previous camera lock
      await new Promise<void>((resolve) => setTimeout(resolve, 200));

      const containerElem = document.getElementById(scannerContainerId);
      if (!containerElem) {
        return;
      }

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      html5QrCodeRef.current = scanner;

      const targetDeviceId = deviceIdToUse || selectedCameraId || (cameras[0]?.id ?? '');

      // Crucial: Omit qrbox entirely!
      // When qrbox is omitted, html5-qrcode decodes 100% of the camera sensor.
      // This allows instant detection at any angle, extreme tilt (45°-60°), 360° rotation, and far/close distances.
      const config = {
        fps: 24, // 24 FPS scanning frequency
      };

      // Pass deviceId as a plain string — most reliable way to switch cameras in html5-qrcode
      try {
        if (targetDeviceId) {
          await scanner.start(
            targetDeviceId,
            config,
            (decodedText) => {
              handleExecuteScanRef.current(decodedText);
            },
            () => {}
          );
        } else {
          await scanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              handleExecuteScanRef.current(decodedText);
            },
            () => {}
          );
        }
        setIsScanning(true);
      } catch (firstStartErr: any) {
        console.warn('First start attempt failed:', firstStartErr);
        // Fallback: MediaTrackConstraints with exact deviceId
        if (targetDeviceId) {
          await scanner.start(
            { deviceId: { exact: targetDeviceId } },
            config,
            (decodedText) => {
              handleExecuteScanRef.current(decodedText);
            },
            () => {}
          );
          setIsScanning(true);
        } else {
          throw firstStartErr;
        }
      }
    } catch (err: any) {
      console.warn('Failed to start camera', err);
      setIsScanning(false);
      if (err?.name === 'NotAllowedError') {
        setCameraPermissionGranted(false);
        setScanError('Camera permission denied. Allow camera access or use USB barcode mode.');
      } else if (err?.name === 'NotReadableError') {
        setScanError(
          'Camera hardware is currently in use by another app or browser preview. Please close other camera windows and click Retry.'
        );
      } else {
        setScanError(
          `Could not start camera (${err?.message || 'device unavailable'}). Please choose another camera from the menu above.`
        );
      }
    }
  };

  // Switch camera when selected in dropdown
  const handleCameraChange = async (newDeviceId: string) => {
    if (!newDeviceId || cameraSwitchLockRef.current) return;
    if (newDeviceId === selectedCameraId && isScanning) return;

    cameraSwitchLockRef.current = true;
    setSelectedCameraId(newDeviceId);
    localStorage.setItem('voice_preferred_cam', newDeviceId);
    setIsCameraMenuOpen(false);

    try {
      await startCamera(newDeviceId);
    } finally {
      cameraSwitchLockRef.current = false;
    }
  };

  const triggerStatusFlash = (type: 'success' | 'warning' | 'error') => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setScanStatusFlash(type);
    flashTimerRef.current = setTimeout(() => {
      setScanStatusFlash(null);
    }, 900);
  };

  // 4. Execute Pass Scan & Automatic Meal Punch (High-Speed POS Mode < 0.5s)
  const handleExecuteScan = async (rawInput: string) => {
    const cleanInput = (rawInput || '').trim();
    if (!cleanInput) return;

    // Concurrency lock: skip frame if server call currently in-flight
    if (isProcessingRef.current) return;

    const now = Date.now();
    // Same pass debounce: only wait if the EXACT same pass is held continuously (1.2s cooldown)
    // If a different devotee's pass is presented, it executes IMMEDIATELY (0ms wait)
    if (lastScannedCodeRef.current === cleanInput && (now - lastScannedAtRef.current < 1200)) {
      return;
    }

    lastScannedCodeRef.current = cleanInput;
    lastScannedAtRef.current = now;
    isProcessingRef.current = true;
    setProcessingScan(true);
    setScanError(null);

    // Use current configuration from refs to guarantee fresh parameters
    const activeCampId = selectedCampIdRef.current || selectedCampId;
    const activeDate = selectedDateRef.current || selectedDate;
    const activeMeal = selectedMealRef.current || selectedMeal;

    if (!activeDate) {
      setScanError('Please select a Meal Date first before scanning.');
      isProcessingRef.current = false;
      setProcessingScan(false);
      return;
    }

    try {
      const res = await verifyAndPunchMealPassAction({
        rawPassInput: cleanInput,
        campId: activeCampId,
        mealDate: activeDate,
        mealName: activeMeal,
      });

      setScanResult(res);

      if (res.success && res.status === 'ALLOWED') {
        playVerificationSound('success');
        triggerStatusFlash('success');
        if (res.totalServed !== undefined) {
          setSessionServedCount(res.totalServed);
        }
        if (res.devoteeServed !== undefined) {
          setDevoteeServedCount(res.devoteeServed);
        }
        if (res.extraServed !== undefined) {
          setExtraGuestsServed(res.extraServed);
        }

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setRecentScans((prev) => [
          {
            id: res.attendee?.id || Math.random().toString(),
            name: res.attendee?.name || 'Devotee Attendee',
            token: res.attendee?.token,
            track: res.attendee?.track,
            center: res.attendee?.center,
            meal: activeMeal,
            time: timeStr,
            status: 'ALLOWED',
          },
          ...prev.slice(0, 4),
        ]);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('camp-attendance-updated'));
        }
      } else if (res.status === 'ALREADY_SERVED') {
        playVerificationSound('warning');
        triggerStatusFlash('warning');
      } else {
        playVerificationSound('error');
        triggerStatusFlash('error');
      }
    } catch (err: any) {
      playVerificationSound('error');
      triggerStatusFlash('error');
      setScanResult({
        status: 'ERROR',
        message: err.message || 'Error processing pass scan.',
      });
    } finally {
      isProcessingRef.current = false;
      setProcessingScan(false);
    }
  };

  useEffect(() => {
    handleExecuteScanRef.current = handleExecuteScan;
  });

  // Auto-fetch live session counts (Devotee QR scans + Non-QR Extra Guests)
  useEffect(() => {
    if (!isOpen || !selectedCampId || !selectedDate || !selectedMeal) return;

    let isMounted = true;
    getSessionMealStatsAction({
      campId: selectedCampId,
      mealDate: selectedDate,
      mealName: selectedMeal,
    }).then((res) => {
      if (!isMounted || !res?.success) return;
      setDevoteeServedCount(res.devoteeServedCount || 0);
      setExtraGuestsServed(res.extraServedCount || 0);
      setSessionServedCount(res.totalServedCount || 0);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedCampId, selectedDate, selectedMeal]);

  // Direct punch for extra / walk-in guests without scanning QR
  const handlePunchExtraGuest = async (increment: number) => {
    if (savingGuestMeal) return;

    const activeCampId = selectedCampIdRef.current || selectedCampId;
    const activeDate = selectedDateRef.current || selectedDate;
    const activeMeal = selectedMealRef.current || selectedMeal;

    if (!activeDate) {
      setScanError('Please select a Meal Date first before adding extra guests.');
      return;
    }

    setSavingGuestMeal(true);
    setScanError(null);

    try {
      const res = await recordExtraGuestMealPunchAction({
        campId: activeCampId,
        mealDate: activeDate,
        mealName: activeMeal,
        increment,
      });

      if (res?.success) {
        playVerificationSound('success');
        triggerStatusFlash('success');

        const newExtra = res.extraServedCount ?? Math.max(0, extraGuestsServed + increment);
        const newDevotees = res.devoteeServedCount ?? devoteeServedCount;
        const newTotal = res.totalServedCount ?? (newDevotees + newExtra);

        setExtraGuestsServed(newExtra);
        setDevoteeServedCount(newDevotees);
        setSessionServedCount(newTotal);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('camp-attendance-updated'));
        }

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setRecentScans((prev) => [
          {
            id: `guest-${Date.now()}`,
            name: increment > 0 ? `+${increment} Extra Guest Meal (No QR)` : `Reverted 1 Guest Plate`,
            token: 'GUEST',
            track: 'Non-QR Honor',
            center: 'Gate Walk-In',
            meal: activeMeal,
            time: timeStr,
            status: 'ALLOWED',
          },
          ...prev.slice(0, 4),
        ]);

        setScanResult({
          status: 'ALLOWED',
          message: increment > 0 
            ? `+${increment} EXTRA GUEST MEAL HONORED (NO QR) • ${activeMeal.toUpperCase()}`
            : `1 EXTRA GUEST REVERTED`,
          attendee: {
            id: `guest-${Date.now()}`,
            name: increment > 0 ? `+${increment} Extra Guest (Without QR)` : `Extra Guest Reverted`,
            track: `Walk-in Guest / Driver / Dignitary (No QR Pass)`,
            token: 'GUEST',
            center: `${newExtra} Non-QR Guests Honored Today`,
          },
        });
      } else {
        playVerificationSound('error');
        triggerStatusFlash('error');
        setScanError(res?.error || 'Failed to record extra guest meal');
      }
    } catch (err: any) {
      playVerificationSound('error');
      triggerStatusFlash('error');
      setScanError(err?.message || 'Error recording extra guest meal');
    } finally {
      setSavingGuestMeal(false);
    }
  };

  // Clear HUD / Reset Scan Result
  const handleClearHUD = () => {
    setScanResult(null);
    lastScannedCodeRef.current = null;
    setManualInput('');
    setScanError(null);
    if (activeInputMode === 'manual') {
      manualInputRef.current?.focus();
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      initCameras();
    } else {
      stopCamera();
      setScanResult(null);
      setRecentScans([]);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Auto-listen for newly connected USB or virtual cameras (Zoom / Meet behavior)
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) return;

    const handleDeviceChange = () => {
      initCameras();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isOpen]);

  // Only re-trigger camera when user explicitly switches between Camera / Manual mode
  useEffect(() => {
    if (!isOpen) return;
    if (activeInputMode === 'manual') {
      stopCamera();
    }
    // When switching TO camera mode: cameras already initialized by initCameras -> startCamera flow
    // selectedCameraId change is handled by handleCameraChange directly
  }, [activeInputMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl lg:max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                  Pass Scanner &amp; Prasadam Punch Desk
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  Live Counter
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Automatic meal punch • Duplicate pass prevention • High-speed attendee queue clearance
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SESSION CONFIGURATION BAR: Camp Selector + Date + Meal Slot */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Control 1: Select Camp */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Active Camp</span>
              </label>
              <select
                value={selectedCampId}
                onChange={(e) => {
                  setSelectedCampId(e.target.value);
                  setScanResult(null);
                }}
                disabled={loadingCamps || allocatedCamps.length <= 1}
                className="w-full py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {allocatedCamps.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.title} ({camp.user_role === 'super_admin' ? 'Master' : camp.user_role?.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Control 2: Select Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Meal Date</span>
              </label>
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setScanResult(null);
                }}
                className="w-full py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {campDates.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Control 3: Select Meal Session */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Meal Session</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Breakfast', 'Lunch', 'Dinner'] as const).map((meal) => (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => {
                      setSelectedMeal(meal);
                      setScanResult(null);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center truncate ${
                      selectedMeal === meal
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {meal}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Session Status Strip */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-1.5 border-t border-slate-200/80 gap-2">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span>Scanning for:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {currentCamp?.title || 'Camp'} • {selectedDate} • {selectedMeal}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 text-[11px]">
                Devotees (QR): <strong className="text-emerald-700 font-black">{devoteeServedCount}</strong>
              </span>
              <span className="font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 text-[11px]">
                Guests (No QR): <strong className="text-indigo-900 font-black">{extraGuestsServed}</strong>
              </span>
              <span className="font-mono font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 text-[11px]">
                Total Served: {sessionServedCount}
              </span>
            </div>
          </div>
        </div>

        {/* CAMERA SELECTION & PERMISSION TOOLBAR (Zoom / Meet Style) */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Input Mode Toggle */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => {
                setActiveInputMode('camera');
                setScanError(null);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeInputMode === 'camera'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>Camera</span>
            </button>
            <button
              onClick={() => {
                stopCamera();
                setActiveInputMode('manual');
                setScanError(null);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeInputMode === 'manual'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ticket className="w-3.5 h-3.5 text-blue-600" />
              <span>USB / Barcode Gun</span>
            </button>
          </div>

          {/* Google Meet-Style Camera Device Selector Popover Menu */}
          {activeInputMode === 'camera' && (
            <div className="relative" ref={cameraMenuRef}>
              <button
                type="button"
                onClick={() => setIsCameraMenuOpen(!isCameraMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all border border-slate-700"
                title="Select Camera (Zoom / Google Meet Style)"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span className="max-w-[170px] sm:max-w-[240px] truncate font-medium">
                  {cameras.find((c) => c.id === selectedCameraId)?.label || (cameras.length > 0 ? 'Select Camera' : 'Camera')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCameraMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Dark Popup Menu */}
              {isCameraMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#282a2d] border border-[#3c4043] rounded-2xl shadow-2xl p-1.5 z-50 text-white animate-fadeIn">
                  <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-[#3c4043]/70 pb-2 mb-1">
                    <span>Available Cameras ({cameras.length})</span>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (cameras.length === 0 || cameraPermissionGranted === false) {
                          await requestCameraPermission();
                        } else {
                          await initCameras();
                        }
                      }}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-0.5 space-y-1">
                    {cameras.length === 0 ? (
                      <div className="p-4 text-xs text-slate-300 text-center space-y-2">
                        <p>No video devices detected.</p>
                        <button
                          type="button"
                          onClick={() => requestCameraPermission()}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow"
                        >
                          Allow Camera Access
                        </button>
                      </div>
                    ) : (
                      cameras.map((cam) => {
                        const isSelected = cam.id === selectedCameraId;
                        return (
                          <button
                            key={cam.id}
                            type="button"
                            onClick={() => {
                              void handleCameraChange(cam.id);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                              isSelected
                                ? 'bg-[#3c4043] font-bold text-white shadow-inner'
                                : 'hover:bg-[#3c4043]/60 text-slate-300'
                            }`}
                          >
                            <div className="w-4 flex items-center justify-center shrink-0">
                              {isSelected ? (
                                <Check className="w-4 h-4 text-blue-400 font-black" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                              )}
                            </div>
                            <span className="truncate">{cam.label}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL MAIN CONTENT: CONTINUOUS POS BILLING COUNTER VIEW */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* CAMERA PERMISSION REQUIRED SCREEN */}
          {activeInputMode === 'camera' && cameraPermissionGranted === false && (
            <div className="py-10 px-4 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 mx-auto shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">Camera Permission Required</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To scan devotee pass QR codes with your laptop or phone camera, please allow camera access.
                </p>
              </div>
              <button
                type="button"
                onClick={requestCameraPermission}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs rounded-full shadow-md shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Allow Camera Access</span>
              </button>
            </div>
          )}

          {/* MAIN TWO-COLUMN SPLIT: SCANNER (LEFT) & LIVE PUNCH HUD (RIGHT) */}
          {(activeInputMode === 'manual' || cameraPermissionGranted !== false) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: CONTINUOUS VIEWFINDER (5 COLS ON LG) */}
              <div className="lg:col-span-5 space-y-3">
                {activeInputMode === 'camera' ? (
                  <div className="space-y-2.5">
                    {/* Scoped CSS to ensure webcam video fills container seamlessly with no letterboxing */}
                    <style
                      dangerouslySetInnerHTML={{
                        __html: `
                          #admin-qr-reader-viewport,
                          #admin-qr-reader-viewport > div,
                          #admin-qr-reader-viewport video,
                          #admin-qr-reader-viewport img {
                            width: 100% !important;
                            height: 100% !important;
                            max-width: none !important;
                            max-height: none !important;
                            border: none !important;
                            border-radius: 0 !important;
                          }
                          #admin-qr-reader-viewport {
                            position: absolute !important;
                            inset: 0 !important;
                            overflow: hidden !important;
                          }
                          #admin-qr-reader-viewport video {
                            object-fit: cover !important;
                            transform: none !important;
                          }
                          #admin-qr-reader-viewport canvas {
                            display: none !important;
                          }
                        `,
                      }}
                    />

                    {/* Viewport with reactive LED glow ring (Natural 4:3 webcam aspect ratio) */}
                    <div
                      className={`relative mx-auto w-full max-w-[340px] aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden transition-all duration-300 ${
                        scanStatusFlash === 'success'
                          ? 'ring-4 ring-emerald-500 shadow-2xl shadow-emerald-500/50'
                          : scanStatusFlash === 'warning'
                          ? 'ring-4 ring-amber-500 shadow-2xl shadow-amber-500/50'
                          : scanStatusFlash === 'error'
                          ? 'ring-4 ring-rose-500 shadow-2xl shadow-rose-500/50'
                          : 'border-2 border-slate-800 shadow-xl'
                      }`}
                    >
                      <div id={scannerContainerId} className="absolute inset-0 w-full h-full" />

                      {/* Viewfinder Target Laser — Proportionally adjusted to fit camera feed */}
                      {isScanning && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-3">
                          <div className="w-[74%] max-w-[220px] aspect-square border-2 border-amber-400/90 rounded-2xl relative shadow-lg">
                            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-amber-500 rounded-tl-lg" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-amber-500 rounded-tr-lg" />
                            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-amber-500 rounded-bl-lg" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-amber-500 rounded-br-lg" />
                            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-md" />
                          </div>
                        </div>
                      )}

                      {!isScanning && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-950/80 p-4 text-center">
                          {scanError ? (
                            <>
                              <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                                <Camera className="w-5 h-5" />
                              </div>
                              <span className="text-rose-300 font-semibold text-xs leading-tight">
                                Camera feed not active
                              </span>
                              <button
                                type="button"
                                onClick={() => startCamera(selectedCameraId)}
                                className="mt-2 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-all"
                              >
                                Retry Camera
                              </button>
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                              <span>Connecting camera feed...</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Continuous Scan Indicator */}
                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600 font-semibold bg-slate-100 py-1.5 px-3 rounded-xl border border-slate-200">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>360° Omnidirectional Fast Scan • Any Angle / Tilt</span>
                    </div>
                  </div>
                ) : (
                  /* USB / BARCODE GUN MODE */
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-100 border border-slate-200">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (manualInput.trim()) {
                          const val = manualInput.trim();
                          setManualInput('');
                          void handleExecuteScan(val);
                          manualInputRef.current?.focus();
                        }
                      }}
                      className="space-y-3"
                    >
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-blue-600" />
                        <span>Handheld USB Scanner Gun</span>
                      </label>
                      <input
                        ref={manualInputRef}
                        type="text"
                        autoFocus
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Pull trigger on pass QR code..."
                        className="w-full px-3 py-3 rounded-xl border-2 border-slate-300 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
                      />
                      <button
                        type="submit"
                        disabled={processingScan || !manualInput.trim()}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {processingScan ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify Pass</span>}
                      </button>
                    </form>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      💡 Barcode gun auto-submits on trigger. Keep input focused and scan passes continuously.
                    </p>
                  </div>
                )}

                {/* COMPACT & ERGONOMIC NON-QR EXTRA GUEST MEAL COUNTER */}
                <div className="px-3.5 py-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 shadow-2xs flex items-center justify-between gap-3 mt-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-indigo-950 truncate">
                          Walk-in Guest (No QR)
                        </h4>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-200/80 text-indigo-900 border border-indigo-300/50">
                          {extraGuestsServed} {extraGuestsServed === 1 ? 'plate' : 'plates'}
                        </span>
                      </div>
                      <p className="text-[10px] text-indigo-700/80 font-medium truncate">
                        Visitors, drivers &amp; VIPs without pass
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePunchExtraGuest(1)}
                      disabled={savingGuestMeal || !selectedDate}
                      className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      title="Add 1 Extra Guest Plate without QR scanner"
                    >
                      {savingGuestMeal ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>+1 Guest Meal</span>
                    </button>

                    {extraGuestsServed > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePunchExtraGuest(-1)}
                        disabled={savingGuestMeal || !selectedDate}
                        className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-600 hover:text-rose-700 font-bold text-xs flex items-center justify-center gap-0.5 transition-all disabled:opacity-50 cursor-pointer"
                        title="Revert 1 Guest Plate"
                      >
                        <Minus className="w-3 h-3" />
                        <span className="text-[10px]">Undo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE PUNCH HUD & RECENT ATTENDEES (7 COLS ON LG) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. ACTIVE RESULT CARD (OR IDLE STANDBY HUD) */}
                {scanResult ? (
                  <div className="space-y-3 animate-fadeIn">
                    {/* ALLOWED */}
                    {scanResult.status === 'ALLOWED' && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl space-y-3 border border-emerald-400/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black tracking-wider uppercase">
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>Meal Allowed • Punched</span>
                          </div>
                          {scanResult.attendee?.token && (
                            <div className="px-3 py-1 rounded-full bg-black/25 text-white text-xs font-mono font-black border border-white/20">
                              Token #{scanResult.attendee.token}
                            </div>
                          )}
                        </div>

                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">
                            {scanResult.attendee?.name || 'Devotee Attendee'}
                          </h2>
                          <p className="text-emerald-100 text-xs font-medium mt-0.5">
                            {scanResult.attendee?.track || 'Standard Track'} • {scanResult.attendee?.center || 'Center'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs text-emerald-50">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                            <span>Meal: <strong>{selectedMeal}</strong> ({selectedDate})</span>
                          </div>
                          <span className="font-bold bg-white text-emerald-900 px-2.5 py-0.5 rounded-full shadow-sm text-[11px]">
                            ⚡ Next pass ready
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ALREADY SERVED (DUPLICATE) */}
                    {scanResult.status === 'ALREADY_SERVED' && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl space-y-3 border border-amber-400/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black tracking-wider uppercase">
                            <AlertTriangle className="w-4 h-4 text-amber-200" />
                            <span>Duplicate Scan • Already Collected</span>
                          </div>
                          {scanResult.attendee?.token && (
                            <div className="px-3 py-1 rounded-full bg-black/25 text-white text-xs font-mono font-black border border-white/20">
                              Token #{scanResult.attendee.token}
                            </div>
                          )}
                        </div>

                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">
                            {scanResult.attendee?.name || 'Devotee Attendee'}
                          </h2>
                          <p className="text-amber-100 text-xs font-medium mt-0.5">
                            {scanResult.attendee?.track || 'Standard Track'} • {scanResult.attendee?.center || 'Center'}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/20 text-amber-50 text-xs font-bold flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                          <span>Already collected {selectedMeal} at {scanResult.servedAt}.</span>
                        </div>
                      </div>
                    )}

                    {/* NOT ELIGIBLE */}
                    {scanResult.status === 'NOT_ELIGIBLE' && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-xl space-y-3 border border-rose-400/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black tracking-wider uppercase">
                            <XCircle className="w-4 h-4 text-rose-200" />
                            <span>Meal Not Included in Pass</span>
                          </div>
                          {scanResult.attendee?.token && (
                            <div className="px-3 py-1 rounded-full bg-black/25 text-white text-xs font-mono font-black border border-white/20">
                              Token #{scanResult.attendee.token}
                            </div>
                          )}
                        </div>

                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">
                            {scanResult.attendee?.name || 'Devotee Attendee'}
                          </h2>
                          <p className="text-rose-100 text-xs font-medium mt-0.5">
                            {scanResult.attendee?.track || 'Standard Track'}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/20 text-rose-50 text-xs space-y-1">
                          <p className="font-bold">{scanResult.message}</p>
                          {scanResult.attendee?.firstMeal && (
                            <p className="text-[11px] text-rose-200">
                              Registered Meal Window: {scanResult.attendee.firstMeal} to {scanResult.attendee.lastMeal}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* WRONG CAMP / CANCELLED / OTHER ERRORS */}
                    {['WRONG_CAMP', 'CANCELLED', 'PENDING_PAYMENT', 'NOT_FOUND', 'EMPTY_DATE', 'ERROR'].includes(scanResult.status) && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl space-y-3 border border-slate-700">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-black tracking-wider uppercase w-fit">
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span>Pass Rejected</span>
                        </div>

                        <div>
                          <h2 className="text-xl font-black text-white">
                            {scanResult.attendee?.name || 'Invalid Pass'}
                          </h2>
                          <p className="text-slate-300 text-xs font-medium mt-1">
                            {scanResult.message}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleClearHUD}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
                      >
                        Dismiss / Ready for Next
                      </button>
                    </div>
                  </div>
                ) : (
                  /* IDLE STANDBY HUD */
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl space-y-3 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Zap className="w-7 h-7 animate-pulse" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h4 className="font-black text-base text-white tracking-tight">
                          Billing Counter Mode Active
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          &lt; 0.5s SPEED
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Hold devotee pass in front of camera. Each attendee is verified and meal-punched automatically with zero lag.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. RECENT PUNCHES LIVE STREAM */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold px-1">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>Live Clearance Feed ({sessionServedCount} Punched)</span>
                    </div>
                    {recentScans.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRecentScans([])}
                        className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors font-medium"
                      >
                        Clear Feed
                      </button>
                    )}
                  </div>

                  {recentScans.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                      Waiting for scans... Punched devotees will appear here in real time.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {recentScans.map((item, idx) => (
                        <div
                          key={item.id + idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs text-xs animate-fadeIn"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            {item.token && (
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 text-[11px]">
                                #{item.token}
                              </span>
                            )}
                            <span className="font-bold text-slate-900 truncate">
                              {item.name}
                            </span>
                            {item.track && (
                              <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                                • {item.track}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono text-slate-500">
                              {item.time}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ Punched
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner if any */}
          {scanError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Scanner Notice:</span> {scanError}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700">Billing Counter Auto-Punch Active</span>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            Done / Close Desk
          </button>
        </div>
      </div>
    </div>
  );
}
