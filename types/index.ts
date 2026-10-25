export type UserRole =
  | 'vice_president'
  | 'president'
  | 'managing_director'
  | 'director'
  | 'central_voice_manager'
  | 'project_advisor'
  | 'project_manager'
  | 'acting_manager'
  | 'oc'
  | 'super_admin'
  | 'zonal_admin'
  | 'state_admin'
  | 'city_admin'
  | 'center_admin'
  | 'bc_voice_manager' // BC Voice Manager
  | 'voice_manager' // Voice Manager
  | 'senior_counselor'
  | 'counselor'
  | 'care_giver'
  | 'youth_preacher'
  | 'internal_manager'
  | 'preaching_coordinator'
  | 'morning_program_in_charge'
  | 'mentor'
  | 'frontliner'
  | 'accountant'
  | 'kitchen_head'
  | 'study_in_charge'
  | 'event_admin'
  | 'grihstha_counselor'
  | 'easy_incharge'
  | 'prerna_incharge'
  | 'student'
  | 1 // student
  | 2 // counselor
  | 3 // voice_manager
  | 4 // bc_voice_manager
  | 5 // city_admin
  | 6 // state_admin
  | 7 // zonal_admin
  | 8 // super_admin
  | 9 // vice_president
  | 10 // president
  | 11 // managing_director
  | 12 // director
  | 13 // central_voice_manager
  | 14 // project_advisor
  | 15 // project_manager
  | 16 // acting_manager
  | 17 // oc
  | 20 // care_giver
  | 21 // youth_preacher
  | 22 // internal_manager
  | 23 // preaching_coordinator
  | 24 // morning_program_in_charge
  | 25 // mentor
  | 26 // frontliner
  | 27 // accountant
  | 28 // kitchen_head
  | 29 // study_in_charge
  | 30 // event_admin
  | 31 // grihstha_counselor
  | 32 // easy_incharge
  | 33; // prerna_incharge

export type SpiritualLevel = 'beginner' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  email: string;
  name: string;
  verificationStatus?: 'incomplete' | 'pending' | 'approved' | 'rejected' | 'unverified';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  role: UserRole | UserRole[]; // Support both single role (backward compatible) and multiple roles
  phone?: string;
  profileImage?: string;
  aadharCardImage?: string;
  birthDate?: string;
  pushTokens?: string[];
  hierarchy: HierarchyLocation;
  // Camp completion fields
  campDys?: boolean;
  campSankalpa?: boolean;
  campSphurti?: boolean;
  campUtkarsh?: boolean;
  campSrcgdWorkshop?: boolean;
  campNishtha?: boolean;
  campFtec?: boolean;
  campAshraya?: boolean;
  campMtec?: boolean;
  campSharanagati?: boolean;
  campIdc?: boolean;
  campBhaktiShastri?: boolean;
  campPositiveThinker?: boolean;
  campSelfManager?: boolean;
  campProactiveLeader?: boolean;
  // SP Books Study Course fields
  spbookThirdSsr15?: boolean;
  spbookThirdComingBack?: boolean;
  spbookThirdPqpa?: boolean;
  spbookThirdMatchlessGift?: boolean;
  spbookThirdRajaVidya?: boolean;
  spbookThirdElevationKc?: boolean;
  spbookThirdBeyondBirthDeath?: boolean;
  spbookThirdKrishnaReservoir?: boolean;
  spbookFourthSsr68?: boolean;
  spbookFourthLawsOfNature?: boolean;
  spbookFourthDharma?: boolean;
  spbookFourthSecondChance?: boolean;
  spbookFourthIsopanishad110?: boolean;
  spbookFourthQueenKuntiVideo?: boolean;
  spbookFourthEnlightenmentNatural?: boolean;
  spbookFourthKrishnaBook121?: boolean;
  spbookFifthLifeFromLife?: boolean;
  spbookFifthPrahladTeachings?: boolean;
  spbookFifthJourneySelfDiscovery?: boolean;
  spbookFifthQueenKuntiHearing?: boolean;
  spbookFifthLordKapila?: boolean;
  spbookFifthNectar16?: boolean;
  spbookFifthGita16?: boolean;
  spbookFifthKrishnaBook2428?: boolean;
  spbookSixthNectar711?: boolean;
  spbookSixthPathPerfection?: boolean;
  spbookSixthCivilisationTranscendence?: boolean;
  spbookSixthHareKrishnaChallenge?: boolean;
  spbookSixthGita712?: boolean;
  spbookSixthSb1stCanto16?: boolean;
  spbookSixthKrishnaBook3559?: boolean;
  spbookSeventhGita1318?: boolean;
  spbookSeventhSb1stCanto713?: boolean;
  spbookSeventhKrishnaBook6378?: boolean;
  spbookEighthSb1stCanto1419?: boolean;
  spbookEighthKrishnaBook7889?: boolean;
  // Education fields (up to 5 entries)
  education?: EducationEntry[];
  // Work experience fields (up to 5 entries)
  workExperience?: WorkExperienceEntry[];
  // Language fields (up to 5 entries)
  languages?: LanguageEntry[];
  // Skills fields (up to 5 entries)
  skills?: SkillEntry[];
  // Services rendered fields (up to 5 entries)
  services?: ServiceEntry[];
  createdAt?: Date;
  updatedAt?: Date;
  // Temple and Center fields
  parentTemple?: string;
  parentCenter?: string;
  currentTemple?: string;
  currentCenter?: string;
  otherTemple?: string;
  otherCounselor?: string;
  otherCenter?: string;
  otherParentCenter?: string;
  introducedToKcIn?: string;
  // Relative contact fields
  relative1Name?: string;
  relative1Relationship?: string;
  relative1Phone?: string;
  relative2Name?: string;
  relative2Relationship?: string;
  relative2Phone?: string;
  relative3Name?: string;
  relative3Relationship?: string;
  relative3Phone?: string;
  // Health fields
  healthChronicDisease?: string;
  bv_group?: string;
}

