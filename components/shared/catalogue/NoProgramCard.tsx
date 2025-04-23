import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    useColorScheme,
    Dimensions
} from 'react-native';
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

interface NoProgramProps {
    onVisitCatalog?: () => void;
}

const NoProgram: React.FC<NoProgramProps> = ({ onVisitCatalog }) => {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleVisitCatalog = () => {
        if (onVisitCatalog) {
            onVisitCatalog();
        } else {
            router.push("/(app)/(catalogue)/shop");
        }
    };

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                    name="bookshelf"
                    size={80}
                    color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
                />
            </View>

            <Text style={[styles.title, isDark && styles.textDark]}>
                Aucun programme actif
            </Text>

            <Text style={[styles.description, isDark && styles.textGray]}>
                Vous n'avez pas encore activé de programme d'apprentissage.
                Découvrez notre catalogue pour trouver le programme qui vous convient.
            </Text>

            <View style={styles.featuresContainer}>
                <View style={styles.featureRow}>
                    <MaterialCommunityIcons
                        name="star"
                        size={24}
                        color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
                    />
                    <Text style={[styles.featureText, isDark && styles.textDark]}>
                        Accès à des programmes exclusifs
                    </Text>
                </View>

                <View style={styles.featureRow}>
                    <MaterialCommunityIcons
                        name="certificate"
                        size={24}
                        color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
                    />
                    <Text style={[styles.featureText, isDark && styles.textDark]}>
                        Contenu créé par des experts
                    </Text>
                </View>

                <View style={styles.featureRow}>
                    <MaterialCommunityIcons
                        name="trophy"
                        size={24}
                        color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
                    />
                    <Text style={[styles.featureText, isDark && styles.textDark]}>
                        Suivi personnalisé de votre progression
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={handleVisitCatalog}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="compass" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Visiter le catalogue</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.color.border,
        marginVertical: 8,
    },
    containerDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: theme.color.dark.border,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontFamily : theme.typography.fontFamily,
fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontFamily : theme.typography.fontFamily,
fontSize: 15,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 24,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    featureText: {
        fontFamily : theme.typography.fontFamily,
fontSize: 15,
        color: '#333333',
        marginLeft: 12,
        flex: 1,
    },
    button: {
        height: 50,
        backgroundColor: theme.color.primary[500],
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        width: '100%',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontFamily : theme.typography.fontFamily,
fontSize: 16,
        fontWeight: '600',
    },
    textDark: {
        color: '#FFFFFF',
    },
    textGray: {
        color: '#CCCCCC',
    },
});

export default NoProgram;