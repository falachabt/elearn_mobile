import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Platform} from 'react-native';
import {MaterialCommunityIcons, FontAwesome5} from '@expo/vector-icons';
import {useRouter} from 'expo-router';

import {theme} from '@/constants/theme';
import {useAuth} from '@/contexts/auth';
import {getUnreadNotificationCount} from '@/services/notifications.service';

interface TopBarProps {
    userName: string;
    streaks: number;
    xp: number;
    onChangeProgram: () => void;
}

const TopBar: React.FC<TopBarProps> = ({userName, streaks, xp, onChangeProgram}) => {
    const {user,} = useAuth();
    const router = useRouter();
    void userName;
    void streaks;
    void xp;
    void onChangeProgram;

    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getUnreadNotificationCount().then((count) => {
            if (!cancelled) setUnreadCount(count);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <View style={styles.container}>
            {/* Stats and Notifications Row */}
            <View style={styles.mainRow}>
                <View style={styles.statsSection}>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="star" size={20} color="#FFD700"/>

                        <Text style={styles.statValue}>{user?.user_xp?.total_xp || 0}</Text>
                    </View>

                    <View style={styles.statDivider}/>

                    <View style={styles.statItem}>
                        <FontAwesome5 name="fire" size={20} color="#FF4500"/>
                        <Text style={styles.statValue}>{user?.user_streaks?.current_streak || 0}</Text>
                    </View>

                    <TouchableOpacity style={styles.programButton} onPress={() => router.push('/(app)/learn')}>
                        <MaterialCommunityIcons name="book-open-variant" size={20} color="#FFF"/>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => router.push('/notifications')}
                >
                    <MaterialCommunityIcons name="bell-outline" size={24} color="#FFF"/>
                    {unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            {/* <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '75%' }]} />
                </View>
            </View> */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.color.primary[500],
        paddingTop: Platform.OS === 'ios' ? 40 : 12,
        paddingHorizontal: theme.spacing.medium,
        paddingBottom: 12,
        borderBottomLeftRadius: theme.border.radius.small,
        borderBottomRightRadius: theme.border.radius.small,
    },
    mainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.color.primary[500],
    },
    notificationBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    statsSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 6,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    statValue: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginHorizontal: 4,
    },
    programButton: {
        marginLeft: 8,
        padding: 6,
    },
    progressContainer: {
        marginTop: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'black',
        borderRadius: 2,
    },
});

export default TopBar;
