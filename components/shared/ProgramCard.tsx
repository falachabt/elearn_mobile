import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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
  isSelected: boolean;
  isDark: boolean;
  onSelect: () => void;
}

const getDefaultImage = (title: string) => {
  const seed = encodeURIComponent(title);
  return `https://api.dicebear.com/9.x/shapes/png?seed=${seed}&backgroundColor=32A852,4CAF50`;
};

export const ProgramCard: React.FC<ProgramCardProps> = ({
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
  isSelected,
  isDark,
}) => {
  return (
    <Animatable.View
      animation="fadeInUp"
      duration={800}
      style={[
        styles.container,
        isDark && styles.containerDark
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: image || getDefaultImage(title) }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={[
            styles.imageOverlay,
            isDark && styles.imageOverlayDark
          ]} />
        </View>

        <View style={styles.mainContent}>
          <View style={[
            styles.levelBadge,
            isDark && styles.levelBadgeDark
          ]}>
            <MaterialCommunityIcons name="school" size={14} color={theme.color.primary[500]} />
            <Text style={styles.levelText}>{level}</Text>
          </View>

          <Text 
            numberOfLines={2} 
            style={[
              styles.title,
              isDark && styles.titleDark
            ]}
          >
            {title}
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons 
                name="book-education" 
                size={16} 
                color={isDark ? theme.color.gray[400] : '#666'} 
              />
              <Text style={[
                styles.statText,
                isDark && styles.statTextDark
              ]}>
                {courseCount}
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons 
                name="head-question" 
                size={16} 
                color={isDark ? theme.color.gray[400] : '#666'} 
              />
              <Text style={[
                styles.statText,
                isDark && styles.statTextDark
              ]}>
                {quizCount}
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={16} 
                color={isDark ? theme.color.gray[400] : '#666'} 
              />
              <Text style={[
                styles.statText,
                isDark && styles.statTextDark
              ]}>
                {duration}
              </Text>
            </View>
          </View>

          <View style={styles.schoolContainer}>
            <MaterialCommunityIcons 
              name="certificate" 
              size={16} 
              color={theme.color.primary[500]} 
            />
            <Text 
              numberOfLines={1} 
              style={[
                styles.schoolText,
                isDark && styles.schoolTextDark
              ]}
            >
              {concoursName} • {schoolName}
            </Text>
          </View>
        </View>
      </View>

      <View style={[
        styles.footer,
        isDark && styles.footerDark
      ]}>
        <View style={styles.priceSection}>
          <Text style={styles.priceAmount}>{price.toLocaleString()} FCFA</Text>
          <Text style={[
            styles.priceLabel,
            isDark && styles.priceLabelDark
          ]}>
            Prix total
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.selectButton,
            isSelected ? styles.selectedButton : styles.unselectedButton,
            isDark && !isSelected && styles.unselectedButtonDark
          ]}
          onPress={onSelect}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={isSelected ? "check" : "plus"}
            size={20}
            color={isSelected ? "#FFF" : theme.color.primary[500]}
          />
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.border.radius.small,
    borderWidth: theme.border.width.thin,
    borderColor: theme.color.gray[200],
    marginVertical: 8,
    padding: 12,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[800],
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
  imageOverlayDark: {
    backgroundColor: 'rgba(0,0,0,0.2)',
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
  levelBadgeDark: {
    backgroundColor: theme.color.primary[900],
  },
  levelText: {
    color: theme.color.primary[500],
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
  titleDark: {
    color: theme.color.gray[50],
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
  statTextDark: {
    color: theme.color.gray[400],
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
  schoolTextDark: {
    color: theme.color.gray[300],
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
  footerDark: {
    borderTopColor: theme.color.gray[800],
  },
  priceSection: {
    flex: 1,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.color.primary[500],
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceLabelDark: {
    color: theme.color.gray[400],
  },
  selectButton: {
    width: 40,
    height: 40,
    borderRadius: theme.border.radius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: theme.color.primary[500],
  },
  unselectedButton: {
    borderWidth: 1,
    borderColor: theme.color.primary[500],
    backgroundColor: '#FFF',
  },
  unselectedButtonDark: {
    backgroundColor: 'transparent',
  },
});