import { Camp, CampMealConfig } from '@/types';

export interface CalculatedCostResult {
  mealCost: number;
  accCost: number;
  acCost: number;
  baseCost: number;
  baseCostLabel?: string;
  lateFee: number;
  entryCost: number;
  totalCost: number;
  daysOfStay: number;
  mealCount: number;
}

/**
 * Dynamically calculates the exact cost for a camp participant entry based on the Camp's configuration.
 */
export function calculateDynamicCampCost(
  camp: Camp,
  entry: {
    firstMealDate: string;
    firstMealType: string;
    lastMealDate: string;
    lastMealType: string;
    accommodation: string;
    participantType: string;
    campTrack?: string;
  },
  isLate: boolean = false
): CalculatedCostResult {
  // 1. Role-based Waivers & Pricing check
  const role = entry.participantType || '';
  const roleWaivers = camp.special_waivers?.role_waivers || [];
  const roleWaiver = roleWaivers.find(
    (w) => w.role.toLowerCase() === role.toLowerCase()
  );

  // If role has a fixed token fee (e.g. 0 for full free pass, or nominal confirmation fee)
  if (roleWaiver && roleWaiver.fixed_token_fee !== null && roleWaiver.fixed_token_fee !== undefined) {
    const fee = Number(roleWaiver.fixed_token_fee) || 0;
    return {
      mealCost: 0,
      accCost: 0,
      acCost: 0,
      baseCost: 0,
      baseCostLabel: '',
      lateFee: 0,
      entryCost: fee,
      totalCost: fee,
      daysOfStay: 0,
      mealCount: 0,
    };
  }

  // 1b. Legacy Brahmachari Fallback (if no explicit role_waiver configured for Brahmachari)
  if (!roleWaiver && role === 'Brahmachari') {
    const fee = camp.special_waivers?.brahmachari_fee ?? 100;
    return {
      mealCost: 0,
      accCost: 0,
      acCost: 0,
      baseCost: 0,
      baseCostLabel: '',
      lateFee: 0,
      entryCost: fee,
      totalCost: fee,
      daysOfStay: 0,
      mealCount: 0,
    };
  }

  // 1c. Sub-Camp Specific Extra Fee (e.g. Camp Booklet, Material Kit)
  let trackFee = 0;
  let trackFeeLabel = '';
  const selectedTrack = (entry.campTrack || '').trim().toLowerCase();
  if (selectedTrack && camp.special_waivers?.track_fees) {
    const tf = camp.special_waivers.track_fees.find(
      (t) => (t.track || '').trim().toLowerCase() === selectedTrack
    );
    if (tf && Number(tf.fee) > 0) {
      trackFee = Number(tf.fee);
      trackFeeLabel = (tf.label || 'Camp Booklet & Material').trim();
    }
  }

  // 1d. General Base Registration Overhead Fee (if any)
  const generalBaseFee = Number(camp.special_waivers?.base_registration_fee || 0);
  const generalBaseLabel = (camp.special_waivers?.base_registration_fee_label || 'Registration Overhead').trim();

  const baseCost = trackFee + generalBaseFee;
  let baseCostLabel = '';
  if (trackFee > 0 && generalBaseFee > 0) {
    baseCostLabel = `${trackFeeLabel} + ${generalBaseLabel}`;
  } else if (trackFee > 0) {
    baseCostLabel = trackFeeLabel;
  } else if (generalBaseFee > 0) {
    baseCostLabel = generalBaseLabel;
  }

  const mealPricing: CampMealConfig[] = camp.meal_pricing || [];
  if (mealPricing.length === 0) {
    return {
      mealCost: 0,
      accCost: 0,
      acCost: 0,
      baseCost,
      baseCostLabel,
      lateFee: 0,
      entryCost: baseCost,
      totalCost: baseCost,
      daysOfStay: 0,
      mealCount: 0,
    };
  }

  // Linearize all meals across the camp schedule chronologically:
  // Each day has Breakfast, Lunch, Dinner with an absolute sequence number
  interface FlatMeal {
    sn: number;
    date: string;
    mealType: 'Breakfast' | 'Lunch' | 'Dinner';
    price: number;
    dayIndex: number;
  }

  const flatMeals: FlatMeal[] = [];
  let snCounter = 1;

  mealPricing.forEach((day, dayIndex) => {
    flatMeals.push({
      sn: snCounter++,
      date: String(day.date),
      mealType: 'Breakfast',
      price: Number(day.breakfast) || 0,
      dayIndex,
    });
    flatMeals.push({
      sn: snCounter++,
      date: String(day.date),
      mealType: 'Lunch',
      price: Number(day.lunch) || 0,
      dayIndex,
    });
    flatMeals.push({
      sn: snCounter++,
      date: String(day.date),
      mealType: 'Dinner',
      price: Number(day.dinner) || 0,
      dayIndex,
    });
  });

  const normType = (t: string): 'Breakfast' | 'Lunch' | 'Dinner' => {
    const lower = (t || '').toLowerCase();
    if (lower.startsWith('b')) return 'Breakfast';
    if (lower.startsWith('l')) return 'Lunch';
    return 'Dinner';
  };

  const firstType = normType(entry.firstMealType);
  const lastType = normType(entry.lastMealType);
  const firstDateStr = String(entry.firstMealDate);
  const lastDateStr = String(entry.lastMealDate);

  const firstMeal = flatMeals.find((m) => m.date === firstDateStr && m.mealType === firstType);
  const lastMeal = flatMeals.find((m) => m.date === lastDateStr && m.mealType === lastType);

  if (!firstMeal || !lastMeal || firstMeal.sn > lastMeal.sn) {
    return {
      mealCost: 0,
      accCost: 0,
      acCost: 0,
      baseCost,
      baseCostLabel,
      lateFee: 0,
      entryCost: baseCost,
      totalCost: baseCost,
      daysOfStay: 0,
      mealCount: 0,
    };
  }

  // Sum meals within range
  let mealCost = 0;
  let mealCount = 0;
  const isFreeMeals = Boolean(roleWaiver?.free_meals);
  for (let i = firstMeal.sn; i <= lastMeal.sn; i++) {
    const meal = flatMeals.find((m) => m.sn === i);
    if (meal) {
      if (!isFreeMeals) {
        mealCost += meal.price;
      }
      mealCount++;
    }
  }

  // Days of stay calculation
  const daysOfStay = Math.max(1, Math.round((lastMeal.sn - firstMeal.sn + 1) / 3));

  // Accommodation Cost calculation
  let accCost = 0;
  const accConfig = camp.accommodation_pricing || { regular_daily: 120, peak_daily: 200, ac_charge: 0 };
  const wantsAcc = entry.accommodation === 'Yes';
  const isFreeAcc = Boolean(roleWaiver?.free_accommodation);

  if (wantsAcc && !isFreeAcc) {
    const peakStartIndex = accConfig.peak_start_date
      ? mealPricing.findIndex(m => m.date === accConfig.peak_start_date || m.label === accConfig.peak_start_date || (m.full_date && m.full_date === accConfig.peak_start_date))
      : -1;
    const peakEndIndex = accConfig.peak_end_date
      ? mealPricing.findIndex(m => m.date === accConfig.peak_end_date || m.label === accConfig.peak_end_date || (m.full_date && m.full_date === accConfig.peak_end_date))
      : -1;

    // Map each day's accommodation fee
    for (let d = firstMeal.dayIndex; d < firstMeal.dayIndex + daysOfStay && d < mealPricing.length; d++) {
      const dayConfig = mealPricing[d];
      const isPeakByRange = peakStartIndex !== -1 && d >= peakStartIndex && (peakEndIndex === -1 || d <= peakEndIndex);
      const isPeakByNumeric = (!isNaN(Number(dayConfig.date)) && !isNaN(Number(accConfig.peak_start_date)) && Number(dayConfig.date) >= Number(accConfig.peak_start_date) && Number(dayConfig.date) <= Number(accConfig.peak_end_date || '999'));
      const isPeak = Boolean(dayConfig.isPeak || isPeakByRange || isPeakByNumeric);
      accCost += isPeak ? (accConfig.peak_daily || 200) : (accConfig.regular_daily || 120);
    }
  }

  // Custom Facility / Miscellaneous Other Charges (Calculated on per-day basis or fixed one-time fee)
  let acCost = 0;
  const configuredFee = Number(accConfig.ac_charge ?? 0);
  const billingType = accConfig.ac_charge_billing_type || 'per_day';
  const appliesTo = accConfig.ac_charge_applies_to || 'accommodation';
  const isEligibleForCharge = appliesTo === 'all' ? !isFreeAcc : (wantsAcc && !isFreeAcc);

  if (configuredFee > 0 && isEligibleForCharge) {
    if (billingType === 'fixed') {
      acCost = configuredFee;
    } else {
      // Per day basis: charges per selected day of stay/meals
      const chargeDays = Math.max(1, daysOfStay);
      acCost = configuredFee * chargeDays;
    }
  }

  const lateFee = isLate ? Number(camp.late_fee || 0) : 0;
  const entryCost = mealCost + accCost + acCost + baseCost;
  const totalCost = entryCost + lateFee;

  return {
    mealCost,
    accCost,
    acCost,
    baseCost,
    baseCostLabel,
    lateFee,
    entryCost,
    totalCost,
    daysOfStay,
    mealCount,
  };
}

