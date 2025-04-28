import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';

export interface Ticket {
    id: string;
    created_at: string;
    updated_at: string;
    title: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    last_message?: {
        content: string;
        created_at: string;
    };
    unread_count: number;
}

export const useTickets = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = async () => {
        try {
            const { data, error: err } = await supabase
                .from('tickets')
                .select(`
          *,
          tickets_messages (
            content,
            created_at,
            read_at
          )
        `)
                .eq('user_id', user?.id)
                .order('updated_at', { ascending: false });

            if (err) throw err;

            const ticketsWithMeta = data.map(ticket => ({
                ...ticket,
                last_message: ticket.tickets_messages?.[0],
                unread_count: ticket.tickets_messages?.filter(
                    (msg: any) => !msg.read_at && msg.sender_id !== user?.id
                ).length || 0
            }));

            setTickets(ticketsWithMeta);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchTickets();

            // Subscribe to changes
            const subscription = supabase
                .channel('tickets-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tickets',
                        filter: `user_id=eq.${user.id}`
                    },
                    () => {
                        fetchTickets();
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user?.id]);

    return { tickets, loading, error, refetch: fetchTickets };
};