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

const isTicketStatus = (
    status: string | null
): status is Ticket['status'] =>
    status === 'open' ||
    status === 'in_progress' ||
    status === 'resolved' ||
    status === 'closed';

export const useTickets = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = async () => {
        if (!user?.id) {
            setTickets([]);
            setLoading(false);
            return;
        }

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
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (err) throw err;

            const ticketsWithMeta: Ticket[] = (data ?? []).map((ticket) => {
                const messages = ticket.tickets_messages ?? [];
                const lastMessage = messages[0];

                return {
                    id: ticket.id,
                    created_at: ticket.created_at ?? '',
                    updated_at: ticket.updated_at ?? ticket.created_at ?? '',
                    title: ticket.title ?? '',
                    status: isTicketStatus(ticket.status) ? ticket.status : 'open',
                    last_message: lastMessage
                        ? {
                            content: lastMessage.content ?? '',
                            created_at: lastMessage.created_at ?? '',
                        }
                        : undefined,
                    unread_count: messages.filter((msg) => !msg.read_at).length,
                };
            });

            setTickets(ticketsWithMeta);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
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
