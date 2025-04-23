import React, {useEffect, useState} from 'react';
import {View, StyleSheet, useColorScheme, Text, TouchableOpacity, ViewStyle, TextStyle} from 'react-native';
import {LoadingAnimation} from "@/components/shared/LoadingAnimation1";
import {theme} from '@/constants/theme';
import {router} from 'expo-router';

function Auth() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [showButton, setShowButton] = useState(false);

    const backgroundColor = isDark
        ? theme.color.dark.background.primary
        : theme.color.light.background.secondary;

    useEffect(() => {
        // Afficher le bouton après 45 secondes
        const timer = setTimeout(() => {
            setShowButton(true);
        }, 45000); // 45 secondes

        return () => clearTimeout(timer);
    }, []);

    const handleNavigateHome = () => {
        router.replace('/');
    };

    return (
        <View style={[styles.container as ViewStyle, {backgroundColor}]}>
            <LoadingAnimation isDarkMode={isDark}/>

            {showButton && (
                <TouchableOpacity
                    style={[
                        styles.button as ViewStyle,
                        {backgroundColor: theme.color.primary[500]}
                    ]}
                    onPress={handleNavigateHome}
                >
                    <Text style={styles.buttonText as TextStyle}>
                        Continuer sans attendre
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    button: {
        marginTop: 30,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: theme.border.radius.small,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
    } as ViewStyle,
    buttonText: {
        color: 'white',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.fontSize.medium,
        fontWeight: '700', // Changer "bold" en "700"
        textAlign: 'center',
    } as TextStyle
});

export default Auth;