import React, {useState} from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    Modal,
    useColorScheme,
} from 'react-native';
import {MaterialCommunityIcons, Ionicons, MaterialIcons, FontAwesome5} from '@expo/vector-icons';
import {Link, router} from 'expo-router';
import TopBar from '@/components/TopBar';
import {theme} from '@/constants/theme';
import {useAuth} from '@/contexts/auth';
import useSWR from "swr";
import {supabase} from "@/lib/supabase";

interface MenuItem {
    icon: JSX.Element;
    label: string;
    route: string;
}


const fetcher = async (key: string): Promise<{
    total_time_in_second: number;
    completed_courses: number | null;
    streaks: any;
}> => {
    const id = key.split("/")[1];
    const {data: user_activty, error} = await supabase.from('user_activity').select('duration').eq('user_id', id);
    const {
        count: completed_courses_count,
        error: error2
    } = await supabase.from('course_progress_summary').select('course_id', {count: 'exact'}).eq('user_id', id).eq("is_completed", true);
    const {
        data,
        error: error3
    } = await supabase.from('user_streaks').select('max_streak').eq('user_id', id).maybeSingle();

    if (error || error2 || error3) {
        console.log('Error fetching user activity:', error);
        return {
            total_time_in_second: 0,
            completed_courses: 0,
            streaks: 0,
        }
    }



    return {
        total_time_in_second: user_activty?.reduce((acc, curr) => acc + curr.duration, 0) || 0,
        completed_courses: completed_courses_count,
        streaks: data?.max_streak || 0,
    }
};

