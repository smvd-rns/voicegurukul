'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  CheckCircle,
  Upload,
  FileSpreadsheet,
  Download,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Building2,
  Globe,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  getCitiesFromLocal,
  addCityToLocal,
  deleteCityFromLocal,
  updateCityInLocal,
} from '@/lib/data/local-cities';
import { indianStates } from '@/lib/data/india-states';
import {
  importAllIndianCities,
  importMappedCitiesOnly,
  getIndianCitiesCount,
} from '@/lib/data/import-indian-cities';
import {
  importAllCitiesFromTxt,
  getAllCitiesTxtCount,
} from '@/lib/data/import-all-cities-txt';

export default function CitiesPage() {
  const { userData } = useAuth();
  const router = useRouter();

  const [cities, setCities] = useState<Array<{ id: string; name: string; state: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // UI State
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importTab, setImportTab] = useState<'excel' | 'prepackaged'>('excel');
  const [filterState, setFilterState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'state'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Add City state
  const [newCity, setNewCity] = useState({ name: '', state: '' });
  const [addingCity, setAddingCity] = useState(false);

  // Edit City Modal state
  const [editingCity, setEditingCity] = useState<{ id: string; name: string; state: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [updatingCity, setUpdatingCity] = useState(false);
  const [editError, setEditError] = useState('');

  // File Import state
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, errors: 0 });

  // Pre-packaged Datasets states
  const [importingFromWorldCities, setImportingFromWorldCities] = useState(false);
  const [availableCitiesCount, setAvailableCitiesCount] = useState<number | null>(null);
  const [importMode, setImportMode] = useState<'all' | 'mapped-only'>('mapped-only');
  const [importStats, setImportStats] = useState<{ mapped: number; unmapped: number }>({ mapped: 0, unmapped: 0 });

  const [importingFromTxt, setImportingFromTxt] = useState(false);
  const [availableTxtCitiesCount, setAvailableTxtCitiesCount] = useState<number | null>(null);

  const [importingFromAllCityTxt, setImportingFromAllCityTxt] = useState(false);

  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);

  const loadCities = useCallback(async () => {
    setLoading(true);
    try {
      const citiesData = await getCitiesFromLocal();
      const allCities: Array<{ id: string; name: string; state: string }> = [];

      Object.keys(citiesData).forEach((state) => {
        citiesData[state].forEach((name, index) => {
          allCities.push({
            id: `${state}-${name}-${index}`,
            name,
            state,
          });
        });
      });

      setCities(allCities);
    } catch (err) {
      console.error('Error loading cities:', err);
      setError('Failed to load cities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    loadCities();
    getIndianCitiesCount().then((count) => setAvailableCitiesCount(count));
    getAllCitiesTxtCount().then((count) => setAvailableTxtCitiesCount(count));
  }, [isSuperAdmin, router, loadCities]);

  // Reset pagination when search, filter, or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterState, searchQuery, sortField, sortOrder, pageSize]);

  // Toggle sorting helper
  const handleSort = (field: 'name' | 'state') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Derived Metrics
  const metrics = useMemo(() => {
    const totalCities = cities.length;
    const statesWithCities = new Set(cities.map((c) => c.state));
    const statesCount = statesWithCities.size;

    // Calculate state with most cities
    const countsByState: Record<string, number> = {};
    cities.forEach((c) => {
      countsByState[c.state] = (countsByState[c.state] || 0) + 1;
    });

    let topStateName = 'None';
    let topStateCount = 0;
    Object.entries(countsByState).forEach(([st, cnt]) => {
      if (cnt > topStateCount) {
        topStateCount = cnt;
        topStateName = st;
      }
    });

    return {
      totalCities,
      statesCount,
      topStateName,
      topStateCount,
      countsByState,
    };
  }, [cities]);

  // Filtered & Sorted Cities
  const filteredCities = useMemo(() => {
    const filtered = cities.filter((city) => {
      const matchesState = filterState ? city.state === filterState : true;
      const matchesSearch = searchQuery
        ? city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          city.state.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesState && matchesSearch;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortField === 'name') {
        const diff = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        if (diff !== 0) return sortOrder === 'asc' ? diff : -diff;
        return a.state.localeCompare(b.state);
      } else {
        const diff = a.state.localeCompare(b.state, undefined, { sensitivity: 'base' });
        if (diff !== 0) return sortOrder === 'asc' ? diff : -diff;
        return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [cities, filterState, searchQuery, sortField, sortOrder]);

  // Paginated Cities
  const paginatedCities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCities.slice(start, start + pageSize);
  }, [filteredCities, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCities.length / pageSize) || 1;

  // Add City Handler
  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.name.trim() || !newCity.state) {
      setError('City name and state are required');
      return;
    }

    setAddingCity(true);
    setError('');
    setSuccess('');

    try {
      const ok = await addCityToLocal(newCity.state, newCity.name.trim());
      if (ok) {
        setSuccess(`City "${newCity.name.trim()}" added to ${newCity.state} successfully`);
        setNewCity({ name: '', state: '' });
        setShowAddForm(false);
        loadCities();
      } else {
        setError('Failed to add city. It may already exist in this state.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add city');
    } finally {
      setAddingCity(false);
    }
  };

  // Open Edit City Modal
  const handleOpenEdit = (city: { id: string; name: string; state: string }) => {
    setEditingCity(city);
    setEditName(city.name);
    setEditError('');
  };

  // Update City Handler
  const handleUpdateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity) return;

    const trimmedNew = editName.trim();
    if (!trimmedNew) {
      setEditError('City name cannot be empty');
      return;
    }

    if (trimmedNew === editingCity.name) {
      setEditingCity(null);
      return;
    }

    setUpdatingCity(true);
    setEditError('');
    setError('');
    setSuccess('');

    try {
      const result = await updateCityInLocal(editingCity.state, editingCity.name, trimmedNew);
      if (result.success) {
        setSuccess(`Renamed "${editingCity.name}" to "${trimmedNew}" successfully.`);
        setEditingCity(null);
        loadCities();
      } else {
        setEditError(result.error || 'Failed to update city name');
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update city');
    } finally {
      setUpdatingCity(false);
    }
  };

  // Delete City Handler
  const handleDeleteCity = async (city: { id: string; name: string; state: string }) => {
    if (!confirm(`Are you sure you want to delete "${city.name}" from ${city.state}?`)) return;

    setError('');
    setSuccess('');

    try {
      const ok = await deleteCityFromLocal(city.state, city.name);
      if (ok) {
        setSuccess(`City "${city.name}" deleted successfully.`);
        loadCities();
      } else {
        setError('Failed to delete city');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete city');
    }
  };

  // Excel/CSV Parsing & Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.name.endsWith('.xlsx') ||
        selectedFile.name.endsWith('.xls') ||
        selectedFile.name.endsWith('.csv')
      ) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a valid Excel or CSV file (.xlsx, .xls, .csv)');
        setFile(null);
      }
    }
  };

  const parseExcel = async (f: File): Promise<any[]> => {
    if (f.name.endsWith('.csv')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map((h) => h.trim());
            const data = lines
              .slice(1)
              .filter((line) => line.trim())
              .map((line) => {
                const values = line.split(',').map((v) => v.trim());
                const obj: any = {};
                headers.forEach((header, index) => {
                  obj[header] = values[index] || '';
                });
                return obj;
              });
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(f);
      });
    } else {
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
              reject(new Error('Failed to parse Excel file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsArrayBuffer(f);
        } catch (error) {
          reject(new Error('Failed to load Excel parser'));
        }
      });
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');
    setProgress({ processed: 0, total: 0, errors: 0 });

    try {
      const data = await parseExcel(file);
      setProgress({ processed: 0, total: data.length, errors: 0 });

      let processed = 0;
      let errors = 0;

      for (const row of data) {
        try {
          const name = (row.name || row.Name || row.city || row.City || '').toString().trim();
          const state = (row.state || row.State || '').toString().trim();

          if (!name || !state) {
            errors++;
            continue;
          }

          const ok = await addCityToLocal(state, name);
          if (ok) {
            processed++;
          } else {
            errors++;
          }
          setProgress({ processed, total: data.length, errors });
        } catch {
          errors++;
          setProgress({ processed, total: data.length, errors });
        }
      }

      setSuccess(`Import finished: ${processed} cities imported. ${errors} skipped or errored.`);
      setFile(null);
      loadCities();

      const fileInput = document.getElementById('excel-file-cities') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  // Pre-packaged dataset imports
  const handleImportFromWorldCities = async () => {
    const mode = importMode;
    const confirmMessage =
      mode === 'mapped-only'
        ? `Import only cities matching existing states from world_cities_full.js (~${Math.floor(
            (availableCitiesCount || 0) * 0.3
          )} cities)?`
        : `Process all ${availableCitiesCount || 0} cities from world_cities_full.js?`;

    if (!confirm(confirmMessage)) return;

    setImportingFromWorldCities(true);
    setError('');
    setSuccess('');
    setProgress({ processed: 0, total: availableCitiesCount || 0, errors: 0 });
    setImportStats({ mapped: 0, unmapped: 0 });

    try {
      let result;
      if (mode === 'mapped-only') {
        result = await importMappedCitiesOnly((current, total) => {
          setProgress({ processed: current, total, errors: 0 });
        });
      } else {
        result = await importAllIndianCities((current, total, stats) => {
          setProgress({ processed: current, total, errors: 0 });
          setImportStats(stats);
        });
      }

      const successMsg =
        mode === 'mapped-only'
          ? `Import completed! Success: ${result.success}, Skipped: ${result.skipped}, Errors: ${result.errors}`
          : `Import completed! Success: ${result.success}, Unmapped: ${result.unmapped}, Skipped: ${result.skipped}, Errors: ${result.errors}`;

      setSuccess(successMsg);
      loadCities();
    } catch (err: any) {
      setError(err.message || 'Failed to import cities from world_cities_full.js');
    } finally {
      setImportingFromWorldCities(false);
    }
  };

  const handleImportFromTxt = async () => {
    if (!confirm(`Import ${availableTxtCitiesCount || 0} cities from all-cities.json?`)) return;

    setImportingFromTxt(true);
    setError('');
    setSuccess('');
    setProgress({ processed: 0, total: availableTxtCitiesCount || 0, errors: 0 });

    try {
      const result = await importAllCitiesFromTxt((current, total) => {
        setProgress({ processed: current, total, errors: 0 });
      });

      setSuccess(`Import completed! Success: ${result.success}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
      loadCities();
    } catch (err: any) {
      setError(err.message || 'Failed to import cities from all-cities.json');
    } finally {
      setImportingFromTxt(false);
    }
  };

  const handleImportFromAllCityTxt = async () => {
    if (!confirm('Import cities from "all city.txt" file into database?')) return;

    setImportingFromAllCityTxt(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/cities/import-all', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import cities');
      }

      const result = await response.json();
      setSuccess(`Successfully imported cities from all city.txt! Added ${result.stats.totalCitiesAdded} cities.`);
      loadCities();
    } catch (err: any) {
      setError(err.message || 'Failed to import cities from all city.txt');
    } finally {
      setImportingFromAllCityTxt(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <div className="animate-spin rounded-full h-9 w-9 border-3 border-primary-200 border-t-primary-600"></div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading Cities Data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 px-3 sm:px-6 py-3 sm:py-5 min-h-screen">
      {/* Compact Modern Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-3 sm:p-4 text-white shadow-md shadow-indigo-900/10 overflow-hidden">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-xs flex-shrink-0">
              <Building2 className="h-5 w-5 text-white stroke-[2.2px]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">Cities Management</h1>
              <p className="text-[11px] text-blue-100 font-medium opacity-90">
                Configure master city names and geographic mappings across Indian states
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowImportPanel((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                showImportPanel
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Tools</span>
              {showImportPanel ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />}
            </button>

            <button
              onClick={() => setShowAddForm((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-blue-700 rounded-xl text-xs font-black shadow-sm hover:shadow-md hover:bg-blue-50 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[2.8px]" />
              <span>Add City</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Compact 4-Card Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Cities */}
        <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/20 p-3 shadow-xs">
          <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-blue-400/10 blur-lg" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
              <Building2 className="h-4 w-4 stroke-[2.2px]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">Total Cities</div>
              <div className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                {metrics.totalCities.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* States Covered */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 p-3 shadow-xs">
          <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-emerald-400/10 blur-lg" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0">
              <Globe className="h-4 w-4 stroke-[2.2px]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">States Covered</div>
              <div className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                {metrics.statesCount} <span className="text-xs font-semibold text-gray-400">/ {indianStates.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtered Cities */}
        <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/20 p-3 shadow-xs">
          <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-amber-400/10 blur-lg" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 flex-shrink-0">
              <Filter className="h-4 w-4 stroke-[2.2px]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">
                {filterState ? filterState : 'Filtered View'}
              </div>
              <div className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                {filteredCities.length.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Top State */}
        <div className="relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/20 p-3 shadow-xs">
          <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-purple-400/10 blur-lg" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
              <Layers className="h-4 w-4 stroke-[2.2px]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">Highest Density</div>
              <div className="text-sm sm:text-base font-black text-gray-900 leading-tight truncate">
                {metrics.topStateName}{' '}
                <span className="text-xs font-bold text-purple-600">({metrics.topStateCount})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add City Modal / Inline Form */}
      {showAddForm && (
        <div className="rounded-xl border border-emerald-200 bg-white p-3.5 sm:p-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
            <h2 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-emerald-600" />
              Add New City
            </h2>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewCity({ name: '', state: '' });
              }}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleAddCity} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={newCity.state}
                onChange={(e) => setNewCity({ ...newCity, state: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">Select State</option>
                {indianStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                City Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newCity.name}
                onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                required
                placeholder="e.g. Pune, Navi Mumbai"
                className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={addingCity}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {addingCity ? 'Adding...' : 'Save City'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCity({ name: '', state: '' });
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Consolidated Bulk Import Section (Collapsible) */}
      {showImportPanel && (
        <div className="rounded-2xl border border-indigo-100 bg-white p-3.5 sm:p-4 shadow-sm animate-in fade-in duration-200 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-4 w-4 text-indigo-600" />
                Bulk Import Tools
              </h2>
              <p className="text-[11px] text-gray-500">
                Consolidated data sources for bulk loading and migrating city registries
              </p>
            </div>

            {/* Sub-tabs for Import Methods */}
            <div className="flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/60 w-fit text-xs font-bold">
              <button
                onClick={() => setImportTab('excel')}
                className={`px-3 py-1 rounded-md transition-all ${
                  importTab === 'excel' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Excel / CSV File
              </button>
              <button
                onClick={() => setImportTab('prepackaged')}
                className={`px-3 py-1 rounded-md transition-all ${
                  importTab === 'prepackaged' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Pre-Packaged Datasets
              </button>
            </div>
          </div>

          {/* TAB 1: Excel / CSV File Import */}
          {importTab === 'excel' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <label className="cursor-pointer">
                  <input
                    id="excel-file-cities"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2.5 px-4 py-3 border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/20 rounded-xl transition-all">
                    <FileSpreadsheet className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {file ? file.name : 'Click to select Excel (.xlsx, .xls) or CSV file'}
                    </span>
                  </div>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleImport}
                    disabled={!file || importing}
                    className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Importing ({progress.processed}/{progress.total})...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload & Import</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-600 border border-gray-200/60 flex items-center justify-between">
                <span>
                  Expected columns: <strong>name</strong> (or <strong>city</strong>) and <strong>state</strong>. Duplicates are automatically skipped.
                </span>
                <span className="text-[10px] font-semibold text-gray-400">SimpleMaps / Custom CSV</span>
              </div>
            </div>
          )}

          {/* TAB 2: Pre-Packaged Seed Datasets */}
          {importTab === 'prepackaged' && (
            <div className="space-y-2.5">
              <div className="rounded-lg bg-amber-50/60 border border-amber-200/60 p-2 text-[11px] text-amber-800">
                ℹ️ <strong>Why are there multiple datasets?</strong> These were built during development as initial
                database bootstrap seeds. You can run any of them on-demand:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* Dataset 1: world_cities_full.js */}
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-900">world_cities_full.js</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                        {availableCitiesCount ? `${availableCitiesCount.toLocaleString()} Cities` : 'Available'}
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-700 mt-1">Automatic state mapping against master dictionary.</p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-3 text-[10px] font-semibold text-blue-900">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          value="mapped-only"
                          checked={importMode === 'mapped-only'}
                          onChange={() => setImportMode('mapped-only')}
                          className="text-blue-600 h-3 w-3"
                        />
                        <span>Mapped Only</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          value="all"
                          checked={importMode === 'all'}
                          onChange={() => setImportMode('all')}
                          className="text-blue-600 h-3 w-3"
                        />
                        <span>All</span>
                      </label>
                    </div>

                    <button
                      onClick={handleImportFromWorldCities}
                      disabled={importingFromWorldCities}
                      className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {importingFromWorldCities ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      <span>Run Import</span>
                    </button>
                  </div>
                </div>

                {/* Dataset 2: all-cities.json */}
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900">all-cities.json</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                        {availableTxtCitiesCount ? `${availableTxtCitiesCount.toLocaleString()} Cities` : 'Available'}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-1">
                      Pre-organized JSON structure mapped by state name.
                    </p>
                  </div>

                  <button
                    onClick={handleImportFromTxt}
                    disabled={importingFromTxt}
                    className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 mt-auto"
                  >
                    {importingFromTxt ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    <span>Run Import</span>
                  </button>
                </div>

                {/* Dataset 3: all city.txt */}
                <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900">all city.txt</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded">
                        Raw Text
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-700 mt-1">
                      Server API parsing from local flat text city dump.
                    </p>
                  </div>

                  <button
                    onClick={handleImportFromAllCityTxt}
                    disabled={importingFromAllCityTxt}
                    className="w-full py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 mt-auto"
                  >
                    {importingFromAllCityTxt ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    <span>Run Import</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter, Search & Sorting Bar */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city name or state..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 hover:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* State Filter */}
          <div className="w-full sm:w-56">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs font-semibold border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50 hover:bg-white text-gray-800"
            >
              <option value="">All States ({metrics.totalCities})</option>
              {indianStates.map((state) => {
                const count = metrics.countsByState[state] || 0;
                return (
                  <option key={state} value={state}>
                    {state} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-full sm:w-44">
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as ['name' | 'state', 'asc' | 'desc'];
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="w-full py-1.5 pl-2.5 pr-7 text-xs font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50 hover:bg-white text-gray-800 cursor-pointer"
              >
                <option value="name-asc">City (A → Z)</option>
                <option value="name-desc">City (Z → A)</option>
                <option value="state-asc">State (A → Z)</option>
                <option value="state-desc">State (Z → A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right side controls: Page Size & Reset */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {(filterState || searchQuery || sortField !== 'name' || sortOrder !== 'asc') && (
            <button
              onClick={() => {
                setFilterState('');
                setSearchQuery('');
                setSortField('name');
                setSortOrder('asc');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-[11px] font-bold py-1 px-1.5 border border-gray-200 rounded-md bg-white text-gray-700"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cities Table */}
      <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-3.5 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 w-16">
                  #
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-3.5 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 cursor-pointer hover:text-blue-600 transition-colors select-none group"
                  title="Click to sort by City Name"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={sortField === 'name' ? 'text-blue-700' : ''}>City Name</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-blue-600" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-blue-600" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('state')}
                  className="px-3.5 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 cursor-pointer hover:text-blue-600 transition-colors select-none group"
                  title="Click to sort by State Name"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={sortField === 'state' ? 'text-blue-700' : ''}>State</span>
                    {sortField === 'state' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-blue-600" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-blue-600" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
                    )}
                  </div>
                </th>
                <th className="px-3.5 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-gray-500 w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedCities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-400">
                    {searchQuery || filterState
                      ? 'No cities match your current search/filter.'
                      : 'No cities found. Use "+ Add City" or "Import Tools" to add cities.'}
                  </td>
                </tr>
              ) : (
                paginatedCities.map((city, idx) => {
                  const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={city.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-3.5 py-2 whitespace-nowrap text-xs font-semibold text-gray-400">
                        {globalIndex}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {city.name}
                          </span>
                          <button
                            onClick={() => handleOpenEdit(city)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all p-0.5 rounded"
                            title="Edit City Name"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                          {city.state}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(city)}
                            className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit City Name"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCity(city)}
                            className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete City"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Compact Pagination Bar */}
        {filteredCities.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3.5 py-2.5 bg-gray-50/60 border-t border-gray-100">
            <span className="text-[11px] text-gray-500 font-medium">
              Showing{' '}
              <strong className="text-gray-900">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-gray-900">
                {Math.min(currentPage * pageSize, filteredCities.length)}
              </strong>{' '}
              of <strong className="text-gray-900">{filteredCities.length.toLocaleString()}</strong> cities
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2.5 py-0.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit City Modal */}
      {editingCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-5 shadow-2xl border border-gray-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Edit City Name</h3>
                  <p className="text-[10px] text-gray-500">Update city name in {editingCity.state}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCity(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCity} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={editingCity.state}
                  disabled
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  City Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                  placeholder="Enter updated city name"
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingCity(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCity || !editName.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {updatingCity ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
