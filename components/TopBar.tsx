import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { Link } from 'expo-router';

interface TopBarProps {
    userName: string;
    streaks: number;
    xp: number;
    onChangeProgram: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ userName, streaks, xp, onChangeProgram }) => {
    const { user,  } = useAuth();
    return (
        <View style={styles.container}>
            {/* Profile and Stats Row */}
            <View style={styles.mainRow}>
                <View style={styles.profileSection}>
                <Link href={'/(app)/profile'} asChild >
                    <Image 
                        // source={{ uri: `https://avatars.dicebear.com/api/initials/${userName}.png` }} 
                        source={{ uri: user?.image?.url || "https://api.dicebear.com/9.x/initials/png?&seed="+userName }} 
                        style={styles.profileImage} 
                        />
                        </Link> 

                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.firstname}</Text>
                        <Text style={styles.levelText}>Level 3</Text>
                    </View>
                </View>

                <View style={styles.statsSection}>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
                        
                        <Text style={styles.statValue}>{user?.user_xp?.total_xp || 0}</Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                        <FontAwesome5 name="fire" size={20} color="#FF4500" />
                        <Text style={styles.statValue}>{user?.user_streaks.current_streak}</Text>
                    </View>

                    <TouchableOpacity style={styles.programButton} onPress={onChangeProgram}>
                        <MaterialCommunityIcons name="book-open-variant" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
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
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    userInfo: {
        marginLeft: 8,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    levelText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
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