'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Database,
  ArrowLeft,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FolderOpen,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Shield,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-hot-toast';

export interface BackupLogItem {
  id: string;
  trigger_type: 'manual' | 'scheduled';
  triggered_by: string;
  status: 'completed' | 'in_progress' | 'failed';
  drive_folder_id?: string;
  drive_folder_name?: string;
  drive_folder_url?: string;
  sheet_file_id?: string;
  sheet_file_url?: string;
  sql_dump_file_id?: string;
  sql_dump_file_url?: string;
  tables_count: number;
  records_count: number;
  file_size_bytes: number;
  duration_ms: number;
  error_message?: string;
  details?: Record<string, { count: number; columns: number }>;
  created_at: string;
}

export interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  lastBackupAt: string | null;
}

export default function DatabaseBackupsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<BackupLogItem[]>([]);
  const [stats, setStats] = useState<BackupStats>({
    totalBackups: 0,
    successfulBackups: 0,
    failedBackups: 0,
    lastBackupAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [selectedLog, setSelectedLog] = useState<BackupLogItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Verify Admin authorization
  const currentUserRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const isSuperAdmin = currentUserRoles.some((r: any) => String(r) === '8' || String(r) === 'super_admin');
  const isAdmin = isSuperAdmin || currentUserRoles.some((r: any) => ['1', '2', '8', '11'].includes(String(r)) || String(r) === 'admin');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (!isAdmin) {
        router.push('/dashboard/admin');
      }
    }
  }, [user, isAdmin, authLoading, router]);

  const loadBackupData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/backups?_t=${Date.now()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch backup logs');
      }
      setLogs(json.logs || []);
      setStats(json.stats || {
        totalBackups: 0,
        successfulBackups: 0,
        failedBackups: 0,
        lastBackupAt: null,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load backup logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadBackupData();
    }
  }, [isAdmin, loadBackupData]);

  const handleRunBackupNow = async () => {
    if (runningBackup) return;
    try {
      setRunningBackup(true);
      toast.loading('Running full database backup & uploading to Google Drive...', { id: 'backup-toast' });

      const res = await fetch('/api/admin/backups', {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Backup operation failed');
      }

      toast.success(
        `Backup complete! ${json.result?.tablesCount || 0} tables (${(json.result?.recordsCount || 0).toLocaleString()} rows) uploaded to Google Drive.`,
        { id: 'backup-toast', duration: 5000 }
      );
      loadBackupData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Backup failed', { id: 'backup-toast' });
    } finally {
      setRunningBackup(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '0s';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedLogs = logs.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4 p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin</span>
            </Link>
            <span className="text-slate-300">•</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              1:00 AM IST Nightly Schedule
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
              30-Day Auto Retention Active
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-600" />
            <span>Database Backups &amp; Google Drive Archival</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated daily snapshots of all tables to Google Drive. Every day creates a dedicated dated folder with full spreadsheet records and SQL dumps.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={loadBackupData}
            disabled={loading || runningBackup}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleRunBackupNow}
            disabled={runningBackup}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {runningBackup ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Backup...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Backup Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Backups</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
            {stats.totalBackups}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {stats.successfulBackups} successful recorded
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Success Rate</span>
          </span>
          <div className="text-lg sm:text-2xl font-black text-emerald-700 mt-0.5">
            {stats.totalBackups > 0
              ? `${Math.round((stats.successfulBackups / stats.totalBackups) * 100)}%`
              : '100%'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {stats.failedBackups === 0 ? 'Zero failures' : `${stats.failedBackups} failed runs`}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Backup</span>
          </span>
          <div className="text-xs sm:text-sm font-black text-slate-900 mt-1 truncate">
            {stats.lastBackupAt
              ? new Date(stats.lastBackupAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              : 'None yet'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {stats.lastBackupAt ? 'Snapshots in Google Drive' : 'Click Run Backup Now'}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Drive Storage</span>
            </span>
            <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">
              VoiceGurukul Backups
            </div>
          </div>
          <div className="mt-1">
            {logs.length > 0 && logs[0].drive_folder_url ? (
              <a
                href={logs[0].drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <span>Open in Drive</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span className="text-[10px] text-slate-400">Created upon first backup</span>
            )}
          </div>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Backup History &amp; Drive Snapshots</span>
          </h2>
          <span className="text-xs text-slate-400 font-semibold">
            Showing latest {logs.length} runs
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-bold">Loading backup history...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Database className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-sm font-bold text-slate-600">No backup records yet</div>
            <p className="text-xs text-slate-400">Click &quot;Run Backup Now&quot; above to create your first Google Drive backup snapshot.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date &amp; Time (IST)</th>
                  <th className="px-3 py-3">Trigger Type</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-center">Duration</th>
                  <th className="px-3 py-3 text-center">Tables &amp; Rows</th>
                  <th className="px-3 py-3 text-right">Size</th>
                  <th className="px-4 py-3 text-right">Google Drive Files</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedLogs.map((item) => {
                  const isSuccess = item.status === 'completed';
                  const isFailed = item.status === 'failed';
                  const isInProgress = item.status === 'in_progress';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date & Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {new Date(item.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {new Date(item.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })} IST
                        </div>
                      </td>

                      {/* Trigger Type */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${item.trigger_type === 'scheduled'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                          >
                            {item.trigger_type === 'scheduled' ? 'Nightly 1 AM' : 'Manual'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                          by {item.triggered_by || 'System'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Completed</span>
                          </span>
                        )}
                        {isFailed && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-300"
                            title={item.error_message}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Failed</span>
                          </span>
                        )}
                        {isInProgress && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                            <span>In Progress</span>
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-medium text-slate-600 text-xs">
                        {formatDuration(item.duration_ms)}
                      </td>

                      {/* Tables & Rows */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {item.tables_count > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLog(item)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                            title="Click to view table record breakdown"
                          >
                            <span>{item.tables_count} tables</span>
                            <span className="text-slate-300">•</span>
                            <span>{item.records_count.toLocaleString()} rows</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Size */}
                      <td className="px-3 py-3 text-right whitespace-nowrap font-mono text-[11px] text-slate-700 font-semibold">
                        {formatBytes(Number(item.file_size_bytes || 0))}
                      </td>

                      {/* Google Drive Links */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.sheet_file_url && (
                            <a
                              href={item.sheet_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors text-[10.5px] font-bold flex items-center gap-1 shadow-2xs"
                              title="Open All Tables in Google Sheets"
                            >
                              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                              <span>Sheet</span>
                            </a>
                          )}

                          {item.sql_dump_file_url && (
                            <a
                              href={item.sql_dump_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors text-[10.5px] font-bold flex items-center gap-1"
                              title="Download Full SQL Database Dump"
                            >
                              <FileCode className="w-3 h-3 text-slate-600" />
                              <span>SQL Dump</span>
                            </a>
                          )}

                          {item.drive_folder_url && (
                            <a
                              href={item.drive_folder_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors text-[10.5px] font-bold flex items-center gap-1 shadow-2xs"
                              title="Open Day's Google Drive Folder"
                            >
                              <FolderOpen className="w-3 h-3 text-indigo-600" />
                              <span>Folder</span>
                            </a>
                          )}

                          {!item.sheet_file_url && !item.drive_folder_url && (
                            <span className="text-[10px] text-slate-400 italic">No files available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {logs.length > 0 && (
            <div className="p-3 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <span>Showing</span>
                <span className="font-black text-slate-900">
                  {logs.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, logs.length)}
                </span>
                <span>of</span>
                <span className="font-black text-slate-900">{logs.length}</span>
                <span>backups</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>

                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-black text-slate-800 text-xs shadow-2xs">
                    Page {safePage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {/* Modal: Per-Table Breakdown */}
      {selectedLog && selectedLog.details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Table Breakdown Snapshot</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Backup on {new Date(selectedLog.created_at).toLocaleString('en-IN')} IST ({selectedLog.tables_count} tables, {selectedLog.records_count.toLocaleString()} total rows)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto divide-y divide-slate-100 text-xs">
              {Object.entries(selectedLog.details).map(([tName, meta]) => (
                <div key={tName} className="py-2 flex items-center justify-between">
                  <div className="font-mono text-slate-800 font-bold truncate max-w-[280px]">
                    {tName}
                  </div>
                  <div className="text-slate-500 font-semibold text-[11px] shrink-0">
                    <span className="text-slate-900 font-black">{meta.count.toLocaleString()}</span> rows
                    <span className="text-slate-300 mx-1.5">•</span>
                    <span>{meta.columns} cols</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {selectedLog.drive_folder_url && (
                <a
                  href={selectedLog.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>View in Google Drive</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

