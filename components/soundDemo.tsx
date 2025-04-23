import React from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { useSound } from '@/hooks/useSound';
import {theme} from "@/constants/theme";


// TODO : remove this component
const SoundDemo: React.FC = () => {
    const {
        isReady,
        playCorrect,
        playWrong,
        playClick,
        playNotification
    } = useSound({
        correct: { volume: 0.7, rate: 1.0 },
        wrong: { volume: 1.0, rate: 0.9 },
        click: { volume: 1.0, rate: 1.1 },
        notification: { volume: 0.8, rate: 1.0 }
    });

    const buttons = [
        { key: 'correct', label: 'Play Correct', onPress: playCorrect },
        { key: 'wrong', label: 'Play Wrong', onPress: playWrong },
        { key: 'click', label: 'Play Click', onPress: playClick },
        { key: 'notification', label: 'Play Notification', onPress: playNotification }
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sound Effects</Text>
            <View style={styles.buttonContainer}>
                {buttons.map(({ key, label, onPress }) => (
                    <TouchableOpacity
                        key={key}
                        style={[
                            styles.button,
                            !isReady && styles.buttonDisabled
                        ]}
                        onPress={onPress}
                        disabled={!isReady}
                    >
                        <Text style={[
                            styles.buttonText,
                            !isReady && styles.buttonTextDisabled
                        ]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 20,
    },
    title: {
        fontFamily : theme.typography.fontFamily,
fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 300,
        gap: 15,
    },
    button: {
        backgroundColor: '#2196F3',
        padding: Platform.select({ ios: 15, android: 12 }),
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonDisabled: {
        backgroundColor: '#BDBDBD',
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    buttonTextDisabled: {
        color: '#757575',
    },
});

export default SoundDemo;