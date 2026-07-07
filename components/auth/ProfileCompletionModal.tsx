'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';
import { validateMobile, validateEmail, isValidName } from '@/lib/utils/validation';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function ProfileCompletionModal({ isOpen, onComplete }: ProfileCompletionModalProps) {
  const { user, userData } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    ashram: '',
    parentTemple: '',
    parentCenter: '',
    counselor: '',
  });

  const [temples, setTemples] = useState<Array<{ id: string; name: string; state: string; city: string }>>([]);
  const [centers, setCenters] = useState<Array<{ id: string; name: string; state: string; city: string }>>([]);
  const [counselors, setCounselors] = useState<Array<{ id: string; name: string; email: string; ashram?: string; user_id?: string }>>([]);

  const [loadingTemples, setLoadingTemples] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingCounselors, setLoadingCounselors] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load temples from database
  useEffect(() => {
    const loadTemples = async () => {
      setLoadingTemples(true);
      try {
        const { data, error } = await supabase!
          .from('temples')
          .select('id, name, state, city')
          .eq('is_verified', true)
          .order('name');

        if (!error && data) {
          setTemples(data);
        }
      } catch (err) {
        console.error('Error loading temples:', err);
      } finally {
        setLoadingTemples(false);
      }
    };
    loadTemples();
  }, []);

  // Load centers from database
  useEffect(() => {
    const loadCenters = async () => {
      setLoadingCenters(true);
      try {
        const { data, error } = await supabase!
          .from('centers')
          .select('id, name, state, city')
          .eq('is_verified', true)
          .order('name');

        if (!error && data) {
          setCenters(data);
        }
      } catch (err) {
        console.error('Error loading centers:', err);
      } finally {
        setLoadingCenters(false);
      }
    };
    loadCenters();
  }, []);

  // Load counselors from database
  useEffect(() => {
    const loadCounselors = async () => {
      setLoadingCounselors(true);
      try {
        const { data, error } = await supabase!
          .from('counselors')
          .select('id, name, email, ashram, user_id')
          .eq('is_verified', true)
          .order('name');

        if (!error && data) {
          setCounselors(data);
        }
      } catch (err) {
        console.error('Error loading counselors:', err);
      } finally {
        setLoadingCounselors(false);
      }
    };
    loadCounselors();
  }, []);

  // Pre-fill form with existing user data
  useEffect(() => {
    if (userData) {
      const userAny = userData as any;
      setFormData({
        name: userAny.name || '',
        phone: userAny.phone || '',
        email: userAny.email || user?.email || '',
        birthDate: userAny.birth_date || userAny.birthDate || '',
        ashram: userAny.ashram || '',
        parentTemple: userAny.parent_temple || userAny.parentTemple || '',
        parentCenter: userAny.parent_center || userAny.parentCenter || '',
        counselor: userAny.hierarchy?.counselor || userAny.counselor || '',
      });
    }
  }, [userData, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !isValidName(formData.name)) {
      setError('Please enter a valid name');
      return;
    }

    if (!formData.email || !validateEmail(formData.email)) {
      setError('Please enter a valid email');
      return;
    }

    if (formData.phone && !validateMobile(formData.phone)) {
      setError('Please enter a valid phone number');
      return;
    }

    if (!formData.birthDate) {
      setError('Please enter your date of birth');
      return;
    }

    if (!formData.ashram) {
      setError('Please select your ashram');
      return;
    }

    if (!formData.parentTemple) {
      setError('Please select your parent temple');
      return;
    }

    if (!formData.parentCenter) {
      setError('Please select your parent center');
      return;
    }

    if (!formData.counselor) {
      setError('Please select your counselor/care giver');
      return;
    }

    setLoading(true);

    try {
      if (!user) throw new Error('No user found');

      // Find selected counselor details
      const selectedCounselor = counselors.find(c => c.id === formData.counselor);

      const counselorData: any = {};
      if (selectedCounselor) {
        // Essential Stable Link (ID)
        counselorData.counselor_id = selectedCounselor.user_id || null;

        // Readable Legacy/Redundant data
        counselorData.counselor = selectedCounselor.name;

        // Preserve Ashram-specific fields for backward compatibility if needed, but unified is preferred
        if (selectedCounselor.ashram === 'Brahmachari') {
          counselorData.brahmachari_counselor = selectedCounselor.name;
          counselorData.brahmachari_counselor_email = selectedCounselor.email;
        } else {
          counselorData.grihastha_counselor = selectedCounselor.name;
          counselorData.grihastha_counselor_email = selectedCounselor.email;
        }
      }

      // Update user profile
      const { error: updateError } = await supabase!
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email,
          birth_date: formData.birthDate,
          ashram: formData.ashram,
          parent_temple: formData.parentTemple,
          parent_center: formData.parentCenter,
          counselor: counselorData.counselor || null,
          counselor_id: counselorData.counselor_id || null,
          ...counselorData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update profile');
      }

      // Success - close modal and let AuthProvider refresh user data
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const onClose = () => {
    // Cannot close modal - profile completion is required
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primary-700">
              Complete Your Profile
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Required to continue
            </p>
          </div>

          <p className="text-gray-600 mb-6">
            Please provide your basic information to access the platform.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Ashram */}
            <div>
              <label htmlFor="ashram" className="block text-sm font-medium text-gray-700 mb-1">
                Ashram <span className="text-red-500">*</span>
              </label>
              <select
                id="ashram"
                value={formData.ashram}
                onChange={(e) => setFormData({ ...formData, ashram: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
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
            </div>

            {/* Parent Temple */}
            <div>
              <label htmlFor="parentTemple" className="block text-sm font-medium text-gray-700 mb-1">
                Parent Temple <span className="text-red-500">*</span>
              </label>
              <select
                id="parentTemple"
                value={formData.parentTemple}
                onChange={(e) => setFormData({ ...formData, parentTemple: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                disabled={loadingTemples}
              >
                <option value="">{loadingTemples ? 'Loading temples...' : 'Select Parent Temple'}</option>
                {temples.map((temple) => (
                  <option key={temple.id} value={temple.name}>
                    {temple.name} ({temple.city}, {temple.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Center */}
            <div>
              <label htmlFor="parentCenter" className="block text-sm font-medium text-gray-700 mb-1">
                Parent Center <span className="text-red-500">*</span>
              </label>
              <select
                id="parentCenter"
                value={formData.parentCenter}
                onChange={(e) => setFormData({ ...formData, parentCenter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                disabled={loadingCenters}
              >
                <option value="">{loadingCenters ? 'Loading centers...' : 'Select Parent Center'}</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.name}>
                    {center.name} ({center.city}, {center.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Counselor/Care Giver */}
            <div>
              <label htmlFor="counselor" className="block text-sm font-medium text-gray-700 mb-1">
                Counselor / Care Giver <span className="text-red-500">*</span>
              </label>
              <select
                id="counselor"
                value={formData.counselor}
                onChange={(e) => setFormData({ ...formData, counselor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={loadingCounselors}
              >
                <option value="">{loadingCounselors ? 'Loading counselors...' : 'Select Counselor'}</option>
                {counselors.map((counselor) => (
                  <option key={counselor.id} value={counselor.id}>
                    {counselor.name} {counselor.ashram ? `(${counselor.ashram})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
