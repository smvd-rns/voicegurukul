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
    // Map each day's accommodation fee
    for (let d = firstMeal.dayIndex; d < firstMeal.dayIndex + daysOfStay && d < mealPricing.length; d++) {
      const dayConfig = mealPricing[d];
      const isPeak = dayConfig.isPeak || (accConfig.peak_start_date && Number(dayConfig.date) >= Number(accConfig.peak_start_date) && Number(dayConfig.date) <= Number(accConfig.peak_end_date || '999'));
      accCost += isPeak ? (accConfig.peak_daily || 200) : (accConfig.regular_daily || 120);
    }
  }

  // Custom Facility / Other Charges
  let acCost = 0;
  const configuredFee = Number(accConfig.ac_charge ?? 0);
  if (configuredFee > 0 && wantsAcc && !isFreeAcc) {
    if (accConfig.peak_start_date) {
      const peakStart = Number(accConfig.peak_start_date);
      const lastDateNum = parseInt(lastDateStr, 10);
      if (!isNaN(lastDateNum) && !isNaN(peakStart) && lastDateNum >= peakStart) {
        acCost = configuredFee;
      }
    } else {
      acCost = configuredFee;
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

  const normType = (t?: string): 'Breakfast' | 'Lunch' | 'Dinner' => {
    const lower = (t || '').toLowerCase();
    if (lower.startsWith('b')) return 'Breakfast';
    if (lower.startsWith('l')) return 'Lunch';
    return 'Dinner';
  };

  const firstType = normType(firstMealType || 'Breakfast');
  const lastType = normType(lastMealType || 'Dinner');
  const firstDateStr = String(firstMealDate || pricing[0]?.date || '');
  const lastDateStr = String(lastMealDate || pricing[pricing.length - 1]?.date || '');

  const firstMeal = flatMeals.find((m) => m.date === firstDateStr && m.mealType === firstType);
  const lastMeal = flatMeals.find((m) => m.date === lastDateStr && m.mealType === lastType);

  const startSn = firstMeal ? firstMeal.sn : 1;
  const endSn = lastMeal ? lastMeal.sn : flatMeals.length;

  const validSet = new Set<number>();
  for (let i = startSn; i <= endSn; i++) {
    validSet.add(i);
  }

  return pricing.map((day) => {
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
