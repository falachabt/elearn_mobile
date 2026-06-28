import React, { FC } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import LottieView from "lottie-react-native";

import { theme } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import WhatsAppContact from "@/components/WhatsappSupport";

interface PaymentProcessingProps {
  state: "processing" | "verifying";
  isDark: boolean;
  currentMessage?: string;
  checkoutUrl?: string | null;
  onCancel: () => void;
}

export const PaymentProcessing: FC<PaymentProcessingProps> = ({
  state,
  isDark,
  currentMessage,
  checkoutUrl,
  onCancel,
}) => {
  const handleOpenCheckout = () => {
    if (checkoutUrl) {
      void Linking.openURL(checkoutUrl);
    }
  };

  if (state === "processing") {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator
          size="large"
          color={isDark ? theme.color.primary[300] : theme.color.primary[500]}
        />
        <ThemedText style={styles.processingText}>
          Initialisation du paiement...
        </ThemedText>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        
        {/* WhatsApp Support */}
        <WhatsAppContact
          message={`Bonjour, j'ai besoin d'aide concernant mon paiement en cours d'initialisation`}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.verifyingContainer}>
      <View
        style={{
          maxWidth: 200,
          maxHeight: 200,
          alignItems: "center",
          overflow: "hidden",
          justifyContent: "center",
        }}
      >
        <LottieView
          source={require("@/assets/animations/payment-loading.json")}
          autoPlay
          loop
          resizeMode="contain"
          speed={1}
          style={{ width: 200, height: 200 }}
          key="verifyingAnimation"
        />
      </View>
      <ThemedText style={styles.verifyingTitle}>
        Vérification du paiement
      </ThemedText>
      <ThemedText style={styles.verifyingMessage}>
        {currentMessage || "En attente de validation sur votre téléphone..."}
      </ThemedText>
      {checkoutUrl ? (
        <TouchableOpacity style={styles.checkoutButton} onPress={handleOpenCheckout}>
          <Text style={styles.checkoutButtonText}>Ouvrir la page de paiement</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </TouchableOpacity>
      
      {/* WhatsApp Support */}
      <WhatsAppContact
        message={`Bonjour, j'ai besoin d'aide concernant la vérification de mon paiement`}
        style={{ marginTop: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  processingText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: theme.color.error,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.color.error,
    fontWeight: "500",
  },
  checkoutButton: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.color.primary[500],
    borderRadius: 8,
  },
  checkoutButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  verifyingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  verifyingTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  verifyingMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: theme.color.gray[600],
  },
});
