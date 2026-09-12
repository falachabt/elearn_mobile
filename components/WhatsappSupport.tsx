import React from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    Linking,
    Alert,
    StyleProp,
    ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { logger } from '@/utils/logger';
import { theme } from '@/constants/theme';

interface WhatsAppContactProps {
    phoneNumber?: string;
    message?: string;
    style?: StyleProp<ViewStyle>;
    compact?: boolean;
}

export const DEFAULT_WHATSAPP_SUPPORT_NUMBER = '+237 6 94 05 18 93';

const WhatsAppContact: React.FC<WhatsAppContactProps> = ({
                                                             phoneNumber = DEFAULT_WHATSAPP_SUPPORT_NUMBER,
                                                             message = '',
                                                             style,
                                                             compact = false,
                                                         }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const handleWhatsAppPress = async () => {
        try {
            const cleanNumber = phoneNumber.replace(/\s+/g, '');
            const encodedMessage = message ? encodeURIComponent(message) : '';
            const whatsappUrl = `whatsapp://send?phone=${cleanNumber}${encodedMessage ? `&text=${encodedMessage}` : ''}`;

            const supported = await Linking.canOpenURL(whatsappUrl);

            if (supported) {
                await Linking.openURL(whatsappUrl);
            } else {
                const webUrl = `https://wa.me/${cleanNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            logger.error('Error opening WhatsApp:', error);
            Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp.');
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                compact && styles.containerCompact,
                isDarkMode && styles.containerDark,
                style,
            ]}
            onPress={handleWhatsAppPress}
            activeOpacity={0.8}
        >
            <MaterialIcons name="chat" size={compact ? 14 : 18} color="#25D366" />
            <Text style={[styles.text, compact && styles.textCompact, isDarkMode && styles.textDark]}>
                {compact ? "Besoin d'aide ?" : "Besoin d'aide ?, appuyez pour nous écrire"}
            </Text>
            {!compact && <MaterialIcons name="chevron-right" size={16} color="#9CA3AF" />}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginVertical: 4,
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: theme.color.dark.border,
    },
    containerCompact: {
        alignSelf: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginVertical: 0,
    },
    text: {
        flex: 1,
        marginLeft: 8,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    textCompact: {
        flex: 0,
        fontSize: 12,
    },
    textDark: {
        color: '#9CA3AF',
    },
});

export default WhatsAppContact;
