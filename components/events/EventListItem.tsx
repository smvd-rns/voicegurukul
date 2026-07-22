'use client';

import { ManagedEvent } from '@/types';
import { Calendar, Star, Pin } from 'lucide-react';


interface EventListItemProps {
    event: ManagedEvent;
    isActive: boolean;
    onClick: () => void;
    onPinToggle: (pinned: boolean) => void;
    onImportanceToggle: (dismissed: boolean) => void;
}


export default function EventListItem({ event, isActive, onClick, onPinToggle, onImportanceToggle }: EventListItemProps) {
    const dateToDisplay = event.eventDate ? new Date(event.eventDate) : new Date(event.createdAt);
    const formattedEventDate = dateToDisplay.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
    });

    const formattedSentDate = new Date(event.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
    });

    // Strip HTML for the snippet
    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const snippet = event.message ? stripHtml(event.message).substring(0, 80) + '...' : 'No description available';

    // If userResponse exists, it means seen, coming, or not_coming.
    const hasBeenSeen = !!event.userResponse;

    return (
        <div className="relative border-b border-gray-100 group">
            <div
                role="button"
                tabIndex={0}
                onClick={onClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
                className={`w-full text-left p-4 transition-all duration-300 flex gap-3 relative cursor-pointer ${isActive
                    ? 'bg-orange-50/80 border-l-4 border-l-orange-600'
                    : hasBeenSeen
                        ? 'bg-gray-100/60 hover:bg-gray-200/50 border-l-4 border-l-transparent'
                        : event.type === 'event'
                            ? 'bg-orange-50/30 hover:bg-orange-50/60 border-l-4 border-l-orange-500 shadow-[inset_4px_0_0_0_#f97316]'
                            : 'bg-white hover:bg-gray-50 border-l-4 border-l-blue-600 shadow-[inset_4px_0_0_0_#2563eb]'
                    }`}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                            {event.isImportant && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onImportanceToggle(!event.isImportantDismissed);
                                    }}
                                    className={`p-1 rounded transition-colors ${event.isImportantDismissed 
                                        ? 'text-gray-300 hover:text-amber-400' 
                                        : 'text-amber-400 hover:bg-amber-50'
                                    }`}
                                    title={event.isImportantDismissed ? "Mark as important" : "Remove importance star"}
                                >
                                    <Star className={`h-3.5 w-3.5 ${!event.isImportantDismissed ? 'fill-current' : ''}`} />
                                </button>
                            )}
                            <h4 className={`text-sm tracking-tight transition-colors ${isActive
                                ? 'text-orange-600 font-black'
                                : hasBeenSeen
                                    ? 'text-gray-600 font-medium'
                                    : 'text-gray-900 font-black'
                                } truncate`}>
                                {event.title}
                            </h4>
                            {event.type === 'event' ? (
                                <div className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[7px] font-black uppercase tracking-widest shrink-0">
                                    Event
                                </div>
                            ) : (
                                <div className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[7px] font-black uppercase tracking-widest shrink-0">
                                    Announcement
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-orange-400' : 'text-gray-400'}`}>
                                Sent: {formattedSentDate}
                            </span>
                             <span className={`text-[10px] items-center gap-1 transition-colors flex ${isActive ? 'text-orange-600 font-black' : hasBeenSeen ? 'text-gray-500 font-bold' : event.type === 'event' ? 'text-orange-600 font-black' : 'text-blue-600 font-black'
                                }`}>
                                <Calendar className="h-2.5 w-2.5" />
                                {formattedEventDate}
                            </span>
                        </div>
                    </div>

                    <p className={`text-[11px] line-clamp-2 leading-relaxed transition-colors ${isActive ? 'text-orange-800/80 font-bold' : hasBeenSeen ? 'text-gray-600 font-medium' : 'text-gray-800 font-bold'
                        }`}>
                        {snippet}
                    </p>

                    <div className="flex gap-1.5 mt-2">
                        {event.attachments?.length > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                {event.attachments.length} Files
                            </div>
                        )}
                        {event.userResponse?.status === 'coming' && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 rounded text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                                Going
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Personal Pin Toggle */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onPinToggle(!event.isPinned);
                }}
                className={`absolute right-4 bottom-4 p-1.5 rounded-lg transition-all duration-300 opacity-100 ${event.isPinned
                    ? 'bg-rose-100 text-rose-600 scale-110 shadow-sm'
                    : 'bg-rose-50/50 text-rose-300 hover:bg-rose-100 hover:text-rose-600'
                    }`}
                title={event.isPinned ? "Unpin this message" : "Pin this message"}
            >
                <Pin className={`h-3.5 w-3.5 transition-transform ${event.isPinned ? 'fill-current rotate-45' : 'rotate-0'}`} />
            </button>
        </div>
    );
}
