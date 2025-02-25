import React, {useState, useRef, useEffect} from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {supabase} from "@/lib/supabase";
import useSWR from 'swr';

const { width } = Dimensions.get('window');

const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePhone = (phone: string) => {
    return /^\d{9}$/.test(phone);
};

const fetcher = async (url: string) => {
    const id = url.split('/')[1];
    const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return {...data, schoollevel: "tle"};
};

export default function EditProfile() {
    const { user } = useAuth();
    const colorScheme = useColorScheme();
    const router = useRouter();
    const isDarkMode = colorScheme === 'dark';
    const scrollY = useRef(new Animated.Value(0)).current;
    const { data : userInfos, isLoading, error } = useSWR(('userInfos/'+ user?.id), fetcher);


    // Refs for input fields
    const lastNameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const addressRef = useRef<TextInput>(null);
    const cityRef = useRef<TextInput>(null);
    const countryRef = useRef<TextInput>(null);
    const schoolRef = useRef<TextInput>(null);
    const schoolLevelRef = useRef<TextInput>(null);
    const gradeLevelRef = useRef<TextInput>(null);
    const learningStyleRef = useRef<TextInput>(null);
    const mainGoalRef = useRef<TextInput>(null);

    const [formData, setFormData] = useState({
        firstname: user?.firstname || '',
        lastname: user?.lastname || '',
        email: user?.email || '',
        phone: user?.phone?.toString() || '',
        address: user?.address || '',
        city: user?.city || '',
        country: user?.country || '',
        school: user?.school || '',
        schoollevel: user?.schoollevel || '',
        gradelevel: user?.gradelevel || '',
        preferredlanguage: user?.preferredlanguage || 'french',
        learningstyle: user?.learningstyle || '',
        maingoal: user?.maingoal || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});



    useEffect(() => {
        if(userInfos){
            setFormData({
                firstname: userInfos.firstname || '',
                lastname: userInfos.lastname || '',
                email: userInfos.email || '',
                phone: userInfos.phone?.toString() || '',
                address: userInfos.address || '',
                city: userInfos.city || '',
                country: userInfos.country || '',
                school: userInfos.school || '',
                schoollevel: userInfos.schoollevel || '',
                gradelevel: userInfos.gradelevel || '',
                preferredlanguage: userInfos.preferredlanguage || 'french',
                learningstyle: userInfos.learningstyle || '',
                maingoal: userInfos.maingoal || '',
            });
        }
    }, [userInfos]);




    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstname.trim()) {
            newErrors.firstname = 'Le prénom est requis';
        }
        if (!formData.lastname.trim()) {
            newErrors.lastname = 'Le nom est requis';
        }
        if (!validateEmail(formData.email)) {
            newErrors.email = 'Email invalide';
        }
        if (formData.phone && !validatePhone(formData.phone)) {
            newErrors.phone = 'Numéro de téléphone invalide';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
       console.log("try here")
        if (!validateForm()) {
            return;
        }
       console.log("try here 2")

        try {
           const {error} = await supabase.from('accounts').update({
                ...formData
            }).eq('id', user?.id);

            if (error) {
                console.log('Error updating profile:', error);
                // Handle error appropriately
                return;
            }

            router.back();
        } catch (error) {
            console.log('Error updating profile:', error);
            // Handle error appropriately
        }
    };

    // Header animation
    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [120, 80],
        extrapolate: 'clamp',
    });

    const headerTitleOpacity = scrollY.interpolate({
        inputRange: [0, 60],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });


    const renderInput = (label: string, field: string, placeholder: string,  options: {
            keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad',
            ref?: React.RefObject<TextInput>,
            nextRef?: React.RefObject<TextInput>,
            returnKeyType?: 'next' | 'done',
        } = {}
    ) => (
        <View style={styles.inputContainer}>
            <Text style={isDarkMode ? styles.labelDark : styles.label}>
                {label}
                {errors[field] && <Text style={styles.errorText}> - {errors[field]}</Text>}
            </Text>
            <TextInput
                ref={options.ref}
                style={[
                    isDarkMode ? styles.inputDark : styles.input,
                    isDarkMode ? styles.inputTextDark : styles.inputText,
                    errors[field] && styles.inputError
                ]}
                // @ts-ignore
                value={formData[field]}
                editable={field !== 'email'}
                onChangeText={(value) => handleInputChange(field, value)}
                placeholder={placeholder}
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
                keyboardType={options.keyboardType}
                returnKeyType={options.returnKeyType || 'next'}
                onSubmitEditing={() => options.nextRef?.current?.focus()}
                blurOnSubmit={!options.nextRef}
            />
        </View>
    );

    const renderLanguageChips = () => (
        <View style={styles.chipsContainer}>
            {['french', 'english'].map((lang) => (
                <TouchableOpacity
                    key={lang}
                    style={[
                        styles.chip,
                        formData.preferredlanguage === lang && styles.chipSelected,
                        isDarkMode && styles.chipDark,
                        formData.preferredlanguage === lang && isDarkMode && styles.chipSelectedDark
                    ]}
                    onPress={() => handleInputChange('preferredlanguage', lang)}
                >
                    <Text
                        style={[
                            styles.chipText,
                            formData.preferredlanguage === lang && styles.chipTextSelected,
                            isDarkMode && styles.chipTextDark
                        ]}
                    >
                        {lang === 'french' ? 'Français' : 'English'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={isDarkMode ? styles.containerDark : styles.container}>
            <Animated.View style={[isDarkMode ? styles.headerDark :  styles.header]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <MaterialCommunityIcons
                        name="arrow-left"
                        size={24}
                        color={isDarkMode ? '#FFFFFF' : '#1A1A1A'}
                    />
                </TouchableOpacity>
                <Animated.Text
                    style={[
                        isDarkMode ? styles.headerTitleDark : styles.headerTitle,
                        // { opacity: headerTitleOpacity }
                    ]}
                >
                    Modifier le profil
                </Animated.Text>
            </Animated.View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <Animated.ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={16}
                >
                    <View style={styles.section}>
                        <Text style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
                            Informations personnelles
                        </Text>
                        {renderInput('Prénom', 'firstname', 'Votre prénom', {
                            // @ts-ignore
                            ref: null,
                            nextRef: lastNameRef
                        })}
                        {renderInput('Nom', 'lastname', 'Votre nom', {
                            ref: lastNameRef,
                            nextRef: emailRef
                        })}
                        {renderInput('Email', 'email', 'Votre email', {
                            ref: emailRef,
                            nextRef: phoneRef,
                            keyboardType: 'email-address'
                        })}
                        {renderInput('Téléphone', 'phone', 'Votre numéro', {
                            ref: phoneRef,
                            nextRef: addressRef,
                            keyboardType: 'phone-pad'
                        })}
                    </View>

                    <View style={styles.section}>
                        <Text style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
                            Adresse
                        </Text>
                        {renderInput('Adresse', 'address', 'Votre adresse', {
                            ref: addressRef,
                            nextRef: cityRef
                        })}
                        {renderInput('Ville', 'city', 'Votre ville', {
                            ref: cityRef,
                            nextRef: countryRef
                        })}
                        {renderInput('Pays', 'country', 'Votre pays', {
                            ref: countryRef,
                            nextRef: schoolRef
                        })}
                    </View>

                    <View style={styles.section}>
                        <Text style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
                            Education
                        </Text>
                        {renderInput('École', 'school', 'Nom de votre école', {
                            ref: schoolRef,
                            nextRef: schoolLevelRef
                        })}
                        {renderInput('Niveau scolaire', 'schoollevel', 'Votre niveau scolaire', {
                            ref: schoolLevelRef,
                            nextRef: gradeLevelRef
                        })}
                        {renderInput('Classe', 'gradelevel', 'Votre classe', {
                            ref: gradeLevelRef,
                            nextRef: learningStyleRef
                        })}
                    </View>

                    <View style={[styles.section, styles.lastSection]}>
                        <Text style={isDarkMode ? styles.sectionTitleDark : styles.sectionTitle}>
                            Préférences d'apprentissage
                        </Text>
                        <View style={styles.inputContainer}>
                            <Text style={isDarkMode ? styles.labelDark : styles.label}>
                                Langue préférée
                            </Text>
                            {renderLanguageChips()}
                        </View>
                        {renderInput('Style d\'apprentissage', 'learningstyle', 'Votre style d\'apprentissage', {
                            ref: learningStyleRef,
                            nextRef: mainGoalRef
                        })}
                        {renderInput('Objectif principal', 'maingoal', 'Votre objectif principal', {
                            ref: mainGoalRef,
                            returnKeyType: 'done'
                        })}
                    </View>
                </Animated.ScrollView>

            </KeyboardAvoidingView>
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                    >
                        <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
                    </TouchableOpacity>
                </View>





        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        flex: 1,
        backgroundColor: theme.color.dark.background.primary,
    },
    header: {
        // backgroundColor: theme.color.dark.background.secondary,
        borderBottomColor: '#E5E5E5',
        borderWidth: 1,
        paddingHorizontal: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerDark: {
        backgroundColor: theme.color.dark.background.primary,
        borderBottomColor: '#333333',
        borderBottomWidth: 1,
        paddingHorizontal: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginLeft: 48,
    },
    headerTitleDark: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        marginLeft: 48,
    },
    keyboardAvoid: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 32,
    },
    lastSection: {
        marginBottom: 0,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 16,
    },
    sectionTitleDark: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    labelDark: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.border.radius.small,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    inputDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderRadius: theme.border.radius.small,
        padding: 12,
        borderWidth: 1,
        borderColor: '#333333',
    },
    inputText: {
        fontSize: 16,
        color: '#1A1A1A',

    },
    inputTextDark: {
        fontSize: 16,
        color: '#FFFFFF',
    },
    inputError: {
        borderColor: theme.color.error,
    },
    errorText: {

        color: theme.color.error,
        fontSize: 14,
        width: "100%",
        textAlign: "center"
    },
    chipsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.border.radius.small,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    chipDark: {
        backgroundColor: theme.color.dark.background.secondary,
        borderColor: '#333333',
    },
    chipSelected: {
        backgroundColor: `${theme.color.primary[500]}15`,
        borderColor: theme.color.primary[500],
    },
    chipSelectedDark: {
        backgroundColor: `${theme.color.primary[500]}30`,
        borderColor: theme.color.primary[500],
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666666',
        width: '100%',
        textAlign: 'center',
    },
    chipTextDark: {
        color: '#CCCCCC',
    },
    chipTextSelected: {
        color: theme.color.primary[500],
        fontWeight: '600',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        marginBottom: 60,
    },
    submitButton: {
        backgroundColor: theme.color.primary[500],
        padding: 16,
        borderRadius: theme.border.radius.small,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    submitButtonText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        width: '100%',
        justifyContent: 'center',
        flexDirection: "row"
    },
});