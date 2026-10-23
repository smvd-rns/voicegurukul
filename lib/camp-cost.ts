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
