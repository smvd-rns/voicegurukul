'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, Plus, Search, Trash2, ArrowLeft, Loader2, AlertCircle, 
  CheckCircle, Database, Copy, Check 
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

interface SpiritualMaster {
  id: string;
  name: string;
  created_at?: string;
}

export default function SpiritualMastersAdminPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [masters, setMasters] = useState<SpiritualMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Search and Add inputs
  const [searchTerm, setSearchTerm] = useState('');
  const [newMasterName, setNewMasterName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fallback states
  const [isFallback, setIsFallback] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Verify authorization
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      const roles = userData?.role;
      const isSuperAdmin = Array.isArray(roles)
        ? roles.some((r) => String(r) === '8' || String(r) === 'super_admin')
        : String(roles) === '8' || String(roles) === 'super_admin';

      if (!isSuperAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, userData, authLoading, router]);

  // Fetch spiritual masters
  const fetchMasters = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/spiritual-masters');
      const data = await res.json();

      if (data.success) {
        setMasters(data.data || []);
        setIsFallback(!!data.isFallback);
        setIsTableMissing(!!data.isTableMissing);
      } else {
        setError(data.error || 'Failed to load spiritual masters');
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while fetching spiritual masters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMasters();
    }
  }, [user]);

  // Add a new spiritual master
  const handleAddMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterName.trim()) return;

    if (isFallback) {
      setError('Cannot add to static list. Please run the SQL migration script to enable database writing.');
      return;
    }

    try {
      setAdding(true);
      setError('');
      setSuccess('');
      
      const res = await fetch('/api/spiritual-masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMasterName.trim() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Successfully added "${newMasterName.trim()}"`);
        setNewMasterName('');
        fetchMasters();
      } else {
        setError(data.error || 'Failed to add spiritual master');
      }
    } catch (err) {
      setError('An error occurred while adding spiritual master');
    } finally {
      setAdding(false);
    }
  };

  // Delete a spiritual master
  const handleDeleteMaster = async (id: string, name: string) => {
    if (isFallback) {
      setError('Cannot delete from static list. Please run the SQL migration script.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const res = await fetch(`/api/spiritual-masters?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Successfully deleted "${name}"`);
        setDeletingId(null);
        fetchMasters();
      } else {
        setError(data.error || 'Failed to delete spiritual master');
      }
    } catch (err) {
      setError('An error occurred while deleting spiritual master');
    }
  };

  // SQL Script to copy
  const sqlScript = `-- Create the spiritual_masters table
CREATE TABLE IF NOT EXISTS spiritual_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE spiritual_masters ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to spiritual_masters" ON spiritual_masters FOR SELECT USING (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Filter masters
  const filteredMasters = masters.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link 
            href="/dashboard/admin" 
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Spiritual Masters
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Manage the list of Spiritual Masters select options for profiles.
          </p>
        </div>
      </div>

      {/* Database Setup Warning banner for Local/Staging fallback */}
      {isTableMissing && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <Database className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-amber-800 font-bold text-base">Database Table Missing</h3>
              <p className="text-amber-700 text-sm mt-1">
                The database table <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">spiritual_masters</code> does not exist yet. 
                The system is gracefully running in <strong>static fallback mode</strong> using the hardcoded list of 118 names.
              </p>
            </div>
          </div>
          <div className="bg-gray-950 text-gray-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-48 relative group">
            <button
              onClick={copySqlToClipboard}
              className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
            <pre className="pr-20">{sqlScript}</pre>
          </div>
          <p className="text-xs text-amber-600">
            💡 Run the above SQL script in your Supabase SQL Editor to enable custom add/delete actions.
          </p>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left pane: Add Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Add Spiritual Master</h2>
            <p className="text-xs text-gray-400 mt-1">Insert a new name to the dynamic options database.</p>
          </div>
          
          <form onSubmit={handleAddMaster} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                disabled={isFallback}
                placeholder="e.g. HH Radhanath Swami (RNS)"
                value={newMasterName}
                onChange={(e) => setNewMasterName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-gray-900 transition-all ${
                  isFallback ? 'bg-gray-50 cursor-not-allowed opacity-60' : 'bg-white'
                }`}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={adding || isFallback || !newMasterName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-100"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isFallback ? 'Disabled in Static Mode' : 'Add Master Name'}
            </button>
          </form>
        </div>

        {/* Right pane: List and Search */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Spiritual Masters List {isFallback && <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full ml-2">Static List</span>}
              </h2>
              <p className="text-xs text-gray-400 mt-1">Showing {filteredMasters.length} of {masters.length} total entries.</p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                placeholder="Search masters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-gray-900 transition-all"
              />
            </div>
          </div>

          {/* List display */}
          <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto divide-y divide-gray-100">
            {filteredMasters.length > 0 ? (
              filteredMasters.map((master) => (
                <div key={master.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3 pr-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">{master.name}</span>
                  </div>
                  
                  {/* Delete Button */}
                  {!isFallback && (
                    <div>
                      {deletingId === master.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteMaster(master.id, master.name)}
                            className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(master.id)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                          title="Remove master name"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                No spiritual masters matched your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
