'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Paperclip, Link, Image as ImageIcon, Music, Play, Shield, Users, Building2, MapPin, Globe, Info, Check, Calendar, MessageSquare } from 'lucide-react';
import { createEvent } from '@/lib/actions/events';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import { ManagedEventAttachment, UserRole } from '@/types';
import { getRoleDisplayName, roleNumberToName, RoleNumber } from '@/lib/utils/roles';
import MultiSelect from '@/components/ui/MultiSelect';
import { supabase } from '@/lib/supabase/config';
import { ashramOptions, roleOptions, campOptions } from '@/lib/utils/event-constants';

interface EventCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EventCreateModal({ isOpen, onClose, onSuccess }: EventCreateModalProps) {
    const { userData } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState<ManagedEventAttachment[]>([]);

    // Target Filters State
    const [targetAshrams, setTargetAshrams] = useState<string[]>([]);
    const [targetRoles, setTargetRoles] = useState<string[]>([]);
    const [targetTemples, setTargetTemples] = useState<string[]>([]);
    const [targetCenters, setTargetCenters] = useState<string[]>([]);
    const [targetCamps, setTargetCamps] = useState<string[]>([]);

    // Data for dropdowns
    const [temples, setTemples] = useState<any[]>([]);
    const [centers, setCenters] = useState<any[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(false);

    // UI Helpers
    const [newAttachment, setNewAttachment] = useState<{ type: 'image' | 'audio' | 'video' | 'link', url: string, name: string }>({
        type: 'link', url: '', name: ''
    });
    const [showAttachmentForm, setShowAttachmentForm] = useState(false);

    useEffect(() => {
        const fetchFilterData = async () => {
            setLoadingFilters(true);
            try {
                // Fetch Temples
                const { data: templeData } = await supabase!.from('temples').select('id, name').order('name');
                setTemples(templeData?.map((t: any) => ({ id: t.name, name: t.name })) || []);

                // Fetch Centers
                const { data: centerData } = await supabase!.from('centers').select('id, name').order('name');
                setCenters(centerData?.map((c: any) => ({ id: c.name, name: c.name })) || []);
            } catch (error) {
                console.error('Error fetching filter data:', error);
            } finally {
                setLoadingFilters(false);
            }
        };
        if (isOpen) fetchFilterData();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;
        if (!title.trim()) {
            toast.error('Please enter an event title');
            return;
        }

        setIsSubmitting(true);
        try {
            await createEvent({
                createdBy: userData.id,
                title,
                eventDate: new Date(eventDate),
                message,
                attachments,
                targetAshrams,
                targetRoles,
                targetTemples,
                targetCenters,
                targetCamps,
                excludedUserIds: []
            });
            toast.success('Event posted successfully! 🚀');
            onSuccess();
        } catch (error: any) {
            console.error('Error creating event:', error);
            const errorMsg = error?.message || (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
            toast.error(`Failed to post event: ${errorMsg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addAttachment = () => {
        if (!newAttachment.url || !newAttachment.name) {
            toast.error('Please provide both a name and a URL');
            return;
        }
        setAttachments([...attachments, { ...newAttachment }]);
        setNewAttachment({ type: 'link', url: '', name: '' });
        setShowAttachmentForm(false);
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-white/20">
                {/* Compact Header */}
                <div className="px-8 py-5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex justify-between items-center shrink-0 border-b border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-2.5 bg-orange-600 rounded-xl shadow-lg shadow-orange-900/20">
                            <Plus className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                New <span className="text-orange-500">Event</span> Broadcast
                            </h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] opacity-60">Design and reach your audience</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all hover:rotate-90">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Main Content Area - Split Panel */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: The "Mail" Content */}
                    <div className="flex-[1.4] flex flex-col p-8 space-y-6 overflow-y-auto custom-scrollbar border-r border-gray-50">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-widest text-[9px]">
                                <MessageSquare className="h-3 w-3" />
                                Content Layer
                            </div>

                            {/* Subject Line Style */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Event Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter a descriptive subject..."
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500 focus:shadow-xl focus:shadow-orange-500/5 transition-all font-bold text-gray-900 placeholder:text-gray-300 outline-none"
                                />
                            </div>

                            {/* Schedule Row */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Date</label>
                                <div className="relative group w-full md:w-1/2">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                    <input
                                        type="date"
                                        required
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        className="w-full pl-11 pr-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500 transition-all font-bold outline-none text-gray-900 shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Body Area */}
                            <div className="space-y-2 flex-grow flex flex-col">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message Body</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Write your invitation message here..."
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-900 resize-none outline-none shadow-sm flex-1 min-h-[300px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Settings / Targeting / Media */}
                    <div className="flex-1 bg-gray-50/50 p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                        {/* Targeting Section */}
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-widest text-[9px]">
                                <Users className="h-3 w-3" />
                                Target Audience
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter ml-1">Ashram</label>
                                    <MultiSelect options={ashramOptions} selectedValues={targetAshrams} onChange={setTargetAshrams} placeholder="All Ashrams" valueProperty="id" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter ml-1">Roles</label>
                                    <MultiSelect options={roleOptions} selectedValues={targetRoles} onChange={setTargetRoles} placeholder="All Roles" valueProperty="id" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter ml-1">Camps</label>
                                    <MultiSelect options={campOptions} selectedValues={targetCamps} onChange={setTargetCamps} placeholder="All Levels" valueProperty="id" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter ml-1">Temples</label>
                                    <MultiSelect options={temples} selectedValues={targetTemples} onChange={setTargetTemples} placeholder="All Temples" valueProperty="id" disabled={loadingFilters} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter ml-1">Centers</label>
                                    <MultiSelect options={centers} selectedValues={targetCenters} onChange={setTargetCenters} placeholder="All Centers" valueProperty="id" disabled={loadingFilters} />
                                </div>
                            </div>
                        </div>

                        {/* Media Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-widest text-[9px]">
                                <Paperclip className="h-3 w-3" />
                                Resources
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {attachments.map((at, idx) => (
                                        <div key={idx} className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-gray-100 rounded-xl shadow-sm group">
                                            <span className="text-[10px] font-black text-gray-700 truncate max-w-[100px]">{at.name}</span>
                                            <button type="button" onClick={() => removeAttachment(idx)} className="p-1 hover:bg-rose-50 text-gray-300 hover:text-rose-600 rounded-lg transition-colors">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setShowAttachmentForm(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 border border-dashed border-orange-200 rounded-xl text-[10px] font-bold hover:bg-orange-100 transition-all"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Quick Add
                                    </button>
                                </div>

                                {showAttachmentForm && (
                                    <div className="p-4 bg-white border border-orange-100 rounded-2xl shadow-xl shadow-orange-900/5 animate-in slide-in-from-top-2 duration-300 space-y-3">
                                        <select
                                            value={newAttachment.type}
                                            onChange={(e) => setNewAttachment({ ...newAttachment, type: e.target.value as any })}
                                            className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-xs font-bold outline-none focus:border-orange-200"
                                        >
                                            <option value="link">🌐 Link</option>
                                            <option value="image">🖼️ Image</option>
                                            <option value="audio">🎵 Audio</option>
                                            <option value="video">🎬 Video</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={newAttachment.name}
                                            onChange={(e) => setNewAttachment({ ...newAttachment, name: e.target.value })}
                                            placeholder="Name"
                                            className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-xs font-bold outline-none focus:border-orange-200"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={newAttachment.url}
                                                onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
                                                placeholder="URL"
                                                className="flex-1 px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-xs font-bold outline-none focus:border-orange-200"
                                            />
                                            <button onClick={addAttachment} className="p-2 bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-200">
                                                <Check className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Condensed Footer */}
                <div className="px-8 py-5 bg-white border-t border-gray-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <Info className="h-3.5 w-3.5 text-orange-400" />
                        Targeting {targetAshrams.length + targetRoles.length + targetTemples.length + targetCenters.length + targetCamps.length || 'Everyone'}
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-400 hover:text-gray-900 font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                            Discard Draft
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="group/post px-10 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-gray-200 hover:shadow-orange-200 hover:bg-orange-600 transition-all transform hover:scale-[1.05] active:scale-95 disabled:opacity-50 flex items-center gap-3"
                        >
                            {isSubmitting ? 'Transmitting...' : 'Broadcast Event 🚀'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
