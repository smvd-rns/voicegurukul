'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getAllCounselorRequests, updateCounselorRequestStatus } from '@/lib/supabase/counselor-requests';
import { getAllBCVoiceManagerRequests, updateBCVoiceManagerRequestStatus } from '@/lib/supabase/bc-voice-manager-requests';
import { updateUser } from '@/lib/supabase/users';
import { getCentersByLocationFromLocal, CenterData } from '@/lib/data/local-centers';
import { CounselorRequest, BCVoiceManagerRequest, UserRole } from '@/types';
import { CheckCircle, XCircle, Loader2, AlertCircle, Clock, UserCheck, Briefcase, Building2 } from 'lucide-react';
import MessagePreview from '@/components/ui/MessagePreview';
import RejectionModal from '@/components/ui/RejectionModal';

type CombinedRequest = (CounselorRequest & { type: 'counselor' }) | (BCVoiceManagerRequest & { type: 'bc_voice_manager' });

export default function RequestApprovalPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<CombinedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'counselor' | 'bc_voice_manager'>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectingRequest, setRejectingRequest] = useState<CombinedRequest | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<CombinedRequest | null>(null);
  const [selectedApprovedCenters, setSelectedApprovedCenters] = useState<string[]>([]);
  const [centers, setCenters] = useState<CenterData[]>([]);

  // Check if user is super admin (role 8)
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both counselor and BC Voice Manager requests
      const [counselorRequests, bcVoiceManagerRequests] = await Promise.all([
        getAllCounselorRequests(),
        getAllBCVoiceManagerRequests(),
      ]);

      // Combine requests with type indicators
      const combinedRequests: CombinedRequest[] = [
        ...counselorRequests.map(r => ({ ...r, type: 'counselor' as const })),
        ...bcVoiceManagerRequests.map(r => ({ ...r, type: 'bc_voice_manager' as const })),
      ];

      // Sort by requested date (newest first)
      combinedRequests.sort((a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

      console.log('Loaded requests:', combinedRequests);

      // Apply filters client-side
      let filtered = combinedRequests;

      if (filter !== 'all') {
        filtered = filtered.filter(r => r.status === filter);
      }

      if (requestTypeFilter !== 'all') {
        filtered = filtered.filter(r => r.type === requestTypeFilter);
      }

      setRequests(filtered);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filter, requestTypeFilter]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    loadRequests();
    // Load centers for center selection
    const loadCenters = async () => {
      try {
        const allCenters = await getCentersByLocationFromLocal();
        setCenters(allCenters);
      } catch (error) {
        console.error('Error loading centers:', error);
      }
    };
    loadCenters();
  }, [isSuperAdmin, router, loadRequests]);

  const handleApproveClick = (request: CombinedRequest) => {
    if (request.type === 'bc_voice_manager' && request.requestedCenters && request.requestedCenters.length > 0) {
      // For BC Voice Manager, show center selection modal
      setApprovingRequest(request);

      // If already approved, only show unapproved centers
      if (request.status === 'approved' && request.approvedCenters) {
        const unapprovedCenters = request.requestedCenters.filter(
          (centerId: string) => !request.approvedCenters?.includes(centerId)
        );
        setSelectedApprovedCenters([...unapprovedCenters]);
      } else {
        // Pre-select all requested centers for new requests
        setSelectedApprovedCenters([...request.requestedCenters]);
      }
    } else {
      // For counselor or BC Voice Manager without centers, approve directly
      handleApprove(request, []);
    }
  };

  const handleApprove = async (request: CombinedRequest, approvedCenters: string[] = []) => {
    if (!user) return;

    setProcessing(request.id);
    setError('');
    setSuccess('');

    try {
      if (request.type === 'counselor') {
        // Update counselor request status
        await updateCounselorRequestStatus(request.id, 'approved', user.id, 'Approved by super admin');

        // Update user role to include counselor (role 2)
        const { supabase } = await import('@/lib/supabase/config');
        if (supabase) {
          const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('role')
            .eq('id', request.userId)
            .single();

          if (!fetchError && targetUser) {
            let existingRoles: number[] = [];
            if (Array.isArray(targetUser.role)) {
              existingRoles = targetUser.role.map((r: any) => typeof r === 'number' ? r : (r === 'counselor' ? 2 : 1));
            } else {
              existingRoles = [typeof targetUser.role === 'number' ? targetUser.role : (targetUser.role === 'counselor' ? 2 : 1)];
            }

            const hasCounselorRole = existingRoles.includes(2);
            if (!hasCounselorRole) {
              const newRoles = [...existingRoles, 2] as UserRole[];
              await updateUser(request.userId, { role: newRoles });
            }
          }
        }
      } else if (request.type === 'bc_voice_manager') {
        const notes = 'Approved by super admin';

        await updateBCVoiceManagerRequestStatus(
          request.id,
          'approved',
          user.id,
          notes,
          approvedCenters
        );
      }

      setSuccess(request.status === 'approved' ? 'Centers updated successfully' : 'Request approved successfully');
      setApprovingRequest(null);
      setSelectedApprovedCenters([]);
      await loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      setError(error.message || 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (request: CombinedRequest) => {
    setRejectingRequest(request);
  };

  const handleReject = async (reason: string) => {
    if (!user || !rejectingRequest) return;

    setProcessing(rejectingRequest.id);
    setError('');
    setSuccess('');

    try {
      console.log('Rejecting request:', {
        requestId: rejectingRequest.id,
        userId: rejectingRequest.userId,
        userEmail: rejectingRequest.userEmail,
        type: rejectingRequest.type,
        reason: reason || 'Rejected by super admin'
      });

      if (rejectingRequest.type === 'counselor') {
        await updateCounselorRequestStatus(
          rejectingRequest.id,
          'rejected',
          user.id,
          reason || 'Rejected by super admin'
        );
      } else if (rejectingRequest.type === 'bc_voice_manager') {
        await updateBCVoiceManagerRequestStatus(
          rejectingRequest.id,
          'rejected',
          user.id,
          reason || 'Rejected by super admin'
        );
      }

      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 500));

      setSuccess('Request rejected');
      setRejectingRequest(null); // Close modal only after successful update

      // Refresh the requests list
      await loadRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      setError(error.message || 'Failed to reject request');
      // Don't close modal on error so user can try again
    } finally {
      setProcessing(null);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Request Approval</h1>
        </div>

        {/* Filter Tabs */}
        <div className="space-y-4 mb-4">
          {/* Request Type Filter */}
          <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto">
            <button
              onClick={() => setRequestTypeFilter('all')}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${requestTypeFilter === 'all'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              All Types
            </button>
            <button
              onClick={() => setRequestTypeFilter('counselor')}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${requestTypeFilter === 'counselor'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <UserCheck className="h-4 w-4" />
              Counselor
            </button>
            <button
              onClick={() => setRequestTypeFilter('bc_voice_manager')}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${requestTypeFilter === 'bc_voice_manager'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <Briefcase className="h-4 w-4" />
              BC Voice Manager
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${filter === 'all'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${filter === 'pending'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${filter === 'approved'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Approved ({approvedRequests.length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-2 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${filter === 'rejected'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Rejected ({rejectedRequests.length})
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={`${request.type}-${request.id}`}
              className={`bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 ${request.status === 'approved'
                ? 'border-green-500'
                : request.status === 'rejected'
                  ? 'border-red-500'
                  : 'border-yellow-500'
                }`}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    {request.status === 'approved' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {request.status === 'rejected' && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    {request.status === 'pending' && (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{request.userName}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${request.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : request.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      {request.type === 'counselor' ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          Counselor Request
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          BC Voice Manager Request
                        </span>
                      )}
                    </div>
                    <p className="break-words"><strong>Email:</strong> <span className="break-all">{request.userEmail}</span></p>
                    {request.type === 'counselor' && (
                      <p className="break-words"><strong>Counselor Email:</strong> <span className="break-all">{request.counselorEmail}</span></p>
                    )}
                    {request.type === 'bc_voice_manager' && request.subject && (
                      <p className="break-words"><strong>Subject:</strong> <span className="break-all">{request.subject}</span></p>
                    )}
                    {request.type === 'bc_voice_manager' && request.requestedCenters && request.requestedCenters.length > 0 && (
                      <div className="mt-3 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-700">Requested Centers:</p>
                          {request.status === 'approved' && request.approvedCenters && (
                            (() => {
                              const unapprovedCenters = request.requestedCenters.filter(
                                (centerId: string) => !request.approvedCenters?.includes(centerId)
                              );
                              return unapprovedCenters.length > 0 ? (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                                  {unapprovedCenters.length} Pending Approval
                                </span>
                              ) : null;
                            })()
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {request.requestedCenters.map((centerId: string) => {
                            const center = centers.find(c => c.id === centerId || c.name === centerId);
                            const isApproved = request.approvedCenters?.includes(centerId);
                            return (
                              <span
                                key={centerId}
                                className={`px-2 py-1 rounded text-xs ${isApproved
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800 font-semibold'
                                  }`}
                              >
                                {center ? `${center.name} (${center.city}, ${center.state})` : centerId}
                                {isApproved && ' ✓'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {request.type === 'bc_voice_manager' && request.approvedCenters && request.approvedCenters.length > 0 && (
                      <div className="mt-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-semibold text-green-700 mb-2">Approved Centers:</p>
                        <div className="flex flex-wrap gap-2">
                          {request.approvedCenters.map((centerId: string) => {
                            const center = centers.find(c => c.id === centerId || c.name === centerId);
                            return (
                              <span key={centerId} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                {center ? `${center.name} (${center.city}, ${center.state})` : centerId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <p><strong>Requested:</strong> <span className="whitespace-nowrap">{new Date(request.requestedAt).toLocaleString()}</span></p>
                    {request.reviewedAt && (
                      <p><strong>Reviewed:</strong> <span className="whitespace-nowrap">{new Date(request.reviewedAt).toLocaleString()}</span></p>
                    )}
                    {request.message && (
                      <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">User&apos;s Message:</p>
                        <MessagePreview message={request.message} maxLength={50} />
                      </div>
                    )}
                    {request.notes && (
                      <div className="mt-2">
                        <p className="break-words"><strong>Admin Notes:</strong> {request.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                  <button
                    onClick={() => handleApproveClick(request)}
                    disabled={processing === request.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {processing === request.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRejectClick(request)}
                    disabled={processing === request.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {processing === request.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Show "Approve Additional Centers" button for approved BC Voice Managers with pending center requests */}
              {request.status === 'approved' && request.type === 'bc_voice_manager' && (() => {
                const unapprovedCenters = request.requestedCenters?.filter(
                  (centerId: string) => !request.approvedCenters?.includes(centerId)
                ) || [];
                return unapprovedCenters.length > 0 ? (
                  <div className="mt-4">
                    <button
                      onClick={() => handleApproveClick(request)}
                      disabled={processing === request.id}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {processing === request.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4" />
                          Approve Additional Centers ({unapprovedCenters.length})
                        </>
                      )}
                    </button>
                  </div>
                ) : null;
              })()}

              {/* Show "Manage Centers" button for all BC Voice Manager requests */}
              {request.type === 'bc_voice_manager' && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setApprovingRequest(request);
                      // Pre-select all currently approved centers
                      setSelectedApprovedCenters(request.approvedCenters || []);
                    }}
                    disabled={processing === request.id}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Building2 className="h-4 w-4" />
                    Manage Centers
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingRequest && (
        <RejectionModal
          isOpen={!!rejectingRequest}
          onClose={() => setRejectingRequest(null)}
          onConfirm={handleReject}
          userName={rejectingRequest.userName}
        />
      )}

      {/* Center Approval Modal for BC Voice Manager */}
      {approvingRequest && approvingRequest.type === 'bc_voice_manager' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {approvingRequest.status === 'approved' ? 'Manage Centers' : 'Approve Centers'} for {approvingRequest.userName}
                </h3>
                <button
                  onClick={() => {
                    setApprovingRequest(null);
                    setSelectedApprovedCenters([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {approvingRequest.status === 'approved'
                  ? 'Select which centers this BC Voice Manager should have access to. You can add or remove centers at any time.'
                  : 'Select which centers to approve for this BC Voice Manager. Only selected centers will be approved.'}
              </p>

              {(() => {
                // For managing approved requests, show ALL centers
                // For new requests, only show requested centers
                const centersToShow = approvingRequest.status === 'approved'
                  ? centers // Show all available centers
                  : approvingRequest.requestedCenters?.filter(
                    (centerId: string) => !approvingRequest.approvedCenters?.includes(centerId)
                  ).map(centerId => centers.find(c => c.id === centerId || c.name === centerId)).filter(Boolean) || [];

                return centersToShow.length > 0 ? (
                  <div className="space-y-2 mb-4 max-h-96 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {centersToShow.map((centerData: any) => {
                      const centerId = centerData.id;
                      const isSelected = selectedApprovedCenters.includes(centerId);
                      const isCurrentlyApproved = approvingRequest.approvedCenters?.includes(centerId);
                      const isPendingRequest = approvingRequest.requestedCenters?.includes(centerId) && !isCurrentlyApproved;
                      return (
                        <label
                          key={centerId}
                          className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded cursor-pointer border border-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedApprovedCenters([...selectedApprovedCenters, centerId]);
                              } else {
                                setSelectedApprovedCenters(selectedApprovedCenters.filter(c => c !== centerId));
                              }
                            }}
                            className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                {centerData ? centerData.name : centerId}
                              </span>
                              {isPendingRequest && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                                  Requested
                                </span>
                              )}
                              {isCurrentlyApproved && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                  Currently Approved
                                </span>
                              )}
                            </div>
                            {centerData && (
                              <p className="text-xs text-gray-500">
                                {centerData.city}, {centerData.state}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">No centers requested.</p>
                );
              })()}

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {selectedApprovedCenters.length} of {approvingRequest.requestedCenters?.length || 0} center(s) selected
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setApprovingRequest(null);
                    setSelectedApprovedCenters([]);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApprove(approvingRequest, selectedApprovedCenters)}
                  disabled={processing === approvingRequest.id || selectedApprovedCenters.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing === approvingRequest.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Approve Selected Centers
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
