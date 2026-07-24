'use client';

import { useState, useEffect, useCallback } from 'react';
import { extractUrls, linkifyMessage } from '@/lib/utils/message-parser';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUserMessages, markMessageAsRead } from '@/lib/supabase/messages';
import { Message } from '@/types';
import { Mail, MailOpen, Clock, AlertCircle, Radio, Eye, EyeOff, Pin, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/config';

export default function MessagesPage() {
  const { userData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');

  const loadMessages = useCallback(async () => {
    if (!userData) return;

    setLoading(true);
    const fetchedMessages = await getUserMessages(userData.id);
    setMessages(fetchedMessages);
    setLoading(false);
  }, [userData]);

  useEffect(() => {
    if (userData) {
      loadMessages();
    }
  }, [userData, loadMessages]);

  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);

    if (userData && !message.readBy.includes(userData.id)) {
      await markMessageAsRead(message.id, userData.id);
      await loadMessages();
    }
  };

  const togglePin = async (messageId: string, currentlyPinned: boolean) => {
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      

      const response = await fetch('/api/messages/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { "Authorization": `Bearer ${session?.access_token}` } : {}),
        },
        body: JSON.stringify({
          messageId,
          pinned: !currentlyPinned,
        }),
      });

      if (response.ok) {
        await loadMessages();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const sortMessages = (msgs: Message[]) => {
    if (!userData) return msgs;

    return msgs.sort((a, b) => {
      const aPinned = a.pinnedBy?.includes(userData.id) || false;
      const bPinned = b.pinnedBy?.includes(userData.id) || false;

      // Pinned messages first
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const unreadMessages = sortMessages(
    messages.filter(msg => userData && !msg.readBy.includes(userData.id))
  );

  const readMessages = sortMessages(
    messages.filter(msg => userData && msg.readBy.includes(userData.id))
  );

  const currentMessages = activeTab === 'unread' ? unreadMessages : readMessages;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 px-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-6 sm:p-10 text-center">
          <div className="mb-6 sm:mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3 sm:mb-4 text-orange-700 tracking-wide">
            Hare Krishna
          </h2>
          <p className="text-lg sm:text-xl text-gray-800 font-serif">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
            Hare Krishna
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3 py-1">
            Messages
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
            {unreadMessages.length} unread, {readMessages.length} read
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Messages List - Hidden on mobile if message selected */}
          <div className={`lg:col-span-1 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 overflow-hidden ${selectedMessage ? 'hidden lg:block' : 'block'}`}>
            {/* Tabs */}
            <div className="flex border-b-2 border-gray-200">
              <button
                onClick={() => setActiveTab('unread')}
                className={`flex-1 px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'unread'
                  ? 'bg-blue-50 text-blue-700 border-b-4 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <EyeOff className="h-4 w-4" />
                <span className="hidden sm:inline">Unread</span>
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {unreadMessages.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('read')}
                className={`flex-1 px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'read'
                  ? 'bg-green-50 text-green-700 border-b-4 border-green-500'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Read</span>
                <span className="px-2 py-0.5 bg-gray-400 text-white text-xs font-bold rounded-full">
                  {readMessages.length}
                </span>
              </button>
            </div>

            {/* Message List */}
            <div className="overflow-y-auto max-h-[calc(100vh-300px)] p-2">
              {currentMessages.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    {activeTab === 'unread' ? 'No unread messages' : 'No read messages'}
                  </p>
                </div>
              ) : (
                currentMessages.map((message) => {
                  const isRead = userData ? message.readBy.includes(userData.id) : false;
                  const isPinned = userData ? (message.pinnedBy?.includes(userData.id) || false) : false;
                  const isSelected = selectedMessage?.id === message.id;
                  const messageDate = message.createdAt instanceof Date
                    ? message.createdAt
                    : new Date(message.createdAt);

                  return (
                    <div key={message.id} className="relative group">
                      <button
                        onClick={() => handleMessageClick(message)}
                        className={`w-full text-left p-3 sm:p-4 transition-all duration-200 rounded-lg mb-2 border-2 ${isSelected
                          ? 'border-orange-500 shadow-lg'
                          : !isRead
                            ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 shadow-md'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                          } ${isPinned ? 'ring-2 ring-yellow-400' : ''}`}
                      >
                        {isPinned && (
                          <div className="absolute top-2 right-2">
                            <Pin className="h-4 w-4 text-yellow-600 fill-yellow-400" />
                          </div>
                        )}

                        <div className="flex items-start justify-between mb-2 pr-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isRead ? (
                              <MailOpen className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <div className="relative">
                                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                                <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-600 rounded-full animate-pulse"></span>
                              </div>
                            )}
                            <span className={`text-sm sm:text-base ${!isRead ? 'font-bold text-blue-900' : 'font-semibold text-gray-700'}`}>
                              {message.senderName}
                            </span>
                            {!isRead && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                                NEW
                              </span>
                            )}
                            {/* Priority Badge */}
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${message.priority === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                              }`}>
                              {message.priority === 'urgent' && <AlertCircle className="h-3 w-3" />}
                              <span className="capitalize">{message.priority}</span>
                            </span>

                            {/* Category Badge */}
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${message.category === 'spiritual'
                              ? 'bg-purple-100 text-purple-700'
                              : message.category === 'administrative'
                                ? 'bg-blue-100 text-blue-700'
                                : message.category === 'events'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                              {message.category || 'General'}
                            </span>
                          </div>
                        </div>
                        <p className={`text-sm sm:text-base mb-1 truncate ${!isRead ? 'font-bold text-blue-900' : 'font-medium text-gray-900'}`}>
                          {message.subject}
                        </p>
                        <p className={`text-xs sm:text-sm line-clamp-2 ${!isRead ? 'text-blue-700' : 'text-gray-500'}`}>
                          {message.content}
                        </p>
                        <p className={`text-xs mt-2 ${!isRead ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                          {format(messageDate, 'MMM d, yyyy h:mm a')}
                        </p>
                      </button>

                      {/* Pin Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(message.id, isPinned);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ${isPinned
                          ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        title={isPinned ? 'Unpin message' : 'Pin message'}
                      >
                        <Pin className={`h-4 w-4 ${isPinned ? 'fill-yellow-600' : ''}`} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Message Detail - Full width on mobile when selected, hidden when not */}
          <div className={`lg:col-span-2 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6 lg:p-8 ${!selectedMessage ? 'hidden lg:block' : 'block'}`}>
            {selectedMessage ? (
              <div>
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="lg:hidden mb-4 flex items-center text-gray-600 hover:text-orange-600 transition-colors"
                >
                  <X className="h-5 w-5 mr-1" />
                  <span className="font-medium">Back to Messages</span>
                </button>

                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                  <div className="w-full sm:w-auto">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-700 break-words">
                        {selectedMessage.subject}
                      </h2>
                      {selectedMessage.isBroadcast && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg flex items-center gap-1.5">
                          <Radio className="h-4 w-4" />
                          Broadcast
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <span>From: <span className="font-semibold">{selectedMessage.senderName}</span></span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-xs sm:text-sm">
                        {format(
                          selectedMessage.createdAt instanceof Date
                            ? selectedMessage.createdAt
                            : new Date(selectedMessage.createdAt),
                          'MMMM d, yyyy h:mm a'
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedMessage.priority === 'urgent' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Urgent
                      </span>
                    )}
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs sm:text-sm font-semibold rounded-lg capitalize">
                      {selectedMessage.category || 'General'}
                    </span>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200">
                    <div className="text-sm sm:text-base md:text-lg text-gray-800 leading-relaxed font-sans">
                      {linkifyMessage(selectedMessage.content)}
                    </div>
                  </div>

                  {extractUrls(selectedMessage.content).length > 0 && (
                    <div className="mt-6 flex flex-col gap-3">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Actionable Links
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {extractUrls(selectedMessage.content).map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium transform hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>
                              {extractUrls(selectedMessage.content).length === 1
                                ? 'Open Link'
                                : `Open Link ${index + 1}`}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 sm:py-20">
                <Mail className="h-16 w-16 sm:h-24 sm:w-24 text-orange-200 mb-4 sm:mb-6" />
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-700 mb-2">
                  Select a message
                </h3>
                <p className="text-sm sm:text-base text-gray-500">
                  Choose a message from the list to view its contents
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
