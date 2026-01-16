import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AppConfigErrorProps {
  error: Error;
  onRetry: () => void;
}

export function AppConfigError({ error, onRetry }: AppConfigErrorProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
      <Text style={styles.title}>Configuration manquante</Text>
      <Text style={styles.message}>{error.message}</Text>
      <Text style={styles.hint}>
        Veuillez configurer les paramètres dans la table app_config de Supabase.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FEF2F2',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
