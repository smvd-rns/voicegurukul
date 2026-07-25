'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, CheckCircle, AlertTriangle, Eye, ToggleLeft, ToggleRight, PlusCircle, Settings, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import toast, { Toaster } from 'react-hot-toast';

interface EmailTemplate {
    id?: string;
    key: string;
    name: string;
    subject: string;
    body: string;
    is_enabled: boolean;
    recipient_type?: string;
    recipient_role?: number;
    created_at?: string;
    updated_at?: string;
}

export default function EmailSettingsPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // Create New Template state
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newTemplate, setNewTemplate] = useState<EmailTemplate>({
        key: '',
        name: '',
        subject: '',
        body: '',
        is_enabled: true
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token;

            const res = await fetch('/api/admin/email-settings', {
                headers: token ? { "Authorization": `Bearer ${token}` } : undefined
            });
            const data = await res.json();
            if (data.success) {
                setTemplates(data.data);
                if (data.data.length > 0) {
                    setSelectedTemplate(data.data[0]);
                }
            } else {
                toast.error(data.error || 'Failed to load email templates');
            }
        } catch (error) {
            console.error('Error fetching email settings:', error);
            toast.error('Internal server error loading email settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (templateToSave: EmailTemplate) => {
        if (!templateToSave.key || !templateToSave.name || !templateToSave.subject || !templateToSave.body) {
            toast.error('All template fields are required');
            return;
        }
        setSaving(true);
        try {
            const session = await supabase?.auth.getSession();
            const token = session?.data.session?.access_token;

            const res = await fetch('/api/admin/email-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify(templateToSave)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Template saved successfully');
                await fetchTemplates();
                // Select saved template
                const updated = data.data;
                setSelectedTemplate(updated);
                setIsCreatingNew(false);
                setNewTemplate({ key: '', name: '', subject: '', body: '', is_enabled: true });
            } else {
                toast.error(data.error || 'Failed to save email template');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            toast.error('Failed to save email template');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleEnable = async (template: EmailTemplate) => {
        const updated = { ...template, is_enabled: !template.is_enabled };
        await handleSave(updated);
    };

    const handleDelete = async (key: string) => {
        if (confirm('Are you sure you want to delete this custom template?')) {
            try {
                const session = await supabase?.auth.getSession();
                const token = session?.data.session?.access_token;

                const res = await fetch(`/api/admin/email-settings?key=${key}`, {
                    method: 'DELETE',
                    headers: token ? { "Authorization": `Bearer ${token}` } : undefined
                });
                const data = await res.json();
                if (data.success) {
                    toast.success('Template deleted successfully');
                    await fetchTemplates();
                } else {
                    toast.error(data.error || 'Failed to delete template');
                }
            } catch (error) {
                console.error('Error deleting template:', error);
                toast.error('Failed to delete template');
            }
        }
    };

    const renderPlaceholders = (key: string) => {
        switch (key) {
            case 'registration_notification':
                return ['{managerName}', '{userName}', '{userEmail}', '{approveLink}'];
            case 'profile_update_approval':
                return ['{userName}', '{dashboardUrl}', '{fieldsList}'];
            case 'welcome_approved':
                return ['{userName}', '{dashboardUrl}'];
            default:
                return ['{userName}', '{dashboardUrl}'];
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
            <Toaster position="top-center" />
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard/admin')}
                            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-600"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
                                <Mail className="h-6 w-6 text-indigo-600" /> Email Template Settings
                            </h1>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Manage notifications and automated emails</p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setIsCreatingNew(true);
                            setSelectedTemplate(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        <PlusCircle className="h-4 w-4" /> Create Custom Template
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[11px]">Loading templates...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Templates List */}
                        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm space-y-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center justify-between">
                                Available Triggers
                                <button onClick={fetchTemplates} className="hover:text-indigo-600 transition-colors">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                            </h2>
                            <div className="space-y-2">
                                {templates.map((tpl) => {
                                    const isSelected = selectedTemplate?.key === tpl.key && !isCreatingNew;
                                    return (
                                        <div
                                            key={tpl.key}
                                            onClick={() => {
                                                setSelectedTemplate(tpl);
                                                setIsCreatingNew(false);
                                            }}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-indigo-200 bg-slate-50/30'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-indigo-800' : 'text-slate-700'}`}>
                                                    {tpl.name}
                                                </h3>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleEnable(tpl);
                                                    }}
                                                    className={`transition-colors p-1 rounded-lg ${tpl.is_enabled ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                                                >
                                                    {tpl.is_enabled ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{tpl.key}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Template Details Editor */}
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
                            {isCreatingNew ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <h2 className="text-sm font-black text-indigo-700 uppercase tracking-widest">New Template Config</h2>
                                        <button
                                            onClick={() => {
                                                setIsCreatingNew(false);
                                                if (templates.length > 0) setSelectedTemplate(templates[0]);
                                            }}
                                            className="text-xs font-bold text-slate-400 hover:text-slate-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Key</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700"
                                                placeholder="e.g. custom_newsletter"
                                                value={newTemplate.key}
                                                onChange={(e) => setNewTemplate(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700"
                                                placeholder="e.g. Weekly Updates"
                                                value={newTemplate.name}
                                                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Send To (Recipient)</label>
                                            <select
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700"
                                                value={newTemplate.recipient_type || 'devotee'}
                                                onChange={(e) => setNewTemplate(prev => ({ ...prev, recipient_type: e.target.value }))}
                                            >
                                                <option value="devotee">Devotee (User who triggers action)</option>
                                                <option value="counselor">Counselor (Their assigned guide)</option>
                                                <option value="managers">Managers (Center & Temple admins)</option>
                                                <option value="role">Specific Role Group</option>
                                            </select>
                                        </div>
                                        {newTemplate.recipient_type === 'role' && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Role ID</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700"
                                                    placeholder="e.g. 20 (Care giver)"
                                                    value={newTemplate.recipient_role || ''}
                                                    onChange={(e) => setNewTemplate(prev => ({ ...prev, recipient_role: parseInt(e.target.value) || undefined }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Line</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700"
                                            placeholder="Subject line for email..."
                                            value={newTemplate.subject}
                                            onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Body (HTML/Text)</label>
                                        <textarea
                                            rows={8}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700 resize-none font-mono"
                                            placeholder="Write your email body here. HTML is supported."
                                            value={newTemplate.body}
                                            onChange={(e) => setNewTemplate(prev => ({ ...prev, body: e.target.value }))}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSave(newTemplate)}
                                        disabled={saving}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save New Template
                                    </button>
                                </div>
                            ) : selectedTemplate ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div>
                                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{selectedTemplate.name}</h2>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Key: {selectedTemplate.key}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> {isPreviewMode ? 'Show Editor' : 'Live Preview'}
                                            </button>
                                        </div>
                                    </div>

                                    {isPreviewMode ? (
                                        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3">
                                            <div className="border-b border-slate-100 pb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject:</span>
                                                <span className="text-xs font-bold text-slate-700 ml-2">
                                                    {selectedTemplate.subject
                                                        .replace(/{managerName}/g, 'Prabhupada sevak')
                                                        .replace(/{userName}/g, 'test11')
                                                    }
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Body Content (Live Preview):</span>
                                                <div
                                                    className="p-0 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 prose max-w-full font-sans"
                                                    dangerouslySetInnerHTML={{
                                                        __html: (() => {
                                                            // Replace placeholders with mock data
                                                            let populatedBody = selectedTemplate.body
                                                                .replace(/{managerName}/g, 'Prabhupada sevak')
                                                                .replace(/{userName}/g, 'test11')
                                                                .replace(/{userEmail}/g, 'test@gmail.com')
                                                                .replace(/{userPhone}/g, '45645')
                                                                .replace(/{counselorName}/g, 'New Accounr')
                                                                .replace(/{ashramName}/g, 'Student and Not decided')
                                                                .replace(/{templeName}/g, 'ISKCON NVCC')
                                                                .replace(/{centerName}/g, 'ner')
                                                                .replace(/{approveLink}/g, '#')
                                                                .replace(/{dashboardUrl}/g, '#')
                                                                .replace(/{fieldsList}/g, '<li style="margin-bottom: 6px; font-weight: 600;">Rounds</li><li style="margin-bottom: 6px; font-weight: 600;">Ashram</li><li style="margin-bottom: 6px; font-weight: 600;">Temple</li>');

                                                            // Wrap it in visual email container layout
                                                            return `
                                                                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 20px 10px; color: #1e293b; line-height: 1.6;">
                                                                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                                                                        <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 25px 20px; text-align: center;">
                                                                            <div style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px;">VOICE Gurukul</div>
                                                                            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${selectedTemplate.name}</h1>
                                                                        </div>
                                                                        <div style="padding: 30px 20px;">
                                                                            ${populatedBody}
                                                                        </div>
                                                                        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                                                            <div style="font-size: 12px; font-weight: 600; color: #ea580c; margin-bottom: 8px; font-style: italic;">
                                                                                Hare Krishna Hare Krishna Krishna Krishna Hare Hare<br/>
                                                                                Hare Rama Hare Rama Rama Rama Hare Hare
                                                                            </div>
                                                                            <div style="font-size: 10px; color: #64748b;">
                                                                                &copy; 2026 VOICE Gurukul. All rights reserved.
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            `;
                                                        })()
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Subject</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700"
                                                    value={selectedTemplate.subject}
                                                    onChange={(e) => setSelectedTemplate(prev => prev ? ({ ...prev, subject: e.target.value }) : null)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Send To (Recipient)</label>
                                                    <select
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700"
                                                        value={selectedTemplate.recipient_type || 'devotee'}
                                                        onChange={(e) => setSelectedTemplate(prev => prev ? ({ ...prev, recipient_type: e.target.value }) : null)}
                                                    >
                                                        <option value="devotee">Devotee (User who triggers action)</option>
                                                        <option value="counselor">Counselor (Their assigned guide)</option>
                                                        <option value="managers">Managers (Center & Temple admins)</option>
                                                        <option value="role">Specific Role Group</option>
                                                    </select>
                                                </div>
                                                {selectedTemplate.recipient_type === 'role' && (
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Role ID</label>
                                                        <input
                                                            type="number"
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700"
                                                            placeholder="e.g. 20"
                                                            value={selectedTemplate.recipient_role || ''}
                                                            onChange={(e) => setSelectedTemplate(prev => prev ? ({ ...prev, recipient_role: parseInt(e.target.value) || undefined }) : null)}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Body (HTML Supported)</label>
                                                <textarea
                                                    rows={8}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:bg-white focus:border-indigo-500 transition-all text-slate-700 font-mono resize-none"
                                                    value={selectedTemplate.body}
                                                    onChange={(e) => setSelectedTemplate(prev => prev ? ({ ...prev, body: e.target.value }) : null)}
                                                />
                                            </div>

                                            {/* Tag Helper */}
                                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Supported Template Tags
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {renderPlaceholders(selectedTemplate.key).map((placeholder) => (
                                                        <code
                                                            key={placeholder}
                                                            onClick={() => {
                                                                if (!selectedTemplate) return;
                                                                setSelectedTemplate({
                                                                    ...selectedTemplate,
                                                                    body: selectedTemplate.body + placeholder
                                                                });
                                                            }}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg text-[10px] font-bold text-slate-600 font-mono cursor-pointer transition-colors"
                                                        >
                                                            {placeholder}
                                                        </code>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                <button
                                                    onClick={() => handleSave(selectedTemplate)}
                                                    disabled={saving}
                                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                    Save Settings
                                                </button>
                                                {!['registration_notification', 'profile_update_approval', 'welcome_approved'].includes(selectedTemplate.key) && (
                                                    <button
                                                        onClick={() => handleDelete(selectedTemplate.key)}
                                                        className="py-4 px-6 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                                                    >
                                                        Delete Template
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <Settings className="h-10 w-10 text-slate-300 mb-2" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No template selected</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
