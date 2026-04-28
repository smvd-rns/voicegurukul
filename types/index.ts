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
  | 30; // event_admin

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
  userResponse?: ManagedEventResponse;

  updatedAt: Date;
}

export interface ManagedEventResponse {
  id: string;
  eventId: string;
  userId: string;
  status: 'seen' | 'coming' | 'not_coming' | 'understood';
  reason?: string;
  isBulk: boolean;
  isPinned?: boolean;
  isImportantDismissed?: boolean;
  bulkAddedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
