'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';

import { Plus, X, Save, User, Mail, Phone, Users, BookOpen, GraduationCap, Briefcase, Calendar, Check, AlertTriangle, Clock, AlertCircle, Info, MessageCircle } from 'lucide-react';
import { validateEmail, isValidName, validateMobile, validateTextInput, validatePhone, sanitizeTextInput, sanitizeInput, validateEducationField, validateWorkField } from '@/lib/utils/validation';
import PhotoUpload from '@/components/ui/PhotoUpload';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { getSmallThumbnailUrl } from '@/lib/utils/google-drive';
import { EducationEntry, WorkExperienceEntry, LanguageEntry, SkillEntry, ServiceEntry } from '@/types';
import { SPIRITUAL_MASTERS } from '@/lib/utils/spiritual-masters';

export default function ProfilePage() {
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [counselors, setCounselors] = useState<Array<{ id: string; name: string; email: string; user_id?: string; current_temple?: string; parent_temple?: string }>>([]);
  const [allCounselors, setAllCounselors] = useState<Array<{ id: string; name: string; email: string; user_id?: string; current_temple?: string; parent_temple?: string }>>([]);
  const [loadingCounselors, setLoadingCounselors] = useState(true);
  const [temples, setTemples] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingTemples, setLoadingTemples] = useState(true);
  const [centers, setCenters] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [parentCenters, setParentCenters] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingParentCenters, setLoadingParentCenters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  // Track if form has unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const isInitializedRef = useRef(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    state: '',
    city: '',
    center: '',
    centerId: '', // Store center ID along with center name
    // Spiritual fields
    initiationStatus: '' as 'initiated' | 'aspiring' | '',
    initiatedName: '',
    spiritualMasterName: '',
    aspiringSpiritualMasterName: '',


    introducedToKcIn: '',
    rounds: '',
    parentTemple: '',
    otherParentTemple: '',
    parentCenter: '',
    currentTemple: '',
    currentCenter: '',
    counselor: '',
    counselorId: '',
    otherCounselor: '',
    ashram: '',
    otherCenter: '',
    otherParentCenter: '',
    // Relative contact info
    relative1Name: '',
    relative1Relationship: '',
    relative1Phone: '',
    relative2Name: '',
    relative2Relationship: '',
    relative2Phone: '',
    relative3Name: '',
    relative3Relationship: '',
    relative3Phone: '',
    // Health info
    healthChronicDisease: '',

    // Camp completion fields
    campDys: false,
    campSankalpa: false,
    campSphurti: false,
    campUtkarsh: false,
    campSrcgdWorkshop: false,
    campNishtha: false,
    campFtec: false,
    campAshraya: false,
    campMtec: false,
    campSharanagati: false,
    campIdc: false,
    campBhaktiShastri: false,
    campPositiveThinker: false,
    campSelfManager: false,
    campProactiveLeader: false,
    aadharCardImage: '',
    // SP Books Study Course fields (Third Semester)
    spbookThirdSsr15: false,
    spbookThirdComingBack: false,
    spbookThirdPqpa: false,
    spbookThirdMatchlessGift: false,
    spbookThirdRajaVidya: false,
    spbookThirdElevationKc: false,
    spbookThirdBeyondBirthDeath: false,
    spbookThirdKrishnaReservoir: false,
    // SP Books Study Course fields (Fourth Semester)
    spbookFourthSsr68: false,
    spbookFourthLawsOfNature: false,
    spbookFourthDharma: false,
    spbookFourthSecondChance: false,
    spbookFourthIsopanishad110: false,
    spbookFourthQueenKuntiVideo: false,
    spbookFourthEnlightenmentNatural: false,
    spbookFourthKrishnaBook121: false,
    // SP Books Study Course fields (Fifth Semester)
    spbookFifthLifeFromLife: false,
    spbookFifthPrahladTeachings: false,
    spbookFifthJourneySelfDiscovery: false,
    spbookFifthQueenKuntiHearing: false,
    spbookFifthLordKapila: false,
    spbookFifthNectar16: false,
    spbookFifthGita16: false,
    spbookFifthKrishnaBook2428: false,
    // SP Books Study Course fields (Sixth Semester)
    spbookSixthNectar711: false,
    spbookSixthPathPerfection: false,
    spbookSixthCivilisationTranscendence: false,
    spbookSixthHareKrishnaChallenge: false,
    spbookSixthGita712: false,
    spbookSixthSb1stCanto16: false,
    spbookSixthKrishnaBook3559: false,
    // SP Books Study Course fields (Seventh Semester)
    spbookSeventhGita1318: false,
    spbookSeventhSb1stCanto713: false,
    spbookSeventhKrishnaBook6378: false,
    // SP Books Study Course fields (Eighth Semester)
    spbookEighthSb1stCanto1419: false,
    spbookEighthKrishnaBook7889: false,
  });

  // Education and Work Experience arrays
  const [education, setEducation] = useState<EducationEntry[]>([
    { institution: '', degreeBranch: '', startYear: null, endYear: null }
  ]);
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([
    { company: '', position: '', location: '', startDate: null, endDate: null, current: false }
  ]);
  // Language, Skills, and Services arrays
  const [languages, setLanguages] = useState<LanguageEntry[]>([
    { name: '' }
  ]);
  const [skills, setSkills] = useState<SkillEntry[]>([
    { name: '' }
  ]);
  const [services, setServices] = useState<ServiceEntry[]>([
    { name: '' }
  ]);

  // Profile Image State
  const [profileImage, setProfileImage] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [aadharImage, setAadharImage] = useState('');
  const [selectedAadharPhoto, setSelectedAadharPhoto] = useState<File | null>(null);

  const [mounted, setMounted] = useState(false);


  // Animation observer for scroll-triggered animations
  useEffect(() => {
    setMounted(true);
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Set initialized to true after a delay to allow initial data population
    // This prevents isDirty from becoming true on initial load
    setTimeout(() => {
      isInitializedRef.current = true;
    }, 1500);

    setTimeout(() => {
      const animatedElements = document.querySelectorAll('.animate-on-scroll');
      animatedElements.forEach((el) => observer.observe(el));
    }, 100);

    return () => observer.disconnect();
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 10000); // Increased to 10 seconds for readability
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});



  // Detect unsaved changes with deep comparison
  useEffect(() => {
    if (!isInitializedRef.current || !userData) return;

    const checkChanges = () => {
      // Helper to normalize values for comparison
      const normalize = (val: any) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'boolean') return val;
        return String(val).trim();
      };

      // 1. Compare basic fields
      if (normalize(formData.name) !== normalize(userData.name)) return true;
      if (normalize(formData.email) !== normalize(userData.email)) return true;
      if (normalize(formData.phone) !== normalize(userData.phone)) return true;
      if (normalize(formData.birthDate) !== normalize(userData.birthDate)) return true;

      // 2. Compare hierarchy/location fields
      if (normalize(formData.state) !== normalize(userData.hierarchy?.state)) return true;
      if (normalize(formData.city) !== normalize(userData.hierarchy?.city)) return true;

      const currentCenter = (userData.hierarchy?.center === 'Other' && userData.hierarchy?.otherCenter)
        ? userData.hierarchy.otherCenter
        : (userData.hierarchy?.center || '');
      if (normalize(formData.center) !== normalize(currentCenter)) return true;

      // 3. Compare spiritual fields
      if (normalize(formData.initiationStatus) !== normalize(userData.hierarchy?.initiationStatus)) return true;
      if (normalize(formData.initiatedName) !== normalize(userData.hierarchy?.initiatedName)) return true;
      if (normalize(formData.spiritualMasterName) !== normalize(userData.hierarchy?.spiritualMasterName)) return true;
      if (normalize(formData.aspiringSpiritualMasterName) !== normalize(userData.hierarchy?.aspiringSpiritualMasterName)) return true;
      if (normalize(formData.ashram) !== normalize(userData.hierarchy?.ashram)) return true;
      if (normalize(formData.introducedToKcIn) !== normalize(userData.hierarchy?.introducedToKcIn)) return true;
      if (normalize(formData.rounds) !== normalize(userData.hierarchy?.rounds)) return true;
      if (normalize(formData.parentTemple) !== normalize(userData.hierarchy?.parentTemple)) return true;
      if (normalize(formData.parentCenter) !== normalize(userData.hierarchy?.parentCenter)) return true;
      if (normalize(formData.otherParentCenter) !== normalize(userData.hierarchy?.otherParentCenter)) return true;
      if (normalize(formData.currentTemple) !== normalize(userData.hierarchy?.currentTemple)) return true;
      if (normalize(formData.currentCenter) !== normalize(userData.hierarchy?.currentCenter || userData.hierarchy?.center)) return true;
      if (normalize(formData.counselor) !== normalize(userData.hierarchy?.counselor)) return true;
      if (normalize(formData.counselorId) !== normalize(userData.hierarchy?.counselorId)) return true;
      if (normalize(formData.otherCounselor) !== normalize(userData.otherCounselor || userData.hierarchy?.otherCounselor)) return true;
      if (normalize(formData.otherCenter) !== normalize(userData.otherCenter || userData.hierarchy?.otherCenter)) return true;

      // 4. Compare Relative Contact & Health Info
      if (normalize(formData.relative1Name) !== normalize(userData.relative1Name)) return true;
      if (normalize(formData.relative1Relationship) !== normalize(userData.relative1Relationship)) return true;
      if (normalize(formData.relative1Phone) !== normalize(userData.relative1Phone)) return true;
      if (normalize(formData.relative2Name) !== normalize(userData.relative2Name)) return true;
      if (normalize(formData.relative2Relationship) !== normalize(userData.relative2Relationship)) return true;
      if (normalize(formData.relative2Phone) !== normalize(userData.relative2Phone)) return true;
      if (normalize(formData.relative3Name) !== normalize(userData.relative3Name)) return true;
      if (normalize(formData.relative3Relationship) !== normalize(userData.relative3Relationship)) return true;
      if (normalize(formData.relative3Phone) !== normalize(userData.relative3Phone)) return true;
      if (normalize(formData.healthChronicDisease) !== normalize(userData.healthChronicDisease)) return true;

      // 5. Compare Array Fields
      const compareArrays = (arr1: any[], arr2?: any[]) => {
        const filtered1 = arr1.filter(item => Object.values(item).some(v => v !== null && v !== '' && v !== false));
        const filtered2 = arr2?.filter(item => Object.values(item).some(v => v !== null && v !== '' && v !== false)) || [];
        if (filtered1.length !== filtered2.length) return true;
        for (let i = 0; i < filtered1.length; i++) {
          const keys = Object.keys(filtered1[i]);
          for (const key of keys) {
            if (normalize(filtered1[i][key]) !== normalize(filtered2[i][key])) return true;
          }
        }
        return false;
      };

      if (compareArrays(education, userData.education)) return true;
      if (compareArrays(workExperience, userData.workExperience)) return true;
      if (compareArrays(languages, userData.languages)) return true;
      if (compareArrays(skills, userData.skills)) return true;
      if (compareArrays(services, userData.services)) return true;

      // 6. Compare Camps
      if (formData.campDys !== (userData.campDys || userData.hierarchy?.campDys || false)) return true;
      if (formData.campSankalpa !== (userData.campSankalpa || false)) return true;
      if (formData.campSphurti !== (userData.campSphurti || false)) return true;
      if (formData.campUtkarsh !== (userData.campUtkarsh || false)) return true;
      if (formData.campSrcgdWorkshop !== (userData.campSrcgdWorkshop || false)) return true;
      if (formData.campNishtha !== (userData.campNishtha || false)) return true;
      if (formData.campFtec !== (userData.campFtec || false)) return true;
      if (formData.campAshraya !== (userData.campAshraya || false)) return true;
      if (formData.campMtec !== (userData.campMtec || false)) return true;
      if (formData.campSharanagati !== (userData.campSharanagati || false)) return true;
      if (formData.campIdc !== (userData.campIdc || false)) return true;
      if (formData.campBhaktiShastri !== (userData.campBhaktiShastri || false)) return true;
      if (formData.campPositiveThinker !== (userData.campPositiveThinker || false)) return true;
      if (formData.campSelfManager !== (userData.campSelfManager || false)) return true;
      if (formData.campProactiveLeader !== (userData.campProactiveLeader || false)) return true;

      // 7. Compare SP Books Course
      if (formData.spbookThirdSsr15 !== (userData.spbookThirdSsr15 || false)) return true;
      if (formData.spbookThirdComingBack !== (userData.spbookThirdComingBack || false)) return true;
      if (formData.spbookThirdPqpa !== (userData.spbookThirdPqpa || false)) return true;
      if (formData.spbookThirdMatchlessGift !== (userData.spbookThirdMatchlessGift || false)) return true;
      if (formData.spbookThirdRajaVidya !== (userData.spbookThirdRajaVidya || false)) return true;
      if (formData.spbookThirdElevationKc !== (userData.spbookThirdElevationKc || false)) return true;
      if (formData.spbookThirdBeyondBirthDeath !== (userData.spbookThirdBeyondBirthDeath || false)) return true;
      if (formData.spbookThirdKrishnaReservoir !== (userData.spbookThirdKrishnaReservoir || false)) return true;

      if (formData.spbookFourthSsr68 !== (userData.spbookFourthSsr68 || false)) return true;
      if (formData.spbookFourthLawsOfNature !== (userData.spbookFourthLawsOfNature || false)) return true;
      if (formData.spbookFourthDharma !== (userData.spbookFourthDharma || false)) return true;
      if (formData.spbookFourthSecondChance !== (userData.spbookFourthSecondChance || false)) return true;
      if (formData.spbookFourthIsopanishad110 !== (userData.spbookFourthIsopanishad110 || false)) return true;
      if (formData.spbookFourthQueenKuntiVideo !== (userData.spbookFourthQueenKuntiVideo || false)) return true;
      if (formData.spbookFourthEnlightenmentNatural !== (userData.spbookFourthEnlightenmentNatural || false)) return true;
      if (formData.spbookFourthKrishnaBook121 !== (userData.spbookFourthKrishnaBook121 || false)) return true;

      if (formData.spbookFifthLifeFromLife !== (userData.spbookFifthLifeFromLife || false)) return true;
      if (formData.spbookFifthPrahladTeachings !== (userData.spbookFifthPrahladTeachings || false)) return true;
      if (formData.spbookFifthJourneySelfDiscovery !== (userData.spbookFifthJourneySelfDiscovery || false)) return true;
      if (formData.spbookFifthQueenKuntiHearing !== (userData.spbookFifthQueenKuntiHearing || false)) return true;
      if (formData.spbookFifthLordKapila !== (userData.spbookFifthLordKapila || false)) return true;
      if (formData.spbookFifthNectar16 !== (userData.spbookFifthNectar16 || false)) return true;
      if (formData.spbookFifthGita16 !== (userData.spbookFifthGita16 || false)) return true;
      if (formData.spbookFifthKrishnaBook2428 !== (userData.spbookFifthKrishnaBook2428 || false)) return true;

      if (formData.spbookSixthNectar711 !== (userData.spbookSixthNectar711 || false)) return true;
      if (formData.spbookSixthPathPerfection !== (userData.spbookSixthPathPerfection || false)) return true;
      if (formData.spbookSixthCivilisationTranscendence !== (userData.spbookSixthCivilisationTranscendence || false)) return true;
      if (formData.spbookSixthHareKrishnaChallenge !== (userData.spbookSixthHareKrishnaChallenge || false)) return true;
      if (formData.spbookSixthGita712 !== (userData.spbookSixthGita712 || false)) return true;
      if (formData.spbookSixthSb1stCanto16 !== (userData.spbookSixthSb1stCanto16 || false)) return true;
      if (formData.spbookSixthKrishnaBook3559 !== (userData.spbookSixthKrishnaBook3559 || false)) return true;

      if (formData.spbookSeventhGita1318 !== (userData.spbookSeventhGita1318 || false)) return true;
      if (formData.spbookSeventhSb1stCanto713 !== (userData.spbookSeventhSb1stCanto713 || false)) return true;
      if (formData.spbookSeventhKrishnaBook6378 !== (userData.spbookSeventhKrishnaBook6378 || false)) return true;

      if (formData.spbookEighthSb1stCanto1419 !== (userData.spbookEighthSb1stCanto1419 || false)) return true;
      if (formData.spbookEighthKrishnaBook7889 !== (userData.spbookEighthKrishnaBook7889 || false)) return true;

      // 8. Check if photo is selected
      if (selectedPhoto || selectedAadharPhoto) return true;
      if (normalize(formData.aadharCardImage) !== normalize(userData.aadharCardImage)) return true;

      return false;
    };

    setIsDirty(checkChanges());
  }, [formData, userData, education, workExperience, languages, skills, services, selectedPhoto, selectedAadharPhoto]);

  // Load counselors from Supabase
  useEffect(() => {
    const fetchCounselors = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('counselors')
          .select(`
            id, 
            name, 
            email, 
            current_temple, 
            parent_temple,
            user:user_id (
              current_temple,
              parent_temple
            )
          `)
          .order('name');

        if (error) {
          console.error('Error loading counselors:', error);
        } else if (data) {
          // Normalize data to include temple info for easier filtering
          const normalized = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            current_temple: c.current_temple,
            parent_temple: c.parent_temple,
            temple: c.current_temple || c.parent_temple || c.user?.current_temple || c.user?.parent_temple || ''
          }));
          setAllCounselors(normalized);
          setCounselors(normalized);
        }
      } catch (error) {
        console.error('Error in fetchCounselors:', error);
      } finally {
        setLoadingCounselors(false);
      }
    };
    fetchCounselors();
  }, []);

  // Filter counselors based on selected temple
  useEffect(() => {
    if (allCounselors.length > 0) {
      const currentT = formData.currentTemple || '';
      const parentT = formData.parentTemple || '';

      if (!currentT && !parentT) {
        setCounselors([]);
        return;
      }

      const filtered = allCounselors.filter(c => {
        const cTemple = (c as any).temple || '';
        
        const matchesCurrent = currentT && cTemple.toLowerCase().includes(currentT.toLowerCase());
        const matchesParent = parentT && cTemple.toLowerCase().includes(parentT.toLowerCase());
        
        return matchesCurrent || matchesParent;
      });
      
      setCounselors(filtered);
    } else {
      setCounselors([]);
    }
  }, [formData.currentTemple, formData.parentTemple, allCounselors]);

  // Auto-resolve counselorId if missing but counselor name exists
  useEffect(() => {
    if (!formData.counselorId && formData.counselor && counselors.length > 0) {
      const match = counselors.find(c => c.name === formData.counselor);
      if (match) {
        setFormData(prev => ({
          ...prev,
          counselorId: match.id
        }));
      }
    }
  }, [counselors, formData.counselor, formData.counselorId]);

  // Load temples from Supabase
  useEffect(() => {
    const fetchTemples = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('temples')
          .select('id, name')
          .order('name');

        if (error) {
          console.error('Error loading temples:', error);
        } else if (data) {
          setTemples(data);
        }
      } catch (error) {
        console.error('Error in fetchTemples:', error);
      } finally {
        setLoadingTemples(false);
      }
    };
    fetchTemples();
  }, []);

  // Load centers based on selected temple
  useEffect(() => {
    const fetchCenters = async () => {
      if (!supabase || !formData.currentTemple || formData.currentTemple === 'None') {
        setCenters([]);
        return;
      }

      setLoadingCenters(true);
      try {
        const { data, error } = await supabase
          .from('centers')
          .select('id, name')
          .eq('temple_name', formData.currentTemple)
          .order('name');

        if (error) {
          console.error('Error loading centers:', error);
        } else if (data) {
          setCenters(data);
        }
      } catch (error) {
        console.error('Error in fetchCenters:', error);
      } finally {
        setLoadingCenters(false);
      }
    };
    fetchCenters();
  }, [formData.currentTemple]);

  // Load parent centers based on selected parent temple
  useEffect(() => {
    const fetchParentCenters = async () => {
      if (!supabase || !formData.parentTemple || formData.parentTemple === 'None') {
        setParentCenters([]);
        return;
      }

      setLoadingParentCenters(true);
      try {
        const { data, error } = await supabase
          .from('centers')
          .select('id, name')
          .eq('temple_name', formData.parentTemple)
          .order('name');

        if (error) {
          console.error('Error loading parent centers:', error);
        } else if (data) {
          setParentCenters(data);
        }
      } catch (error) {
        console.error('Error in fetchParentCenters:', error);
      } finally {
        setLoadingParentCenters(false);
      }
    };
    fetchParentCenters();
  }, [formData.parentTemple]);

  // Check for pending profile update requests
  useEffect(() => {
    if (!user) return;

    const fetchPendingRequest = async () => {
      if (!supabase) return;
      try {
        setLoadingRequest(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch user's latest pending or rejected request
        const { data, error } = await supabase
          .from('profile_update_requests')
          .select('*')
          .in('status', ['pending', 'rejected', 'approved'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching request status:', error);
        } else if (data) {
          setPendingRequest(data);
        }
      } catch (err) {
        console.error('Error checking requests:', err);
      } finally {
        setLoadingRequest(false);
      }
    };

    fetchPendingRequest();
  }, [user]);


  // Load initial data
  useEffect(() => {
    if (userData) {
      const baseHierarchy = userData.hierarchy || {};
      
      // Basic fields from userData
      const baseData: any = {
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        birthDate: userData.birthDate || '',
        state: baseHierarchy.state || '',
        city: baseHierarchy.city || '',
        center: (baseHierarchy.center === 'Other' && baseHierarchy.otherCenter)
          ? baseHierarchy.otherCenter
          : (baseHierarchy.center || ''),
        centerId: baseHierarchy.centerId || '',
        
        // Spiritual fields
        initiationStatus: (baseHierarchy.initiationStatus || '') as 'initiated' | 'aspiring' | '',
        initiatedName: baseHierarchy.initiatedName || '',
        spiritualMasterName: baseHierarchy.spiritualMasterName || '',
        aspiringSpiritualMasterName: baseHierarchy.aspiringSpiritualMasterName || '',
        introducedToKcIn: baseHierarchy.introducedToKcIn || '',
        rounds: baseHierarchy.rounds ? baseHierarchy.rounds.toString() : '',
        parentTemple: baseHierarchy.parentTemple || '',
        otherParentTemple: baseHierarchy.otherParentTemple || '',
        parentCenter: baseHierarchy.parentCenter || '',
        currentTemple: baseHierarchy.currentTemple || '',
        currentCenter: baseHierarchy.currentCenter || baseHierarchy.center || '',
        counselor: baseHierarchy.counselor || baseHierarchy.brahmachariCounselor || baseHierarchy.grihasthaCounselor || '',
        counselorId: baseHierarchy.counselorId || '',
        otherCounselor: baseHierarchy.otherCounselor || '',
        ashram: baseHierarchy.ashram || '',
        otherCenter: baseHierarchy.otherCenter || '',
        otherParentCenter: baseHierarchy.otherParentCenter || '',

        // Relative contact info
        relative1Name: userData.relative1Name || '',
        relative1Relationship: userData.relative1Relationship || '',
        relative1Phone: userData.relative1Phone || '',
        relative2Name: userData.relative2Name || '',
        relative2Relationship: userData.relative2Relationship || '',
        relative2Phone: userData.relative2Phone || '',
        relative3Name: userData.relative3Name || '',
        relative3Relationship: userData.relative3Relationship || '',
        relative3Phone: userData.relative3Phone || '',
        
        // Health info
        healthChronicDisease: userData.healthChronicDisease || '',
        aadharCardImage: userData.aadharCardImage || '',

        // Camp completion fields
        campDys: userData.campDys || baseHierarchy.campDys || false,
        campSankalpa: userData.campSankalpa || false,
        campSphurti: userData.campSphurti || false,
        campUtkarsh: userData.campUtkarsh || false,
        campSrcgdWorkshop: userData.campSrcgdWorkshop || false,
        campNishtha: userData.campNishtha || false,
        campFtec: userData.campFtec || false,
        campAshraya: userData.campAshraya || false,
        campMtec: userData.campMtec || false,
        campSharanagati: userData.campSharanagati || false,
        campIdc: userData.campIdc || false,
        campBhaktiShastri: userData.campBhaktiShastri || false,
        campPositiveThinker: userData.campPositiveThinker || false,
        campSelfManager: userData.campSelfManager || false,
        campProactiveLeader: userData.campProactiveLeader || false,
        
        // SP Books Study Course fields
        spbookThirdSsr15: userData.spbookThirdSsr15 || false,
        spbookThirdComingBack: userData.spbookThirdComingBack || false,
        spbookThirdPqpa: userData.spbookThirdPqpa || false,
        spbookThirdMatchlessGift: userData.spbookThirdMatchlessGift || false,
        spbookThirdRajaVidya: userData.spbookThirdRajaVidya || false,
        spbookThirdElevationKc: userData.spbookThirdElevationKc || false,
        spbookThirdBeyondBirthDeath: userData.spbookThirdBeyondBirthDeath || false,
        spbookThirdKrishnaReservoir: userData.spbookThirdKrishnaReservoir || false,
        spbookFourthSsr68: userData.spbookFourthSsr68 || false,
        spbookFourthLawsOfNature: userData.spbookFourthLawsOfNature || false,
        spbookFourthDharma: userData.spbookFourthDharma || false,
        spbookFourthSecondChance: userData.spbookFourthSecondChance || false,
        spbookFourthIsopanishad110: userData.spbookFourthIsopanishad110 || false,
        spbookFourthQueenKuntiVideo: userData.spbookFourthQueenKuntiVideo || false,
        spbookFourthEnlightenmentNatural: userData.spbookFourthEnlightenmentNatural || false,
        spbookFourthKrishnaBook121: userData.spbookFourthKrishnaBook121 || false,
        spbookFifthLifeFromLife: userData.spbookFifthLifeFromLife || false,
        spbookFifthPrahladTeachings: userData.spbookFifthPrahladTeachings || false,
        spbookFifthJourneySelfDiscovery: userData.spbookFifthJourneySelfDiscovery || false,
        spbookFifthQueenKuntiHearing: userData.spbookFifthQueenKuntiHearing || false,
        spbookFifthLordKapila: userData.spbookFifthLordKapila || false,
        spbookFifthNectar16: userData.spbookFifthNectar16 || false,
        spbookFifthGita16: userData.spbookFifthGita16 || false,
        spbookFifthKrishnaBook2428: userData.spbookFifthKrishnaBook2428 || false,
        spbookSixthNectar711: userData.spbookSixthNectar711 || false,
        spbookSixthPathPerfection: userData.spbookSixthPathPerfection || false,
        spbookSixthCivilisationTranscendence: userData.spbookSixthCivilisationTranscendence || false,
        spbookSixthHareKrishnaChallenge: userData.spbookSixthHareKrishnaChallenge || false,
        spbookSixthGita712: userData.spbookSixthGita712 || false,
        spbookSixthSb1stCanto16: userData.spbookSixthSb1stCanto16 || false,
        spbookSixthKrishnaBook3559: userData.spbookSixthKrishnaBook3559 || false,
        spbookSeventhGita1318: userData.spbookSeventhGita1318 || false,
        spbookSeventhSb1stCanto713: userData.spbookSeventhSb1stCanto713 || false,
        spbookSeventhKrishnaBook6378: userData.spbookSeventhKrishnaBook6378 || false,
        spbookEighthSb1stCanto1419: userData.spbookEighthSb1stCanto1419 || false,
        spbookEighthKrishnaBook7889: userData.spbookEighthKrishnaBook7889 || false,
      };

      // Apply pending changes if any (to show user what they've requested)
      if (pendingRequest?.status === 'pending' && pendingRequest.requested_changes) {
        Object.entries(pendingRequest.requested_changes).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            baseData[key] = value;
          }
        });
      }

      setFormData(baseData);
      // Set counselor search values from spiritual fields

      // Set profile image from userData (Google Drive URL)
      const imageUrl = userData.profileImage || '';
      setProfileImage(imageUrl);

      const aadharUrl = userData.aadharCardImage || '';
      setAadharImage(aadharUrl);

      // Load education and work experience
      if (userData.education && userData.education.length > 0) {
        const filteredEdu = userData.education.filter(edu => edu.institution || edu.degreeBranch);
        setEducation(filteredEdu.length > 0 ? filteredEdu : [{ institution: '', degreeBranch: '', startYear: null, endYear: null }]);
      } else {
        setEducation([{ institution: '', degreeBranch: '', startYear: null, endYear: null }]);
      }

      if (userData.workExperience && userData.workExperience.length > 0) {
        const filteredWork = userData.workExperience.filter(work => work.company || work.position || work.location);
        setWorkExperience(filteredWork.length > 0 ? filteredWork : [{ company: '', position: '', location: '', startDate: null, endDate: null, current: false }]);
      } else {
        setWorkExperience([{ company: '', position: '', location: '', startDate: null, endDate: null, current: false }]);
      }
      // Load languages, skills, and services
      if (userData.languages && userData.languages.length > 0) {
        const filteredLangs = userData.languages.filter(lang => lang.name && lang.name.trim());
        setLanguages(filteredLangs.length > 0 ? filteredLangs : [{ name: '' }]);
      } else {
        setLanguages([{ name: '' }]);
      }
      if (userData.skills && userData.skills.length > 0) {
        const filteredSkills = userData.skills.filter(skill => skill.name && skill.name.trim());
        setSkills(filteredSkills.length > 0 ? filteredSkills : [{ name: '' }]);
      } else {
        setSkills([{ name: '' }]);
      }
      if (userData.services && userData.services.length > 0) {
        const filteredServices = userData.services.filter(service => service.name && service.name.trim());
        setServices(filteredServices.length > 0 ? filteredServices : [{ name: '' }]);
      } else {
        setServices([{ name: '' }]);
      }
    }
  }, [userData, pendingRequest]);



  // Load Brahmachari counselors with search (with debounce)






  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});

    if (!user || !supabase) {
      setError('User session not found. Please sign in again.');
      return;
    }

    // Check if profile completion is mandatory (account > 7 days old)
    const isMandatory = () => {
      if (!userData?.createdAt) return false;
      const createdAt = new Date(userData.createdAt);
      const now = new Date();
      const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return diffInDays >= 15;
    };

    const mandatory = isMandatory();

    if (mandatory) {
      // 1. Profile Photo
      if (!profileImage && !selectedPhoto) {
        setError('Profile Photo is mandatory for accounts older than 15 days.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 2. Aadhar Card Photo
      if (!aadharImage && !selectedAadharPhoto) {
        setError('Aadhar Card photo upload is mandatory for accounts older than 15 days.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 3. Spiritual Information - full section
      const spiritualMissing = [];
      if (!formData.initiationStatus) spiritualMissing.push('Initiation Status');
      if (!formData.ashram) spiritualMissing.push('Ashram');
      if (!formData.rounds && formData.rounds !== '0') spiritualMissing.push('Rounds');
      if (!formData.counselor) spiritualMissing.push('Counselor');

      if (spiritualMissing.length > 0) {
        setError(`Please fill all Spiritual Information (mandatory for accounts older than 15 days): ${spiritualMissing.join(', ')}`);
        return;
      }

      if (formData.initiationStatus === 'initiated' && (!formData.initiatedName || !formData.spiritualMasterName)) {
        setError('Initiated Name and Spiritual Master Name are mandatory for initiated devotees.');
        return;
      }

      // 4. Camps completed (at least some)
      const campFields = [
        'campDys', 'campSankalpa', 'campSphurti', 'campUtkarsh', 'campSrcgdWorkshop',
        'campNishtha', 'campFtec', 'campAshraya', 'campMtec', 'campSharanagati',
        'campIdc', 'campBhaktiShastri', 'campPositiveThinker', 'campSelfManager', 'campProactiveLeader'
      ];
      const hasAnyCamp = campFields.some(field => (formData as any)[field]);
      if (!hasAnyCamp) {
        setError('At least one Completed Camp must be selected.');
        return;
      }

      // 5. SP Book study (at least some)
      const spBookFields = Object.keys(formData).filter(key => key.startsWith('spbook'));
      const hasAnyBook = spBookFields.some(field => (formData as any)[field]);
      if (!hasAnyBook) {
        setError('At least one SP Book study entry must be selected.');
        return;
      }
    }

    setSaving(true);
    let finalProfileImageUrl = profileImage;
    let finalAadharCardUrl = aadharImage;

    const uploadFileDirectlyToDrive = async (file: File, prefix: string, userName: string): Promise<string> => {
      // Clean user name for filename
      const cleanUserName = userName.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const customFileName = `${prefix}_${cleanUserName}_${new Date().toISOString().split('T')[0]}.${ext}`;

      // 1. Get token
      const tokenRes = await fetch('/api/upload-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: customFileName,
          fileType: file.type || 'application/octet-stream',
          targetFolderId: 'profile_uploads',
          userId: user.id
        })
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(errorData.error || 'Failed to get upload token');
      }
      const tokenData = await tokenRes.json();

      // 2. Initialize Resumable Upload
      const metadata = {
        name: customFileName,
        mimeType: file.type || 'application/octet-stream',
        parents: [tokenData.folderId]
      };

      const sessionRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': file.type || 'application/octet-stream',
          'X-Upload-Content-Length': file.size.toString()
        },
        body: JSON.stringify(metadata)
      });

      if (!sessionRes.ok) throw new Error('Failed to initialize Google Drive resumable upload');
      const location = sessionRes.headers.get('Location');
      if (!location) throw new Error('No upload location received from Google Drive');

      // 3. Upload file binary
      const uploadRes = await fetch(location, {
        method: 'PUT',
        body: file
      });

      if (!uploadRes.ok) throw new Error('Google Drive upload failed');
      const driveData = await uploadRes.json();

      // Fetch extra info if links are missing
      if (!driveData.webViewLink) {
        const extraRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}?fields=id,name,mimeType,size,thumbnailLink,webViewLink`, {
          headers: { 'Authorization': `Bearer ${tokenData.accessToken}` }
        });
        if (extraRes.ok) {
          const extraData = await extraRes.json();
          Object.assign(driveData, extraData);
        }
      }

      // Check directImageUrl / webViewLink / id
      const directImageUrl = `https://lh3.googleusercontent.com/d/${driveData.id}=s1600`;
      return directImageUrl || driveData.webViewLink || driveData.id;
    };

    // Parallel upload optimization
    const uploadPromises = [];

    if (selectedPhoto) {
      uploadPromises.push(
        uploadFileDirectlyToDrive(selectedPhoto, 'profile', formData.name).then(url => {
          finalProfileImageUrl = url;
        })
      );
    }

    if (selectedAadharPhoto) {
      uploadPromises.push(
        uploadFileDirectlyToDrive(selectedAadharPhoto, 'adhar', formData.name).then(url => {
          finalAadharCardUrl = url;
        })
      );
    }

    if (uploadPromises.length > 0) {
      try {
        await Promise.all(uploadPromises);
      } catch (uploadError: any) {
        console.error('Upload error:', uploadError);
        setError(`Failed to upload photo(s): ${uploadError.message}`);
        setSaving(false);
        return;
      }
    }


    // Validate and sanitize name
    const nameValidation = validateTextInput(formData.name, 'Full Name', 100);
    if (!nameValidation.valid) {
      setFieldErrors({ name: nameValidation.error || 'Invalid name' });
      setError(nameValidation.error || 'Invalid name');
      setSaving(false);
      return;
    }
    const sanitizedName = sanitizeTextInput(formData.name.trim());

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      setFieldErrors({ email: emailValidation.error || 'Invalid email address' });
      setError(emailValidation.error || 'Invalid email address');
      setSaving(false);
      return;
    }

    // Validate and sanitize phone if provided
    let sanitizedPhone = null;
    if (formData.phone && formData.phone.trim()) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        setFieldErrors({ phone: phoneValidation.error || 'Invalid phone number' });
        setError(phoneValidation.error || 'Invalid phone number');
        setSaving(false);
        return;
      }
      sanitizedPhone = formData.phone.trim();
    }

    // ALL FIELDS BELOW ARE NOW OPTIONAL - VALIDATIONS COMMENTED OUT

    // // Validate required hierarchy fields
    // if (!formData.state || !formData.city || !formData.center) {
    //   setError('Please fill in all required location fields (State, City, and Center)');
    //   return;
    // }

    // // Validate spiritual fields
    // if (!formData.initiationStatus) {
    //   setError('Please select whether you are Initiated or Aspiring');
    //   return;
    // }

    // if (formData.initiationStatus === 'initiated') {
    //   if (!formData.initiatedName || !formData.spiritualMasterName) {
    //     setError('Please fill in Initiated Name and Spiritual Master Name');
    //     return;
    //   }
    // } else if (formData.initiationStatus === 'aspiring') {
    //   // Aspiring Spiritual Master Name is optional - no validation needed
    // }

    // if (!formData.chantingSince) {
    //   setError('Please select Chanting Since date');
    //   return;
    // }

    // if (!formData.ashram) {
    //   setError('Please select Ashram');
    //   return;
    // }

    // if (!formData.royalMember) {
    //   setError('Please select Royal Member status');
    //   return;
    // }

    // if (!formData.brahmachariCounselor) {
    //   setError('Please select Brahmachari Counselor');
    //   return;
    // }

    // Validate and sanitize education entries
    const educationErrors: string[] = [];
    const sanitizedEducation = education.map((edu, index) => {
      if (edu.institution?.trim()) {
        const instValidation = validateEducationField(edu.institution, `Education ${index + 1} - Institution`);
        if (!instValidation.valid) {
          educationErrors.push(instValidation.error || `Invalid institution name in entry ${index + 1}`);
        }
      }
      if (edu.degreeBranch?.trim()) {
        const branchValidation = validateEducationField(edu.degreeBranch, `Education ${index + 1} - Degree-Branch`);
        if (!branchValidation.valid) {
          educationErrors.push(branchValidation.error || `Invalid degree-branch name in entry ${index + 1}`);
        }
      }
      return {
        institution: edu.institution ? sanitizeTextInput(edu.institution.trim()) : '',
        degreeBranch: edu.degreeBranch ? sanitizeTextInput(edu.degreeBranch.trim()) : '',
        startYear: edu.startYear,
        endYear: edu.endYear
      };
    });
    if (educationErrors.length > 0) {
      setError(educationErrors[0]);
      setFieldErrors({ education: educationErrors[0] });
      setSaving(false);
      return;
    }

    // Validate and sanitize work experience entries
    const workErrors: string[] = [];
    const sanitizedWork = workExperience.map((work, index) => {
      if (work.company?.trim()) {
        const companyValidation = validateWorkField(work.company, `Work ${index + 1} - Company`);
        if (!companyValidation.valid) {
          workErrors.push(companyValidation.error || `Invalid company name in entry ${index + 1}`);
        }
      }
      if (work.position?.trim()) {
        const positionValidation = validateWorkField(work.position, `Work ${index + 1} - Title/Position`);
        if (!positionValidation.valid) {
          workErrors.push(positionValidation.error || `Invalid title/position name in entry ${index + 1}`);
        }
      }
      if (work.location?.trim()) {
        const locationValidation = validateWorkField(work.location, `Work ${index + 1} - Location`);
        if (!locationValidation.valid) {
          workErrors.push(locationValidation.error || `Invalid location in entry ${index + 1}`);
        }
      }
      return {
        company: work.company ? sanitizeTextInput(work.company.trim()) : '',
        position: work.position ? sanitizeTextInput(work.position.trim()) : '',
        location: work.location ? sanitizeTextInput(work.location.trim()) : '',
        startDate: work.startDate,
        endDate: work.endDate,
        current: work.current
      };
    });
    if (workErrors.length > 0) {
      setError(workErrors[0]);
      setFieldErrors({ work: workErrors[0] });
      setSaving(false);
      return;
    }


    try {
      // Build hierarchy object for backward compatibility (using sanitized values)
      const hierarchy: any = {};
      if (formData.state) hierarchy.state = sanitizeTextInput(formData.state.trim());
      if (formData.city) hierarchy.city = sanitizeTextInput(formData.city.trim());
      if (formData.center) {
        hierarchy.center = sanitizeTextInput(formData.center.trim());
        if (formData.centerId) hierarchy.centerId = formData.centerId;
      }

      // Add spiritual fields to hierarchy object
      if (formData.initiationStatus) hierarchy.initiationStatus = formData.initiationStatus;
      if (formData.initiatedName) hierarchy.initiatedName = sanitizeTextInput(formData.initiatedName.trim());
      if (formData.spiritualMasterName) hierarchy.spiritualMasterName = sanitizeTextInput(formData.spiritualMasterName.trim());
      if (formData.aspiringSpiritualMasterName) hierarchy.aspiringSpiritualMasterName = sanitizeTextInput(formData.aspiringSpiritualMasterName.trim());
      if (formData.ashram) hierarchy.ashram = formData.ashram;
      if (formData.introducedToKcIn) hierarchy.introducedToKcIn = sanitizeTextInput(formData.introducedToKcIn.trim());
      if (formData.rounds) hierarchy.rounds = parseInt(formData.rounds) || 0;
      if (formData.parentTemple) hierarchy.parentTemple = sanitizeTextInput(formData.parentTemple.trim());
      if (formData.otherParentTemple) hierarchy.otherParentTemple = sanitizeTextInput(formData.otherParentTemple.trim());
      if (formData.parentCenter) hierarchy.parentCenter = sanitizeTextInput(formData.parentCenter.trim());
      if (formData.otherParentCenter) hierarchy.otherParentCenter = sanitizeTextInput(formData.otherParentCenter.trim());
      if (formData.currentTemple) hierarchy.currentTemple = sanitizeTextInput(formData.currentTemple.trim());
      if (formData.currentCenter) hierarchy.currentCenter = sanitizeTextInput(formData.currentCenter.trim());
      if (formData.counselor) {
        hierarchy.counselor = sanitizeTextInput(formData.counselor.trim());
        if (formData.counselorId) hierarchy.counselorId = formData.counselorId;
      }
      if (formData.otherCounselor) hierarchy.otherCounselor = sanitizeTextInput(formData.otherCounselor.trim());
      if (formData.otherCenter) hierarchy.otherCenter = sanitizeTextInput(formData.otherCenter.trim());

      // Build expanded update objects (education, work, etc.)
      const educationUpdate: any = {};
      const validEducation = sanitizedEducation.filter(edu => edu.institution?.trim() || edu.degreeBranch?.trim());
      validEducation.slice(0, 5).forEach((edu, index) => {
        const num = index + 1;
        educationUpdate[`edu_${num}_institution`] = edu.institution?.trim() || null;
        educationUpdate[`edu_${num}_degree_branch`] = edu.degreeBranch?.trim() || null;
        educationUpdate[`edu_${num}_start_year`] = edu.startYear || null;
        educationUpdate[`edu_${num}_end_year`] = edu.endYear || null;
      });
      for (let i = validEducation.length + 1; i <= 5; i++) {
        educationUpdate[`edu_${i}_institution`] = null;
        educationUpdate[`edu_${i}_degree_branch`] = null;
        educationUpdate[`edu_${i}_start_year`] = null;
        educationUpdate[`edu_${i}_end_year`] = null;
      }

      const workUpdate: any = {};
      const validWork = sanitizedWork.filter(work => work.company?.trim() || work.position?.trim() || work.location?.trim());
      validWork.slice(0, 5).forEach((work, index) => {
        const num = index + 1;
        workUpdate[`work_${num}_company`] = work.company?.trim() || null;
        workUpdate[`work_${num}_position`] = work.position?.trim() || null;
        workUpdate[`work_${num}_location`] = work.location?.trim() || null;
        workUpdate[`work_${num}_start_date`] = work.startDate || null;
        workUpdate[`work_${num}_end_date`] = work.current ? null : (work.endDate || null);
        workUpdate[`work_${num}_current`] = work.current || false;
      });
      for (let i = validWork.length + 1; i <= 5; i++) {
        workUpdate[`work_${i}_company`] = null;
        workUpdate[`work_${i}_position`] = null;
        workUpdate[`work_${i}_location`] = null;
        workUpdate[`work_${i}_start_date`] = null;
        workUpdate[`work_${i}_end_date`] = null;
        workUpdate[`work_${i}_current`] = false;
      }

      const languagesUpdate: any = {};
      const filteredLanguages = languages.filter(lang => lang.name?.trim());
      filteredLanguages.slice(0, 5).forEach((lang, index) => {
        const num = index + 1;
        languagesUpdate[`language_${num}`] = lang.name?.trim() || null;
      });
      for (let i = filteredLanguages.length + 1; i <= 5; i++) {
        languagesUpdate[`language_${i}`] = null;
      }

      const skillsUpdate: any = {};
      const filteredSkills = skills.filter(skill => skill.name?.trim());
      filteredSkills.slice(0, 5).forEach((skill, index) => {
        const num = index + 1;
        skillsUpdate[`skill_${num}`] = skill.name?.trim() || null;
      });
      for (let i = filteredSkills.length + 1; i <= 5; i++) {
        skillsUpdate[`skill_${i}`] = null;
      }

      const servicesUpdate: any = {};
      const filteredServices = services.filter(service => service.name?.trim());
      filteredServices.slice(0, 5).forEach((service, index) => {
        const num = index + 1;
        servicesUpdate[`service_${num}`] = service.name?.trim() || null;
      });
      for (let i = filteredServices.length + 1; i <= 5; i++) {
        servicesUpdate[`service_${i}`] = null;
      }

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';

      // Construct the main updates object
      const updates: any = {
        name: sanitizedName,
        phone: sanitizedPhone,
        birth_date: formData.birthDate || null,
        profile_image: finalProfileImageUrl || null,
        aadhar_card_image: finalAadharCardUrl || null,
        state: hierarchy.state || null,
        city: hierarchy.city || null,
        center: hierarchy.center || null,
        center_id: formData.centerId || null,
        // Spiritual fields
        initiation_status: formData.initiationStatus || null,
        initiated_name: formData.initiatedName ? sanitizeTextInput(formData.initiatedName.trim()) : null,
        spiritual_master_name: formData.spiritualMasterName ? sanitizeTextInput(formData.spiritualMasterName.trim()) : null,
        aspiring_spiritual_master_name: formData.aspiringSpiritualMasterName ? sanitizeTextInput(formData.aspiringSpiritualMasterName.trim()) : null,
        ashram: formData.ashram || null,
        introduced_to_kc_in: formData.introducedToKcIn ? sanitizeTextInput(formData.introducedToKcIn.trim()) : null,
        rounds: formData.rounds ? parseInt(formData.rounds) : null,
        parent_temple: formData.parentTemple ? sanitizeTextInput(formData.parentTemple.trim()) : null,
        other_parent_temple: formData.parentTemple === 'Other' ? (formData.otherParentTemple ? sanitizeTextInput(formData.otherParentTemple.trim()) : null) : null,
        parent_center: formData.parentCenter ? sanitizeTextInput(formData.parentCenter.trim()) : null,
        other_parent_center: formData.parentCenter === 'Other' ? (formData.otherParentCenter ? sanitizeTextInput(formData.otherParentCenter.trim()) : null) : null,
        current_temple: formData.currentTemple ? sanitizeTextInput(formData.currentTemple.trim()) : null,
        current_center: formData.currentCenter ? sanitizeTextInput(formData.currentCenter.trim()) : null,
        counselor: formData.counselor ? sanitizeTextInput(formData.counselor.trim()) : null,
        counselor_id: formData.counselorId || null,
        other_counselor: formData.counselor === 'Other' ? (formData.otherCounselor ? sanitizeTextInput(formData.otherCounselor.trim()) : null) : null,
        other_center: formData.currentCenter === 'Other' || formData.center === 'Other' ? (formData.otherCenter ? sanitizeTextInput(formData.otherCenter.trim()) : null) : null,
        // Relative contact info
        relative_1_name: formData.relative1Name ? sanitizeTextInput(formData.relative1Name.trim()) : null,
        relative_1_relationship: formData.relative1Relationship || null,
        relative_1_phone: formData.relative1Phone ? sanitizeTextInput(formData.relative1Phone.trim()) : null,
        relative_2_name: formData.relative2Name ? sanitizeTextInput(formData.relative2Name.trim()) : null,
        relative_2_relationship: formData.relative2Relationship || null,
        relative_2_phone: formData.relative2Phone ? sanitizeTextInput(formData.relative2Phone.trim()) : null,
        relative_3_name: formData.relative3Name ? sanitizeTextInput(formData.relative3Name.trim()) : null,
        relative_3_relationship: formData.relative3Relationship || null,
        relative_3_phone: formData.relative3Phone ? sanitizeTextInput(formData.relative3Phone.trim()) : null,
        // Health info
        health_chronic_disease: formData.healthChronicDisease ? sanitizeTextInput(formData.healthChronicDisease.trim()) : null,
        // Camp fields
        camp_dys: formData.campDys || false,
        camp_sankalpa: formData.campSankalpa || false,
        camp_sphurti: formData.campSphurti || false,
        camp_utkarsh: formData.campUtkarsh || false,
        camp_srcgd_workshop: formData.campSrcgdWorkshop || false,
        camp_nishtha: formData.campNishtha || false,
        camp_ftec: formData.campFtec || false,
        camp_ashraya: formData.campAshraya || false,
        camp_mtec: formData.campMtec || false,
        camp_sharanagati: formData.campSharanagati || false,
        camp_idc: formData.campIdc || false,
        camp_bhakti_shastri: formData.campBhaktiShastri || false,
        camp_positive_thinker: formData.campPositiveThinker || false,
        camp_self_manager: formData.campSelfManager || false,
        camp_proactive_leader: formData.campProactiveLeader || false,
        // SP Books fields
        spbook_third_ssr_1_5: formData.spbookThirdSsr15 || false,
        spbook_third_coming_back: formData.spbookThirdComingBack || false,
        spbook_third_pqpa: formData.spbookThirdPqpa || false,
        spbook_third_matchless_gift: formData.spbookThirdMatchlessGift || false,
        spbook_third_raja_vidya: formData.spbookThirdRajaVidya || false,
        spbook_third_elevation_kc: formData.spbookThirdElevationKc || false,
        spbook_third_beyond_birth_death: formData.spbookThirdBeyondBirthDeath || false,
        spbook_third_krishna_reservoir: formData.spbookThirdKrishnaReservoir || false,
        spbook_fourth_ssr_6_8: formData.spbookFourthSsr68 || false,
        spbook_fourth_laws_of_nature: formData.spbookFourthLawsOfNature || false,
        spbook_fourth_dharma: formData.spbookFourthDharma || false,
        spbook_fourth_second_chance: formData.spbookFourthSecondChance || false,
        spbook_fourth_isopanishad_1_10: formData.spbookFourthIsopanishad110 || false,
        spbook_fourth_queen_kunti_video: formData.spbookFourthQueenKuntiVideo || false,
        spbook_fourth_enlightenment_natural: formData.spbookFourthEnlightenmentNatural || false,
        spbook_fourth_krishna_book_1_21: formData.spbookFourthKrishnaBook121 || false,
        spbook_fifth_life_from_life: formData.spbookFifthLifeFromLife || false,
        spbook_fifth_prahlad_teachings: formData.spbookFifthPrahladTeachings || false,
        spbook_fifth_journey_self_discovery: formData.spbookFifthJourneySelfDiscovery || false,
        spbook_fifth_queen_kunti_hearing: formData.spbookFifthQueenKuntiHearing || false,
        spbook_fifth_lord_kapila: formData.spbookFifthLordKapila || false,
        spbook_fifth_nectar_1_6: formData.spbookFifthNectar16 || false,
        spbook_fifth_gita_1_6: formData.spbookFifthGita16 || false,
        spbook_fifth_krishna_book_24_28: formData.spbookFifthKrishnaBook2428 || false,
        spbook_sixth_nectar_7_11: formData.spbookSixthNectar711 || false,
        spbook_sixth_path_perfection: formData.spbookSixthPathPerfection || false,
        spbook_sixth_civilisation_transcendence: formData.spbookSixthCivilisationTranscendence || false,
        spbook_sixth_hare_krishna_challenge: formData.spbookSixthHareKrishnaChallenge || false,
        spbook_sixth_gita_7_12: formData.spbookSixthGita712 || false,
        spbook_sixth_sb_1st_canto_1_6: formData.spbookSixthSb1stCanto16 || false,
        spbook_sixth_krishna_book_35_59: formData.spbookSixthKrishnaBook3559 || false,
        spbook_seventh_gita_13_18: formData.spbookSeventhGita1318 || false,
        spbook_seventh_sb_1st_canto_7_13: formData.spbookSeventhSb1stCanto713 || false,
        spbook_seventh_krishna_book_63_78: formData.spbookSeventhKrishnaBook6378 || false,
        spbook_eighth_sb_1st_canto_14_19: formData.spbookEighthSb1stCanto1419 || false,
        spbook_eighth_krishna_book_78_89: formData.spbookEighthKrishnaBook7889 || false,
        ...educationUpdate,
        ...workUpdate,
        ...languagesUpdate,
        ...skillsUpdate,
        ...servicesUpdate,
        updated_at: new Date().toISOString(),
      };

      // Split spiritual changes from basic profile changes
      const spiritualFields = [
        'initiation_status', 'initiated_name', 'spiritual_master_name',
        'aspiring_spiritual_master_name', 'rounds', 'introduced_to_kc_in',
        'parent_temple', 'other_parent_temple', 'parent_center', 'other_parent_center',
        'current_temple', 'current_center', 'counselor', 'counselor_id',
        'other_counselor', 'other_center', 'ashram'
      ];

      const spiritualUpdates: any = {};
      const basicUpdates: any = { ...updates };

      // Identify spiritual updates and remove from basic
      spiritualFields.forEach(field => {
        if (updates[field] !== undefined) {
          spiritualUpdates[field] = updates[field];
          delete basicUpdates[field];
        }
      });

      // Check if any spiritual field has actually changed
      const actualSpiritualChanges: any = {};
      let hasSpiritualChanges = false;
      const snakeToCamel = (s: string) => s.replace(/(_\w)/g, k => k[1].toUpperCase());

      spiritualFields.forEach(field => {
        const camelField = snakeToCamel(field);
        const newValue = updates[field];
        const oldValue = userData?.hierarchy?.[camelField];

        const normNew = (newValue === null || newValue === undefined) ? '' : newValue.toString().trim();
        const normOld = (oldValue === null || oldValue === undefined) ? '' : oldValue.toString().trim();

        if (normNew !== normOld) {
          actualSpiritualChanges[camelField] = newValue;
          hasSpiritualChanges = true;
        }
      });

      // Prepare final basic updates in hierarchy
      const finalBasicUpdates = {
        ...basicUpdates,
        hierarchy: {
          ...hierarchy,
          ...Object.keys(userData?.hierarchy || {}).reduce((acc: any, key) => {
            if (!spiritualFields.map(snakeToCamel).includes(key)) {
              acc[key] = userData?.hierarchy?.[key];
            }
            return acc;
          }, {})
        }
      };

      const promises = [];
      // 1. Update basic info
      promises.push(
        fetch('/api/users/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user.id, updates: finalBasicUpdates })
        }).then(res => res.json())
      );

      // 2. Submit spiritual changes for approval
      if (hasSpiritualChanges) {
        const currentSpiritualValues: any = {};
        spiritualFields.forEach(field => {
          const camelField = snakeToCamel(field);
          currentSpiritualValues[camelField] = userData?.hierarchy?.[camelField] || '';
        });

        promises.push(
          fetch('/api/profile-requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              requestedChanges: actualSpiritualChanges,
              currentValues: currentSpiritualValues
            })
          }).then(res => res.json())
        );
      }

      const results = await Promise.all(promises);
      if (results[0]?.error) throw new Error(results[0].details || results[0].error);
      if (hasSpiritualChanges && results[1]?.error) throw new Error(results[1].details || results[1].error);

      setSuccess(hasSpiritualChanges ? 'Profile updated! Spiritual changes pending approval.' : 'Profile updated successfully!');
      await refreshUserData();

      if (hasSpiritualChanges) {
        const { data } = await supabase.from('profile_update_requests')
          .select('*').eq('user_id', user.id).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (data) setPendingRequest(data);
      }

      setIsDirty(false);
      isInitializedRef.current = false;
      setSelectedPhoto(null); // Clear selected photo after successful submission

      // Refresh page after a short delay to ensure all updates are visible
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative animate-fadeIn">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600 mx-auto shadow-lg"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-2 bg-amber-100 rounded-full">
                <User className="h-6 w-6 text-amber-600 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="mt-6 text-gray-700 font-semibold text-lg animate-slideInRight" style={{ animationDelay: '0.2s' }}>Loading your profile...</p>
          <p className="mt-2 text-gray-500 text-sm animate-fadeIn" style={{ animationDelay: '0.3s' }}>Please wait while we fetch your information</p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-50/50 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out forwards;
        }
        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out forwards;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-on-scroll {
          opacity: 0;
        }
        .animate-on-scroll.animate-in {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .ripple-effect {
          position: relative;
          overflow: hidden;
        }
        .ripple-effect::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        .ripple-effect:active::after {
          width: 300px;
          height: 300px;
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header Section - Devotional and Soothing Colors with Animation */}
        <div className={`bg-white rounded-xl sm:rounded-2xl shadow-lg border border-amber-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] ${mounted ? 'animate-fadeInUp' : 'opacity-0'}`}>
          <div className="bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 relative overflow-hidden">
            <div className="absolute inset-0 shimmer opacity-30"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-0.5 sm:mb-1 flex items-center gap-2 sm:gap-3 drop-shadow-md font-display tracking-tight ${mounted ? 'animate-slideInRight' : 'opacity-0'}`}>
                    <div className="p-1.5 sm:p-2 bg-white/30 rounded-lg sm:rounded-xl backdrop-blur-sm shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-900" />
                    </div>
                    My Profile
                  </h1>
                  <p className={`text-blue-800/80 text-xs sm:text-sm lg:text-base ml-8 sm:ml-10 lg:ml-12 font-medium tracking-wide ${mounted ? 'animate-fadeIn' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>Manage and update your personal information</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Messages with Enhanced Animations */}
        {/* Toasts removed from here and moved to fixed position container at the bottom */}

        {pendingRequest && (pendingRequest.status === 'pending' || pendingRequest.status === 'rejected' || (pendingRequest.status === 'approved' && pendingRequest.admin_feedback && pendingRequest.admin_feedback.trim() !== '')) && (
          <div className={`${pendingRequest.status === 'pending' ? 'bg-amber-50 border-amber-400' : pendingRequest.status === 'approved' ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'} border-l-4 p-4 rounded-r-xl shadow-sm animate-fadeIn`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {pendingRequest.status === 'pending' ? (
                  <Clock className="h-5 w-5 text-amber-400" />
                ) : pendingRequest.status === 'approved' ? (
                  <Check className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${pendingRequest.status === 'pending' ? 'text-amber-700' : pendingRequest.status === 'approved' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {pendingRequest.status === 'pending'
                    ? 'Spiritual Information Update Pending Approval'
                    : pendingRequest.status === 'approved'
                      ? 'Spiritual Information Update Approved with Remarks'
                      : 'Spiritual Information Update Rejected'}
                </p>
                <div className="mt-1 space-y-2">
                  <p className={`text-xs ${pendingRequest.status === 'pending' ? 'text-amber-600' : pendingRequest.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {pendingRequest.status === 'pending'
                      ? `Your changes submitted on ${new Date(pendingRequest.created_at).toLocaleDateString()} are currently under review by authority. Other profile data can still be updated immediately.`
                      : pendingRequest.status === 'approved'
                        ? `Your update request from ${new Date(pendingRequest.created_at).toLocaleDateString()} was approved by authority, but with some observations.`
                        : `Your update request from ${new Date(pendingRequest.created_at).toLocaleDateString()} was reviewed by authority.`}
                  </p>

                  {(pendingRequest.status === 'rejected' || pendingRequest.status === 'approved') && pendingRequest.admin_feedback && (
                    <div className={`bg-white/50 rounded-lg p-2.5 border ${pendingRequest.status === 'approved' ? 'border-emerald-100' : 'border-red-100'} mt-2`}>
                      <p className={`text-[10px] font-bold ${pendingRequest.status === 'approved' ? 'text-emerald-800' : 'text-red-800'} uppercase tracking-wider mb-1`}>Reason / Feedback from Authority:</p>
                      <p className={`text-xs ${pendingRequest.status === 'approved' ? 'text-emerald-700' : 'text-red-700'} italic font-medium leading-relaxed`}>
                        &quot; {pendingRequest.admin_feedback} &quot;
                      </p>
                    </div>
                  )}

                  {pendingRequest.status === 'rejected' && (
                    <p className="text-[10px] text-red-500 font-medium">Please review the feedback above and update your information accordingly.</p>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 relative">
          {/* Personal Information Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-blue-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 drop-shadow-sm relative z-10">
                <div className="p-1.5 sm:p-2 bg-white/30 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-900" />
                </div>
                Personal Information
              </h2>
            </div>

            {userData?.createdAt && (new Date().getTime() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24) >= 15 && (
              (() => {
                const campFields = [
                  'campDys', 'campSankalpa', 'campSphurti', 'campUtkarsh', 'campSrcgdWorkshop',
                  'campNishtha', 'campFtec', 'campAshraya', 'campMtec', 'campSharanagati',
                  'campIdc', 'campBhaktiShastri', 'campPositiveThinker', 'campSelfManager', 'campProactiveLeader'
                ];
                const hasAnyCamp = campFields.some(field => (formData as any)[field]);
                const hasAnyBook = Object.keys(formData).some(key => key.startsWith('spbook') && (formData as any)[key]);
                
                const isIncomplete = (!profileImage && !selectedPhoto) || 
                                   (!aadharImage && !selectedAadharPhoto) || 
                                   !formData.initiationStatus || 
                                   !formData.ashram || 
                                   (formData.rounds === null || formData.rounds === undefined || formData.rounds === '') || 
                                   !formData.counselor ||
                                   !hasAnyCamp || 
                                   !hasAnyBook;
                
                if (!isIncomplete) return null;

                return (
                  <div className="px-4 sm:px-6 pt-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        <span className="font-bold">Mandatory Profile Update:</span> Your account is more than 15 days old and some required information is missing. 
                        Profile Photo, Aadhar Card, Spiritual Info, and at least one Camp/Book completion are now required.
                      </p>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 mb-4 sm:mb-6">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">Profile Photo</span>
                  <PhotoUpload
                    onFileSelect={(file) => {
                      setSelectedPhoto(file);
                      if (file) {
                        const objectUrl = URL.createObjectURL(file);
                        setProfileImage(objectUrl);
                      } else if (userData?.profileImage) {
                        setProfileImage(userData.profileImage);
                      } else {
                        setProfileImage('');
                      }
                    }}
                    userName={formData.name || userData?.name || 'user'}
                    currentImageUrl={profileImage}
                    disabled={saving}
                    label=""
                  />
                </div>

                <div className="flex flex-col items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">Aadhar Card</span>
                  <PhotoUpload
                    onFileSelect={(file) => {
                      setSelectedAadharPhoto(file);
                      if (file) {
                        const objectUrl = URL.createObjectURL(file);
                        setAadharImage(objectUrl);
                      } else if (userData?.aadharCardImage) {
                        setAadharImage(userData.aadharCardImage);
                      } else {
                        setAadharImage('');
                      }
                    }}
                    userName={`${formData.name || userData?.name || 'user'}_aadhar`}
                    currentImageUrl={aadharImage}
                    disabled={saving}
                    label=""
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="group animate-on-scroll" style={{ animationDelay: '0.1s' }}>
                  <label htmlFor="name" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const sanitized = sanitizeTextInput(e.target.value);
                      setFormData({ ...formData, name: sanitized });
                      // Clear error when user starts typing
                      if (fieldErrors.name) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.name;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={() => {
                      const validation = validateTextInput(formData.name, 'Full Name', 100);
                      if (!validation.valid) {
                        setFieldErrors(prev => ({ ...prev, name: validation.error || 'Invalid name' }));
                      }
                    }}
                    required
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-sky-50/50 hover:bg-sky-50 transition-all duration-300 group-hover:border-sky-200 focus:scale-[1.02] focus:shadow-md ${fieldErrors.name
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-sky-100 focus:ring-sky-400 focus:border-sky-400'
                      }`}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                      <X className="h-3 w-3" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div className="group animate-on-scroll" style={{ animationDelay: '0.2s' }}>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-sky-100 rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Email cannot be changed
                  </p>
                </div>

                <div className="group animate-on-scroll" style={{ animationDelay: '0.3s' }}>
                  <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      // Allow only phone-valid characters
                      const phoneValue = e.target.value.replace(/[^0-9+\-\s()]/g, '');
                      setFormData({ ...formData, phone: phoneValue });
                      // Clear error when user starts typing
                      if (fieldErrors.phone) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.phone;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={() => {
                      if (formData.phone && formData.phone.trim()) {
                        const validation = validatePhone(formData.phone);
                        if (!validation.valid) {
                          setFieldErrors(prev => ({ ...prev, phone: validation.error || 'Invalid phone number' }));
                        }
                      }
                    }}
                    placeholder="+91 9876543210"
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-sky-50/50 hover:bg-sky-50 transition-all duration-300 group-hover:border-sky-200 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md ${fieldErrors.phone
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-sky-100 focus:ring-sky-400 focus:border-sky-400'
                      }`}
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                      <X className="h-3 w-3" />
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div className="group animate-on-scroll" style={{ animationDelay: '0.4s' }}>
                  <label htmlFor="birthDate" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 transform transition-all duration-200 group-hover:translate-x-1">
                    Date of Birth
                  </label>
                  <input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      // Prevent future dates
                      if (selectedDate > today) {
                        setFieldErrors(prev => ({ ...prev, birthDate: 'Future dates are not allowed' }));
                        return;
                      }
                      setFormData({ ...formData, birthDate: selectedDate });
                      if (fieldErrors.birthDate) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.birthDate;
                          return newErrors;
                        });
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-sky-50/50 hover:bg-sky-50 transition-all duration-300 group-hover:border-sky-200 focus:scale-[1.02] focus:shadow-md ${fieldErrors.birthDate
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-sky-100 focus:ring-sky-400 focus:border-sky-400'
                      }`}
                  />
                  {fieldErrors.birthDate && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                      <X className="h-3 w-3" />
                      {fieldErrors.birthDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Relative Contact Details Section */}
              <div className="mt-8 pt-8 border-t border-sky-100 space-y-6 animate-on-scroll">
                <h3 className="text-sm sm:text-base font-bold text-sky-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-600" />
                  Relative Contact Details
                </h3>

                <div className="space-y-6">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="bg-sky-50/30 p-4 rounded-xl border border-sky-100/50 space-y-4">
                      <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Contact {num}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="group">
                          <label htmlFor={`relativeName${num}`} className="block text-xs font-semibold text-gray-600 mb-1.5">Name</label>
                          <input
                            id={`relativeName${num}`}
                            type="text"
                            value={(formData as any)[`relative${num}Name`]}
                            onChange={(e) => setFormData({ ...formData, [`relative${num}Name`]: e.target.value })}
                            placeholder="Full Name"
                            className="w-full px-3 py-2 text-sm border-2 border-sky-100 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white transition-all text-gray-900"
                          />
                        </div>
                        <div className="group">
                          <label htmlFor={`relativeRel${num}`} className="block text-xs font-semibold text-gray-600 mb-1.5">Relationship</label>
                          <select
                            id={`relativeRel${num}`}
                            value={(formData as any)[`relative${num}Relationship`]}
                            onChange={(e) => setFormData({ ...formData, [`relative${num}Relationship`]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border-2 border-sky-100 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYgOUwxMiAxNUwxOCA5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGlub2pvaW49InJvdW5kIi8+Cjwvc3ZnPg==')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat text-gray-900"
                          >
                            <option value="">Select...</option>
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                            <option value="Brother">Brother</option>
                            <option value="Sister">Sister</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Son">Son</option>
                            <option value="Daughter">Daughter</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="group">
                          <label htmlFor={`relativePhone${num}`} className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                          <input
                            id={`relativePhone${num}`}
                            type="tel"
                            value={(formData as any)[`relative${num}Phone`]}
                            onChange={(e) => setFormData({ ...formData, [`relative${num}Phone`]: e.target.value.replace(/[^0-9+\-\s()]/g, '') })}
                            placeholder="Phone Number"
                            className="w-full px-3 py-2 text-sm border-2 border-sky-100 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white transition-all text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Health Information Section */}
              <div className="mt-8 pt-8 border-t border-sky-100 space-y-4 animate-on-scroll">
                <h3 className="text-sm sm:text-base font-bold text-sky-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Health Information
                </h3>
                <div className="group">
                  <label htmlFor="healthChronicDisease" className="block text-xs font-semibold text-gray-600 mb-2">
                    Any chronic diseases (Free text)
                  </label>
                  <textarea
                    id="healthChronicDisease"
                    value={formData.healthChronicDisease}
                    onChange={(e) => setFormData({ ...formData, healthChronicDisease: e.target.value })}
                    placeholder="List any chronic diseases or health conditions here..."
                    className="w-full px-4 py-3 text-sm border-2 border-sky-100 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-sky-50/30 hover:bg-sky-50 transition-all min-h-[100px] resize-y text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>



          {/* Spiritual Information Card with Animations */}
          {/* Spiritual Information Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-lg sm:rounded-xl shadow-md border border-purple-100 overflow-visible relative" style={{ zIndex: 1 }}>
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-3 sm:px-4 py-2 sm:py-3 relative overflow-hidden group flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 relative z-10">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                Spiritual Information
              </h2>
              {pendingRequest && (pendingRequest.status === 'pending' || pendingRequest.status === 'rejected' || (pendingRequest.status === 'approved' && pendingRequest.admin_feedback && pendingRequest.admin_feedback.trim() !== '')) && (
                <div className={`relative z-10 flex items-center gap-1.5 px-2 py-1 ${pendingRequest.status === 'pending' ? 'bg-white/20' : pendingRequest.status === 'approved' ? 'bg-emerald-500/30' : 'bg-red-500/30'} backdrop-blur-md rounded-lg border border-white/30 text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider animate-pulse transition-all hover:bg-white/30`}>
                  {pendingRequest.status === 'pending' ? <Clock className="h-3 w-3" /> : pendingRequest.status === 'approved' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {pendingRequest.status === 'pending' ? 'Pending Approval' : pendingRequest.status === 'approved' ? 'Approved with Remarks' : 'Review Feedback'}
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 space-y-6">
              {pendingRequest && (pendingRequest.status === 'pending' || pendingRequest.status === 'rejected' || (pendingRequest.status === 'approved' && pendingRequest.admin_feedback && pendingRequest.admin_feedback.trim() !== '')) && (
                <div className={`${pendingRequest.status === 'pending' ? 'bg-purple-50 border-purple-100' : pendingRequest.status === 'approved' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} border p-3 rounded-xl flex items-start gap-3 animate-fadeIn mb-2`}>
                  <div className={`p-1.5 ${pendingRequest.status === 'pending' ? 'bg-purple-100' : pendingRequest.status === 'approved' ? 'bg-emerald-100' : 'bg-red-100'} rounded-lg`}>
                    {pendingRequest.status === 'pending'
                      ? <AlertCircle className="h-4 w-4 text-purple-600" />
                      : pendingRequest.status === 'approved'
                        ? <Check className="h-4 w-4 text-emerald-600" />
                        : <MessageCircle className="h-4 w-4 text-red-600" />}
                  </div>
                  <div>
                    <p className={`text-xs font-bold leading-tight ${pendingRequest.status === 'pending' ? 'text-purple-800' : pendingRequest.status === 'approved' ? 'text-emerald-800' : 'text-red-800'}`}>
                      {pendingRequest.status === 'pending' ? 'Review in Progress' : pendingRequest.status === 'approved' ? 'Approved with Remarks' : 'Authority Feedback Available'}
                    </p>
                    <p className={`text-[10px] mt-0.5 leading-relaxed ${pendingRequest.status === 'pending' ? 'text-purple-600' : pendingRequest.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {pendingRequest.status === 'pending'
                        ? `Changes made on ${new Date(pendingRequest.created_at).toLocaleDateString()} are currently under review by authority. They will be applied once approved.`
                        : pendingRequest.status === 'approved'
                          ? `Your changes have been approved, but please note the feedback: "${pendingRequest.admin_feedback || 'No detail provided.'}"`
                          : `Your last request was reviewed. Reason: "${pendingRequest.admin_feedback || 'No detail provided.'}"`}
                    </p>
                  </div>
                </div>
              )}

              {/* Group 1: Initiation Details - Indigo Theme */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 transition-all hover:bg-indigo-50 hover:shadow-sm">
                <h3 className="text-sm font-bold text-indigo-800 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Initiation Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
                  {/* Initiated/Aspiring Field */}
                  <div>
                    <label htmlFor="initiationStatus" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Initiated/Aspiring
                    </label>
                    <select
                      id="initiationStatus"
                      value={formData.initiationStatus}
                      onChange={(e) => {
                        const newStatus = e.target.value as 'initiated' | 'aspiring' | '';
                        setFormData(prev => {
                          if (newStatus === 'initiated' && prev.initiationStatus === 'aspiring') {
                            return { ...prev, initiationStatus: newStatus, aspiringSpiritualMasterName: '' };
                          } else if (newStatus === 'aspiring' && prev.initiationStatus === 'initiated') {
                            return { ...prev, initiationStatus: newStatus, initiatedName: '', spiritualMasterName: '' };
                          } else {
                            return { ...prev, initiationStatus: newStatus };
                          }
                        });
                      }}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-indigo-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-indigo-50/50 hover:bg-indigo-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYgOUwxMiAxNUwxOCA5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGlub2pvaW49InJvdW5kIi8+Cjwvc3ZnPg==')] bg-[length:16px] sm:bg-[length:20px] bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                    >
                      <option value="">Select...</option>
                      <option value="initiated">Initiated</option>
                      <option value="aspiring">Aspiring</option>
                    </select>
                  </div>

                  {/* Initiated Name - only shown if Initiated */}
                  {formData.initiationStatus === 'initiated' && (
                    <>
                      <div>
                        <label htmlFor="initiatedName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                          Initiated Name
                        </label>
                        <input
                          id="initiatedName"
                          type="text"
                          value={formData.initiatedName}
                          onChange={(e) => {
                            const sanitized = sanitizeTextInput(e.target.value);
                            setFormData({ ...formData, initiatedName: sanitized });
                            if (fieldErrors.initiatedName) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.initiatedName;
                                return newErrors;
                              });
                            }
                          }}
                          required
                          placeholder="Enter your initiated name"
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-indigo-50/50 hover:bg-indigo-50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md ${fieldErrors.initiatedName
                            ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                            : 'border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                        />
                        {fieldErrors.initiatedName && (
                          <p className="mt-1 text-xs text-red-600">{fieldErrors.initiatedName}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="spiritualMasterName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                          Spiritual Master Name
                        </label>
                        <SearchableSelect
                          options={SPIRITUAL_MASTERS.map(name => ({ id: name, name }))}
                          value={formData.spiritualMasterName}
                          onChange={(value) => {
                            setFormData({ ...formData, spiritualMasterName: value });
                            if (fieldErrors.spiritualMasterName) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.spiritualMasterName;
                                return newErrors;
                              });
                            }
                          }}
                          placeholder="Select Spiritual Master"
                          triggerClassName={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-indigo-50/50 hover:bg-indigo-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${fieldErrors.spiritualMasterName
                            ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                            : 'border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500'
                            }`}
                        />
                        {fieldErrors.spiritualMasterName && (
                          <p className="mt-1 text-xs text-red-600">{fieldErrors.spiritualMasterName}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Aspiring Spiritual Master Name - only shown if Aspiring */}
                  {formData.initiationStatus === 'aspiring' && (
                    <div className="sm:col-span-2 lg:col-span-2">
                      <label htmlFor="aspiringSpiritualMasterName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                        Aspiring Spiritual Master Name
                      </label>
                      <SearchableSelect
                        options={SPIRITUAL_MASTERS.map(name => ({ id: name, name }))}
                        value={formData.aspiringSpiritualMasterName}
                        onChange={(value) => {
                          setFormData({ ...formData, aspiringSpiritualMasterName: value });
                          if (fieldErrors.aspiringSpiritualMasterName) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.aspiringSpiritualMasterName;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="Select Aspiring Spiritual Master"
                        triggerClassName={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-indigo-50/50 hover:bg-indigo-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${fieldErrors.aspiringSpiritualMasterName
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
                      />
                      {fieldErrors.aspiringSpiritualMasterName && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.aspiringSpiritualMasterName}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Group 2: Spiritual Practice - Amber Theme */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 transition-all hover:bg-amber-50 hover:shadow-sm">
                <h3 className="text-sm font-bold text-amber-800 mb-4 border-b border-amber-100 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Spiritual Practice
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
                  {/* Ashram */}
                  <div>
                    <label htmlFor="ashram" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Ashram
                    </label>
                    <select
                      id="ashram"
                      value={formData.ashram}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: any = { ashram: val };
                        if (val === 'Brahmachari' || val === 'Grihastha') {
                          updates.currentCenter = '';
                          updates.otherCenter = '';
                          updates.center = '';
                        }
                        setFormData({ ...formData, ...updates });
                      }}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-amber-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-amber-50/50 hover:bg-amber-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik02IDlMMTIgMTVMMTggOSIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=')] bg-[length:16px] sm:bg-[length:20px] bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                    >
                      <option value="">Select Ashram</option>
                      <option value="Student and Not decided">Student and Not decided</option>
                      <option value="Working and Not Decided">Working and Not Decided</option>
                      <option value="Gauranga Sabha">Gauranga Sabha</option>
                      <option value="Nityananda Sabha">Nityananda Sabha</option>
                      <option value="Grihastha">Grihastha</option>
                      <option value="Brahmachari">Brahmachari</option>
                      <option value="Staying Single (Not planning to marry)">Staying Single (Not planning to marry)</option>
                    </select>
                    {fieldErrors.ashram && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.ashram}</p>
                    )}
                  </div>

                  {/* Introduced to KC */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="introducedToKcIn" className="block text-xs sm:text-sm font-semibold text-gray-700">
                        Introduced to KC on (Date)
                      </label>
                      {pendingRequest?.status === 'pending' && pendingRequest.requested_changes?.introducedToKcIn && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending approval
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <input
                        id="introducedToKcIn"
                        type={(formData.introducedToKcIn && formData.introducedToKcIn.length === 4) ? 'text' : 'date'}
                        value={formData.introducedToKcIn}
                        disabled={!!userData?.hierarchy?.introducedToKcIn}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          const today = new Date().toISOString().split('T')[0];
                          if (selectedDate.length > 4 && selectedDate > today) {
                            setFieldErrors(prev => ({ ...prev, introducedToKcIn: 'Future dates are not allowed' }));
                            return;
                          }
                          setFormData({ ...formData, introducedToKcIn: selectedDate });
                          if (fieldErrors.introducedToKcIn) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.introducedToKcIn;
                              return newErrors;
                            });
                          }
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-amber-50/50 hover:bg-amber-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${userData?.hierarchy?.introducedToKcIn ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''} ${fieldErrors.introducedToKcIn
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-amber-100 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                      />
                      {userData?.hierarchy?.introducedToKcIn && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600">
                          <Save className="w-4 h-4" />
                        </div>
                      )}
                      {formData.introducedToKcIn && formData.introducedToKcIn.length === 4 && !userData?.hierarchy?.introducedToKcIn && (
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, introducedToKcIn: ''})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600 hover:text-amber-700"
                        >
                          Change to Date
                        </button>
                      )}
                    </div>
                    {formData.introducedToKcIn && formData.introducedToKcIn.length === 4 && (
                      <p className="mt-1 text-[10px] text-amber-600">Currently stored as Year. Use &quot;Change to Date&quot; to select a specific date.</p>
                    )}
                    {userData?.hierarchy?.introducedToKcIn && (
                      <p className="mt-1 text-[10px] text-gray-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        This field is locked. Contact admin to change.
                      </p>
                    )}
                    {fieldErrors.introducedToKcIn && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                        <X className="h-3 w-3" />
                        {fieldErrors.introducedToKcIn}
                      </p>
                    )}
                  </div>

                  {/* Rounds */}
                  <div>
                    <label htmlFor="rounds" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      No. of Rounds Chanting
                    </label>
                    <input
                      id="rounds"
                      type="number"
                      min="0"
                      max="64"
                      value={formData.rounds}
                      onChange={(e) => setFormData({ ...formData, rounds: e.target.value })}
                      placeholder="e.g., 16"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-amber-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-amber-50/50 hover:bg-amber-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Counseling Details - Emerald Theme */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 transition-all hover:bg-emerald-50 hover:shadow-sm">
                <h3 className="text-sm font-bold text-emerald-800 mb-4 border-b border-emerald-100 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Counseling Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
                  <div>
                    <label htmlFor="counselor" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Counselor Name
                    </label>
                    <SearchableSelect
                      options={[
                        ...counselors.map(c => ({ id: c.id, name: c.name })),
                        { id: 'None', name: 'None' },
                        { id: 'Other', name: 'Other' }
                      ]}
                      value={formData.counselorId || formData.counselor}
                      valueProperty="id"
                      onChange={(value) => {
                        const selected = counselors.find(c => (c.id === value || c.name === value));
                        if (selected) {
                          setFormData({
                            ...formData,
                            counselor: selected.name,
                            counselorId: selected.id
                          });
                        } else {
                          setFormData({ ...formData, counselor: value, counselorId: '' });
                        }
                      }}
                      placeholder="Select Counselor"
                      disabled={loadingCounselors}
                    />
                  </div>

                  {formData.counselor === 'Other' && (
                    <div className="animate-fadeIn">
                      <label htmlFor="otherCounselor" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                        Other Counselor Name
                      </label>
                      <input
                        id="otherCounselor"
                        type="text"
                        value={formData.otherCounselor}
                        onChange={(e) => setFormData({ ...formData, otherCounselor: e.target.value })}
                        placeholder="Enter counselor name"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-emerald-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-emerald-50/50 hover:bg-emerald-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Group 4: Current Location - Sky Theme */}
              <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 transition-all hover:bg-sky-50 hover:shadow-sm">
                <h3 className="text-sm font-bold text-sky-800 mb-4 border-b border-sky-100 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  Current Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
                  <div>
                    <label htmlFor="currentTemple" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Current Temple
                    </label>
                    <SearchableSelect
                      options={[
                        ...temples.map(t => ({ id: t.name, name: t.name }))
                      ]}
                      value={formData.currentTemple}
                      onChange={(value) => setFormData({ ...formData, currentTemple: value })}
                      placeholder="Select Current Temple"
                      disabled={loadingTemples}
                    />
                  </div>

                  {formData.ashram !== 'Brahmachari' && formData.ashram !== 'Grihastha' && (
                    <>
                      <div>
                        <label htmlFor="currentCenter" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                          Current Center
                        </label>
                        <SearchableSelect
                          options={[
                            ...centers.map(c => ({ id: c.name, name: c.name })),
                            { id: 'Other', name: 'Other' }
                          ]}
                          value={formData.currentCenter}
                          onChange={(value) => setFormData({ ...formData, currentCenter: value, center: value })}
                          placeholder="Select Current Center"
                          disabled={loadingCenters || !formData.currentTemple || formData.currentTemple === 'None'}
                        />
                      </div>

                      {formData.currentCenter === 'Other' && (
                        <div className="animate-fadeIn">
                          <label htmlFor="otherCenter" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                            Other Center Name
                          </label>
                          <input
                            id="otherCenter"
                            type="text"
                            value={formData.otherCenter}
                            onChange={(e) => setFormData({ ...formData, otherCenter: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm p-3 border"
                            placeholder="Type center name"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Group 5: Parent Location - Fuchsia Theme */}
              <div className="bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl p-4 transition-all hover:bg-fuchsia-50 hover:shadow-sm">
                <h3 className="text-sm font-bold text-fuchsia-800 mb-4 border-b border-fuchsia-100 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></span>
                  Parent Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
                  <div>
                    <label htmlFor="parentTemple" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Parent Temple
                    </label>
                    <SearchableSelect
                      options={[
                        ...temples.map(t => ({ id: t.name, name: t.name })),
                        { id: 'Other', name: 'Other' }
                      ]}
                      value={formData.parentTemple}
                      onChange={(value) => setFormData({ ...formData, parentTemple: value })}
                      placeholder="Select Parent Temple"
                      disabled={loadingTemples || !!userData?.hierarchy?.parentTemple}
                    />
                    {userData?.hierarchy?.parentTemple && (
                      <p className="mt-1 text-[10px] text-gray-500 flex items-center gap-1 px-1">
                        <Info className="w-3 h-3" />
                        Locked. Contact admin to change.
                      </p>
                    )}
                  </div>

                  {formData.parentTemple === 'Other' && (
                    <div className="animate-fadeIn">
                      <label htmlFor="otherParentTemple" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                        Other Parent Temple Name
                      </label>
                      <input
                        id="otherParentTemple"
                        type="text"
                        value={formData.otherParentTemple}
                        disabled={!!userData?.hierarchy?.otherParentTemple}
                        onChange={(e) => setFormData({ ...formData, otherParentTemple: e.target.value })}
                        placeholder="Enter temple name"
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-fuchsia-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-gray-900 bg-fuchsia-50/50 hover:bg-fuchsia-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${userData?.hierarchy?.otherParentTemple ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                      />
                      {userData?.hierarchy?.otherParentTemple && (
                        <p className="mt-1 text-[10px] text-gray-500 flex items-center gap-1 px-1">
                          <Info className="w-3 h-3" />
                          Locked. Contact admin to change.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="parentCenter" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Parent Center
                    </label>
                    <SearchableSelect
                      options={[
                        ...parentCenters.map(c => ({ id: c.name, name: c.name })),
                        { id: 'Other', name: 'Other' }
                      ]}
                      value={formData.parentCenter}
                      onChange={(value) => setFormData({ ...formData, parentCenter: value })}
                      placeholder="Select Parent Center"
                      disabled={loadingParentCenters || !formData.parentTemple || !!userData?.hierarchy?.parentCenter}
                    />
                    {userData?.hierarchy?.parentCenter && (
                      <p className="mt-1 text-[10px] text-gray-500 flex items-center gap-1 px-1">
                        <Info className="w-3 h-3" />
                        Locked. Contact admin to change.
                      </p>
                    )}
                  </div>

                  {formData.parentCenter === 'Other' && (
                    <div className="animate-fadeIn">
                      <label htmlFor="otherParentCenter" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                        Other Parent Center Name
                      </label>
                      <input
                        id="otherParentCenter"
                        type="text"
                        value={formData.otherParentCenter}
                        disabled={!!userData?.hierarchy?.otherParentCenter}
                        onChange={(e) => setFormData({ ...formData, otherParentCenter: e.target.value })}
                        placeholder="Enter center name"
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-fuchsia-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-gray-900 bg-fuchsia-50/50 hover:bg-fuchsia-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${userData?.hierarchy?.otherParentCenter ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                      />
                      {userData?.hierarchy?.otherParentCenter && (
                        <p className="mt-1 text-[10px] text-gray-500 flex items-center gap-1 px-1">
                          <Info className="w-3 h-3" />
                          Locked. Contact admin to change.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Education Section Card with Animations */}
          {/* Education Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-visible transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1 relative" style={{ zIndex: 1 }}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Education
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter your higher education details (up to 5 entries)
                  </p>
                </div>
                {education.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEducation(prev => [...prev, { institution: '', degreeBranch: '', startYear: null, endYear: null }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Education
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {education.map((edu, index) => (
                <div key={index} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-amber-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Education Entry {index + 1}</h3>
                    </div>
                    {education.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEducation(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="flex flex-col h-full">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 min-h-[2.5rem] flex flex-col justify-start">
                        <span className="flex items-center gap-1">🏛️ Institution/University</span>
                      </label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...education];
                          updated[index] = { ...updated[index], institution: sanitized };
                          setEducation(updated);
                          if (fieldErrors[`edu_${index}_institution`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`edu_${index}_institution`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (edu.institution && edu.institution.trim()) {
                            const validation = validateEducationField(edu.institution, `Education ${index + 1} - Institution`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`edu_${index}_institution`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., University of Delhi"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-gray-50 transition-all duration-200 ${fieldErrors[`edu_${index}_institution`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                      />
                      {fieldErrors[`edu_${index}_institution`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`edu_${index}_institution`]}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col h-full">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 min-h-[2.5rem] flex flex-col justify-start">
                        <span className="flex items-center gap-1">🎓 Degree-Branch</span>
                        <span className="text-[10px] sm:text-xs font-normal text-gray-500">eg. B.Tech. Electronics Engineering</span>
                      </label>
                      <input
                        type="text"
                        value={edu.degreeBranch}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...education];
                          updated[index] = { ...updated[index], degreeBranch: sanitized };
                          setEducation(updated);
                          if (fieldErrors[`edu_${index}_degreeBranch`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`edu_${index}_degreeBranch`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (edu.degreeBranch && edu.degreeBranch.trim()) {
                            const validation = validateEducationField(edu.degreeBranch, `Education ${index + 1} - Degree-Branch`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`edu_${index}_degreeBranch`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., B.Tech. Electronics Engineering"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-gray-50 transition-all duration-200 ${fieldErrors[`edu_${index}_degreeBranch`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                      />
                      {fieldErrors[`edu_${index}_degreeBranch`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`edu_${index}_degreeBranch`]}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col h-full sm:col-span-2 lg:col-span-1">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 min-h-[2.5rem] flex flex-col justify-start">
                        <span className="flex items-center gap-1">📅 Time Period (From - To)</span>
                      </label>
                      <div className="flex items-center gap-2 h-full">
                        <div className="relative flex-1 group">
                          <input
                            type="number"
                            value={edu.startYear || ''}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[index] = { ...updated[index], startYear: e.target.value ? parseInt(e.target.value) : null };
                              setEducation(updated);
                            }}
                            placeholder="From"
                            min="1900"
                            max={new Date().getFullYear() + 10}
                            className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white hover:bg-gray-50 transition-all duration-200"
                          />
                        </div>
                        <span className="text-gray-400 font-bold">-</span>
                        <div className="relative flex-1 group">
                          <input
                            type="number"
                            value={edu.endYear || ''}
                            onChange={(e) => {
                              const updated = [...education];
                              updated[index] = { ...updated[index], endYear: e.target.value ? parseInt(e.target.value) : null };
                              setEducation(updated);
                            }}
                            placeholder="To"
                            min="1900"
                            max={new Date().getFullYear() + 10}
                            className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white hover:bg-gray-50 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Work Experience Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Work Experience
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter your professional work experience (up to 5 entries)
                  </p>
                </div>
                {workExperience.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setWorkExperience(prev => [...prev, { company: '', position: '', location: '', startDate: null, endDate: null, current: false }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Work Experience
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {workExperience.map((work, index) => (
                <div key={index} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-indigo-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Work Experience {index + 1}</h3>
                    </div>
                    {workExperience.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setWorkExperience(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex flex-col h-full">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 min-h-[2.5rem] flex flex-col justify-start transform transition-all duration-200 group-hover:translate-x-1">
                        <span className="flex items-center gap-1">🏢 Company Name</span>
                      </label>
                      <input
                        type="text"
                        value={work.company}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], company: sanitized };
                          setWorkExperience(updated);
                          if (fieldErrors[`work_${index}_company`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`work_${index}_company`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (work.company && work.company.trim()) {
                            const validation = validateWorkField(work.company, `Work ${index + 1} - Company`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`work_${index}_company`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., Google Inc."
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${fieldErrors[`work_${index}_company`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
                      />
                      {fieldErrors[`work_${index}_company`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`work_${index}_company`]}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col h-full">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 min-h-[2.5rem] flex flex-col justify-start transform transition-all duration-200 group-hover:translate-x-1">
                        <span className="flex items-center gap-1">💼 Title/Position</span>
                      </label>
                      <input
                        type="text"
                        value={work.position}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], position: sanitized };
                          setWorkExperience(updated);
                          if (fieldErrors[`work_${index}_position`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`work_${index}_position`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (work.position && work.position.trim()) {
                            const validation = validateWorkField(work.position, `Work ${index + 1} - Title/Position`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`work_${index}_position`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., Software Engineer"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${fieldErrors[`work_${index}_position`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
                      />
                      {fieldErrors[`work_${index}_position`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`work_${index}_position`]}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col h-full sm:col-span-2 lg:col-span-1">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 min-h-[2.5rem] flex flex-col justify-start transform transition-all duration-200 group-hover:translate-x-1">
                        <span className="flex items-center gap-1">📍 Location(City, State, Country)</span>
                      </label>
                      <input
                        type="text"
                        value={work.location}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], location: sanitized };
                          setWorkExperience(updated);
                          if (fieldErrors[`work_${index}_location`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`work_${index}_location`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (work.location && work.location.trim()) {
                            const validation = validateWorkField(work.location, `Work ${index + 1} - Location`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`work_${index}_location`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., Pune, Maharashtra, India"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${fieldErrors[`work_${index}_location`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                      />
                      {fieldErrors[`work_${index}_location`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`work_${index}_location`]}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 transform transition-all duration-200 group-hover:scale-110" />
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={work.startDate || ''}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          const today = new Date().toISOString().split('T')[0];
                          if (selectedDate > today) {
                            return; // Or show error, but max attribute usually handles this UI-wise
                          }
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], startDate: selectedDate || null };
                          setWorkExperience(updated);
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-indigo-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 transform transition-all duration-200 group-hover:scale-110" />
                        End Date
                      </label>
                      <input
                        type="date"
                        value={work.endDate || ''}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          const today = new Date().toISOString().split('T')[0];
                          if (selectedDate > today) {
                            return;
                          }
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], endDate: selectedDate || null, current: false };
                          setWorkExperience(updated);
                        }}
                        disabled={work.current}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-indigo-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 focus:scale-[1.02] focus:shadow-md"
                      />
                    </div>
                    <div className="flex items-end sm:col-span-2 lg:col-span-1">
                      <label className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 border-2 border-indigo-100 rounded-lg sm:rounded-xl hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer w-full transition-all duration-300 bg-white transform hover:scale-[1.02]">
                        <input
                          type="checkbox"
                          checked={work.current}
                          onChange={(e) => {
                            const updated = [...workExperience];
                            updated[index] = { ...updated[index], current: e.target.checked, endDate: e.target.checked ? null : updated[index].endDate };
                            setWorkExperience(updated);
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">✓ Currently working here</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Camps Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 relative z-10">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                Camps Completed
              </h2>
              <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11 relative z-10">
                Mark the camps you have successfully completed
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { key: 'campDys', label: 'DYS', emoji: '🎓' },
                  { key: 'campSankalpa', label: 'Sankalpa', emoji: '🌱' },
                  { key: 'campSphurti', label: 'Sphurti', emoji: '⚡' },
                  { key: 'campUtkarsh', label: 'Utkarsh', emoji: '🚀' },
                  { key: 'campSrcgdWorkshop', label: 'SRCGD Workshop', emoji: '🎯' },
                  { key: 'campNishtha', label: 'Nishtha', emoji: '💎' },
                  { key: 'campFtec', label: 'FTEC', emoji: '🏗️' },
                  { key: 'campAshraya', label: 'Ashraya', emoji: '🛡️' },
                  { key: 'campMtec', label: 'MTEC', emoji: '📈' },
                  { key: 'campSharanagati', label: 'Sharanagati', emoji: '🙏' },
                  { key: 'campIdc', label: 'IDC', emoji: '🔑' },
                  { key: 'campBhaktiShastri', label: 'Bhakti Shastri', emoji: '📜' },
                  { key: 'campPositiveThinker', label: 'Positive Thinker', emoji: '🧠' },
                  { key: 'campSelfManager', label: 'Self Manager', emoji: '⌚' },
                  { key: 'campProactiveLeader', label: 'Proactive Leader', emoji: '👑' },
                ].map((camp, index) => (
                  <label
                    key={camp.key}
                    className={`group flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[camp.key as keyof typeof formData] as boolean
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg ring-2 ring-emerald-200 scale-105'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md'
                      }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <input
                      type="checkbox"
                      checked={formData[camp.key as keyof typeof formData] as boolean}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          [camp.key]: e.target.checked,
                        }));
                      }}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                    />
                    <span className={`text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2 flex-1 transform transition-all duration-200 group-hover:translate-x-1 ${formData[camp.key as keyof typeof formData] as boolean
                      ? 'text-emerald-800'
                      : 'text-gray-700 group-hover:text-emerald-700'
                      }`}>
                      <span className="text-base sm:text-lg transform transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">{camp.emoji}</span>
                      {camp.label}
                    </span>
                    {formData[camp.key as keyof typeof formData] as boolean && (
                      <span className="ml-auto text-emerald-600 text-sm sm:text-base flex-shrink-0 animate-scaleIn transform transition-all duration-300">
                        ✓
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SP Books Study Course Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 relative z-10">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                SP Books Study Course
              </h2>
              <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11 relative z-10">
                Track your progress through the systematic study course
              </p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Third Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 rounded-xl sm:rounded-2xl border-2 border-blue-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-blue-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-cyan-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">3rd</span>
                      <span className="text-sm sm:text-base lg:text-lg">Third Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 3.5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookThirdSsr15', label: 'Science of Self Realisation (Chapters 1-5)' },
                      { key: 'spbookThirdComingBack', label: 'Coming Back' },
                      { key: 'spbookThirdPqpa', label: 'Perfect Questions and Perfect Answers' },
                      { key: 'spbookThirdMatchlessGift', label: 'Matchless Gift' },
                      { key: 'spbookThirdRajaVidya', label: 'Raja Vidya' },
                      { key: 'spbookThirdElevationKc', label: 'Elevation to KC' },
                      { key: 'spbookThirdBeyondBirthDeath', label: 'Beyond Birth and Death' },
                      { key: 'spbookThirdKrishnaReservoir', label: 'Krishna – the reservoir of all Pleasure' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-blue-500 bg-blue-100 shadow-lg ring-2 ring-blue-200 scale-105'
                          : 'border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-blue-900'
                          : 'text-gray-700 group-hover:text-blue-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fourth Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 rounded-xl sm:rounded-2xl border-2 border-green-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-green-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-emerald-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">4th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Fourth Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 4 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookFourthSsr68', label: 'Science of Self Realisation (Chapters 6-8)' },
                      { key: 'spbookFourthLawsOfNature', label: 'Laws of Nature' },
                      { key: 'spbookFourthDharma', label: 'Dharma' },
                      { key: 'spbookFourthSecondChance', label: 'Second chance book' },
                      { key: 'spbookFourthIsopanishad110', label: 'Isopanishad Mantra (Mantra 1-10)' },
                      { key: 'spbookFourthQueenKuntiVideo', label: 'Teachings of Queen Kunti (see SP Video)' },
                      { key: 'spbookFourthEnlightenmentNatural', label: 'Enlightenment by Natural Path' },
                      { key: 'spbookFourthKrishnaBook121', label: 'Krishna Book (Chapters 1-21)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-green-500 bg-green-100 shadow-lg ring-2 ring-green-200 scale-105'
                          : 'border-green-200 bg-white hover:border-green-400 hover:bg-green-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-green-900'
                          : 'text-gray-700 group-hover:text-green-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fifth Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 rounded-xl sm:rounded-2xl border-2 border-purple-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-purple-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-violet-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-purple-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">5th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Fifth Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 4.5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookFifthLifeFromLife', label: 'Life comes from Life' },
                      { key: 'spbookFifthPrahladTeachings', label: 'Teachings of Prahlad maharaja' },
                      { key: 'spbookFifthJourneySelfDiscovery', label: 'Journey of Self Discovery' },
                      { key: 'spbookFifthQueenKuntiHearing', label: 'Teachings of Queen Kunti (only hearing RSP classes)' },
                      { key: 'spbookFifthLordKapila', label: 'Teachings of Lord Kapila' },
                      { key: 'spbookFifthNectar16', label: 'Nectar of Instruction (Text 1-6)' },
                      { key: 'spbookFifthGita16', label: 'Bhagavad gita As It Is (Chapters 1-6)' },
                      { key: 'spbookFifthKrishnaBook2428', label: 'Krishna Book (Chapters 24-28)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-purple-500 bg-purple-100 shadow-lg ring-2 ring-purple-200 scale-105'
                          : 'border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-purple-900'
                          : 'text-gray-700 group-hover:text-purple-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sixth Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 rounded-xl sm:rounded-2xl border-2 border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-amber-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-yellow-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-amber-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">6th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Sixth Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookSixthNectar711', label: 'Nectar of Instruction (Text 7-11)' },
                      { key: 'spbookSixthPathPerfection', label: 'Path of Perfection' },
                      { key: 'spbookSixthCivilisationTranscendence', label: 'Civilisation and Transcendence' },
                      { key: 'spbookSixthHareKrishnaChallenge', label: 'Hare Krishna Challenge' },
                      { key: 'spbookSixthGita712', label: 'Bhagavad gita As It Is (Chapters 7-12)' },
                      { key: 'spbookSixthSb1stCanto16', label: 'Srimad Bhagavatam 1st canto (Chapters 1-6)' },
                      { key: 'spbookSixthKrishnaBook3559', label: 'Krishna Book (Chapters 35-59)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-amber-500 bg-amber-100 shadow-lg ring-2 ring-amber-200 scale-105'
                          : 'border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-amber-900'
                          : 'text-gray-700 group-hover:text-amber-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seventh Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 rounded-xl sm:rounded-2xl border-2 border-indigo-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-indigo-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-blue-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">7th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Seventh Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookSeventhGita1318', label: 'Bhagavad gita As It Is (Chapters 13-18)' },
                      { key: 'spbookSeventhSb1stCanto713', label: 'Srimad Bhagavatam 1st canto (Chapters 7-13)' },
                      { key: 'spbookSeventhKrishnaBook6378', label: 'Krishna Book (Chapters 63-78)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-indigo-500 bg-indigo-100 shadow-lg ring-2 ring-indigo-200 scale-105'
                          : 'border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-indigo-900'
                          : 'text-gray-700 group-hover:text-indigo-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Eighth Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 rounded-xl sm:rounded-2xl border-2 border-rose-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-rose-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-pink-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-rose-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">8th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Eighth Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-rose-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookEighthSb1stCanto1419', label: 'Srimad Bhagavatam 1st canto (Chapters 14-19)' },
                      { key: 'spbookEighthKrishnaBook7889', label: 'Krishna Book (Chapters 78-89)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-rose-500 bg-rose-100 shadow-lg ring-2 ring-rose-200 scale-105'
                          : 'border-rose-200 bg-white hover:border-rose-400 hover:bg-rose-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 border-gray-300 rounded focus:ring-rose-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-rose-900'
                          : 'text-gray-700 group-hover:text-rose-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Languages Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Languages
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter languages you know (up to 5 entries)
                  </p>
                </div>
                {languages.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setLanguages(prev => [...prev, { name: '' }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Language
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {languages.map((lang, index) => (
                <div key={`lang-${index}`} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-blue-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Language {index + 1}</h3>
                    </div>
                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setLanguages(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                      🌐 Language Name
                    </label>
                    <input
                      type="text"
                      value={lang?.name ?? ''}
                      onChange={(e) => {
                        const sanitized = sanitizeTextInput(e.target.value);
                        setLanguages(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], name: sanitized };
                          return updated;
                        });
                      }}
                      placeholder="e.g., English, Hindi, Sanskrit"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white hover:bg-blue-50/50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Section Card - Hidden for now
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Skills
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter your skills (up to 5 entries)
                  </p>
                </div>
                {skills.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSkills(prev => [...prev, { name: '' }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Skill
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {skills.map((skill, index) => (
                <div key={`skill-${index}`} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-purple-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 hover:border-purple-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Skill {index + 1}</h3>
                    </div>
                    {skills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSkills(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                      💼 Skill Name
                    </label>
                    <input
                      type="text"
                      value={skill?.name ?? ''}
                      onChange={(e) => {
                        const sanitized = sanitizeTextInput(e.target.value);
                        setSkills(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], name: sanitized };
                          return updated;
                        });
                      }}
                      placeholder="e.g., Programming, Teaching, Cooking"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white hover:bg-purple-50/50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {/* Services Rendered Section Card - Hidden for now
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Services Rendered
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter services you have rendered (up to 5 entries)
                  </p>
                </div>
                {services.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setServices([...services, { name: '' }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Service
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {services.map((service, index) => (
                <div key={`service-${index}`} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-green-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Service {index + 1}</h3>
                    </div>
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setServices(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                      🙏 Service Name
                    </label>
                    <input
                      type="text"
                      value={service?.name ?? ''}
                      onChange={(e) => {
                        const sanitized = sanitizeTextInput(e.target.value);
                        setServices(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], name: sanitized };
                          return updated;
                        });
                      }}
                      placeholder="e.g., Temple Service, Kitchen Service, Book Distribution"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-green-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white hover:bg-green-50/50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {/* Submit Button - Devotional Colors with Enhanced Animations */}
          <div className="flex justify-center pt-4 sm:pt-6 animate-on-scroll">
            <button
              type="submit"
              disabled={saving}
              className="group relative flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-white sm:bg-gradient-to-r sm:from-amber-500 sm:via-orange-400 sm:to-amber-600 text-blue-900 sm:text-white lg:text-blue-900 lg:font-bold rounded-lg sm:rounded-xl font-bold text-sm sm:text-base lg:text-lg shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden w-full sm:w-auto border-2 border-blue-600 sm:border-amber-300 ripple-effect"
            >
              <div className="absolute inset-0 sm:bg-gradient-to-r sm:from-amber-600 sm:to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-30"></div>
              <Save className="h-5 w-5 sm:h-6 sm:w-6 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 drop-shadow-sm" />
              <span className="relative z-10 drop-shadow-sm text-center w-full">
                {saving ? (
                  <span className="flex items-center justify-center gap-2 w-full">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs sm:text-sm lg:text-base font-semibold">Saving Changes...</span>
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm lg:text-base transform transition-all duration-300 group-hover:scale-105 font-semibold">Save All Changes</span>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Fixed Toast Notifications */}
      <div className="fixed top-24 right-4 z-[1000000] flex flex-col gap-4 w-full max-w-md pointer-events-none p-4">
        {error && (
          <div className="pointer-events-auto bg-white border-l-4 border-red-500 text-gray-800 px-6 py-4 rounded-xl shadow-2xl flex items-start gap-4 animate-slideInRight ring-1 ring-black/5">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-bold text-red-800 text-lg mb-1">Error</h3>
              <p className="text-sm text-gray-600 leading-relaxed break-words">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {success && (
          <div className="pointer-events-auto bg-white border-l-4 border-green-500 text-gray-800 px-6 py-4 rounded-xl shadow-2xl flex items-start gap-4 animate-slideInRight ring-1 ring-black/5">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-bold text-green-800 text-lg mb-1">Success</h3>
              <p className="text-sm text-gray-600 leading-relaxed break-words">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Sticky Save Button - Floating Action Button Style */}
      <div className={`fixed bottom-6 right-6 z-[101] transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isDirty ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-32 opacity-0 scale-75 pointer-events-none'}`}>
        <button
          type="button"
          onClick={(e) => handleSubmit({ preventDefault: () => { } } as React.FormEvent)}
          disabled={saving}
          className="flex items-center gap-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full shadow-2xl hover:shadow-[0_10px_30px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-sm sm:text-lg border-2 border-white/20 backdrop-blur-sm group"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <div className="relative">
              <Save className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-amber-600 animate-pulse"></span>
            </div>
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
