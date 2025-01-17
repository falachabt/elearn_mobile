import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform 
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Link } from 'expo-router';
import TopBar from '@/components/TopBar';
import { theme } from '@/constants/theme';

const PRIMARY_COLOR = '#4CAF50'; // Green color from the image

interface MenuItem {
  icon: JSX.Element;
  label: string;
  route: string;
}

const Profile = () => {
  const userData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    studentId: 'STU-2024-001',
    xp: 2500,
    streaks: 15,
    completedCourses: 8,
    achievements: 12
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
            icon={<MaterialCommunityIcons name="book-open-variant" size={24} color={PRIMARY_COLOR} />}
            value={userData.completedCourses}
            label="Cours"
          />
          <StatCard 
            icon={<FontAwesome5 name="trophy" size={24} color={PRIMARY_COLOR} />}
            value={userData.achievements}
            label="Réalisations"
          />
          <StatCard 
            icon={<Ionicons name="flame" size={24} color={PRIMARY_COLOR} />}
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
      </ScrollView>
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
    color: PRIMARY_COLOR,
    marginTop: 4,
  },
  editButton: {
    backgroundColor: PRIMARY_COLOR,
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
});

export default Profile;