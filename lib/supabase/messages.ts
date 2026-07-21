import { supabase } from './config';
import { Message } from '@/types';

export const sendMessage = async (message: Omit<Message, 'id' | 'createdAt' | 'readBy'>) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: message.senderId,
        recipient_ids: message.recipientIds || [],
        recipient_groups: message.recipientGroups || [],
        subject: message.subject,
        content: message.content,
        read_by: [],
        is_broadcast: message.isBroadcast || false,
        sender_role: message.senderRole || null,
        priority: message.priority || 'normal',
        category: message.category || 'administrative',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data.id;
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw new Error(error.message || 'Failed to send message');
  }
};

export const getUserMessages = async (userId: string, limitCount: number = 50) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    const { data, error } = await (supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(name)
      `) as any)
      .contains('recipient_ids', [userId])
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderName: msg.sender?.name || 'Unknown',
      recipientIds: msg.recipient_ids || [],
      recipientGroups: msg.recipient_groups || [],
      subject: msg.subject,
      content: msg.content,
      readBy: msg.read_by || [],
      isBroadcast: msg.is_broadcast || false,
      senderRole: msg.sender_role || null,
      priority: msg.priority || 'normal',
      category: msg.category || 'administrative',
      pinnedBy: msg.pinned_by || [],
      createdAt: new Date(msg.created_at),
    })) as Message[];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const markMessageAsRead = async (messageId: string, userId: string) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // First get the current message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('read_by')
      .eq('id', messageId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no result

    if (fetchError) {
      console.error('Error fetching message:', fetchError);
      throw new Error('Failed to fetch message');
    }

    if (!message) {
      throw new Error('Message not found');
    }

    // Add userId to read_by array if not already present
    const readBy = message.read_by || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
    }

    const { error } = await supabase
      .from('messages')
      .update({ read_by: readBy })
      .eq('id', messageId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error: any) {
    console.error('Error marking message as read:', error);
    throw new Error(error.message || 'Failed to mark message as read');
  }
};

export const getGroupMessages = async (groupId: string, limitCount: number = 50) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    const { data, error } = await (supabase
      .from('messages')
      .select('*') as any)
      .contains('recipient_groups', [groupId])
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) {
      console.error('Error fetching group messages:', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender_id,
      recipientIds: msg.recipient_ids || [],
      recipientGroups: msg.recipient_groups || [],
      subject: msg.subject,
      content: msg.content,
      readBy: msg.read_by || [],
      priority: msg.priority || 'normal',
      category: msg.category || 'administrative',
      createdAt: new Date(msg.created_at),
    })) as Message[];
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return [];
  }
};