const Profile = () => {
    const {user, signOut} = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const {data} = useSWR(
        "profile/"+user?.id,
        fetcher,
        {
            revalidateOnFocus: true,
        }
    );

    console.log("data", data);



    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const userData = {
        name: user?.firstname || '',
        email: user?.email || '',
        studentId: user?.authId || 'STU-2024-001',
        xp: 0,
        streaks: 0,
        completedCourses: 0,
        learningTime: '0',
    };

    const menuItems: MenuItem[] = [
        {
            icon: <MaterialCommunityIcons name="book-open-variant" size={24} color={theme.color.primary[500]}/>,
            label: 'Mes programmes',
            route: '/(app)/learn',
        },
        // {
        //     icon: <Ionicons name="stats-chart" size={24} color={theme.color.primary[500]}/>,
        //     label: 'Statistiques',
        //     route: '/profile/statistics',
        // },
        // {
        //     icon: <MaterialCommunityIcons name="trophy-outline" size={24} color={theme.color.primary[500]}/>,
        //     label: 'Classement',
        //     route: '/profile/leaderboard',
        // },
        {
            icon: <Ionicons name="settings-outline" size={24} color={theme.color.primary[500]}/>,
            label: 'Paramètres',
            route: '/profile/settings',
        },
        {
            icon: <MaterialCommunityIcons name="credit-card-outline" size={24} color={theme.color.primary[500]}/>,
            label: 'Paiements',
            route: '/profile/paiements',
        },
        {
            icon: <MaterialIcons name="support-agent" size={24} color={theme.color.primary[500]}/>,
            label: 'Service client',
            route: '/profile/supportList',
        },
    ];

    const StatCard = ({icon, value, label,}: { icon: JSX.Element; value: number | string; label: string; }) => (
        <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
            <View style={[styles.statIcon, isDarkMode && styles.statIconDark]}>
                {icon}
            </View>
            <Text style={[styles.statValue, isDarkMode && styles.statValueDark]}>{value}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>{label}</Text>
        </View>
    );

    const MenuItem = ({item}: { item: MenuItem }) => (
        <Link href={item.route as any} asChild>
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                    backgroundColor: isDarkMode ? theme.color.dark.background.secondary : '#FFFFFF',
                }}
            >
                <View style={{width: 32, alignItems: 'center'}}>{item.icon}</View>
                <Text style={{
                    flex: 1,
                    marginLeft: 12,
                    fontFamily : theme.typography.fontFamily,
fontSize: 16,
                    color: isDarkMode ? '#E5E7EB' : '#1F2937',
                }}>
                    {item.label}
                </Text>
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={isDarkMode ? '#E5E7EB' : '#9CA3AF'}
                />
            </TouchableOpacity>
        </Link>
    );

    const handleLogout = () => {
        setIsModalVisible(true);
    };

    const confirmLogout = async () => {
        setIsLoggingOut(true);
        setIsModalVisible(false);
        try {
            await signOut();
        } catch (error) {
            console.error('Error logging out:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <View style={[styles.container, isDarkMode && styles.containerDark]}>
            <TopBar
                userName={userData.name}
                streaks={userData.streaks}
                xp={userData.xp}
                onChangeProgram={() => {
                }}
            />

            <ScrollView
                style={[styles.content, isDarkMode && styles.contentDark]}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Info Card */}
                <View style={[styles.profileCard, isDarkMode && styles.profileCardDark]}>
                    <View style={styles.profileHeader}>
                        <Image
                            source={{
                                uri: `https://avatars.dicebear.com/api/initials/${userData.name}.png`,
                            }}
                            style={styles.avatar}
                        />
                        <View style={styles.profileInfo}>
                            <Text style={[styles.email, isDarkMode && styles.emailDark]}>
                                {userData.email}
                            </Text>
                            <Text style={[styles.studentId, isDarkMode && styles.studentIdDark]}>
                                {userData.studentId}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/(app)/profile/editProfile')}
                        style={[styles.editButton, isDarkMode && styles.editButtonDark]}
                    >
                        <Text style={styles.editButtonText}>Modifier le profil</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Section */}
                <View style={styles.statsContainer}>
                    <StatCard
                        icon={<MaterialCommunityIcons name="book-open-variant" size={24}
                                                      color={isDarkMode ? theme.color.primary[400] : theme.color.primary[600]}/>}
                        value={data?.completed_courses || 0}
                        label="Cours"
                    />
                    <StatCard
                        icon={<MaterialIcons name="timer" size={24}
                                             color={isDarkMode ? theme.color.warning : theme.color.primary[400]}/>}
                        // well format the time
                        value={((data?.total_time_in_second || 0) / 3600).toFixed(2) +  " h" || 0}
                        label="Temps total"
                    />
                    <StatCard
                        icon={<FontAwesome5 name="fire" size={20}
                                            color={"red"}/>}
                        value={data?.streaks || 0}
                        label="max série"
                    />
                </View>

                {/* Menu List */}
                <View style={[styles.menuList, isDarkMode && styles.menuListDark]}>
                    {menuItems.map((item, index) => (
                        <MenuItem key={index} item={item}/>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={[styles.logoutButton, isDarkMode && styles.logoutButtonDark]}
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                >
                    <Text style={styles.logoutButtonText}>Déconnexion</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Logout Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
                        <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
                            Confirmation
                        </Text>
                        <Text style={[styles.modalMessage, isDarkMode && styles.modalMessageDark]}>
                            Êtes-vous sûr de vouloir vous déconnecter ?
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, isDarkMode && styles.modalButtonDark]}
                                onPress={() => setIsModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, isDarkMode && styles.modalButtonTextDark]}>
                                    Annuler
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={confirmLogout}
                            >
                                <Text style={[styles.modalButtonText, styles.modalButtonConfirmText]}>
                                    Déconnecter
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default Profile;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    content: {
        flex: 1,
        padding: 16,
        marginBottom: 60,
    },
    contentDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        padding: theme.spacing.medium,
        marginBottom: theme.spacing.medium,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    profileCardDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E5E7EB',
    },
    profileInfo: {
        marginLeft: 16,
        flex: 1,
    },
    email: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    emailDark: {
        color: '#E5E7EB',
    },
    studentId: {
        fontFamily : theme.typography.fontFamily,
fontSize: 14,
        color: theme.color.primary[500],
        marginTop: 4,
    },
    studentIdDark: {
        color: theme.color.primary[400],
    },
    editButton: {
        backgroundColor: theme.color.primary[500],
        borderRadius: theme.border.radius.small,
        paddingVertical: 12,
        marginTop: 16,
        alignItems: 'center',
    },
    editButtonDark: {
        backgroundColor: theme.color.primary[600],
    },
    editButtonText: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        padding: 12,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    statCardDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statIconDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    statValue: {
        fontFamily : theme.typography.fontFamily,
fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statValueDark: {
        color: '#E5E7EB',
    },
    statLabel: {
        fontFamily : theme.typography.fontFamily,
fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    statLabelDark: {
        color: '#9CA3AF',
    },
    menuList: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    menuListDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    menuItemDark: {
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: theme.color.dark.background.secondary,
    },
    menuIcon: {
        width: 32,
        alignItems: 'center',
    },
    menuLabel: {
        flex: 1,
        marginLeft: 12,
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#1F2937',
    },
    menuLabelDark: {
        color: '#E5E7EB',
    },
    logoutButton: {
        backgroundColor: '#EF4444',
        borderRadius: theme.border.radius.small,
        paddingVertical: 12,
        marginTop: 16,
        marginBottom: 32,
        alignItems: 'center',
    },
    logoutButtonDark: {
        backgroundColor: '#DC2626',
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.medium,
        padding: theme.spacing.large,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    modalContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    modalTitle: {
        fontFamily : theme.typography.fontFamily,
fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: theme.spacing.small,
    },
    modalTitleDark: {
        color: '#E5E7EB',
    },
    modalMessage: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        color: '#374151',
        textAlign: 'center',
        marginBottom: theme.spacing.medium,
    },
    modalMessageDark: {
        color: '#D1D5DB',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
        marginBottom: theme.spacing.medium,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: theme.border.radius.small,
        backgroundColor: '#E5E7EB',
    },
    modalButtonDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    modalButtonConfirm: {
        backgroundColor: '#EF4444',
    },
    modalButtonText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    modalButtonTextDark: {
        color: '#E5E7EB',
    },
    modalButtonConfirmText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});