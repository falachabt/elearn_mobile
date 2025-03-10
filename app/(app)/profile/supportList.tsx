import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    useColorScheme,
    Alert, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import {useTickets} from "@/hooks/useTicketList";

const TicketListScreen = () => {
    const { tickets, loading, error, refetch } = useTickets();
    const { user } = useAuth();
    const [isNewTicketModalVisible, setNewTicketModalVisible] = useState(false);
    const [newTicketTitle, setNewTicketTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const handleCreateNewTicket = async () => {
        if (!newTicketTitle.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un titre pour votre ticket');
            return;
        }

        setIsCreating(true);
        try {
            const { data: ticket, error } = await supabase
                .from('tickets')
                .insert({
                    title: newTicketTitle.trim(),
                    user_id: user?.id,
                    status: 'open'
                })
                .select()
                .single();

            if (error) throw error;

            // Create initial system message
            await supabase
                .from('tickets_messages')
                .insert({
                    ticket_id: ticket.id,
                    content: 'Comment pouvons-nous vous aider ?',
                    message_type: 'system',
                    sender_id: null
                });

            setNewTicketModalVisible(false);
            setNewTicketTitle('');
            await refetch();
            router.push(`/profile/support/${ticket.id}`);
        } catch (error: any) {
            console.log('Error creating ticket:', error);
            Alert.alert('Erreur', 'Impossible de créer le ticket. Veuillez réessayer.');
        } finally {
            setIsCreating(false);
        }
    };

    const renderTicketItem = ({ item }: { item: any }) => {
        const statusColors = {
            open: '#FCD34D',
            in_progress: '#60A5FA',
            resolved: '#34D399',
            closed: '#9CA3AF'
        };

        const statusLabels = {
            open: 'Ouvert',
            in_progress: 'En cours',
            resolved: 'Résolu',
            closed: 'Fermé'
        };

        console.log(item.tickets_messages)

        const unreadCount = item.tickets_messages?.filter(
            (msg: any) => !msg.read_at && msg.sender_id !== user?.id &&  msg?.sender_id != null
        ).length || 0;

        return (
            <TouchableOpacity
                style={[styles.ticketItem, isDarkMode && styles.ticketItemDark]}
                onPress={() => router.push(`/profile/support/${item.id}`)}
            >
                <View style={styles.ticketHeader}>
                    <View style={styles.ticketInfo}>
                        <Text style={[styles.ticketTitle, isDarkMode && styles.ticketTitleDark]}>
                            {item.title || 'Nouveau ticket'}
                        </Text>
                        <Text style={[styles.ticketDate, isDarkMode && styles.ticketDateDark]}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: statusColors[item.status as keyof typeof statusColors] }
                    ]}>
                        <Text style={styles.statusText}>
                            {statusLabels[item.status as keyof typeof statusLabels]}
                        </Text>
                    </View>
                </View>

                <View style={styles.ticketFooter}>
                    {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unreadCount}</Text>
                        </View>
                    )}
                    <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={isDarkMode ? '#E5E7EB' : '#6B7280'}
                    />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.color.primary[500]} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Une erreur est survenue</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={refetch}
                >
                    <Text style={styles.retryText}>Réessayer</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Mes tickets
                </Text>
                <TouchableOpacity
                    style={[styles.newTicketButton, isDarkMode && styles.newTicketButtonDark]}
                    onPress={() => setNewTicketModalVisible(true)}
                >
                    <MaterialIcons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={tickets}
                renderItem={renderTicketItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            <Modal
                visible={isNewTicketModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setNewTicketModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
                                Nouveau ticket
                            </Text>
                            <TouchableOpacity
                                onPress={() => setNewTicketModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons
                                    name="close"
                                    size={24}
                                    color={isDarkMode ? '#E5E7EB' : '#4B5563'}
                                />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.input, isDarkMode && styles.inputDark]}
                            value={newTicketTitle}
                            onChangeText={setNewTicketTitle}
                            placeholder="Décrivez brièvement votre problème"
                            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                            multiline
                            maxLength={100}
                        />

                        <TouchableOpacity
                            style={[
                                styles.createButton,
                                (!newTicketTitle.trim() || isCreating) && styles.createButtonDisabled
                            ]}
                            onPress={handleCreateNewTicket}
                            disabled={!newTicketTitle.trim() || isCreating}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.createButtonText}>Créer le ticket</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: theme.color.dark.border,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    headerTitleDark: {
        color: '#E5E7EB',
    },
    newTicketButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.color.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
    },
    newTicketButtonDark: {
        backgroundColor: theme.color.primary[600],
    },
    listContainer: {
        padding: 16,
        gap: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: theme.color.primary[500],
        borderRadius: 8,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    ticketItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    ticketItemDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    ticketInfo: {
        flex: 1,
        marginRight: 12,
    },
    ticketTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 4,
    },
    ticketTitleDark: {
        color: '#E5E7EB',
    },
    ticketDate: {
        fontSize: 14,
        color: '#6B7280',
    },
    ticketDateDark: {
        color: '#9CA3AF',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.border.radius.small,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1F2937',
    },
    ticketFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
    },
    unreadBadge: {
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    separator: {
        height: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    modalContentDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalTitleDark: {
        color: '#E5E7EB',
    },
    closeButton: {
        padding: 4,
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    inputDark: {
        backgroundColor: theme.color.dark.background.tertiary,
        color: '#E5E7EB',
    },
    createButton: {
        backgroundColor: theme.color.primary[500],
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    createButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TicketListScreen;