export const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a raw meal date string (e.g. "1", "28", "28 - Dec", "2026-12-28") into a human-friendly date with month (e.g. "28 Dec" or "28 Dec 2026").
 */
export function formatParticipantMealDate(
  dateVal: string | undefined,
  campStartDate?: string,
  mealPricing?: CampMealConfig[],
  includeYear: boolean = false
): string {
  if (!dateVal || typeof dateVal !== 'string') return '';
  const trimmed = dateVal.trim();
  if (!trimmed) return '';

  // 1. If it's an ISO date string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const mName = MONTH_NAMES_SHORT[m - 1] || '';
    return includeYear ? `${d} ${mName} ${y}` : `${d} ${mName}`;
  }

  // 2. If it contains day and month text (e.g. "28 - Dec", "4 Jan", "28-December")
  const match = trimmed.match(/(\d{1,2})\s*[-/]?\s*([A-Za-z]{3,9})/i);
  if (match) {
    const dNum = parseInt(match[1], 10);
    const mPrefix = match[2].slice(0, 3).toLowerCase();
    const mIdx = MONTH_NAMES_SHORT.findIndex((m) => m.toLowerCase() === mPrefix);
    if (mIdx >= 0) {
      let year = new Date().getFullYear();
      if (campStartDate) {
        const cd = new Date(campStartDate);
        if (!isNaN(cd.getTime())) {
          year = cd.getFullYear();
          if (cd.getMonth() > 9 && mIdx < 3) {
            year += 1;
          }
        }
      }
      return includeYear ? `${dNum} ${MONTH_NAMES_SHORT[mIdx]} ${year}` : `${dNum} ${MONTH_NAMES_SHORT[mIdx]}`;
    }
  }

  // 3. Search in mealPricing configs if available
  if (Array.isArray(mealPricing) && mealPricing.length > 0) {
    const found = mealPricing.find((m) =>
      String(m.date).trim() === trimmed ||
      String(m.label || '').trim() === trimmed ||
      String(m.full_date || '').trim() === trimmed
    );
    if (found) {
      if (found.full_date && /^\d{4}-\d{2}-\d{2}$/.test(found.full_date)) {
        const [y, m, d] = found.full_date.split('-').map(Number);
        const mName = MONTH_NAMES_SHORT[m - 1] || '';
        return includeYear ? `${d} ${mName} ${y}` : `${d} ${mName}`;
      }
      if (found.label) {
        const labelMatch = found.label.match(/(\d{1,2})\s*[-/]?\s*([A-Za-z]{3,9})/i);
        if (labelMatch) {
          const dNum = parseInt(labelMatch[1], 10);
          const mPrefix = labelMatch[2].slice(0, 3).toLowerCase();
          const mIdx = MONTH_NAMES_SHORT.findIndex((m) => m.toLowerCase() === mPrefix);
          if (mIdx >= 0) {
            let year = new Date().getFullYear();
            if (campStartDate) {
              const cd = new Date(campStartDate);
              if (!isNaN(cd.getTime())) {
                year = cd.getFullYear();
                if (cd.getMonth() > 9 && mIdx < 3) year += 1;
              }
            }
            return includeYear ? `${dNum} ${MONTH_NAMES_SHORT[mIdx]} ${year}` : `${dNum} ${MONTH_NAMES_SHORT[mIdx]}`;
          }
        }
      }
      const iso = parseMealDayToIso(found, campStartDate);
      if (iso) {
        const [y, m, d] = iso.split('-').map(Number);
        const mName = MONTH_NAMES_SHORT[m - 1] || '';
        return includeYear ? `${d} ${mName} ${y}` : `${d} ${mName}`;
      }
    }
  }

  // 4. Numeric day only fallback (e.g. "28" or "4")
  const numOnly = parseInt(trimmed, 10);
  if (!isNaN(numOnly) && numOnly >= 1 && numOnly <= 31 && campStartDate) {
    const cd = new Date(campStartDate);
    if (!isNaN(cd.getTime())) {
      let mIdx = cd.getMonth();
      let year = cd.getFullYear();
      const startDay = cd.getDate();
      // If the day number is smaller than the camp start day, it wrapped into the next month
      if (numOnly < startDay) {
        mIdx = (mIdx + 1) % 12;
        if (mIdx === 0) year += 1;
      }
      return includeYear ? `${numOnly} ${MONTH_NAMES_SHORT[mIdx]} ${year}` : `${numOnly} ${MONTH_NAMES_SHORT[mIdx]}`;
    }
  }

  return trimmed;
}