export interface EducationEntry {
  institution: string;
  degreeBranch: string;
  startYear: number | null;
  endYear: number | null;
}

export interface WorkExperienceEntry {
  company: string;
  position: string;
  location: string;
  startDate: string | null; // ISO date string or null
  endDate: string | null; // ISO date string or null, null if current
  current: boolean; // true if currently working here
}

export interface LanguageEntry {
  name: string;
}

export interface SkillEntry {
  name: string;
}

export interface ServiceEntry {
  name: string;
}

export interface HierarchyLocation {
  [key: string]: any;
  zone?: string; // Geographic zone (for Zone Managers)
  state?: string;
  city?: string;
  center?: string;
  centerId?: string; // Center ID for accurate matching
  counselor?: string;
  counselorGroup?: string;
  brahmachariCounselor?: string;
  brahmachariCounselorEmail?: string;
  grihasthaCounselor?: string;
  grihasthaCounselorEmail?: string;
  counselorId?: string;
  counselor_id?: string;
  otherCounselor?: string;
  otherCenter?: string;
  // Fields for admin role assignments (which area they manage)
  assignedZone?: string; // For Zone Managers (role 7)
  assignedState?: string; // For State Managers (role 6)
  assignedCity?: string; // For City Managers (role 5)
  // New fields for extended location info
  currentTemple?: string;
  currentCenter?: string;
  otherTemple?: string;
  // Spiritual fields
  initiationStatus?: string;
  initiatedName?: string;
  spiritualMasterName?: string;
  aspiringSpiritualMasterName?: string;
  chantingSince?: string;
  rounds?: number;
  ashram?: string;
  royalMember?: boolean | string; // Allow string 'yes'/'no' for form handling
  introducedToKcIn?: string;
  parentTemple?: string;
  parentCenter?: string;
  otherParentCenter?: string;
  kcStatus?: 'Active' | 'Passive' | 'Dormant';
  bv_group?: string;
}

