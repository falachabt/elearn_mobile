import {Ticket, useTickets} from "@/hooks/useTicketList";
import {ActivityIndicator, FlatList, TouchableOpacity, useColorScheme, View, StyleSheet, Platform, Text} from "react-native";
import {theme} from "@/constants/theme";
import {useRouter} from "expo-router";
import {MaterialIcons} from "@expo/vector-icons";

const TicketsList = () => {
    const { tickets, loading, error } = useTickets();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const router = useRouter();

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

                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }


    const renderTicket = ({ item }: { item: Ticket }) => (
        <TouchableOpacity
            style={[styles.ticketCard, isDarkMode && styles.ticketCardDark]}
            // onPress={() => router.push(`/support/${item.id}`)}
        >
            <View style={styles.ticketHeader}>
                <View style={styles.ticketMeta}>
                    <Text style={[styles.ticketDate, isDarkMode && styles.ticketDateDark]}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                    <View style={[styles.statusBadge, styles[`status${item.status}`]]}>
                        <Text style={styles.statusText}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Text>
                    </View>
                </View>
                {item.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread_count}</Text>
                    </View>
                )}
            </View>

            <Text style={[styles.lastMessage, isDarkMode && styles.lastMessageDark]}>
                {item.last_message?.content || 'Aucun message'}
            </Text>

            <View style={styles.ticketFooter}>
                <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={isDarkMode ? '#E5E7EB' : '#6B7280'}
                />
            </View>
        </TouchableOpacity>
    );

    return (
        <FlatList
            data={tickets}
            renderItem={renderTicket}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
    );
};

const styles = StyleSheet.create({
    listContainer: {
        padding: 16,
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
        color: '#EF4444',
        textAlign: 'center',
    },
    ticketCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
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
    ticketCardDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    ticketMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ticketDate: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#6B7280',
    },
    ticketDateDark: {
        color: '#9CA3AF',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusopen: {
        backgroundColor: '#FEF3C7',
    },
    statusin_progress: {
        backgroundColor: '#DBEAFE',
    },
    statusresolved: {
        backgroundColor: '#D1FAE5',
    },
    statusclosed: {
        backgroundColor: '#F3F4F6',
    },
    statusText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        fontWeight: '500',
        color: '#1F2937',
    },
    unreadBadge: {
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    unreadText: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        fontWeight: '600',
    },
    lastMessage: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: '#4B5563',
        marginBottom: 8,
    },
    lastMessageDark: {
        color: '#D1D5DB',
    },
    ticketFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    separator: {
        height: 8,
    },
});

export default TicketsList;