import React, {useEffect, useRef} from "react";
import {Animated, Easing, Text, View, StyleSheet} from "react-native";
import {theme} from "@/constants/theme";

export function LoadingAnimation({ isDarkMode } : { isDarkMode: boolean }) {
    const rotation = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        // Rotation animation
        Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start();

        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1.1,
                    duration: 800,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true
                }),
                Animated.timing(scale, {
                    toValue: 0.8,
                    duration: 800,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.loadingContainer}>
            <Animated.View
                style={[
                    styles.loadingCircle,
                    {
                        backgroundColor: isDarkMode ? '#2d3748' : '#f7fafc',
                        transform: [{ rotate: spin }, { scale }]
                    }
                ]}
            >
                <View style={[styles.innerCircle, {backgroundColor: theme.color.primary[500]}]} />
            </Animated.View>
            <Text
                style={[
                    styles.loadingText,
                    {color: isDarkMode ? '#f7fafc' : '#4a5568'}
                ]}
            >
                Chargement de votre expérience...
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    // New loading animation styles
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        marginBottom: 20,
    },
    innerCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.color.primary[500],
    },
    loadingText: {
        marginTop: 20,
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '500',
    }
})
