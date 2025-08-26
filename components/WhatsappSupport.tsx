import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    Linking,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';

interface WhatsAppContactProps {
    phoneNumber?: string;
    message?: string;
    style?: any;
}

const WhatsAppContact: React.FC<WhatsAppContactProps> = ({
                                                             phoneNumber = '+237 6 57 27 37 53',
                                                             message = '',
                                                             style
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
            console.error('Error opening WhatsApp:', error);
            Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp.');
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, isDarkMode && styles.containerDark, style]}
            onPress={handleWhatsAppPress}
            activeOpacity={0.8}
        >
            <MaterialIcons name="chat" size={18} color="#25D366" />
            <Text style={[styles.text, isDarkMode && styles.textDark]}>
                Besoin d'aide ?, appuyez pour nous écrire
            </Text>
            <MaterialIcons name="chevron-right" size={16} color="#9CA3AF" />
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
    text: {
        flex: 1,
        marginLeft: 8,
        fontFamily: theme.typography.fontFamily,
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    textDark: {
        color: '#9CA3AF',
    },
});

export default WhatsAppContact;