/**
 * Formats the participant's registered date range (e.g. "28 Dec 2026 - 4 Jan 2027" or "28 Dec - 4 Jan").
 * Falls back to camp dates if specific participant dates are not provided.
 */
export function formatParticipantDateRange(
  firstDateVal?: string,
  lastDateVal?: string,
  campStartDate?: string,
  campEndDate?: string,
  mealPricing?: CampMealConfig[],
  includeYear: boolean = true
): string {
  const startStr = formatParticipantMealDate(firstDateVal, campStartDate, mealPricing, false);
  const endStr = formatParticipantMealDate(lastDateVal, campStartDate, mealPricing, false);

  if (startStr && endStr) {
    if (startStr === endStr) {
      if (includeYear && campStartDate) {
        const yr = new Date(campStartDate).getFullYear();
        return `${startStr} ${yr}`;
      }
      return startStr;
    }

    if (includeYear) {
      let startYear = campStartDate ? new Date(campStartDate).getFullYear() : new Date().getFullYear();
      let endYear = startYear;
      if (campEndDate) {
        const ed = new Date(campEndDate);
        if (!isNaN(ed.getTime())) endYear = ed.getFullYear();
      }
      if (startStr.includes('Dec') && endStr.includes('Jan')) {
        endYear = startYear + 1;
      }
      if (startYear === endYear) {
        return `${startStr} - ${endStr} ${startYear}`;
      }
      return `${startStr} ${startYear} - ${endStr} ${endYear}`;
    }

    return `${startStr} - ${endStr}`;
  }

  if (startStr) return startStr;
  if (endStr) return endStr;

  // Fallback to full camp dates
  if (campStartDate && campEndDate) {
    const sDate = new Date(campStartDate);
    const eDate = new Date(campEndDate);
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
      return `${sDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - ${eDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  }
  return campStartDate ? new Date(campStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export function parseMealDayToIso(day: CampMealConfig, campStartDate?: string): string {
  if (day.full_date && /^\d{4}-\d{2}-\d{2}$/.test(day.full_date)) {
    return day.full_date;
  }
  const raw = `${day.label || ''} ${day.date || ''}`.trim();
  const match = raw.match(/(\d{1,2})\s*[-/]?\s*([A-Za-z]{3,9})/i);
  let year = new Date().getFullYear();
  if (campStartDate) {
    const cd = new Date(campStartDate);
    if (!isNaN(cd.getTime())) {
      year = cd.getFullYear();
    }
  }

  if (match) {
    const dNum = parseInt(match[1], 10);
    const mPrefix = match[2].slice(0, 3).toLowerCase();
    const mIdx = MONTH_NAMES_SHORT.findIndex((m) => m.toLowerCase() === mPrefix);
    if (mIdx >= 0) {
      if (campStartDate) {
        const cd = new Date(campStartDate);
        if (!isNaN(cd.getTime()) && cd.getMonth() > 9 && mIdx < 3) {
          year += 1;
        }
      }
      return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    }
  }

  const numOnly = parseInt(String(day.date), 10);
  if (!isNaN(numOnly) && campStartDate) {
    const cd = new Date(campStartDate);
    if (!isNaN(cd.getTime())) {
      const mIdx = cd.getMonth();
      return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(numOnly).padStart(2, '0')}`;
    }
  }

  return '';
}

