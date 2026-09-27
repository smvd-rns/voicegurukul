import { User, UserRole, EducationEntry, WorkExperienceEntry, LanguageEntry, SkillEntry, ServiceEntry } from '@/types';
import { normalizeRoleFromFirestore } from '@/lib/utils/roles';

/**
 * Transforms raw database user data (potentially including joined profile details) 
 * into a consistent User object used by the frontend.
 */
export const transformUserProfile = (data: any): User => {
  // Convert role numbers back to role names
  const normalizedRole = normalizeRoleFromFirestore(data.role);

  const details = Array.isArray(data.user_profile_details) 
    ? data.user_profile_details[0] 
    : data.user_profile_details;

  // Build hierarchy object from separate columns (preferred) or JSONB (fallback)
  const hierarchy = {
    state: data.state || data.hierarchy?.state,
    city: data.city || data.hierarchy?.city,
    center: data.center || data.hierarchy?.center,
    centerId: data.center_id || data.hierarchy?.centerId,
    // Spiritual fields from separate columns
    initiationStatus: data.initiation_status || data.hierarchy?.initiationStatus,
    initiatedName: data.initiated_name || data.hierarchy?.initiatedName,
    spiritualMasterName: data.spiritual_master_name || data.hierarchy?.spiritualMasterName,
    aspiringSpiritualMasterName: data.aspiring_spiritual_master_name || data.hierarchy?.aspiringSpiritualMasterName,
    chantingSince: data.chanting_since || data.hierarchy?.chantingSince,
    rounds: data.rounds?.toString() || data.hierarchy?.rounds,
    ashram: data.ashram || data.hierarchy?.ashram,
    counselor: data.counselor || data.hierarchy?.counselor,
    counselorId: data.counselor_id || data.hierarchy?.counselorId,
    royalMember: data.royal_member || data.hierarchy?.royalMember,
    introducedToKcIn: data.introduced_to_kc_in || data.hierarchy?.introducedToKcIn,
    parentTemple: data.parent_temple || data.hierarchy?.parentTemple,
    otherParentTemple: data.other_parent_temple || data.hierarchy?.otherParentTemple,
    parentCenter: data.parent_center || data.hierarchy?.parentCenter,
    currentTemple: data.current_temple || data.hierarchy?.currentTemple,
    currentCenter: data.current_center || data.hierarchy?.currentCenter,
    brahmachariCounselor: data.brahmachari_counselor || data.hierarchy?.brahmachariCounselor,
    brahmachariCounselorEmail: data.brahmachari_counselor_email || data.hierarchy?.brahmachariCounselorEmail,
    grihasthaCounselor: data.grihastha_counselor || data.hierarchy?.grihasthaCounselor,
    grihasthaCounselorEmail: data.grihastha_counselor_email || data.hierarchy?.grihasthaCounselorEmail,
    otherCounselor: data.other_counselor || data.hierarchy?.otherCounselor,
    otherCenter: data.other_center || data.hierarchy?.otherCenter,
    otherParentCenter: data.other_parent_center || data.hierarchy?.otherParentCenter,
    // Assigned geographic areas for manager roles
    assignedZone: data.assigned_zone || data.hierarchy?.assignedZone,
    assignedState: data.assigned_state || data.hierarchy?.assignedState,
    assignedCity: data.assigned_city || data.hierarchy?.assignedCity,
  };

  const rawBirthDate = data.birth_date || data.birthDate || details?.birth_date || details?.birthDate || data.hierarchy?.birthDate || data.hierarchy?.birth_date;
  const formattedBirthDate = (() => {
    if (!rawBirthDate) return undefined;
    if (typeof rawBirthDate === 'string') {
      const trimmed = rawBirthDate.trim();
      // Plain date string like "1996-03-15" — use directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      // ISO timestamp from pg DATE column (e.g. "1996-03-14T18:30:00.000Z")
      // Must parse and use LOCAL date parts (not UTC) because pg creates the Date
      // at local midnight, which shifts to previous UTC day on UTC+ servers like IST.
      if (trimmed.includes('T')) {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      // Fallback: extract date part before T
      const datePart = trimmed.split('T')[0].split(' ')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    }
    try {
      const d = new Date(rawBirthDate);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {}
    return String(rawBirthDate);
  })();

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    verificationStatus: data.verification_status,
    rejectionReason: data.rejection_reason,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    role: normalizedRole,
    phone: data.phone,
    profileImage: data.profile_image,
    aadharCardImage: data.aadhar_card_image,
    birthDate: formattedBirthDate,
    hierarchy: hierarchy,
    // Relative contact fields
    relative1Name: data.relative_1_name,
    relative1Relationship: data.relative_1_relationship,
    relative1Phone: data.relative_1_phone,
    relative2Name: data.relative_2_name,
    relative2Relationship: data.relative_2_relationship,
    relative2Phone: data.relative_2_phone,
    relative3Name: data.relative_3_name,
    relative3Relationship: data.relative_3_relationship,
    relative3Phone: data.relative_3_phone,
    // Health fields
    healthChronicDisease: data.health_chronic_disease,
    
    // Camp completion fields (Strictly from user_profile_details)
    campDys: details?.camp_dys ?? false,
    campSankalpa: details?.camp_sankalpa ?? false,
    campSphurti: details?.camp_sphurti ?? false,
    campUtkarsh: details?.camp_utkarsh ?? false,
    campSrcgdWorkshop: details?.camp_srcgd_workshop ?? false,
    campNishtha: (details?.camp_nishtha ?? details?.camp_nistha) ?? false,
    campFtec: details?.camp_ftec ?? false,
    campAshraya: (details?.camp_ashraya ?? details?.camp_ashray) ?? false,
    campMtec: details?.camp_mtec ?? false,
    campSharanagati: details?.camp_sharanagati ?? false,
    campIdc: details?.camp_idc ?? false,
    campBhaktiShastri: details?.camp_bhakti_shastri ?? false,
    campPositiveThinker: details?.camp_positive_thinker ?? false,
    campSelfManager: details?.camp_self_manager ?? false,
    campProactiveLeader: details?.camp_proactive_leader ?? false,
    
    // SP Books Study Course fields (Strictly from user_profile_details)
    spbookThirdSsr15: details?.spbook_third_ssr_1_5 ?? false,
    spbookThirdComingBack: details?.spbook_third_coming_back ?? false,
    spbookThirdPqpa: details?.spbook_third_pqpa ?? false,
    spbookThirdMatchlessGift: details?.spbook_third_matchless_gift ?? false,
    spbookThirdRajaVidya: details?.spbook_third_raja_vidya ?? false,
    spbookThirdElevationKc: details?.spbook_third_elevation_kc ?? false,
    spbookThirdBeyondBirthDeath: details?.spbook_third_beyond_birth_death ?? false,
    spbookThirdKrishnaReservoir: details?.spbook_third_krishna_reservoir ?? false,
    spbookFourthSsr68: details?.spbook_fourth_ssr_6_8 ?? false,
    spbookFourthLawsOfNature: details?.spbook_fourth_laws_of_nature ?? false,
    spbookFourthDharma: details?.spbook_fourth_dharma ?? false,
    spbookFourthSecondChance: details?.spbook_fourth_second_chance ?? false,
    spbookFourthIsopanishad110: details?.spbook_fourth_isopanishad_1_10 ?? false,
    spbookFourthQueenKuntiVideo: details?.spbook_fourth_queen_kunti_video ?? false,
    spbookFourthEnlightenmentNatural: details?.spbook_fourth_enlightenment_natural ?? false,
    spbookFourthKrishnaBook121: details?.spbook_fourth_krishna_book_1_21 ?? false,
    spbookFifthLifeFromLife: details?.spbook_fifth_life_from_life ?? false,
    spbookFifthPrahladTeachings: details?.spbook_fifth_prahlad_teachings ?? false,
    spbookFifthJourneySelfDiscovery: details?.spbook_fifth_journey_self_discovery ?? false,
    spbookFifthQueenKuntiHearing: details?.spbook_fifth_queen_kunti_hearing ?? false,
    spbookFifthLordKapila: details?.spbook_fifth_lord_kapila ?? false,
    spbookFifthNectar16: details?.spbook_fifth_nectar_1_6 ?? false,
    spbookFifthGita16: details?.spbook_fifth_gita_1_6 ?? false,
    spbookFifthKrishnaBook2428: details?.spbook_fifth_krishna_book_24_28 ?? false,
    spbookSixthNectar711: details?.spbook_sixth_nectar_7_11 ?? false,
    spbookSixthPathPerfection: details?.spbook_sixth_path_perfection ?? false,
    spbookSixthCivilisationTranscendence: details?.spbook_sixth_civilisation_transcendence ?? false,
    spbookSixthHareKrishnaChallenge: details?.spbook_sixth_hare_krishna_challenge ?? false,
    spbookSixthGita712: details?.spbook_sixth_gita_7_12 ?? false,
    spbookSixthSb1stCanto16: details?.spbook_sixth_sb_1st_canto_1_6 ?? false,
    spbookSixthKrishnaBook3559: details?.spbook_sixth_krishna_book_35_59 ?? false,
    spbookSeventhGita1318: details?.spbook_seventh_gita_13_18 ?? false,
    spbookSeventhSb1stCanto713: details?.spbook_seventh_sb_1st_canto_7_13 ?? false,
    spbookSeventhKrishnaBook6378: details?.spbook_seventh_krishna_book_63_78 ?? false,
    spbookEighthSb1stCanto1419: details?.spbook_eighth_sb_1st_canto_14_19 ?? false,
    spbookEighthKrishnaBook7889: details?.spbook_eighth_krishna_book_78_89 ?? false,

    // Education fields (Strictly from user_profile_details flat columns)
    education: (() => {
      const eduArray: EducationEntry[] = [];
      if (!details) return undefined;
      for (let i = 1; i <= 5; i++) {
        const inst = details[`edu_${i}_institution`] as string | undefined;
        const degreeBranch = (details[`edu_${i}_degree_branch`] || details[`edu_${i}_field`]);
        const startYear = details[`edu_${i}_start_year`] as number | undefined;
        const endYear = (details[`edu_${i}_end_year`] || details[`edu_${i}_year`]);
        if (inst || degreeBranch) {
          eduArray.push({
            institution: inst || '',
            degreeBranch: degreeBranch || '',
            startYear: startYear || null,
            endYear: endYear || null,
          });
        }
      }
      return eduArray.length > 0 ? eduArray : undefined;
    })(),

    // Work experience fields (Strictly from user_profile_details flat columns)
    workExperience: (() => {
      const workArray: WorkExperienceEntry[] = [];
      if (!details) return undefined;
      for (let i = 1; i <= 5; i++) {
        const company = details[`work_${i}_company`] as string | undefined;
        const position = details[`work_${i}_position`] as string | undefined;
        const location = details[`work_${i}_location`] as string | undefined;
        const startDate = details[`work_${i}_start_date`] as string | undefined;
        const endDate = details[`work_${i}_end_date`] as string | undefined;
        const current = details[`work_${i}_current`] as boolean | undefined;
        if (company || position) {
          workArray.push({
            company: company || '',
            position: position || '',
            location: location || '',
            startDate: startDate || null,
            endDate: endDate || null,
            current: current || false,
          });
        }
      }
      return workArray.length > 0 ? workArray : undefined;
    })(),

    // Language fields (Strictly from user_profile_details flat columns)
    languages: (() => {
      const langArray: LanguageEntry[] = [];
      if (!details) return undefined;
      for (let i = 1; i <= 5; i++) {
        const name = details[`language_${i}`] as string | undefined;
        if (name && name.trim()) {
          langArray.push({ name: name.trim() });
        }
      }
      return langArray.length > 0 ? langArray : undefined;
    })(),

    // Skills fields (Strictly from user_profile_details flat columns)
    skills: (() => {
      const skillArray: SkillEntry[] = [];
      if (!details) return undefined;
      for (let i = 1; i <= 5; i++) {
        const name = details[`skill_${i}`] as string | undefined;
        if (name && name.trim()) {
          skillArray.push({ name: name.trim() });
        }
      }
      return skillArray.length > 0 ? skillArray : undefined;
    })(),

    // Services rendered fields (Strictly from user_profile_details flat columns)
    services: (() => {
      const serviceArray: ServiceEntry[] = [];
      if (!details) return undefined;
      for (let i = 1; i <= 5; i++) {
        const name = details[`service_${i}`] as string | undefined;
        if (name && name.trim()) {
          serviceArray.push({ name: name.trim() });
        }
      }
      return serviceArray.length > 0 ? serviceArray : undefined;
    })(),

    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  } as User;
};
