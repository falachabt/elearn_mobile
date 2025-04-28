import {useState, useEffect, useCallback} from 'react';
import {supabase} from '@/lib/supabase';
import {useAuth} from '@/contexts/auth';
import { Ticket } from "@/hooks/useTicketList";


export interface Message {
    id: string;
    created_at: string;
    ticket_id: string;
    sender_id: string;
    content: string | null;
    image_url: string | null;
    image_path: string | null;
    read_at: string | null;
    message_type: 'text' | 'image' | 'system';
}

export const useTicketMessages = (ticketId: string) => {
    const {user} = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ticket, setTicket] = useState<Ticket | null>(null);

    const fetchTicket = async () => {
        try {
            const {data, error: err} = await supabase
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (err) throw err;
            setTicket(data);
        } catch (err: any) {
            setError(err.message);
        }
    }
    const fetchMessages = async () => {
        try {
            const {data, error: err} = await supabase
                .from('tickets_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', {ascending: true});

            if (err) throw err;
            setMessages(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (content: string,
                               messageType: 'text' | 'image' = 'text',
                               imageUrl?: string,
                               imagePath?: string
    ) => {
        try {
            const {data, error: err} = await supabase
                .from('tickets_messages')
                .insert({
                    ticket_id: ticketId,
                    sender_id: user?.id,
                    content,
                    message_type: messageType,
                    image_url: imageUrl,
                    image_path: imagePath
                })
                .select()
                .single();

            if (err) throw err;
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const markMessagesAsRead = async () => {
        try {
            const {error: err} = await supabase
                .from('tickets_messages')
                .update({read_at: new Date().toISOString()})
                .eq('ticket_id', ticketId)
                .neq('sender_id', user?.id)
                .is('read_at', null);

            if (err) throw err;
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        if (ticketId) {
            fetchMessages();
            fetchTicket();

            // Subscribe to new messages
            const subscription = supabase
                .channel(`messages:${ticketId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tickets_messages',
                        filter: `ticket_id=eq.${ticketId}`
                    },
                    payload => {
                        console.log('Message change:', payload);
                        if (payload.eventType === 'INSERT') {
                            setMessages(current => [...current, payload.new as Message]);
                        } else if (payload.eventType === 'UPDATE') {
                            setMessages(current =>
                                current.map(msg =>
                                    msg.id === payload.new.id ? (payload.new as Message) : msg
                                )
                            );
                        } else if (payload.eventType === 'DELETE') {
                            setMessages(current =>
                                current.filter(msg => msg.id !== payload.old.id)
                            );
                        }
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [ticketId]);

    return {
        messages,
        ticket,
        loading,
        error,
        sendMessage,
        markMessagesAsRead,
        refetch: fetchMessages
    };
};