export function getMealTimestamp(day: CampMealConfig, campStartDate?: string): number {
  const iso = parseMealDayToIso(day, campStartDate);
  if (iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (!isNaN(dt.getTime())) return dt.getTime();
  }
  const n = parseInt(String(day.date), 10);
  return isNaN(n) ? 0 : n;
}

export function sortMealDays(days: CampMealConfig[], campStartDate?: string): CampMealConfig[] {
  return [...days].sort((a, b) => {
    const tA = getMealTimestamp(a, campStartDate);
    const tB = getMealTimestamp(b, campStartDate);
    return tA - tB;
  });
}

export interface MealMatrixColumn {
  date: string;
  full_date?: string;
  label: string; // e.g. "24-Dec"
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export function buildMealMatrix(
  mealPricing: CampMealConfig[] = [],
  firstMealDate?: string,
  firstMealType?: string,
  lastMealDate?: string,
  lastMealType?: string,
  campStartDate?: string,
  campEndDate?: string
): MealMatrixColumn[] {
  let pricing = Array.isArray(mealPricing) && mealPricing.length > 0 ? mealPricing : [];
  
  if (pricing.length === 0 && campStartDate && campEndDate) {
    const startDt = new Date(campStartDate);
    const endDt = new Date(campEndDate);
    const curr = new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate());
    const stop = new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate());
    while (curr <= stop) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;
      pricing.push({
        date: dStr,
        full_date: dStr,
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        label: curr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      });
      curr.setDate(curr.getDate() + 1);
    }
  }

  if (pricing.length === 0) return [];

  interface FlatMeal {
    sn: number;
    date: string;
    mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  }

  const flatMeals: FlatMeal[] = [];
  let snCounter = 1;

  pricing.forEach((day) => {
    flatMeals.push({ sn: snCounter++, date: String(day.date), mealType: 'Breakfast' });
    flatMeals.push({ sn: snCounter++, date: String(day.date), mealType: 'Lunch' });
    flatMeals.push({ sn: snCounter++, date: String(day.date), mealType: 'Dinner' });
  });

  const isDateMatch = (day: CampMealConfig, targetDate?: string) => {
    if (!targetDate) return false;
    const t = String(targetDate).trim().toLowerCase();
    if (!t) return false;

    const dStr = String(day.date).trim().toLowerCase();
    const lStr = String(day.label || '').trim().toLowerCase();
    const fStr = String(day.full_date || '').trim().toLowerCase();

    if (dStr === t || lStr === t || fStr === t) return true;

    // Clean match (ignore hyphens, spaces)
    const cleanT = t.replace(/[\s\-_]/g, '');
    if (dStr.replace(/[\s\-_]/g, '') === cleanT || lStr.replace(/[\s\-_]/g, '') === cleanT) return true;

    // If target is just day number e.g. "28" or "1"
    const tNum = t.match(/^\d+/)?.[0];
    if (tNum) {
      if (fStr.endsWith(`-${tNum.padStart(2, '0')}`)) return true;
      const dNum = dStr.match(/^\d+/)?.[0];
      const lNum = lStr.match(/^\d+/)?.[0];
      if (dNum === tNum || lNum === tNum) {
        // If target has month letters, check if day label/date also matches month
        const tMonth = t.replace(/^\d+[\s\-_]*/, '').slice(0, 3);
        if (tMonth) {
          const dayText = (dStr + ' ' + lStr).toLowerCase();
          return dayText.includes(tMonth);
        }
        return true;
      }
    }
    return false;
  };

  const normType = (t?: string): 'Breakfast' | 'Lunch' | 'Dinner' => {
    const lower = (t || '').toLowerCase();
    if (lower.startsWith('b')) return 'Breakfast';
    if (lower.startsWith('l')) return 'Lunch';
    return 'Dinner';
  };

  const firstType = normType(firstMealType || 'Breakfast');
  const lastType = normType(lastMealType || 'Dinner');

  const firstDayIndex = firstMealDate
    ? pricing.findIndex((d) => isDateMatch(d, firstMealDate))
    : 0;

  const lastDayIndex = lastMealDate
    ? pricing.findIndex((d) => isDateMatch(d, lastMealDate))
    : pricing.length - 1;

  const validStartDay = firstDayIndex >= 0 ? firstDayIndex : 0;
  const validEndDay = lastDayIndex >= 0 ? lastDayIndex : pricing.length - 1;

  // The participant's matrix columns start on their arrival date and end on their departure date!
  const targetPricing = (validStartDay <= validEndDay)
    ? pricing.slice(validStartDay, validEndDay + 1)
    : pricing;

  const firstMeal = flatMeals.find((m) => {
    const day = pricing[validStartDay];
    return day && String(day.date) === m.date && m.mealType === firstType;
  });
  const lastMeal = flatMeals.find((m) => {
    const day = pricing[validEndDay];
    return day && String(day.date) === m.date && m.mealType === lastType;
  });

  const startSn = firstMeal ? firstMeal.sn : (validStartDay * 3 + 1);
  const endSn = lastMeal ? lastMeal.sn : ((validEndDay + 1) * 3);

  const validSet = new Set<number>();
  for (let i = startSn; i <= endSn; i++) {
    validSet.add(i);
  }

  return targetPricing.map((day) => {
    const dStr = String(day.date);
    const mB = flatMeals.find((m) => m.date === dStr && m.mealType === 'Breakfast');
    const mL = flatMeals.find((m) => m.date === dStr && m.mealType === 'Lunch');
    const mD = flatMeals.find((m) => m.date === dStr && m.mealType === 'Dinner');

    let fullDate = day.full_date;
    if (!fullDate || !/^\d{4}-\d{2}-\d{2}$/.test(fullDate)) {
      fullDate = parseMealDayToIso(day, campStartDate);
    }

    let label = (day.label || '').trim();
    if (!label || label.toLowerCase().includes('date') || /^\d+$/.test(label)) {
      const parsed = new Date(dStr);
      if (!isNaN(parsed.getTime())) {
        label = parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(/\s+/g, '-');
      } else {
        label = dStr;
      }
    } else {
      label = label.replace(/\s*-\s*/g, '-').replace(/\s+/g, '-');
    }

    return {
      date: dStr,
      full_date: fullDate,
      label,
      breakfast: mB ? validSet.has(mB.sn) : false,
      lunch: mL ? validSet.has(mL.sn) : false,
      dinner: mD ? validSet.has(mD.sn) : false,
    };
  });
}

