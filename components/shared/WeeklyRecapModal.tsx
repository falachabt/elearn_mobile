// components/shared/WeeklyRecapModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { WeeklyRecapData } from '@/hooks/useWeeklyRecap'; // Adjust path
import { useUser } from '@/contexts/useUserInfo'; // For current streak

interface WeeklyRecapModalProps {
    visible: boolean;
    onClose: () => void;
    data: WeeklyRecapData | null;
}

const StatItem: React.FC<{ iconName: any; value: string | number; label: string; color?: string, isDark: boolean }> =
    ({ iconName, value, label, color, isDark }) => (
    <View style={[styles.statItem, isDark && styles.statItemDark]}>
        <MaterialCommunityIcons name={iconName} size={28} color={color || (isDark ? theme.color.primary[300] : theme.color.primary[500])} />
        <Text style={[styles.statValue, isDark && styles.statValueDark, color ? {color} : {}]}>{value}</Text>
        <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>{label}</Text>
    </View>
);

const WeeklyRecapModal: React.FC<WeeklyRecapModalProps> = ({ visible, onClose, data }) => {
    const { user: userInfo } = useUser(); // For streaks
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (!data) return null;

    const formatTime = (ms: number) => {
        const totalMinutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                    <View style={styles.modalHeader}>
                        <MaterialCommunityIcons name="calendar-check" size={32} color={isDark ? theme.color.primary[300] : theme.color.primary[500]} />
                        <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Votre RÃ©cap' Hebdo !</Text>
                    </View>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Text style={[styles.periodText, isDark && styles.periodTextDark]}>
                            Du {new Date(data.periodStart!).toLocaleDateString('fr-FR')} au {new Date(data.periodEnd!).toLocaleDateString('fr-FR')}
                        </Text>

                        <View style={styles.statsGrid}>
                            <StatItem iconName="star-four-points" value={data.xpGained} label="XP GagnÃ©s" color="#FFD700" isDark={isDark} />
                            <StatItem iconName="clock-time-four-outline" value={formatTime(data.learningTimeMs)} label="Temps d'App." color="#4CAF50" isDark={isDark}/>
                            <StatItem iconName="fire" value={userInfo?.user_streaks?.current_streak || 0} label="SÃ©rie Actuelle" color="#FF6F00" isDark={isDark}/>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>ProgrÃ¨s RÃ©alisÃ©s :</Text>
                            <StatItem iconName="notebook-check" value={data.lessonsCompleted} label="LeÃ§ons TerminÃ©es" isDark={isDark} />
                            <StatItem iconName="help-circle-outline" value={data.quizzesPassed} label="Quiz RÃ©ussis" isDark={isDark} />
                            <StatItem iconName="pencil-box-outline" value={data.exercisesCompleted} label="Exercices Faits" isDark={isDark} />
                        </View>

                        <Text style={[styles.motivationalMessage, isDark && styles.motivationalMessageDark]}>
                            Bravo pour votre engagement cette semaine ! Continuez sur cette lancÃ©e. ðŸš€
                        </Text>
                    </ScrollView>

                    <TouchableOpacity style={[styles.closeButton, isDark && styles.closeButtonDark]} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Fermer</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center' },
    modalContentDark: { backgroundColor: theme.color.dark.background.secondary },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontFamily : theme.typography.fontFamily,fontSize: 22, fontWeight: 'bold', marginLeft: 10, color: theme.color.text },
    modalTitleDark: { color: theme.color.dark.text.primary },
    scrollContent: { paddingBottom: 20 },
    periodText: { fontFamily : theme.typography.fontFamily,fontSize: 14, color: theme.color.gray[600], marginBottom: 20, textAlign: 'center' },
    periodTextDark: { color: theme.color.gray[400] },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, flexWrap: 'wrap' },
    statItem: { alignItems: 'center', marginVertical: 10, width: '45%' }, // Adjusted for better wrapping
    statItemDark: {},
    statValue: { fontFamily : theme.typography.fontFamily,fontSize: 20, fontWeight: 'bold', marginTop: 4, color: theme.color.text },
    statValueDark: { color: theme.color.dark.text.primary },
    statLabel: { fontFamily : theme.typography.fontFamily,fontSize: 12, color: theme.color.gray[600], marginTop: 2, textAlign: 'center' },
    statLabelDark: { color: theme.color.gray[400] },
    section: { width: '100%', marginBottom: 20, padding: 10, backgroundColor: theme.color.gray[50], borderRadius: 8 },
    sectionTitle: { fontFamily : theme.typography.fontFamily,fontSize: 16, fontWeight: '600', marginBottom: 10, color: theme.color.primary[600] },
    sectionTitleDark: { color: theme.color.primary[300] },
    motivationalMessage: { fontFamily : theme.typography.fontFamily,fontSize: 15, fontStyle: 'italic', color: theme.color.gray[700], textAlign: 'center', marginTop: 10 },
    motivationalMessageDark: { color: theme.color.gray[300] },
    closeButton: { backgroundColor: theme.color.primary[500], paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, marginTop: 20 },
    closeButtonDark: { backgroundColor: theme.color.primary[600] },
    closeButtonText: { fontFamily : theme.typography.fontFamily,color: 'white', fontSize: 16, fontWeight: '600' },
});

export default WeeklyRecapModal;