export interface SadhanaReport {
  id: string;
  userId: string;
  date: Date | string; // Date object or ISO string
  japa: number; // marks (0-10 per day, max 70 per week)
  hearing: number; // marks (0-10 per day, max 70 per week)
  reading: number; // marks (0-10 per day, max 70 per week)
  bookName?: string;
  toBed: number; // time or number
  wakeUp: number; // time or number
  dailyFilling: number;
  daySleep: number;
  study?: number;
  bodyPercent: number; // calculated weekly (Mon-Sun): (toBed + wakeUp + dailyFilling + daySleep) / 280 * 100
  soulPercent: number; // calculated weekly (Mon-Sun): (japa + hearing + reading) / 210 * 100
  submittedAt: Date;
  updatedAt?: Date;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientIds: string[];
  recipientGroups?: string[];
  hierarchyLevel?: {
    zone?: string;
    state?: string;
    city?: string;
    center?: string;
    counselorGroup?: string;
  };
  subject: string;
  content: string;
  attachments?: string[];
  priority: 'normal' | 'urgent';
  category: 'spiritual' | 'administrative' | 'events';
  readBy: string[];
  createdAt: Date;
  scheduledFor?: Date;
  isBroadcast?: boolean;
  senderRole?: number;
  pinnedBy?: string[];
}

export interface Group {
  id: string;
  name: string;
  type: 'geographic' | 'institutional' | 'mentorship' | 'special_interest';
  hierarchy: HierarchyLocation;
  memberIds: string[];
  adminIds: string[];
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location?: string;
  hierarchyLevel: HierarchyLocation;
  registeredUsers: string[];
  attendance?: string[];
  createdAt: Date;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'scripture' | 'lecture' | 'study_material' | 'guideline';
  url: string;
  spiritualLevel?: SpiritualLevel;
  tags: string[];
  createdAt: Date;
}

export interface ProgressMetrics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  chantingRoundsTotal: number;
  morningProgramAttendance: number;
  scriptureReadingHours: number;
  streak: number;
  milestones: string[];
  lastUpdated: Date;
}

export interface CounselorRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  counselorEmail: string;
  message?: string; // User's self-description message
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

export interface BCVoiceManagerRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject?: string; // Subject to distinguish from counselor requests
  message?: string; // User's self-description message
  requestedCenters?: string[]; // Array of center IDs/names requested by user
  approvedCenters?: string[]; // Array of center IDs/names approved by admin
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

export interface TempleData {
  id: string;
  name: string;
  state: string;
  city: string;
  address?: string; // Optional
  contact?: string; // Optional
  created_at?: string;
  updated_at?: string;
  managing_director_id?: string;
  managing_director_name?: string;
  director_id?: string;
  director_name?: string;
  central_voice_manager_id?: string;
  central_voice_manager_name?: string;
  yp_id?: string;
  yp_name?: string;
}

export interface ManagedEventAttachment {
  type: 'image' | 'audio' | 'video' | 'link' | 'file';
  url: string;
  name: string;
  file?: File; // For internal use during deferred uploads
  fileId?: string; // Google Drive ID
  mimeType?: string;
}

export interface ManagedEvent {
  id: string;
  type?: 'event' | 'announcement';
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  title: string;
  eventDate?: Date;
  message?: string;
  attachments: ManagedEventAttachment[];
  targetAshrams: string[];
  targetRoles: string[];
  targetTemples: string[];
  targetCenters: string[];
  targetCamps: string[];
  targetVoiceGroups?: string[];
  targetUserIds?: string[];
  excludedUserIds: string[];
  reachedUsers?: number;
  reachedCount?: number;
  comingCount?: number;
  seenCount?: number;
  understoodCount?: number;
  isImportant?: boolean;
  isImportantDismissed?: boolean;
  isPinned?: boolean;
  rsvpDeadline?: Date;
  guestCount?: number;
  totalGuestCount?: number;
  userResponse?: ManagedEventResponse;

  // Auto-reminder configuration
  autoReminderEnabled?: boolean;
  reminderDateTime?: Date;            // Specific date and time for the reminder
  reminderTarget?: ('no_reply' | 'seen')[];  // who to remind
  reminderSentAt?: Date;              // When the reminder was actually sent

