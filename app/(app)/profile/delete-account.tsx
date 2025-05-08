import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    useColorScheme,
    Platform,
    SafeAreaView,
    Modal,
    Alert,
    ActivityIndicator
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { supabase } from "@/lib/supabase";
import axios from "axios";

// Define confirmation types to fix TypeScript errors
type ConfirmationKey = 'loseData' | 'cannotRecover' | 'confirmFinal';
type Confirmations = {
    [key in ConfirmationKey]: boolean;
};

// Define checkbox props to fix TypeScript errors
interface CheckboxProps {
    label: string;
    checked: boolean;
    onToggle: () => void;
}

const DeleteAccount = () => {
    const { user, signOut } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [confirmations, setConfirmations] = useState<Confirmations>({
        loseData: false,
        cannotRecover: false,
        confirmFinal: false,
    });

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const allConfirmed = Object.values(confirmations).every(value => value === true);

    const handleOpenModal = () => {
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const toggleConfirmation = (key: ConfirmationKey) => {
        setConfirmations(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleDeleteAccount = async () => {
        if (!allConfirmed) return;

        setIsDeleting(true);
        try {
            const { data: session } = await supabase.auth.getSession();

            const response = await axios.delete('https://elearn.ezadrive.com/api/mobile/auth/delete', {
                headers: {
                    'Authorization': `Bearer ${session?.session?.access_token}`
                }
            });

            if (response.data.success) {
                await signOut();
                router.replace('/(auth)/login');
            } else {
                throw new Error(response.data.error || 'Failed to delete account');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            Alert.alert(
                'Error',
                'Failed to delete account. Please try again later.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsDeleting(false);
            setIsModalVisible(false);
        }
    };


    const CustomCheckbox: React.FC<CheckboxProps> = ({ label, checked, onToggle }) => (
        <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={onToggle}
            activeOpacity={0.7}
        >
            <View style={[
                styles.checkbox,
                checked && styles.checkboxChecked,
                isDarkMode && styles.checkboxDark,
                checked && isDarkMode && styles.checkboxCheckedDark
            ]}>
                {checked && (
                    <FontAwesome5 name="check" size={12} color="#FFF" />
                )}
            </View>
            <Text style={[
                styles.checkboxLabel,
                isDarkMode && styles.checkboxLabelDark
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={isDarkMode ? '#FFF' : '#000'}
                    />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Supprimer mon compte
                </Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    entering={FadeInDown.duration(500).delay(100)}
                    style={styles.contentContainer}
                >
                    {/* Modern Warning Section */}
                    <View style={[styles.iconWrapper, isDarkMode && styles.iconWrapperDark]}>
                        <MaterialIcons name="warning" size={48} color="#EF4444" />
                    </View>

                    <Text style={[styles.title, isDarkMode && styles.titleDark]}>
                        Êtes-vous sûr de vouloir supprimer votre compte?
                    </Text>

                    <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
                        Cette action est permanente et ne peut pas être annulée.
                    </Text>

                    {/* Modern Consequences Cards */}
                    <View style={styles.cardsContainer}>
                        <Animated.View
                            entering={FadeInDown.duration(500).delay(150)}
                            style={[styles.card, isDarkMode && styles.cardDark]}
                        >
                            <FontAwesome5 name="history" size={20} color={isDarkMode ? "#93C5FD" : "#3B82F6"} />
                            <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]}>
                                Historique d'apprentissage
                            </Text>
                        </Animated.View>

                        <Animated.View
                            entering={FadeInDown.duration(500).delay(200)}
                            style={[styles.card, isDarkMode && styles.cardDark]}
                        >
                            <FontAwesome5 name="chart-line" size={20} color={isDarkMode ? "#93C5FD" : "#3B82F6"} />
                            <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]}>
                                Progression des cours
                            </Text>
                        </Animated.View>

                        <Animated.View
                            entering={FadeInDown.duration(500).delay(250)}
                            style={[styles.card, isDarkMode && styles.cardDark]}
                        >
                            <FontAwesome5 name="credit-card" size={20} color={isDarkMode ? "#93C5FD" : "#3B82F6"} />
                            <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]}>
                                Abonnements & paiements
                            </Text>
                        </Animated.View>
                    </View>

                    <Animated.View
                        entering={FadeInDown.duration(500).delay(300)}
                        style={[styles.alternativeCard, isDarkMode && styles.alternativeCardDark]}
                    >
                        <FontAwesome5 name="info-circle" size={20} color={isDarkMode ? "#93C5FD" : "#3B82F6"} />
                        <Text style={[styles.alternativeText, isDarkMode && styles.alternativeTextDark]}>
                            Besoin d'une pause? Vous pouvez simplement vous déconnecter et revenir plus tard.
                        </Text>
                    </Animated.View>
                </Animated.View>

                <Animated.View
                    entering={FadeInDown.duration(500).delay(400)}
                    style={styles.buttonContainer}
                >
                    <TouchableOpacity
                        style={[styles.cancelButton, isDarkMode && styles.cancelButtonDark]}
                        onPress={() => router.back()}
                    >
                        <Text style={[styles.cancelButtonText, isDarkMode && styles.cancelButtonTextDark]}>
                            Annuler
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.deleteButton, isDarkMode && styles.deleteButtonDark]}
                        onPress={handleOpenModal}
                    >
                        <Text style={styles.deleteButtonText}>
                            Supprimer mon compte
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>

            {/* Modern Modal Dialog */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={handleCloseModal}
            >
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
                                Confirmation
                            </Text>
                            <TouchableOpacity onPress={handleCloseModal}>
                                <Ionicons name="close" size={24} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.confirmationContainer}>
                            <CustomCheckbox
                                label="Je comprends que mes données seront perdues"
                                checked={confirmations.loseData}
                                onToggle={() => toggleConfirmation('loseData')}
                            />

                            <CustomCheckbox
                                label="Je comprends que cette action est permanente"
                                checked={confirmations.cannotRecover}
                                onToggle={() => toggleConfirmation('cannotRecover')}
                            />

                            <CustomCheckbox
                                label="Je souhaite définitivement supprimer mon compte"
                                checked={confirmations.confirmFinal}
                                onToggle={() => toggleConfirmation('confirmFinal')}
                            />
                        </View>

                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalCancelButton, isDarkMode && styles.modalCancelButtonDark]}
                                onPress={handleCloseModal}
                            >
                                <Text style={[styles.modalButtonText, isDarkMode && styles.modalButtonTextDark]}>
                                    Annuler
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.modalConfirmButton,
                                    !allConfirmed && styles.modalButtonDisabled
                                ]}
                                onPress={handleDeleteAccount}
                                disabled={!allConfirmed || isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalConfirmButtonText}>
                                        Confirmer
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingBottom: 45,
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            }
        }),
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        marginLeft: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        fontFamily: theme.typography.fontFamily,
    },
    headerTitleDark: {
        color: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 20,
        paddingBottom: 40,
    },
    contentContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconWrapper: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconWrapperDark: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: theme.typography.fontFamily,
    },
    titleDark: {
        color: '#F9FAFB',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
        fontFamily: theme.typography.fontFamily,
    },
    subtitleDark: {
        color: '#D1D5DB',
    },
    cardsContainer: {
        width: '100%',
        marginBottom: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cardDark: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1E40AF',
        marginLeft: 12,
        fontFamily: theme.typography.fontFamily,
    },
    cardTitleDark: {
        color: '#93C5FD',
    },
    alternativeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        width: '100%',
    },
    alternativeCardDark: {
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
    },
    alternativeText: {
        fontSize: 14,
        color: '#4B5563',
        marginLeft: 12,
        flex: 1,
        fontFamily: theme.typography.fontFamily,
    },
    alternativeTextDark: {
        color: '#D1D5DB',
    },
    buttonContainer: {
        width: '100%',
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    cancelButtonDark: {
        borderColor: '#4B5563',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
        fontFamily: theme.typography.fontFamily,
    },
    cancelButtonTextDark: {
        color: '#E5E7EB',
    },
    deleteButton: {
        backgroundColor: '#EF4444',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    deleteButtonDark: {
        backgroundColor: '#DC2626',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    modalContainerDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        fontFamily: theme.typography.fontFamily,
    },
    modalTitleDark: {
        color: '#F9FAFB',
    },
    confirmationContainer: {
        padding: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxDark: {
        borderColor: '#6B7280',
        backgroundColor: theme.color.dark.background.tertiary,
    },
    checkboxChecked: {
        borderColor: theme.color.primary[500],
        backgroundColor: theme.color.primary[500],
    },
    checkboxCheckedDark: {
        borderColor: theme.color.primary[400],
        backgroundColor: theme.color.primary[400],
    },
    checkboxLabel: {
        marginLeft: 12,
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
        fontFamily: theme.typography.fontFamily,
    },
    checkboxLabelDark: {
        color: '#D1D5DB',
    },
    modalButtonContainer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelButton: {
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    modalCancelButtonDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    modalConfirmButton: {
        backgroundColor: '#EF4444',
        marginLeft: 8,
    },
    modalButtonDisabled: {
        backgroundColor: '#FCA5A5',
        opacity: 0.7,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
        fontFamily: theme.typography.fontFamily,
    },
    modalButtonTextDark: {
        color: '#E5E7EB',
    },
    modalConfirmButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
    },
});

export default DeleteAccount;