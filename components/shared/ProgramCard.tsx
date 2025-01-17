import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { theme } from '@/constants/theme';

interface ProgramCardProps {
  title: string;
  description: string;
  price: number;
  features: string[];
  level: string;
  duration?: string;
  image?: string;
  courseCount: number;
  quizCount: number;
  concoursName: string;
  schoolName: string;
  onSelect: () => void;
}

const getDefaultImage = (title: string) => {
  // Encode title for URL safety
  const seed = encodeURIComponent(title);
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=32A852,4CAF50`;
};

const ProgramCard: React.FC<ProgramCardProps> = ({
  title,
  description,
  price,
  level,
  duration = '6 mois',
  image,
  courseCount,
  quizCount,
  concoursName,
  schoolName,
  onSelect,
}) => {
  const [isSelected, setIsSelected] = useState(false);

  const handleSelect = () => {
    setIsSelected(!isSelected);
    onSelect();
  };

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={800}
      style={styles.container}
    >
      <View style={styles.contentRow}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: image || getDefaultImage(title) }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
        </View>

        <View style={styles.mainContent}>
          <View style={styles.levelBadge}>
            <MaterialCommunityIcons name="school" size={14} color="#32A852" />
            <Text style={styles.levelText}>{level}</Text>
          </View>

          <Text numberOfLines={2} style={styles.title}>{title}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="book-education" size={16} color="#666" />
              <Text style={styles.statText}>{courseCount}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="head-question" size={16} color="#666" />
              <Text style={styles.statText}>{quizCount}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
              <Text style={styles.statText}>{duration}</Text>
            </View>
          </View>

          <View style={styles.schoolContainer}>
            <MaterialCommunityIcons name="certificate" size={16} color="#32A852" />
            <Text numberOfLines={1} style={styles.schoolText}>
              {concoursName} • {schoolName}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.priceSection}>
          <Text style={styles.priceAmount}>{price.toLocaleString()} FCFA</Text>
          <Text style={styles.priceLabel}>Prix total</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.selectButton, isSelected ? styles.selectedButton : styles.unselectedButton]}
          onPress={handleSelect}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={isSelected ? "check" : "plus"}
            size={20}
            color={isSelected ? "#FFF" : "#32A852"}
          />
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small ,
    borderWidth: theme.border.width.thin,
    borderColor: theme.color.background,
    marginVertical: 8,
    padding: 12,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 6,
  },
  levelText: {
    color: '#32A852',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  schoolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schoolText: {
    fontSize: 13,
    color: '#4A4A4A',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  priceSection: {
    flex: 1,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#32A852',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  selectButton: {
    width: 40,
    height: 40,
    borderRadius: theme.border.radius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#32A852',
  },
  unselectedButton: {
    borderWidth: 1,
    borderColor: '#32A852',
    backgroundColor: '#FFF',
  },
});

export default ProgramCard;