  updatedAt: Date;
}

export interface ManagedEventResponse {
  id: string;
  eventId: string;
  userId: string;
  status: 'seen' | 'coming' | 'not_coming' | 'understood';
  reason?: string;
  guestCount?: number;
  isBulk: boolean;
  isPinned?: boolean;
  isImportantDismissed?: boolean;
  bulkAddedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampMealConfig {
  date: string; // e.g. "14" or "2026-04-14"
  label: string; // e.g. "14 - April"
  breakfast: number;
  lunch: number;
  dinner: number;
  isPeak?: boolean;
  full_date?: string; // e.g. "2026-10-29"
}

export interface CampAccommodationPricing {
  regular_daily: number; // e.g. 120
  peak_daily: number; // e.g. 200
  peak_start_date?: string; // e.g. "18"
  peak_end_date?: string; // e.g. "20"
  ac_charge: number; // Optional miscellaneous or other charge amount (₹)
  facility_charge_label?: string; // Custom label, e.g. "Other Charges", "AC Charge", "Hall Setup"
  allow_female_cv_accommodation?: boolean;
}

export interface CampRoleWaiver {
  role: string; // e.g. 'Volunteer', 'Mentor', 'Brahmachari'
  free_meals?: boolean;
  free_accommodation?: boolean;
  fixed_token_fee?: number | null; // e.g. 0 for full free, 100 for Brahmachari, or null for calculated
  notice_message?: string;
}

export interface CampCoupon {
  code: string; // e.g. 'STUDENT100', 'VOLUNTEERFREE'
  discount_type: 'PERCENT' | 'FLAT';
  discount_value: number; // e.g. 100 for 100%, 500 for ₹500
  description?: string;
  max_uses?: number | null; // e.g. 10 for first 10 users, null/0 for unlimited
  used_count?: number; // count of times redeemed
}

export interface CampTrackFee {
  track: string; // e.g. 'GS Camp - 1st Timer'
  fee: number; // e.g. 150
  label?: string; // e.g. 'Camp Booklet & Study Material'
}

export interface CampSpecialWaivers {
  brahmachari_fee: number; // e.g. 111 (backward compatibility)
  brahmachari_message?: string;
  role_waivers?: CampRoleWaiver[];
  coupons?: CampCoupon[];
  track_fees?: CampTrackFee[];
  base_registration_fee?: number;
  base_registration_fee_label?: string;
}

export interface CampIttBankDetails {
  account_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  branch_name?: string;
  upi_id?: string;
  instructions?: string;
}

export interface CampPaymentConfig {
  enable_razorpay: boolean;
  surcharge_percent: number; // e.g. 2.0
  enable_idt: boolean;
  idt_passcodes: string[];
  enable_itt?: boolean;
  itt_bank_details?: CampIttBankDetails;
  sheets_webhook_url?: string;
}

export interface CampRefundTier {
  id: string;
  cutoff_date: string; // YYYY-MM-DD or empty for fallback
  refund_percent: number; // e.g. 100, 50, 0
  label: string; // e.g. "Full Refund (100% of Base Fee)"
}

export interface CampRefundConfig {
  enable_refunds: boolean;
  refund_policy_rules: CampRefundTier[];
  refund_meals: boolean;
  refund_accommodation: boolean;
  refund_instructions?: string;
}

export interface CampRefundRequest {
  id: string;
  camp_id: string;
  registration_id?: string;
  group_id?: string;
  poc_name: string;
  poc_contact: string;
  email: string;
  cancellation_type: 'FULL' | 'PARTIAL_ATTENDEES' | 'PARTIAL_DAYS';
  cancelled_registrations: {
    reg_id: string;
    participant_name: string;
    camp_track: string;
    original_total: number;
    base_cost: number;
    meal_cost: number;
    acc_cost: number;
    refund_amount: number;
  }[];
  original_total_amount: number;
  refund_amount: number;
  breakdown: {
    base_fee_refund: number;
    meal_refund: number;
    acc_refund: number;
    non_refundable_fee?: number;
    tier_label?: string;
  };
  payout_type: 'UPI' | 'BANK';
  upi_id?: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  reason?: string;
  status: 'pending' | 'refunded' | 'rejected';
  admin_notes?: string;
  payout_txn_ref?: string;
  payout_date?: string;
  processed_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Camp {
  id: string;
  slug: string;
  title: string;
  description?: string;
  venue?: string;
  status: 'draft' | 'active' | 'closed' | 'completed' | 'archived';
  start_date: string;
  end_date: string;
  registration_start_date?: string;
  late_fee_start_date?: string;
  registration_deadline?: string;
  late_fee: number;
  tracks: string[];
  participant_types: string[];
  meal_pricing: CampMealConfig[];
  accommodation_pricing: CampAccommodationPricing;
  special_waivers: CampSpecialWaivers;
  payment_config: CampPaymentConfig;
  refund_config?: CampRefundConfig;
  created_at?: string;
  updated_at?: string;
}

export interface CampRegistration {
  id?: string;
  camp_id: string;
  group_id?: string;
  poc_name: string;
  poc_contact: string;
  email: string;
  parent_temple?: string;
  voice_name?: string;
  participant_name: string;
  whatsapp: string;
  counselor_name?: string;
  gender: string;
  age?: number;
  married_since_year?: number;
  camp_track: string;
  participant_type: string;
  first_meal_date: string;
  first_meal_type: string;
  last_meal_date: string;
  last_meal_type: string;
  dinner_type?: string;
  accommodation: string;
  meal_cost: number;
  acc_cost: number;
  ac_cost: number;
  late_fee: number;
  entry_cost: number;
  total_cost: number;
  discount_amount?: number;
  coupon_code?: string;
  payment_method: 'RAZORPAY' | 'IDT' | 'FREE' | 'CASH' | 'COUPON' | 'ROLE_WAIVER' | 'INTER_TEMPLE_TRANSFER' | 'ITT';
  payment_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_id?: string;
  order_id?: string;
  deduction_source?: string;
  passcode?: string;
  payment_screenshot_url?: string;
  transaction_ref?: string;
  verified_at?: string;
  verified_by?: string;
  payment_date?: string;
  is_cancelled?: boolean;
  cancellation_id?: string;
  checked_in?: boolean;
  checked_in_at?: string;
  meals_served?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

export interface CampAdminAllocation {
  id: string;
  user_id: string;
  camp_id: string;
  permission_type: 'attendance' | 'refunds' | 'both' | 'scan_pass';
  assigned_by?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  camp_title?: string;
}

export interface CampAuditTransaction {
  txn_id: string;
  camp_id: string;
  camp_title: string;
  camp_slug: string;
  poc_name: string;
  poc_contact: string;
  email: string;
  payment_method: string;
  payment_status: string;
  payment_id?: string;
  order_id?: string;
  deduction_source?: string;
  passcode?: string;
  payment_screenshot_url?: string;
  verified_at?: string;
  verified_by?: string;
  created_at: string;
  participant_count: number;
  total_amount: number;
  total_meal_cost: number;
  total_acc_cost: number;
  total_discount: number;
  coupon_code?: string;
  participants: Array<{
    id: string;
    participant_name: string;
    whatsapp: string;
    camp_track: string;
    participant_type: string;
    gender: string;
    voice_name?: string;
    parent_temple?: string;
    counselor_name?: string;
    accommodation?: string;
    first_meal_date?: string;
    first_meal_type?: string;
    last_meal_date?: string;
    last_meal_type?: string;
    total_cost: number;
    meal_cost: number;
    acc_cost: number;
    is_cancelled?: boolean;
    payment_status?: string;
  }>;
  refund?: CampRefundRequest | null;
}

export interface CampAuditStats {
  total_gross_fee: number;
  total_discounts: number;
  total_coupons_count: number;
  total_collected: number;
  total_refunded: number;
  net_revenue: number;
  total_transactions: number;
  total_participants: number;
  pending_verifications: number;
  pending_refunds: number;
}
