import React from 'react';
import { logger } from '@/utils/logger';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    Linking,
    Platform,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { theme } from '@/constants/theme';

interface ContactInfo {
    title: string;
    number: string;
    hours: string;
    description: string;
}

// WhatsApp support configuration
const WHATSAPP_CONFIG = {
    defaultMessage: 'Bonjour, j\'ai besoin d\'aide avec Elearn Prepa.',
    errorMessages: {
        cannotOpen: 'Impossible d\'ouvrir WhatsApp. Veuillez installer l\'application WhatsApp ou vérifier votre connexion internet.',
        genericError: 'Une erreur s\'est produite lors de l\'ouverture de WhatsApp. Veuillez réessayer.',
    },
} as const;

const contactNumbers: ContactInfo[] = [
    {
        title: 'Support Technique',
        number: '+237657273753',
        hours: 'Lun-Ven: 9h-18h',
        description: 'Pour toute assistance technique avec la plateforme'
    },
    {
        title: 'Support Commercial',
        number: '+237651055663',
        hours: 'Lun-Ven: 9h-17h',
        description: 'Pour les questions concernant votre abonnement'
    }
];

const WhatsAppSupportScreen = () => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const handleWhatsAppPress = async (phoneNumber: string) => {
        try {
            const message = encodeURIComponent(WHATSAPP_CONFIG.defaultMessage);
            const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${message}`;
            
            const supported = await Linking.canOpenURL(whatsappUrl);
            
            if (supported) {
                await Linking.openURL(whatsappUrl);
            } else {
                // Fallback to web WhatsApp
                const webUrl = `https://wa.me/${phoneNumber}?text=${message}`;
                try {
                    await Linking.openURL(webUrl);
                } catch (webError) {
                    Alert.alert('Erreur', WHATSAPP_CONFIG.errorMessages.cannotOpen);
                }
            }
        } catch (error) {
            logger.error('Error opening WhatsApp:', error);
            Alert.alert('Erreur', WHATSAPP_CONFIG.errorMessages.genericError);
        }
    };

    return (
        <View style={[styles.container, isDarkMode && styles.containerDark]}>
            {/* Header */}
            <View style={[styles.header, isDarkMode && styles.headerDark]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <MaterialIcons
                        name="arrow-back"
                        size={24}
                        color={isDarkMode ? '#E5E7EB' : '#1F2937'}
                    />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
                    Service Client
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Info Banner */}
                <View style={[styles.infoBanner, isDarkMode && styles.infoBannerDark]}>
                    <MaterialIcons name="info-outline" size={24} color={theme.color.primary[500]} />
                    <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
                        Contactez-nous directement via WhatsApp pour une assistance rapide et personnalisée.
                    </Text>
                </View>

                {/* Contact Cards */}
                <View style={styles.cardsContainer}>
                    {contactNumbers.map((contact, index) => (
                        <View
                            key={index}
                            style={[styles.contactCard, isDarkMode && styles.contactCardDark]}
                        >
                            <View style={styles.cardHeader}>
                                <MaterialIcons
                                    name="support-agent"
                                    size={32}
                                    color={theme.color.primary[500]}
                                />
                                <Text style={[styles.contactTitle, isDarkMode && styles.contactTitleDark]}>
                                    {contact.title}
                                </Text>
                            </View>

                            <View style={styles.cardContent}>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="schedule" size={20} color="#9CA3AF" />
                                    <Text style={[styles.contactHours, isDarkMode && styles.contactHoursDark]}>
                                        {contact.hours}
                                    </Text>
                                </View>
                                <Text style={[styles.contactDescription, isDarkMode && styles.contactDescriptionDark]}>
                                    {contact.description}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.whatsappButton}
                                onPress={() => handleWhatsAppPress(contact.number)}
                                activeOpacity={0.8}
                            >
                                <MaterialIcons name="chat" size={20} color="#FFFFFF" />
                                <Text style={styles.whatsappButtonText}>
                                    Ouvrir WhatsApp
                                </Text>
                                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                {/* Additional Info */}
                <View style={[styles.additionalInfo, isDarkMode && styles.additionalInfoDark]}>
                    <MaterialIcons name="timer" size={20} color="#6B7280" />
                    <Text style={[styles.additionalInfoText, isDarkMode && styles.additionalInfoTextDark]}>
                        Nous répondons généralement en moins de 30 minutes pendant les heures d'ouverture.
                    </Text>
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
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    headerTitleDark: {
        color: '#E5E7EB',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DBEAFE',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        gap: 12,
    },
    infoBannerDark: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    infoText: {
        flex: 1,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#1E40AF',
        lineHeight: 20,
    },
    infoTextDark: {
        color: '#93C5FD',
    },
    cardsContainer: {
        gap: 16,
        marginBottom: 24,
    },
    contactCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    contactCardDark: {
        backgroundColor: theme.color.dark.background.secondary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    contactTitle: {
        flex: 1,
        fontFamily: theme.typography.fontFamily,
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    contactTitleDark: {
        color: '#E5E7EB',
    },
    cardContent: {
        gap: 12,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    contactHours: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: theme.color.primary[500],
        fontWeight: '500',
    },
    contactHoursDark: {
        color: theme.color.primary[400],
    },
    contactDescription: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    contactDescriptionDark: {
        color: '#9CA3AF',
    },
    whatsappButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D366',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    whatsappButtonText: {
        flex: 1,
        textAlign: 'center',
        color: '#FFFFFF',
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '600',
    },
    additionalInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
    },
    additionalInfoDark: {
        backgroundColor: theme.color.dark.background.tertiary,
    },
    additionalInfoText: {
        flex: 1,
        fontFamily: theme.typography.fontFamily,
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    additionalInfoTextDark: {
        color: '#9CA3AF',
    },
});

export default WhatsAppSupportScreen;
