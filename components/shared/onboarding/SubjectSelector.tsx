import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  selected,
  onSelect,
}) => {
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
    if (selected.includes(subject)) {
      onSelect(selected.filter(s => s !== subject));
    } else if (selected.length < 3) {
      onSelect([...selected, subject]);
    }
  };

  return (
    <Animatable.View 
      animation="fadeIn" 
      duration={600} 
      style={styles.container}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Sélectionnez jusqu'à 3 matières</Text>
      </View>
      
      <View style={styles.chipGrid}>
        {subjects.map((subject) => (
          <Animatable.View
            key={subject}
            animation={selected.includes(subject) ? "bounceIn" : "fadeIn"}
            duration={500}
          >
            <TouchableOpacity
              onPress={() => handleSelect(subject)}
              style={[
                styles.chip,
                selected.includes(subject) && styles.chipSelected,
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.chipContent}>
                {selected.includes(subject) && (
                  <FontAwesome5 
                    name="check" 
                    size={12} 
                    color="#4A90E2" 
                    style={styles.checkIcon} 
                  />
                )}
                <Text 
                  style={[
                    styles.chipText,
                    selected.includes(subject) && styles.chipTextSelected,
                  ]}
                >
                  {subject}
                </Text>
              </View>
            </TouchableOpacity>
          </Animatable.View>
        ))}
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  titleContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 6,
    borderWidth: 1.5,
    borderColor: '#E1E1E1',
  },
  chipSelected: {
    backgroundColor: theme.color.primary[100],
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
    color: '#666666',
  },
  chipTextSelected: {
    color: theme.color.primary[900],
    fontWeight: '900',
  },
});

export default SubjectSelector;