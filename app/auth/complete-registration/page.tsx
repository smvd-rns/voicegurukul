'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { updateUser } from '@/lib/supabase/users';
import { getCentersByTempleFromSupabase } from '@/lib/supabase/centers';
import { getTemplesFromSupabase } from '@/lib/supabase/temples';
import { supabase } from '@/lib/supabase/config';
import { Loader2, User, Phone, Mail, Calendar, Home, Building2, CheckCircle2, ChevronRight, Flower, AlertTriangle } from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function CompleteRegistrationPage() {
    const { user, userData, loading: authLoading, refreshUserData } = useAuth();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeStep, setActiveStep] = useState(1); // 1: Personal, 2: Spiritual

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        birthDate: '',
        counselor: '',
        counselorId: '',
        otherCounselor: '',
        ashram: '',
        temple: '',
        templeId: '',
        center: '',
        otherCenter: '',
        otherTemple: '',
        parentTemple: '',
        parentTempleId: '',
        otherParentTemple: '',
        parentCenter: '',
        otherParentCenter: '',
        introducedToKcIn: '',
    });

    const [centers, setCenters] = useState<Array<{ id: string; name: string }>>([]);
    const [parentCenters, setParentCenters] = useState<Array<{ id: string; name: string }>>([]);
    const [counselors, setCounselors] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [temples, setTemples] = useState<Array<{ id: string; name: string }>>([]);

    const [loadingCenters, setLoadingCenters] = useState(false);
    const [loadingParentCenters, setLoadingParentCenters] = useState(false);
    const [loadingCounselors, setLoadingCounselors] = useState(true);
    const [loadingTemples, setLoadingTemples] = useState(true);

    const ashramOptions = [
        'Student and Not decided',
        'Working and Not Decided',
        'Gauranga Sabha',
        'Nityananda Sabha',
        'Brahmachari',
        'Grihastha',
        'Staying Single (Not planning to marry)',
    ];

    // Redirect user to pending page if they have already submitted and status is pending
    useEffect(() => {
        if (!authLoading && userData?.verificationStatus === 'pending') {
            router.push('/auth/pending');
        }
    }, [userData, authLoading, router]);

    // Load initial data
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: prev.name || userData?.name || user.user_metadata?.name || user.user_metadata?.full_name || '',
                email: prev.email || user.email || '',
                // Initialize spiritual fields if they exist in userData
                introducedToKcIn: userData?.hierarchy?.introducedToKcIn || (userData as any)?.introducedToKcIn || '',
                parentTemple: userData?.hierarchy?.parentTemple || (userData as any)?.parentTemple || '',
                parentTempleId: '', // Will be resolved if parentTemple exists
                otherParentTemple: userData?.hierarchy?.otherParentTemple || (userData as any)?.otherTemple || '',
                parentCenter: userData?.hierarchy?.parentCenter || (userData as any)?.parentCenter || '',
                otherParentCenter: userData?.hierarchy?.otherParentCenter || (userData as any)?.otherParentCenter || '',
                ashram: userData?.hierarchy?.ashram || '',
                temple: userData?.hierarchy?.currentTemple || (userData as any)?.currentTemple || '',
                center: userData?.hierarchy?.currentCenter || (userData as any)?.currentCenter || '',
                counselor: userData?.hierarchy?.counselor || '',
                counselorId: userData?.hierarchy?.counselorId || '',
            }));
        }
    }, [user, userData]);

    // Auto-resolve parentTempleId if parentTemple exists
    useEffect(() => {
        if (formData.parentTemple && !formData.parentTempleId && temples.length > 0) {
            const match = temples.find(t => t.name === formData.parentTemple);
            if (match) {
                setFormData(prev => ({ ...prev, parentTempleId: match.id }));
            }
        }
    }, [temples, formData.parentTemple, formData.parentTempleId]);

    // Load temples from Supabase
    useEffect(() => {
        getTemplesFromSupabase()
            .then(data => setTemples(data.map(t => ({ id: t.id, name: t.name }))))
            .catch(err => console.error('Error loading temples:', err))
            .finally(() => setLoadingTemples(false));
    }, []);

    // Load counselors from Supabase
    useEffect(() => {
        if (!supabase) return;

        const loadCounselors = async () => {
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
                    .eq('is_verified', true)
                    .order('name');

                if (error) {
                    console.error('Error loading counselors:', error);
                } else if (data) {
                    // Normalize data to include temple info for easier filtering
                    const normalized = data.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        email: c.email,
                        temple: c.current_temple || c.parent_temple || c.user?.current_temple || c.user?.parent_temple || ''
                    }));
                    setCounselors(normalized);
                }
            } finally {
                setLoadingCounselors(false);
            }
        };

        loadCounselors();
    }, []);

    // Filter counselors based on selected temple or parent temple
    const memoizedFilteredCounselors = useMemo(() => {
        const connectedTemple = formData.temple === 'Other' ? formData.otherTemple : formData.temple;
        const parentTemple = formData.parentTemple === 'Other' ? formData.otherParentTemple : formData.parentTemple;

        if (!connectedTemple && !parentTemple) return [];

        return counselors.filter((c: any) => {
            const cTemple = (c as any).temple || '';
            const matchesConnected = connectedTemple && cTemple.toLowerCase() === connectedTemple.toLowerCase();
            const matchesParent = parentTemple && cTemple.toLowerCase() === parentTemple.toLowerCase();
            return matchesConnected || matchesParent;
        });
    }, [counselors, formData.temple, formData.otherTemple, formData.parentTemple, formData.otherParentTemple]);

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

    // Load centers when temple changes
    useEffect(() => {
        if (formData.templeId) {
            setLoadingCenters(true);
            getCentersByTempleFromSupabase(formData.templeId)
                .then(data => setCenters(data.map(c => ({ id: c.id, name: c.name }))))
                .catch(err => console.error('Error loading centers:', err))
                .finally(() => setLoadingCenters(false));
        } else {
            setCenters([]);
        }
    }, [formData.templeId]);

    // Load parent centers when parent temple changes
    useEffect(() => {
        if (formData.parentTempleId) {
            setLoadingParentCenters(true);
            getCentersByTempleFromSupabase(formData.parentTempleId)
                .then(data => setParentCenters(data.map(c => ({ id: c.id, name: c.name }))))
                .catch(err => console.error('Error loading parent centers:', err))
                .finally(() => setLoadingParentCenters(false));
        } else {
            setParentCenters([]);
        }
    }, [formData.parentTempleId]);

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate Step 1
        if (activeStep === 1) {
            if (!formData.name.trim()) return setError('Name is required');
            if (!formData.phone.trim()) return setError('Phone is required');
            if (!formData.birthDate) return setError('Date of Birth is required');
            setActiveStep(2);
        } else {
            handleSubmit(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Step 2 Validation
        if (!formData.ashram) {
            setError('Ashram is required');
            return;
        }

        if (!formData.temple) {
            setError('Current Temple is required');
            return;
        }

        if (formData.temple === 'Other' && !formData.otherTemple.trim()) {
            setError('Please specify the other temple name');
            return;
        }

        const requiresCurrentCenter = formData.ashram !== 'Brahmachari' && formData.ashram !== 'Grihastha';
        if (requiresCurrentCenter && !formData.center) {
            setError('Current Center is required');
            return;
        }

        if (requiresCurrentCenter && formData.center === 'Other' && !formData.otherCenter.trim()) {
            setError('Please specify the other center name');
            return;
        }

        if (!formData.parentTemple) {
            setError('Parent Temple is required');
            return;
        }

        if (formData.parentTemple === 'Other' && !formData.otherParentTemple.trim()) {
            setError('Please specify the other parent temple name');
            return;
        }

        if (!formData.parentCenter) {
            setError('Parent Center is required');
            return;
        }

        if (formData.parentCenter === 'Other' && !formData.otherParentCenter.trim()) {
            setError('Please specify the other parent center name');
            return;
        }

        if (!formData.introducedToKcIn) {
            setError('Introduced to KC date is required');
            return;
        }

        if (!formData.counselor) {
            setError('Counselor is required. Please select a counselor or select "Other" and enter their name.');
            return;
        }

        if (formData.counselor === 'Other' && !formData.otherCounselor.trim()) {
            setError('Please specify the counselor name for "Other"');
            return;
        }

        if (!user) {
            setError('User session not found');
            return;
        }

        setSaving(true);

        try {
            // Prepare hierarchy data
            const hierarchy: any = {};
            if (formData.center && formData.center !== 'None') hierarchy.currentCenter = formData.center;
            if (formData.center === 'Other') hierarchy.otherCenter = formData.otherCenter;
            if (formData.temple === 'Other') hierarchy.otherTemple = formData.otherTemple;

            if (formData.counselor && formData.counselor !== 'None') {
                hierarchy.counselor = formData.counselor;
                hierarchy.counselorId = formData.counselorId || undefined;
            }
            if (formData.counselor === 'Other') hierarchy.otherCounselor = formData.otherCounselor;

            if (formData.ashram) hierarchy.ashram = formData.ashram;
            if (formData.temple) hierarchy.currentTemple = formData.temple;

            // New spiritual fields
            if (formData.introducedToKcIn) hierarchy.introducedToKcIn = formData.introducedToKcIn;
            if (formData.parentTemple) hierarchy.parentTemple = formData.parentTemple;
            if (formData.parentTemple === 'Other') hierarchy.otherParentTemple = formData.otherParentTemple;
            if (formData.parentCenter) hierarchy.parentCenter = formData.parentCenter;
            if (formData.parentCenter === 'Other') hierarchy.otherParentCenter = formData.otherParentCenter;

            // Update user with all data and set status to pending
            await updateUser(user.id, {
                email: formData.email, // Required for new user creation
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                birthDate: formData.birthDate,
                otherCounselor: formData.counselor === 'Other' ? formData.otherCounselor : undefined,
                currentTemple: formData.temple || undefined,
                otherTemple: formData.temple === 'Other' ? formData.otherTemple : undefined,
                currentCenter: formData.center !== 'None' ? formData.center : undefined,
                otherCenter: formData.center === 'Other' ? formData.otherCenter : undefined,

                // Add top-level fields for new spiritual columns
                introducedToKcIn: formData.introducedToKcIn || undefined,
                parentTemple: formData.parentTemple || undefined,
                parentCenter: formData.parentCenter || undefined,

                verificationStatus: userData?.verificationStatus === 'unverified' ? 'approved' : 'pending', // Auto-approve imported users, others go to pending
                rejectionReason: null as any, // Clear previous rejection reason
                reviewedBy: null as any,
                reviewedAt: null as any,
                role: !userData ? [1] : undefined, // Default to student role for new users
                hierarchy,
            });

            // Trigger the email notification to project/acting managers silently for non-imported users
            if (userData?.verificationStatus !== 'unverified') {
                try {
                    await fetch('/api/emails/new-registration', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id })
                    });
                } catch (emailErr: any) {
                    console.error('Failed to trigger registration email:', emailErr);
                }
            }

            // Generate Membership ID immediately after joining
            try {
                await fetch('/api/membership/generate', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token}`
                    }
                });
            } catch (genErr: any) {
                console.error('Failed to auto-generate membership ID:', genErr);
                // Don't block registration for ID generation failure
            }

            setSuccess('Registration completed! Redirecting...');

            // Refresh auth state in memory before redirect
            await refreshUserData();

            // Redirect to dashboard if auto-approved, otherwise to pending approval page
            if (userData?.verificationStatus === 'unverified') {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/auth/pending';
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Failed to complete registration');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-orange-50">
                <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
            </div>
        );
    }

    if (!user) {
        router.push('/auth/login');
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            {/* Left Panel - Branding & Hero */}
            <div className="lg:w-1/2 bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 text-white">
                <div className="absolute inset-0 opacity-10 mix-blend-overlay"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                            <Flower className="w-8 h-8 text-yellow-300" />
                        </div>
                        <span className="text-2xl font-serif font-bold tracking-wide">VOICE Gurukul</span>
                    </div>
                </div>

                <div className="relative z-10 max-w-lg mb-12">
                    <h1 className="text-4xl lg:text-5xl font-bold font-serif mb-6 leading-tight">
                        Start Your <br />
                        <span className="text-yellow-200">Spiritual Journey</span>
                    </h1>
                    <p className="text-lg text-orange-100 leading-relaxed mb-8">
                        Join our community of devotees. Connect with mentors, track your sadhana, and grow in your spiritual life with guidance and support.
                    </p>

                    <div className="space-y-2 font-serif text-yellow-100/80">
                        <p className="text-sm tracking-wider uppercase">Hare Krishna Mahamantra</p>
                        <p className="text-xl font-medium">Hare Krishna Hare Krishna Krishna Krishna Hare Hare</p>
                        <p className="text-xl font-medium opacity-80">Hare Rama Hare Rama Rama Rama Hare Hare</p>
                    </div>
                </div>

                <div className="relative z-10 flex gap-2">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${activeStep === 1 ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${activeStep === 2 ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} />
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                            {activeStep === 1 ? 'Personal Details' : 'Spiritual Connection'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {activeStep === 1
                                ? 'Let\'s get to know you better. Please provide your basic information.'
                                : 'Almost there! Tell us about your spiritual associations.'}
                        </p>
                    </div>

                    {/* Rejection Message */}
                    {userData?.verificationStatus === 'rejected' && userData.rejectionReason && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Application Rejected</h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        <p>{userData.rejectionReason}</p>
                                    </div>
                                    <p className="mt-2 text-sm text-red-600 italic">
                                        Please update your details according to the feedback and resubmit.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-10 fade-in duration-300">
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded shadow-lg flex items-center gap-3">
                                <span className="font-medium">Error:</span> {error}
                            </div>
                        </div>
                    )}
                    {success && (
                        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-10 fade-in duration-300">
                            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-6 py-4 rounded shadow-lg flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5" /> {success}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleNextStep} className="mt-8 space-y-6">
                        {/* Step 1: Personal Information */}
                        <div className={`space-y-6 ${activeStep === 1 ? 'block' : 'hidden'}`}>
                            {/* Name */}
                            <div className="group">
                                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-orange-600 transition-colors">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <User className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6 transition-all"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="group">
                                <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-orange-600 transition-colors">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                    </div>
                                    <input
                                        type="tel"
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6 transition-all"
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                            </div>

                            {/* Email (Read-only) */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        value={formData.email}
                                        readOnly
                                        className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-500 bg-gray-50 shadow-sm ring-1 ring-inset ring-gray-200 sm:text-sm sm:leading-6 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Date of Birth */}
                            <div className="group">
                                <label htmlFor="birthDate" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-orange-600 transition-colors">
                                    Date of Birth <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Calendar className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                    </div>
                                    <input
                                        type="date"
                                        id="birthDate"
                                        value={formData.birthDate}
                                        max={new Date().toISOString().split('T')[0]} // Prevent future dates
                                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                        className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="flex w-full justify-center items-center gap-2 rounded-lg bg-orange-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                            >
                                Next Step <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Step 2: Spiritual Information */}
                        <div className={`space-y-6 ${activeStep === 2 ? 'block' : 'hidden'}`}>
                            {/* Ashram Selection */}
                            <div className="group">
                                <label htmlFor="ashram" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-orange-600 transition-colors">
                                    Ashram Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="ashram"
                                    value={formData.ashram}
                                    onChange={(e) => {
                                        const newAshram = e.target.value;
                                        setFormData((prev) => ({
                                            ...prev,
                                            ashram: newAshram,
                                            // Reset center if Brahmachari or Grihastha
                                            ...((newAshram === 'Brahmachari' || newAshram === 'Grihastha') ? { center: 'None', otherCenter: '' } : {})
                                        }));
                                    }}
                                    className="block w-full rounded-lg border-0 py-3 pl-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6 transition-all"
                                >
                                    <option value="">Select Ashram</option>
                                    {ashramOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Connected Location Group - Green Theme */}
                            <div className="bg-emerald-100/40 border border-emerald-200 rounded-xl p-4 space-y-4">
                                <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Current Location
                                </h3>
                                
                                {/* Temple Selection */}
                                <div className="group">
                                    <label htmlFor="temple" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-emerald-600 transition-colors">
                                        Temple <span className="text-red-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            ...temples.map((t) => ({ id: t.id, name: t.name })),
                                            { id: 'Other', name: 'Other' }
                                        ]}
                                        value={formData.temple}
                                        valueProperty="name"
                                        disabled={loadingTemples}
                                        placeholder={loadingTemples ? "Loading temples..." : "Search & Select Temple"}
                                        onChange={(value) => {
                                            const selectedTemple = temples.find(t => t.name === value || t.id === value);
                                            setFormData({
                                                ...formData,
                                                temple: value,
                                                templeId: selectedTemple?.id || '',
                                                center: '',
                                                otherTemple: value === 'Other' ? formData.otherTemple : ''
                                            });
                                        }}
                                    />
                                </div>

                                {/* Other Temple Input */}
                                {formData.temple === 'Other' && (
                                    <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                        <label htmlFor="otherTemple" className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                                            Other Temple Name
                                        </label>
                                        <input
                                            type="text"
                                            id="otherTemple"
                                            value={formData.otherTemple}
                                            onChange={(e) => setFormData({ ...formData, otherTemple: e.target.value })}
                                            className="block w-full rounded-lg border-0 py-3 pl-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
                                            placeholder="Enter temple name"
                                        />
                                    </div>
                                )}

                                {/* Center Selection */}
                                {formData.temple && formData.ashram !== 'Brahmachari' && formData.ashram !== 'Grihastha' && (
                                    <div className="group animate-in slide-in-from-top-2 fade-in duration-200">
                                        <label htmlFor="center" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-emerald-600 transition-colors">
                                            Center <span className="text-red-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            options={[
                                                ...centers.map((c) => ({ id: c.id, name: c.name })),
                                                { id: 'None', name: 'None' },
                                                { id: 'Other', name: 'Other' }
                                            ]}
                                            value={formData.center}
                                            valueProperty="name"
                                            disabled={loadingCenters}
                                            placeholder={loadingCenters ? "Loading centers..." : "Search & Select Center"}
                                            onChange={(value) => {
                                                setFormData({
                                                    ...formData,
                                                    center: value,
                                                    otherCenter: value === 'Other' ? formData.otherCenter : ''
                                                });
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Other Center Input */}
                                {formData.temple && formData.ashram !== 'Brahmachari' && formData.ashram !== 'Grihastha' && formData.center === 'Other' && (
                                    <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                        <label htmlFor="otherCenter" className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                                            Other Center Name
                                        </label>
                                        <input
                                            type="text"
                                            id="otherCenter"
                                            value={formData.otherCenter}
                                            onChange={(e) => setFormData({ ...formData, otherCenter: e.target.value })}
                                            className="block w-full rounded-lg border-0 py-3 pl-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
                                            placeholder="Enter center name"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Parent Location Group */}
                            <div className="bg-purple-100/40 border border-purple-200 rounded-xl p-4 space-y-4">
                                <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    Parent Location
                                </h3>

                                {/* Parent Temple Selection */}
                                <div className="group">
                                    <label htmlFor="parentTemple" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-purple-600 transition-colors">
                                        Parent Temple <span className="text-red-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            ...temples.map((t) => ({ id: t.id, name: t.name })),
                                            { id: 'Other', name: 'Other' }
                                        ]}
                                        value={formData.parentTemple}
                                        valueProperty="name"
                                        disabled={loadingTemples || !!(userData?.hierarchy?.parentTemple || (userData as any)?.parentTemple)}
                                        placeholder={loadingTemples ? "Loading parent temples..." : "Search & Select Parent Temple"}
                                        onChange={(value) => {
                                            const selectedTemple = temples.find(t => t.name === value || t.id === value);
                                            setFormData({
                                                ...formData,
                                                parentTemple: value,
                                                parentTempleId: selectedTemple?.id || '',
                                                parentCenter: '',
                                                otherParentTemple: value === 'Other' ? formData.otherParentTemple : ''
                                            });
                                        }}
                                    />
                                </div>

                                {/* Other Parent Temple Input */}
                                {formData.parentTemple === 'Other' && (
                                    <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                        <label htmlFor="otherParentTemple" className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                                            Other Parent Temple Name
                                        </label>
                                        <input
                                            type="text"
                                            id="otherParentTemple"
                                            value={formData.otherParentTemple}
                                            disabled={!!(userData?.hierarchy?.otherParentTemple || (userData as any)?.otherParentTemple)}
                                            onChange={(e) => setFormData({ ...formData, otherParentTemple: e.target.value })}
                                            className={`block w-full rounded-lg border-0 py-3 pl-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6 ${(userData?.hierarchy?.otherParentTemple || (userData as any)?.otherParentTemple) ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                                            placeholder="Enter parent temple name"
                                        />
                                    </div>
                                )}

                                {/* Parent Center Selection */}
                                {formData.parentTemple && (
                                    <div className="group animate-in slide-in-from-top-2 fade-in duration-200">
                                        <label htmlFor="parentCenter" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-purple-600 transition-colors">
                                            Parent Center <span className="text-red-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            options={[
                                                ...parentCenters.map((c) => ({ id: c.id, name: c.name })),
                                                { id: 'None', name: 'None' },
                                                { id: 'Other', name: 'Other' }
                                            ]}
                                            value={formData.parentCenter}
                                            valueProperty="name"
                                            disabled={loadingParentCenters || !!(userData?.hierarchy?.parentCenter || (userData as any)?.parentCenter)}
                                            placeholder={loadingParentCenters ? "Loading parent centers..." : "Search & Select Parent Center"}
                                            onChange={(value) => {
                                                setFormData({
                                                    ...formData,
                                                    parentCenter: value,
                                                    otherParentCenter: value === 'Other' ? formData.otherParentCenter : ''
                                                });
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Other Parent Center Input */}
                                {formData.parentTemple && formData.parentCenter === 'Other' && (
                                    <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                        <label htmlFor="otherParentCenter" className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                                            Other Parent Center Name
                                        </label>
                                        <input
                                            type="text"
                                            id="otherParentCenter"
                                            value={formData.otherParentCenter}
                                            disabled={!!(userData?.hierarchy?.otherParentCenter || (userData as any)?.otherParentCenter)}
                                            onChange={(e) => setFormData({ ...formData, otherParentCenter: e.target.value })}
                                            className={`block w-full rounded-lg border-0 py-3 pl-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6 ${(userData?.hierarchy?.otherParentCenter || (userData as any)?.otherParentCenter) ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                                            placeholder="Enter parent center name"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Introduced to KC */}
                            <div className="group">
                                <label htmlFor="introducedToKcIn" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-orange-600 transition-colors">
                                    Introduced to KC Since <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Calendar className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                    </div>
                                    <input
                                        type="date"
                                        id="introducedToKcIn"
                                        value={formData.introducedToKcIn}
                                        max={new Date().toISOString().split('T')[0]}
                                        disabled={!!(userData?.hierarchy?.introducedToKcIn || (userData as any)?.introducedToKcIn)}
                                        onChange={(e) => setFormData({ ...formData, introducedToKcIn: e.target.value })}
                                        className={`block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6 transition-all ${(userData?.hierarchy?.introducedToKcIn || (userData as any)?.introducedToKcIn) ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                                    />
                                </div>
                            </div>

                            {/* Counselor Selection */}
                            <div className="group">
                                <label htmlFor="counselor" className="block text-sm font-medium leading-6 text-gray-900 mb-1 group-focus-within:text-orange-600 transition-colors">
                                    Counselor / Care Giver <span className="text-red-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={[
                                        ...memoizedFilteredCounselors.map((c: any) => ({ id: c.id, name: c.name })),
                                        { id: 'None', name: 'None' },
                                        { id: 'Other', name: 'Other' }
                                    ]}
                                    value={formData.counselorId || formData.counselor}
                                    valueProperty="id"
                                    onChange={(value) => {
                                        const selected = counselors.find(c => c.id === value || c.name === value);
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

                            {/* Other Counselor Input */}
                            {formData.counselor === 'Other' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                    <label htmlFor="otherCounselor" className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                                        Other Counselor Name
                                    </label>
                                    <input
                                        type="text"
                                        id="otherCounselor"
                                        value={formData.otherCounselor}
                                        onChange={(e) => setFormData({ ...formData, otherCounselor: e.target.value })}
                                        className="block w-full rounded-lg border-0 py-3 pl-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6"
                                        placeholder="Enter counselor name"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex w-full justify-center items-center gap-2 rounded-lg bg-orange-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Completing Registration...
                                        </>
                                    ) : (
                                        <>
                                            Complete Registration <CheckCircle2 className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveStep(1)}
                                    disabled={saving}
                                    className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors py-2"
                                >
                                    ← Back to Personal Details
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