export function checkCurrentMealEligibility(
  matrix: MealMatrixColumn[],
  now: Date = new Date()
): {
  currentSlot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Outside Meal Hours';
  slotDateStr: string;
  isEligible: boolean;
  message: string;
} {
  if (matrix.length === 0) {
    return {
      currentSlot: 'Outside Meal Hours',
      slotDateStr: '',
      isEligible: false,
      message: 'No meal schedule configured for this camp.',
    };
  }

  // Format today's date YYYY-MM-DD
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Time in hours
  const hours = now.getHours() + now.getMinutes() / 60;

  let currentSlot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Outside Meal Hours' = 'Outside Meal Hours';
  if (hours >= 5 && hours <= 10.75) {
    currentSlot = 'Breakfast';
  } else if (hours > 10.75 && hours <= 15.75) {
    currentSlot = 'Lunch';
  } else if (hours > 17 && hours <= 22.75) {
    currentSlot = 'Dinner';
  } else if (hours > 15.75 && hours <= 17) {
    currentSlot = 'Dinner'; // Upcoming dinner window
  } else {
    currentSlot = 'Breakfast'; // Morning upcoming
  }

  // Find column matching today's date or closest date
  const todayCol = matrix.find((m) => m.date === todayStr);

  if (!todayCol) {
    return {
      currentSlot,
      slotDateStr: todayStr,
      isEligible: false,
      message: `Today (${todayStr}) is not within the scheduled camp meal dates.`,
    };
  }

  const isEligible =
    currentSlot === 'Breakfast'
      ? todayCol.breakfast
      : currentSlot === 'Lunch'
      ? todayCol.lunch
      : todayCol.dinner;

  return {
    currentSlot,
    slotDateStr: todayStr,
    isEligible,
    message: isEligible
      ? `Devotee is eligible for ${currentSlot} Prasadam today!`
      : `Devotee's pass does NOT include ${currentSlot} on ${todayCol.label}.`,
  };
}
