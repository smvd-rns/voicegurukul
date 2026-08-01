'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Plus, Trash2, Edit2, X, Search, MapPin, Building2, Users } from 'lucide-react';
import { getCentersByLocationFromLocal, addCenterToLocal, deleteCenterFromLocal, CenterData } from '@/lib/data/local-centers';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';
import { getRoleHierarchyNumber } from '@/lib/utils/roles';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function CentersPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [centers, setCenters] = useState<CenterData[]>([]);
  const [temples, setTemples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ processed: 0, total: 0, errors: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Add Center Form State
  const [newCenter, setNewCenter] = useState<{
    id?: string;
    name: string;
    templeId: string;
    address: string;
    contact: string;
    projectManagerId?: string;
    projectAdvisorId?: string;
    actingManagerId?: string;
    internalManagerId?: string;
    preachingCoordinatorId?: string;
    morningProgramInChargeId?: string;
    mentorId?: string;
    frontlinerId?: string;
    accountantId?: string;
    kitchenHeadId?: string;
    studyInChargeId?: string;
  }>({
    name: '',
    templeId: '',
    address: '',
    contact: '',
    projectManagerId: '',
    projectAdvisorId: '',
    actingManagerId: '',
    internalManagerId: '',
    preachingCoordinatorId: '',
    morningProgramInChargeId: '',
    mentorId: '',
    frontlinerId: '',
    accountantId: '',
    kitchenHeadId: '',
    studyInChargeId: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<CenterData | null>(null);

  // Only Super Admin (Role 8) can access this page
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    loadCenters();
    loadTemples();
    loadUsers(); // Fetch users when loading
  }, [isSuperAdmin, router]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/centers/eligible-roles', {
        headers: {
          'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadCenters = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('centers')
        .select('*, temple_id, temple_name')
        .order('name');

      if (error) throw error;

      // Map to match CenterData interface but include new fields
      const formattedCenters = ((data || []) as any[]).map((center: any) => ({
        ...center,
        // Ensure backward compatibility if types mismatch
        templeId: center.temple_id,
        templeName: center.temple_name
      }));

      setCenters(formattedCenters);
    } catch (error) {
      console.error('Error loading centers:', error);
      toast.error('Failed to load centers');
    } finally {
      setLoading(false);
    }
  };

  const loadTemples = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('temples')
      .select('*')
      .order('name');

    if (data) {
      setTemples(data);
    }
  };

  // Prepare searchable options for temples
  const templeOptions = temples.map(temple => ({
    id: temple.id,
    name: `${temple.name}${temple.city ? ` (${temple.city})` : ''}`,
    email: temple.state ? `State: ${temple.state}` : undefined
  }));

  // Filter centers based on search
  const filteredCenters = centers.filter(center =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredCenters.length / ITEMS_PER_PAGE);
  const paginatedCenters = filteredCenters.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const totalCenters = centers.length;
  const totalCities = new Set(centers.map(c => c.city)).size;
  const totalStates = new Set(centers.map(c => c.state)).size;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.name.endsWith('.xlsx') ||
        selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        setFile(null);
      }
    }
  };

  const parseExcel = async (file: File): Promise<any[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          } catch (error) {
            reject(new Error('Failed to parse Excel file. Please ensure it is a valid Excel file.'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(new Error('Failed to load Excel parser. Please refresh the page and try again.'));
      }
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setImporting(true);
    setError('');
    setProgress({ processed: 0, total: 0, errors: 0 });

    try {
      const data = await parseExcel(file);
      setProgress({ processed: 0, total: data.length, errors: 0 });

      let processed = 0;
      let errors = 0;

      for (const row of data) {
        try {
          const name = row.name || row.Name || '';
          const state = row.state || row.State || '';
          const city = row.city || row.City || '';
          const address = row.address || row.Address || '';
          const contact = row.contact || row.Contact || '';

          if (!name || !state || !city) {
            errors++;
            continue;
          }

          await addCenterToLocal({
            name,
            state,
            city,
            address: address || undefined,
            contact: contact || undefined,
          });

          processed++;
          setProgress({ processed, total: data.length, errors });
        } catch (err: any) {
          console.error('Error importing center:', err);
          errors++;
          setProgress({ processed, total: data.length, errors });
        }
      }

      toast.success(`Successfully imported ${processed} centers. ${errors} errors.`);
      setFile(null);
      loadCenters();

      const fileInput = document.getElementById('excel-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
      toast.error('Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  const handleAddCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCenter.name || !newCenter.templeId) {
      setError('Name and Temple are required');
      return;
    }

    const selectedTemple = temples.find(t => t.id === newCenter.templeId);
    if (!selectedTemple) {
      setError('Invalid temple selected');
      return;
    }

    console.log('Adding center with temple:', selectedTemple);
    console.log('Payload:', {
      name: newCenter.name,
      state: selectedTemple.state,
      city: selectedTemple.city,
      address: newCenter.address || selectedTemple.address,
      contact: newCenter.contact || null,
      temple_id: newCenter.templeId,
      temple_name: selectedTemple.name,
      project_manager_id: newCenter.projectManagerId,
      project_advisor_id: newCenter.projectAdvisorId,
      acting_manager_id: newCenter.actingManagerId
    });

    const selectedPM = users.find(u => u.id === newCenter.projectManagerId);
    const selectedPA = users.find(u => u.id === newCenter.projectAdvisorId);
    const selectedAM = users.find(u => u.id === newCenter.actingManagerId);
    const selectedIM = users.find(u => u.id === newCenter.internalManagerId);
    const selectedPC = users.find(u => u.id === newCenter.preachingCoordinatorId);
    const selectedMP = users.find(u => u.id === newCenter.morningProgramInChargeId);
    const selectedMentor = users.find(u => u.id === newCenter.mentorId);
    const selectedFL = users.find(u => u.id === newCenter.frontlinerId);
    const selectedACC = users.find(u => u.id === newCenter.accountantId);
    const selectedKH = users.find(u => u.id === newCenter.kitchenHeadId);
    const selectedSI = users.find(u => u.id === newCenter.studyInChargeId);

    const payload = {
      id: isEditing ? newCenter.id : undefined,
      name: newCenter.name,
      state: selectedTemple.state,
      city: selectedTemple.city,
      address: newCenter.address || selectedTemple.address,
      contact: newCenter.contact || undefined,
      temple_id: newCenter.templeId,
      temple_name: selectedTemple.name,
      project_manager_id: newCenter.projectManagerId,
      project_manager_name: selectedPM?.name,
      project_advisor_id: newCenter.projectAdvisorId,
      project_advisor_name: selectedPA?.name,
      acting_manager_id: newCenter.actingManagerId,
      acting_manager_name: selectedAM?.name,
      internal_manager_id: newCenter.internalManagerId,
      internal_manager_name: selectedIM?.name,
      preaching_coordinator_id: newCenter.preachingCoordinatorId,
      preaching_coordinator_name: selectedPC?.name,
      morning_program_in_charge_id: newCenter.morningProgramInChargeId,
      morning_program_in_charge_name: selectedMP?.name,
      mentor_id: newCenter.mentorId,
      mentor_name: selectedMentor?.name,
      frontliner_id: newCenter.frontlinerId,
      frontliner_name: selectedFL?.name,
      accountant_id: newCenter.accountantId,
      accountant_name: selectedACC?.name,
      kitchen_head_id: newCenter.kitchenHeadId,
      kitchen_head_name: selectedKH?.name,
      study_in_charge_id: newCenter.studyInChargeId,
      study_in_charge_name: selectedSI?.name
    };

    try {
      const url = isEditing ? '/api/centers/update' : '/api/centers/add';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(isEditing ? 'Center updated successfully' : 'Center added successfully');
        setNewCenter({
          name: '', templeId: '', address: '', contact: '',
          projectManagerId: '', projectAdvisorId: '', actingManagerId: '',
          internalManagerId: '', preachingCoordinatorId: '', morningProgramInChargeId: '',
          mentorId: '', frontlinerId: '', accountantId: '', kitchenHeadId: '', studyInChargeId: ''
        });
        setIsEditing(false);
        setShowAddModal(false);
        loadCenters();
      } else {
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'add'} center`);
      }
    } catch (err: any) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} center:`, err);
      setError(err.message || `Failed to ${isEditing ? 'update' : 'add'} center`);
      toast.error(err.message || `Failed to ${isEditing ? 'update' : 'add'} center`);
    }
  };



  const handleEditClick = (center: any) => {
    // Resolve temple ID if needed
    const matchedTemple = temples.find(t => t.id === center.temple_id || (center.temple_name && t.name?.toLowerCase() === center.temple_name?.toLowerCase()));

    // Populate form with center data
    setNewCenter({
      id: center.id,
      name: center.name,
      templeId: matchedTemple ? matchedTemple.id : (center.temple_id || ''),
      address: center.address || '',
      contact: center.contact || '',
      projectManagerId: center.project_manager_id || '',
      projectAdvisorId: center.project_advisor_id || '',
      actingManagerId: center.acting_manager_id || '',
      internalManagerId: center.internal_manager_id || '',
      preachingCoordinatorId: center.preaching_coordinator_id || '',
      morningProgramInChargeId: center.morning_program_in_charge_id || '',
      mentorId: center.mentor_id || '',
      frontlinerId: center.frontliner_id || '',
      accountantId: center.accountant_id || '',
      kitchenHeadId: center.kitchen_head_id || '',
      studyInChargeId: center.study_in_charge_id || ''
    });

    const missingUsers: any[] = [];
    const checkAndAdd = (id: string | undefined | null, name: string | undefined | null) => {
        if (id && name && !users.some(u => u.id === id)) {
            missingUsers.push({ id, name, email: name + ' (Unlinked User)' });
        }
    };

    checkAndAdd(center.project_manager_id, center.project_manager_name);
    checkAndAdd(center.project_advisor_id, center.project_advisor_name);
    checkAndAdd(center.acting_manager_id, center.acting_manager_name);
    checkAndAdd(center.internal_manager_id, center.internal_manager_name);
    checkAndAdd(center.preaching_coordinator_id, center.preaching_coordinator_name);
    checkAndAdd(center.morning_program_in_charge_id, center.morning_program_in_charge_name);
    checkAndAdd(center.mentor_id, center.mentor_name);
    checkAndAdd(center.frontliner_id, center.frontliner_name);
    checkAndAdd(center.accountant_id, center.accountant_name);
    checkAndAdd(center.kitchen_head_id, center.kitchen_head_name);
    checkAndAdd(center.study_in_charge_id, center.study_in_charge_name);

    if (missingUsers.length > 0) {
        setUsers(prev => [...prev, ...missingUsers]);
    }

    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleDeleteClick = (center: CenterData) => {
    setCenterToDelete(center);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!centerToDelete) return;

    try {
      const success = await deleteCenterFromLocal(centerToDelete.id);
      if (success) {
        toast.success('Center deleted successfully');
        loadCenters();
        setShowDeleteModal(false);
        setCenterToDelete(null);
      } else {
        setError('Failed to delete center');
        toast.error('Failed to delete center');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete center');
      toast.error(err.message || 'Failed to delete center');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gray-50/50 min-h-screen">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 p-8 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-white">
            <h1 className="text-3xl font-extrabold tracking-tight">Centers Management</h1>
            <p className="mt-2 text-orange-100 text-lg">Manage and monitor ISKCON centers across India</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setNewCenter({ name: '', templeId: '', address: '', contact: '' });
                setIsEditing(false);
                setShowAddModal(true);
              }}
              className="px-6 py-3 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all font-semibold flex items-center shadow-md hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Center
            </button>
          </div>
        </div>
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-orange-400/20 blur-3xl"></div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center hover:shadow-md transition-shadow">
          <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center mr-5 shadow-sm">
            <Building2 className="h-7 w-7 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Centers</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCenters}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center hover:shadow-md transition-shadow">
          <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center mr-5 shadow-sm">
            <MapPin className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cities Covered</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCities}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center hover:shadow-md transition-shadow">
          <div className="h-14 w-14 bg-purple-50 rounded-2xl flex items-center justify-center mr-5 shadow-sm">
            <Users className="h-7 w-7 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">States Covered</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalStates}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search centers by name, city or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-gray-50/50 hover:bg-white transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Import Section - Only for Super Admin (Role 8) */}
      {isSuperAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer" onClick={() => setImporting(!importing)}>
            <div className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="font-semibold text-gray-700">Bulk Import via Excel</h3>
            </div>
            <span className="text-xs text-primary-600 font-medium">Click to expand</span>
          </div>

          {importing && (
            <div className="p-6 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-4">
                <div>
                  <label htmlFor="excel-file" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File (.xlsx or .xls)
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex-1 cursor-pointer">
                      <input
                        id="excel-file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors bg-gray-50 hover:bg-white">
                        <Upload className="h-8 w-8 text-gray-400 mr-3" />
                        <span className="text-gray-600">
                          {file ? file.name : 'Click to select Excel file'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2 font-medium">Excel Format Guide:</p>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    <li><strong>name</strong> (required) - Center name</li>
                    <li><strong>state</strong> (required) - State name</li>
                    <li><strong>city</strong> (required) - City name</li>
                    <li><strong>address</strong> (optional) - Center address</li>
                    <li><strong>contact</strong> (optional) - Contact information</li>
                  </ul>
                </div>

                {importing && progress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Processing: {progress.processed} / {progress.total}</span>
                      <span>Errors: {progress.errors}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={!file}
                  className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Start Import
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Centers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0">
              <tr>
                <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name & Temple</th>
                <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedCenters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900">No centers found</p>
                      <p className="text-gray-500 mt-2">Try adjusting your search or add a new center.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCenters.map((center) => (
                  <tr key={center.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{center.name}</div>
                        {/* @ts-ignore - using dynamic property */}
                        {center.temple_name && (
                          <div className="flex items-center mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              <Building2 className="w-3 h-3 mr-1" />
                              {center.temple_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{center.city}</div>
                      <div className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">{center.state}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 line-clamp-2 max-w-xs leading-relaxed" title={center.address || ''}>
                        {center.address || <span className="text-gray-300 italic">No address provided</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(center)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
                          title="Edit Center"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(center)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                          title="Delete Center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredCenters.length)}</span> of <span className="font-medium">{filteredCenters.length}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Center Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-[90%] sm:w-[80%] md:w-full md:max-w-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-gray-100">

            {/* Colorful Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-white">{isEditing ? 'Edit Center' : 'Add New Center'}</h2>
                <p className="text-orange-100 text-sm mt-1">{isEditing ? 'Update the details for this center.' : 'Enter the details for the new ISKCON center.'}</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddCenter} className="space-y-6">

                {/* Section: Basic Info */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-500" /> Center Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Center Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newCenter.name}
                        onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })}
                        required
                        placeholder="e.g. Bhaktivedanta Youth Post"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-400 text-sm transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Associated Temple <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={templeOptions}
                        value={newCenter.templeId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, templeId: val })}
                        placeholder="Search & Select Temple..."
                        valueProperty="id"
                        className="w-full"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 pl-1">
                        Location: {temples.find(t => t.id === newCenter.templeId)?.city || '-'}, {temples.find(t => t.id === newCenter.templeId)?.state || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Management Team */}
                <div className="bg-orange-50/30 p-4 rounded-xl border border-orange-100/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-500" /> Management Team
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Project Manager - Mandatory */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Project Manager <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.projectManagerId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, projectManagerId: val })}
                        placeholder="Search & Select Project Manager..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Project Advisor - Optional */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Project Advisor <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.projectAdvisorId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, projectAdvisorId: val })}
                        placeholder="Search Advisor..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Acting Manager - Optional */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Acting Manager <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.actingManagerId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, actingManagerId: val })}
                        placeholder="Search Manager..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Identifying Roles (Roles 22-29) */}
                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" /> Identifying Roles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Internal Manager (22) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Internal Manager (22)
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.internalManagerId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, internalManagerId: val })}
                        placeholder="Search..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Preaching Coordinator (23) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Preaching Coord. (23)
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.preachingCoordinatorId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, preachingCoordinatorId: val })}
                        placeholder="Search..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Morning Program In-charge (24) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Morning Program IC (24)
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.morningProgramInChargeId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, morningProgramInChargeId: val })}
                        placeholder="Search..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Mentor (25) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Mentor (25)
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.mentorId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, mentorId: val })}
                        placeholder="Search..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Frontliner (26) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Frontliner (26)
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.frontlinerId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, frontlinerId: val })}
                        placeholder="Search..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Accountant (27) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Accountant (27)
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.accountantId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, accountantId: val })}
                        placeholder="Search..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Kitchen Head (28) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Kitchen Head (28)
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.kitchenHeadId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, kitchenHeadId: val })}
                        placeholder="Search..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>

                    {/* Study In-charge (29) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                        Study In-charge (29)
                      </label>
                      <SearchableSelect
                        options={users}
                        value={newCenter.studyInChargeId || ''}
                        onChange={(val) => setNewCenter({ ...newCenter, studyInChargeId: val })}
                        placeholder="Search..."
                        valueProperty="id"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Address <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                  </label>
                  <textarea
                    value={newCenter.address}
                    onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })}
                    rows={2}
                    placeholder="Enter full address. If left blank, it will be associated with the temple's location."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-400 text-sm transition-all"
                  />
                </div>

                <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-medium rounded-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  >
                    {isEditing ? 'Update Center' : 'Create Center'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && centerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete Center?
              </h3>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{centerToDelete.name}</span>?
                This action cannot be undone.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                >
                  Delete Center
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
