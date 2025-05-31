import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Composants d'icônes simples (vous pouvez remplacer par react-native-vector-icons)
const CloseIcon = () => (
    <View style={styles.iconContainer}>
        <Text style={styles.iconText}>✕</Text>
    </View>
);

const CreditCardIcon = () => (
    <View style={styles.iconContainer}>
        <Text style={styles.iconText}>💳</Text>
    </View>
);

const PhoneIcon = () => (
    <View style={styles.iconContainer}>
        <Text style={styles.iconText}>📱</Text>
    </View>
);

const CheckIcon = () => (
    <View style={styles.iconContainer}>
        <Text style={styles.iconText}>✅</Text>
    </View>
);

const ClockIcon = () => (
    <View style={styles.iconContainer}>
        <Text style={styles.iconText}>⏰</Text>
    </View>
);

const DollarIcon = () => (
    <View style={styles.iconContainer}>
        <Text style={styles.iconText}>💰</Text>
    </View>
);

const SmartphoneIcon = () => (
    <View style={styles.iconContainer}>
        <Text style={styles.iconText}>📲</Text>
    </View>
);

const AlertIcon = () => (
    <View style={styles.iconContainer}>
        <Text style={styles.iconText}>⚠️</Text>
    </View>
);

const PaymentGuideModal = ({ visible, onClose } : { visible: boolean, onClose: () => void }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.8));

    const steps = [
        {
            title: "Préparez votre paiement",
            description: "Vérifiez que votre solde Orange Money ou MTN Mobile Money est suffisant pour couvrir le montant de la facture",
            icon: <DollarIcon/>,
            illustration: (
                <View style={styles.illustrationContainer}>
                    <View style={styles.paymentCardsContainer}>
                        <View style={styles.paymentCard}>
                            <View style={[styles.card, { backgroundColor: '#FF6B35' }]}>
                                <Text style={styles.cardText}>OM</Text>
                            </View>
                            {/*<View style={styles.amountBadge}>*/}
                            {/*    <Text style={styles.amountText}>200</Text>*/}
                            {/*</View>*/}
                        </View>
                        <View style={styles.paymentCard}>
                            <View style={[styles.card, { backgroundColor: '#FFCD00' }]}>
                                <Text style={[styles.cardText, { color: '#000' }]}>MTN</Text>
                            </View>
                            {/*<View style={styles.amountBadge}>*/}
                            {/*    <Text style={styles.amountText}>200</Text>*/}
                            {/*</View>*/}
                        </View>
                    </View>
                </View>
            )
        },
        {
            title: "Entrez votre numéro",
            description: "Renseignez votre numéro Orange Money ou MTN Mobile Money (ou celui de la personne qui va payer pour vous)",
            icon: <PhoneIcon />,
            illustration: (
                <View style={styles.illustrationContainer}>
                    <View style={styles.phoneInputsContainer}>
                        <View style={styles.phoneInputGroup}>
                            <View style={[styles.providerDot, { backgroundColor: '#FF6B35' }]} />
                            <View style={styles.phoneInput}>
                                <Text style={styles.phoneInputText}>6XX XXX XXX</Text>
                            </View>
                        </View>
                        <View style={styles.phoneInputGroup}>
                            <View style={[styles.providerDot, { backgroundColor: '#FFCD00' }]} />
                            <View style={styles.phoneInput}>
                                <Text style={styles.phoneInputText}>6XX XXX XXX</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )
        },
        {
            title: "Validation sur téléphone",
            description: "La personne concernée recevra une notification sur son téléphone pour valider la transaction avec son code secret",
            icon: <SmartphoneIcon />,
            illustration: (
                <View style={styles.illustrationContainer}>
                    <View style={styles.phonesContainer}>
                        <View style={styles.phoneNotification}>
                            <View style={styles.phone}>
                                <View style={styles.phoneScreen}>
                                    <View style={[styles.notificationHeader, { backgroundColor: '#FF6B35' }]}>
                                        <Text style={styles.notificationTitle}>Orange Money</Text>
                                    </View>
                                    <Text style={styles.notificationMessage}>Autoriser paiement?</Text>
                                    <View style={styles.notificationButtons}>
                                        <View style={[styles.notificationButton, { backgroundColor: '#4CAF50' }]}>
                                            <Text style={styles.buttonText}>Oui</Text>
                                        </View>
                                        <View style={[styles.notificationButton, { backgroundColor: '#F44336' }]}>
                                            <Text style={styles.buttonText}>Non</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.notificationDot} />
                        </View>
                        <View style={styles.phoneNotification}>
                            <View style={styles.phone}>
                                <View style={styles.phoneScreen}>
                                    <View style={[styles.notificationHeader, { backgroundColor: '#FFCD00' }]}>
                                        <Text style={[styles.notificationTitle, { color: '#000' }]}>MTN MoMo</Text>
                                    </View>
                                    <Text style={styles.notificationMessage}>Confirmer transaction?</Text>
                                    <View style={styles.notificationButtons}>
                                        <View style={[styles.notificationButton, { backgroundColor: '#4CAF50' }]}>
                                            <Text style={styles.buttonText}>OK</Text>
                                        </View>
                                        <View style={[styles.notificationButton, { backgroundColor: '#F44336' }]}>
                                            <Text style={styles.buttonText}>Non</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.notificationDot} />
                        </View>
                    </View>
                </View>
            )
        },
        {
            title: "Patientez pendant la vérification",
            description: "Après validation, patientez sur cette page entre 1 à 5 minutes que nous vérifions la transaction",
            icon: <ClockIcon />,
            illustration: (
                <View style={styles.illustrationContainer}>
                    <View style={styles.loadingContainer}>
                        <View style={styles.loadingCircle}>
                            <ClockIcon />
                        </View>
                        <Text style={styles.loadingText}>2-5 minutes</Text>
                    </View>
                </View>
            )
        },
        {
            title: "Comment vérifier le paiement",
            description: "Une fois validé sur votre téléphone, ce message de confirmation apparaîtra pour indiquer que votre paiement a bien été pris en compte",
            icon: <CheckIcon/>,
            illustration: (
                <View style={styles.illustrationContainer}>
                    <View style={styles.successContainer}>
                        <View style={styles.successCircle}>
                            <CheckIcon/>
                        </View>
                        <Text style={styles.successText}>Paiement confirmé</Text>
                    </View>
                </View>
            )
        }
    ];

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
        }
    }, [visible]);

    const handleNext = async () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Marquer le guide comme vu
            await AsyncStorage.setItem('paymentGuideShown', 'true');
            onClose();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleClose = async () => {
        await AsyncStorage.setItem('paymentGuideShown', 'true');
        onClose();
    };

    const renderAlert = () => {
        if (currentStep === 1) {
            return (
                <View style={[styles.alertContainer, { backgroundColor: '#FFF3CD', borderLeftColor: '#FFC107' }]}>
                    <AlertIcon />
                    <Text style={[styles.alertText, { color: '#856404' }]}>
                        Assurez-vous d'entrer un numéro de téléphone valide connecté à Orange Money ou MTN Mobile Money.
                    </Text>
                </View>
            );
        }
        if (currentStep === 2) {
            return (
                <View style={[styles.alertContainer, { backgroundColor: '#D1ECF1', borderLeftColor: '#17A2B8' }]}>
                    <AlertIcon />
                    <Text style={[styles.alertText, { color: '#0C5460' }]}>
                        La notification peut prendre jusqu'à 1 minute pour apparaître sur le téléphone. Assurez-vous que le téléphone est allumé et a du réseau.
                    </Text>
                </View>
            );
        }
        return null;
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* En-tête */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <CreditCardIcon />
                            <Text style={styles.headerTitle}>Guide de paiement Mobile Money</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <CloseIcon />
                        </TouchableOpacity>
                    </View>

                    {/* Contenu principal */}
                    <View style={styles.content}>
                        {/* Indicateur d'étapes */}
                        <View style={styles.stepsIndicator}>
                            {steps.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.stepIndicator,
                                        { backgroundColor: index <= currentStep ? '#FF6B35' : '#E0E0E0' }
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Étape actuelle */}
                        <View style={styles.stepContent}>
                            <View style={styles.stepIcon}>
                                {steps[currentStep].icon}
                            </View>
                            <Text style={styles.stepTitle}>
                                {steps[currentStep].title}
                            </Text>
                            <Text style={styles.stepDescription}>
                                {steps[currentStep].description}
                            </Text>
                        </View>

                        {/* Illustration */}
                        <View style={styles.illustration}>
                            {steps[currentStep].illustration}
                        </View>

                        {/* Alerte */}
                        {renderAlert()}
                    </View>

                    {/* Navigation */}
                    <View style={styles.navigation}>
                        <TouchableOpacity
                            onPress={handlePrevious}
                            disabled={currentStep === 0}
                            style={[
                                styles.navButton,
                                currentStep === 0 && styles.navButtonDisabled
                            ]}
                        >
                            <Text style={[
                                styles.navButtonText,
                                currentStep === 0 && styles.navButtonTextDisabled
                            ]}>
                                Précédent
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleNext}
                            style={styles.nextButton}
                        >
                            <Text style={styles.nextButtonText}>
                                {currentStep === steps.length - 1 ? 'Terminer' : 'Suivant →'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// Hook pour gérer l'affichage automatique du guide
export const usePaymentGuide = () => {
    const [showGuide, setShowGuide] = useState(false);

    const checkAndShowGuide = async () => {
        try {
            const hasShown = await AsyncStorage.getItem('paymentGuideShown');
            if (!hasShown) {
                setShowGuide(true);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du guide de paiement:', error);
        }
    };

    const hideGuide = () => {
        setShowGuide(false);
    };

    // Fonction pour forcer l'affichage du guide (utile pour les tests)
    const forceShowGuide = async () => {
        await AsyncStorage.removeItem('paymentGuideShown');
        setShowGuide(true);
    };

    return {
        showGuide,
        checkAndShowGuide,
        hideGuide,
        forceShowGuide,
    };
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '100%',
        maxWidth: 400,
        maxHeight: height * 0.9,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FF6B35',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        flex: 1,
    },
    closeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 15,
        padding: 4,
    },
    content: {
        padding: 20,
    },
    stepsIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    stepIndicator: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 2,
    },
    stepContent: {
        alignItems: 'center',
        marginBottom: 24,
    },
    stepIcon: {
        marginBottom: 16,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    stepDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    illustration: {
        alignItems: 'center',
        marginBottom: 16,
    },
    illustrationContainer: {
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    paymentCardsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
    },
    paymentCard: {
        alignItems: 'center',
        position: 'relative',
    },
    card: {
        width: 60,
        height: 80,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    amountBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    amountText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    phoneInputsContainer: {
        alignItems: 'center',
        width: '100%',
    },
    phoneInputGroup: {
        alignItems: 'center',
        marginVertical: 8,
    },
    providerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 4,
    },
    phoneInput: {
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        backgroundColor: 'white',
        minWidth: 120,
        alignItems: 'center',
    },
    phoneInputText: {
        fontSize: 12,
        color: '#333',
    },
    phonesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    phoneNotification: {
        alignItems: 'center',
        position: 'relative',
    },
    phone: {
        width: 70,
        height: 120,
        borderWidth: 2,
        borderColor: '#333',
        borderRadius: 8,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    phoneScreen: {
        width: 60,
        height: 80,
        backgroundColor: 'white',
        borderRadius: 4,
        padding: 4,
        justifyContent: 'space-between',
    },
    notificationHeader: {
        borderRadius: 2,
        padding: 2,
        alignItems: 'center',
    },
    notificationTitle: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    notificationMessage: {
        fontSize: 8,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
        textAlignVertical: 'center',
    },
    notificationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    notificationButton: {
        borderRadius: 2,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    buttonText: {
        color: 'white',
        fontSize: 7,
        fontWeight: 'bold',
    },
    notificationDot: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F44336',
    },
    loadingContainer: {
        alignItems: 'center',
    },
    loadingCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 4,
        borderColor: '#E0E0E0',
        borderTopColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF6B35',
    },
    successContainer: {
        alignItems: 'center',
    },
    successCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E8F5E8',
        borderWidth: 4,
        borderColor: '#C8E6C9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    successText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    alertContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderLeftWidth: 4,
        borderRadius: 4,
        padding: 12,
        marginBottom: 16,
    },
    alertText: {
        fontSize: 12,
        marginLeft: 8,
        flex: 1,
        lineHeight: 16,
    },
    navigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        padding: 16,
    },
    navButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    navButtonText: {
        color: '#333',
        fontSize: 14,
    },
    navButtonTextDisabled: {
        color: '#999',
    },
    nextButton: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    iconContainer: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 20,
    },
});

export default PaymentGuideModal;