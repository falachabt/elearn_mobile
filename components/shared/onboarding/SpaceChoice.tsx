import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { theme } from '@/constants/theme';
import * as Animatable from 'react-native-animatable';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

interface SpaceChoiceProps {
  selectedSpace: 'secondary' | 'prepa' | null;
  setSelectedSpace: (space: 'secondary' | 'prepa') => void;
}

const SpaceChoice: React.FC<SpaceChoiceProps> = ({ selectedSpace, setSelectedSpace }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800} 
      style={[
        styles.spaceChoiceContainer,
        isDark && styles.spaceChoiceContainerDark
      ]}
    >
      <View style={styles.headerContainer}>
        <Text style={[
          styles.headerTitle,
          isDark && styles.headerTitleDark
        ]}>
          Choisissez votre espace d'apprentissage
        </Text>
        <Text style={[
          styles.headerSubtitle,
          isDark && styles.headerSubtitleDark
        ]}>
          Sélectionnez l'espace qui correspond à vos besoins éducatifs
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.choiceCard,
          isDark && styles.choiceCardDark,
          selectedSpace === 'secondary' && (isDark ? styles.choiceCardSelectedDark : styles.choiceCardSelected)
        ]}
        onPress={() => setSelectedSpace('secondary')}
      >
        <View style={[
          styles.choiceIconContainer,
          isDark && styles.choiceIconContainerDark,
          selectedSpace === 'secondary' && styles.choiceIconContainerSelected
        ]}>
          <MaterialCommunityIcons 
            name="school" 
            size={32} 
            color={selectedSpace === 'secondary' ? '#FFFFFF' : theme.color.primary[isDark ? 400 : 500]} 
          />
        </View>
        <View style={styles.choiceContent}>
          <Text style={[
            styles.choiceTitle,
            isDark && styles.choiceTitleDark
          ]}>
            Espace Secondaire
          </Text>
          <Text style={[
            styles.choiceDescription,
            isDark && styles.choiceDescriptionDark
          ]}>
            Pour les élèves de 3ème à Terminale - Réseau social éducatif avec collaboration, échanges et ressources pédagogiques
          </Text>
          <View style={styles.featuresList}>
            <Text style={[styles.featureItem, isDark && styles.featureItemDark]}>
              • Réseau social éducatif
            </Text>
            <Text style={[styles.featureItem, isDark && styles.featureItemDark]}>
              • Groupes par classe et matière
            </Text>
            <Text style={[styles.featureItem, isDark && styles.featureItemDark]}>
              • Système de gamification
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.choiceCard,
          isDark && styles.choiceCardDark,
          selectedSpace === 'prepa' && (isDark ? styles.choiceCardSelectedDark : styles.choiceCardSelected)
        ]}
        onPress={() => setSelectedSpace('prepa')}
      >
        <View style={[
          styles.choiceIconContainer,
          isDark && styles.choiceIconContainerDark,
          selectedSpace === 'prepa' && styles.choiceIconContainerSelected
        ]}>
          <FontAwesome5 
            name="graduation-cap" 
            size={32} 
            color={selectedSpace === 'prepa' ? '#FFFFFF' : theme.color.primary[isDark ? 400 : 500]} 
          />
        </View>
        <View style={styles.choiceContent}>
          <Text style={[
            styles.choiceTitle,
            isDark && styles.choiceTitleDark
          ]}>
            Prépa Concours
          </Text>
          <Text style={[
            styles.choiceDescription,
            isDark && styles.choiceDescriptionDark
          ]}>
            Préparation intensive aux concours d'entrée avec programmes structurés et suivi personnalisé
          </Text>
          <View style={styles.featuresList}>
            <Text style={[styles.featureItem, isDark && styles.featureItemDark]}>
              • Programmes de préparation
            </Text>
            <Text style={[styles.featureItem, isDark && styles.featureItemDark]}>
              • Concours blancs
            </Text>
            <Text style={[styles.featureItem, isDark && styles.featureItemDark]}>
              • Suivi personnalisé
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  spaceChoiceContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  spaceChoiceContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  headerTitleDark: {
    color: theme.color.gray[50],
  },
  headerSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  headerSubtitleDark: {
    color: theme.color.gray[300],
  },
  choiceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: theme.border.radius.medium,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E1E1E1',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  choiceCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[800],
  },
  choiceCardSelected: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[50],
  },
  choiceCardSelectedDark: {
    borderColor: theme.color.primary[500],
    backgroundColor: theme.color.primary[900],
  },
  choiceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  choiceIconContainerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  choiceIconContainerSelected: {
    backgroundColor: theme.color.primary[500],
  },
  choiceContent: {
    flex: 1,
  },
  choiceTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  choiceTitleDark: {
    color: theme.color.gray[50],
  },
  choiceDescription: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  choiceDescriptionDark: {
    color: theme.color.gray[300],
  },
  featuresList: {
    marginTop: 4,
  },
  featureItem: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  featureItemDark: {
    color: theme.color.gray[400],
  },
});

export default SpaceChoice;