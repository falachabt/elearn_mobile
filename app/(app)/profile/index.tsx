import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform, 
  Modal 
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Link } from 'expo-router';
import TopBar from '@/components/TopBar';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';

interface MenuItem {
  icon: JSX.Element;
  label: string;
  route: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const userData = {
    name: user?.firstname || 'John Doe',
    email: user?.email || 'john.doe@example.com',
    studentId: user?.authId || 'STU-2024-001',
    xp:  2500,
    streaks:  15,
    completedCourses:  8,
    achievements: Array.isArray(user?.achievements) ? user.achievements.length : (user?.achievements || 12)
  };

  const menuItems: MenuItem[] = [
    {
      icon: <MaterialCommunityIcons name="book-open-variant" size={24} color="#4B5563" />,
      label: 'Mes cours',
      route: '/courses/my-courses'
    },
    {
      icon: <MaterialCommunityIcons name="certificate" size={24} color="#4B5563" />,
      label: 'Certificats',
      route: '/profile/certificates'
    },
    {
      icon: <Ionicons name="stats-chart" size={24} color="#4B5563" />,
      label: 'Statistiques',
      route: '/profile/statistics'
    },
    {
      icon: <MaterialCommunityIcons name="trophy-outline" size={24} color="#4B5563" />,
      label: 'Classement',
      route: '/profile/leaderboard'
    },
    {
      icon: <Ionicons name="settings-outline" size={24} color="#4B5563" />,
      label: 'Paramètres',
      route: '/settings'
    },
    {
      icon: <MaterialCommunityIcons name="credit-card-outline" size={24} color="#4B5563" />,
      label: 'Paiements',
      route: '/profile/payments'
    }
  ];

  const StatCard = ({ icon, value, label }: { icon: JSX.Element; value: number; label: string }) => (
    <View style={styles.statCard}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const MenuItem = ({ item }: { item: MenuItem }) => (
    <Link href={item.route as any} asChild>
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuIcon}>{item.icon}</View>
        <Text style={styles.menuLabel}>{item.label}</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
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
    <View style={styles.container}>
      <TopBar 
        userName={userData.name}
        streaks={userData.streaks}
        xp={userData.xp}
        onChangeProgram={() => {}}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image 
              source={{ uri: `https://avatars.dicebear.com/api/initials/${userData.name}.png` }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.email}>{userData.email}</Text>
              <Text style={styles.studentId}>{userData.studentId}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Modifier le profil</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <StatCard 
            icon={<MaterialCommunityIcons name="book-open-variant" size={24}  />}
            value={userData.completedCourses}
            label="Cours"
          />
          <StatCard 
            icon={<FontAwesome5 name="trophy" size={24}  />}
            value={userData.achievements}
            label="Réalisations"
          />
          <StatCard 
            icon={<Ionicons name="flame" size={24}  />}
            value={userData.streaks}
            label="Série"
          />
        </View>

        {/* Menu List */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isLoggingOut}>
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirmation</Text>
            <Text style={styles.modalMessage}>Êtes-vous sûr de vouloir vous déconnecter ?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={confirmLogout}>
                <Text style={[styles.modalButtonText, styles.modalButtonConfirmText]}>Déconnecter</Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
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
    fontSize: 16,
    color: '#374151',
  },
  studentId: {
    fontSize: 14,
    color: theme.color.primary[500],
    marginTop: 4,
  },
  editButton: {
    backgroundColor: theme.color.primary[500],
    borderRadius: theme.border.radius.small,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
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
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  menuList: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: theme.border.radius.small,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 100,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.small,
  },
  modalMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: theme.spacing.medium,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.border.radius.small,
    marginHorizontal: 8,
    backgroundColor: '#E5E7EB',
  },
  modalButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalButtonConfirmText: {
    color: '#FFFFFF',
  },
});

export default Profile;