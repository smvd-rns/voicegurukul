'use client';

import { useState, useEffect, useCallback } from 'react';
import { ManagedEvent, ManagedEventAttachment } from '@/types';
import { Calendar, MapPin, Users, Paperclip, Check, X, ExternalLink, Play, Music, Image as ImageIcon, Star, Clock, Image as LucideImage, Share2, Info } from 'lucide-react';
import NextImage from 'next/image';
import { submitEventResponse } from '@/lib/actions/events';
import { getThumbnailUrl } from '@/lib/utils/google-drive';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import EventAudienceTracking from './EventAudienceTracking';

interface EventDetailViewProps {
    event: ManagedEvent;
    onResponseUpdate: () => void;
}

export default function EventDetailView({ event, onResponseUpdate }: EventDetailViewProps) {
    const { userData } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [guestCount, setGuestCount] = useState<number>(event.userResponse?.guestCount || 0);

    // Sync state when event changes
    useEffect(() => {
        setGuestCount(event.userResponse?.guestCount || 0);
    }, [event.userResponse?.guestCount, event.id]);

    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const isAdmin = userRoles.some(role =>
        ['super_admin', 'zonal_admin', 'state_admin', 'city_admin', 'center_admin', 'bc_voice_manager', 'project_manager', 'managing_director', 'director', 'central_voice_manager', 'youth_preacher', 'project_advisor', 'acting_manager'].includes(String(role)) ||
        (typeof role === 'number' && ((role >= 4 && role <= 8) || (role >= 11 && role <= 16) || role === 21))
    );

    const canGiveGuestCount = event.type === 'event';

    const handleResponse = useCallback(async (status: 'coming' | 'not_coming' | 'seen' | 'understood', reason?: string, overrideGuestCount?: number) => {
        if (!userData) return;
        setIsSubmitting(true);
        try {
            await submitEventResponse({
                eventId: event.id,
                userId: userData.id,
                status,
                reason,
                isBulk: false,
                guestCount: status === 'coming' ? (overrideGuestCount !== undefined ? overrideGuestCount : guestCount) : 0
            });
            toast.success(status === 'coming' ? "See you there! 🙏" : "Response recorded.");
            onResponseUpdate();
        } catch (error: any) {
            console.error('Error submitting response:', error);
            const message = error.message || 'Failed to submit response';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, [event.id, userData, onResponseUpdate, guestCount]);

    useEffect(() => {
        // Auto-record 'seen' status when opening an announcement
        if (event.type === 'announcement' && !event.userResponse && userData) {
            handleResponse('seen');
        }
    }, [event.id, event.type, event.userResponse, userData, handleResponse]);

    const isImage = (att: ManagedEventAttachment) => {
        if (att.type === 'image') return true;
        if (att.mimeType?.startsWith('image/')) return true;
        const url = att.url?.toLowerCase() || '';
        return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.webp') || url.includes('export=view');
    };

    const formattedEventDate = event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : '';

    const formattedSentDate = new Date(event.createdAt).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const handleShare = () => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const shareUrl = `${baseUrl}/dashboard/events?eventId=${event.id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
    };

    return (
        <div className="bg-white h-full flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/30">
                <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            {event.isImportant && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[9px] font-black uppercase tracking-widest border border-amber-200">
                                    <Star className="h-3 w-3 fill-amber-500" />
                                    Important
                                </div>
                            )}
                             {event.type === 'event' ? (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest">
                                    Event
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest">
                                    Announcement
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight">
                            {event.title}
                        </h2>
                    </div>

                    <button
                        onClick={handleShare}
                        className="p-3 bg-white hover:bg-orange-50 text-gray-400 hover:text-orange-600 rounded-2xl border-2 border-gray-100 hover:border-orange-100 transition-all shadow-sm active:scale-95 group"
                        title="Share Event"
                    >
                        <Share2 className="h-5 w-5 transition-transform group-hover:rotate-12" />
                    </button>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-3 text-gray-500">
                    {event.type === 'event' && formattedEventDate && (
                        <div className="flex items-center gap-3 group">
                            <div className="p-2 bg-white rounded-xl shadow-sm border border-orange-100 text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Event Date</span>
                                <span className="text-xs font-black text-gray-900 tracking-tight">{formattedEventDate}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 group">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Sent Date</span>
                            <span className="text-xs font-black text-gray-900 tracking-tight">{formattedSentDate}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-10 space-y-8">
                {/* Message Body */}
                {event.message && (
                    <div className="w-full overflow-hidden">
                        <div
                            className="prose prose-slate prose-sm max-w-full prose-p:font-medium prose-p:leading-relaxed prose-p:text-gray-950 prose-headings:text-gray-950 prose-strong:font-black prose-a:text-orange-600 prose-img:rounded-2xl prose-img:shadow-lg prose-img:my-6 prose-img:mx-auto text-gray-950 break-words [&_*]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:!overflow-x-hidden"
                            dangerouslySetInnerHTML={{ 
                                __html: event.attachments.reduce((html, att) => {
                                    // Retroactively fix any expiring drive-storage URLs in the HTML body
                                    // by replacing them with the permanent format if we have the fileId.
                                    if (att.fileId && html.includes(att.url) && (att.url.includes('drive-storage') || att.url.includes('drive-viewer'))) {
                                        return html.split(att.url).join(`https://lh3.googleusercontent.com/d/${att.fileId}=s1600`);
                                    }
                                    return html;
                                }, event.message)
                            }}
                        />
                    </div>
                )}

                {/* Optimized Image Gallery */}
                {event.attachments.filter(isImage).length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ImageIcon className="h-3.5 w-3.5 text-orange-600" /> Photo Gallery
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {event.attachments.filter(isImage).map((item, idx) => (
                                <a
                                    key={`img-${idx}`}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative aspect-video rounded-2xl overflow-hidden border-2 border-gray-50 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1 block"
                                >
                                    <NextImage
                                        src={getThumbnailUrl(item.url, 800, 450, item.fileId) || item.url || ''}
                                        alt={item.name}
                                        width={800}
                                        height={450}
                                        unoptimized={true}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <p className="text-[10px] text-white font-black truncate uppercase tracking-widest">{item.name}</p>
                                    </div>
                                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="h-4 w-4 text-white" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Non-Image Attachments */}
                {event.attachments.filter(a => !isImage(a)).length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Paperclip className="h-3.5 w-3.5 text-blue-600" /> Resources
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {event.attachments.filter(a => !isImage(a)).map((item, idx) => (
                                <a
                                    key={`file-${idx}`}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-4 bg-gray-50/80 hover:bg-white border-2 border-transparent hover:border-blue-100 rounded-2xl transition-all group shadow-sm hover:shadow-md"
                                >
                                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                        {item.type === 'video' ? <Play className="h-4 w-4" /> :
                                            item.type === 'audio' ? <Music className="h-4 w-4" /> :
                                                <Paperclip className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-900 truncate uppercase tracking-[0.05em]">{item.name}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.type || 'File'}</p>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Administrative Tracking Section */}
                {isAdmin && event.type === 'event' && (
                    <div className="pt-8 border-t border-gray-100">
                        <EventAudienceTracking event={event} />
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                {event.type === 'announcement' ? (
                    <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-200 text-blue-600">
                                <Info className="h-4 w-4" />
                            </div>
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Announcement</p>
                        </div>
                        <button 
                            onClick={() => handleResponse('understood')}
                            disabled={isSubmitting || event.userResponse?.status === 'understood'}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                event.userResponse?.status === 'understood'
                                ? 'bg-white text-gray-400 border border-gray-100 cursor-default' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95'
                            }`}
                        >
                            {event.userResponse?.status === 'understood' ? 'Acknowledged' : 'I have read & understood this message'}
                        </button>
                    </div>
                ) : event.userResponse && (event.userResponse.status === 'coming' || event.userResponse.status === 'not_coming') ? (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-500 ${event.userResponse.status === 'coming'
                        ? 'bg-emerald-50/50 border-emerald-100'
                        : 'bg-rose-50/50 border-rose-100'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl bg-white shadow-sm ring-1 ${event.userResponse.status === 'coming' ? 'ring-emerald-500/20' : 'ring-rose-500/20'
                                }`}>
                                {event.userResponse.status === 'coming'
                                    ? <Check className="h-5 w-5 text-emerald-600 animate-in zoom-in-50" />
                                    : <X className="h-5 w-5 text-rose-600 animate-in zoom-in-50" />
                                }
                            </div>
                            <div>
                                <h5 className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${event.userResponse.status === 'coming' ? 'text-emerald-700' : 'text-rose-700'
                                    }`}>
                                    {event.userResponse.status === 'coming' ? "You're Going!" : "Response: No"}
                                </h5>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                    {event.userResponse.isBulk ? 'Assigned by Manager' : 'Selection saved'}
                                    {event.userResponse.guestCount ? ` • ${event.userResponse.guestCount} Guests` : ''}
                                </p>
                            </div>
                        </div>

                        {!event.userResponse.isBulk && (
                            <div className="flex items-center gap-2">
                                {event.type === 'event' && event.userResponse.status === 'coming' && (
                                    <button
                                        onClick={() => {
                                            // Trigger a special mode or just re-show the guest count input
                                            // For simplicity, we can use a prompt or just toggle a local state
                                            const newCount = prompt("How many guests are with you?", String(event.userResponse?.guestCount || 0));
                                            if (newCount !== null) {
                                                const val = parseInt(newCount) || 0;
                                                setGuestCount(val);
                                                handleResponse('coming', undefined, val);
                                            }
                                        }}
                                        className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:bg-orange-50 transition-all px-4 py-2 rounded-xl"
                                    >
                                        Edit Guests
                                    </button>
                                )}
                                <button
                                    onClick={() => handleResponse(event.userResponse?.status === 'coming' ? 'not_coming' : 'coming')}
                                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-600 transition-colors px-4 py-2"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>
                ) : (event.rsvpDeadline && new Date() > new Date(event.rsvpDeadline)) ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-4 text-gray-400 grayscale">
                        <div className="p-2.5 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                            <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                            <h5 className="text-[11px] font-black uppercase tracking-widest mb-0.5 text-gray-500">
                                Time is over
                            </h5>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                No more responses
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {canGiveGuestCount && (
                            <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl mb-2">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl shadow-sm border border-orange-200 text-orange-600">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-orange-900 uppercase tracking-widest">Guest Count</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">How many people are with you?</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white rounded-xl border border-orange-200 p-1">
                                        <button 
                                            onClick={() => setGuestCount(Math.max(0, guestCount - 1))}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-lg text-orange-600 font-black"
                                        >
                                            -
                                        </button>
                                        <input 
                                            type="number" 
                                            value={guestCount}
                                            onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-12 text-center font-black text-sm bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button 
                                            onClick={() => setGuestCount(guestCount + 1)}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-lg text-orange-600 font-black"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => handleResponse('coming')}
                            disabled={isSubmitting}
                            className="flex-1 flex items-center justify-center gap-3 py-4 bg-orange-600 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-200 hover:bg-orange-700 hover:shadow-orange-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Check className="h-4 w-4" />
                            <span>Confirm Attendance</span>
                        </button>
                        <button
                            onClick={() => handleResponse('not_coming')}
                            disabled={isSubmitting}
                            className="px-8 py-4 bg-white text-gray-400 border-2 border-gray-100 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <span>Decline</span>
                        </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
