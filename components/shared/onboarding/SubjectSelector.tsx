import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { theme } from '@/constants/theme';

interface SubjectSelectorProps {
  title: string;
  selected: string[];
  onSelect: (subjects: string[]) => void;
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  title,
  selected = [], // Providing default value
  onSelect,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const subjects = [
    'Mathématiques',
    'Physique',
    'Chimie',
    'SVT',
    'Français',
    'Anglais',
    'Histoire-Géo',
    'Philosophie',
  ];

  const handleSelect = (subject: string) => {
    if (!selected) {
      onSelect([subject]);
      return;
    }

    const isSelected = selected.includes(subject);
    if (isSelected) {
      onSelect(selected.filter(s => s !== subject));
    } else if (selected.length < 3) {
      onSelect([...selected, subject]);
    }
  };

  const isSubjectSelected = (subject: string): boolean => {
    return Array.isArray(selected) && selected.includes(subject);
  };

  return (
    <Animatable.View 
      animation="fadeIn" 
      duration={600} 
      style={[
        styles.container,
        isDark && styles.containerDark
      ]}
    >
      <View style={styles.titleContainer}>
        <Text style={[
          styles.title,
          isDark && styles.titleDark
        ]}>
          {title}
        </Text>
        <Text style={[
          styles.subtitle,
          isDark && styles.subtitleDark
        ]}>
          Sélectionnez jusqu'à 3 matières
        </Text>
      </View>
      
      <View style={styles.chipGrid}>
        {subjects.map((subject) => {
          const isSelected = isSubjectSelected(subject);
          
          return (
            <Animatable.View
              key={subject}
              animation={isSelected ? "bounceIn" : "fadeIn"}
              duration={500}
            >
              <TouchableOpacity
                onPress={() => handleSelect(subject)}
                style={[
                  styles.chip,
                  isDark && styles.chipDark,
                  isSelected && (isDark ? styles.chipSelectedDark : styles.chipSelected),
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.chipContent}>
                  {isSelected && (
                    <FontAwesome5 
                      name="check" 
                      size={12} 
                      color={isDark ? theme.color.primary[400] : theme.color.primary[500]} 
                      style={styles.checkIcon} 
                    />
                  )}
                  <Text 
                    style={[
                      styles.chipText,
                      isDark && styles.chipTextDark,
                      isSelected && (isDark ? styles.chipTextSelectedDark : styles.chipTextSelected),
                    ]}
                  >
                    {subject}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animatable.View>
          );
        })}
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  titleContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.color.gray[900],
    marginBottom: 4,
  },
  titleDark: {
    color: theme.color.gray[50],
  },
  subtitle: {
    fontSize: 14,
    color: theme.color.gray[600],
  },
  subtitleDark: {
    color: theme.color.gray[400],
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  chip: {
    backgroundColor: theme.color.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 6,
    borderWidth: 1.5,
    borderColor: theme.color.gray[300],
  },
  chipDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[700],
  },
  chipSelected: {
    backgroundColor: theme.color.primary[100],
    borderColor: theme.color.primary[500],
  },
  chipSelectedDark: {
    backgroundColor: theme.color.primary[800],
    borderColor: theme.color.primary[500],
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    color: theme.color.gray[600],
  },
  chipTextDark: {
    color: theme.color.gray[300],
  },
  chipTextSelected: {
    color: theme.color.primary[900],
    fontWeight: '600',
  },
  chipTextSelectedDark: {
    color: theme.color.primary[100],
    fontWeight: '600',
  },
});

export default SubjectSelector;