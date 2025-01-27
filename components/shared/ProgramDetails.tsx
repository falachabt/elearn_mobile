import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { Course } from '@/app/(app)/(catalogue)/shop';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

interface ProgramDetailsProps {
  program: Course;
  isInCart: boolean;
  onAddToCart: () => void;
  isDark: boolean;
}

const { width } = Dimensions.get('window');

export const ProgramDetails: React.FC<ProgramDetailsProps> = ({ 
  program, 
  isInCart, 
  onAddToCart, 
  isDark 
}) => {
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <BottomSheetScrollView>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/shapes/png?seed=\${program.learning_path.title}&backgroundColor=32A852` }}
            style={styles.image}
          />
          <View style={styles.tags}>
            <View style={styles.tag}>
              <MaterialCommunityIcons name="school" size={16} color={theme.color.primary[500]} />
              <Text style={styles.tagText}>{program.concour.name}</Text>
            </View>
            <View style={styles.tag}>
              <MaterialCommunityIcons name="office-building" size={16} color={theme.color.primary[500]} />
              <Text style={styles.tagText}>{program.concour.school.name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            {program.learning_path.title}
          </Text>

          {/* <View style={styles.stats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons 
                name="book-education" 
                size={24} 
                color={theme.color.primary[500]} 
              />
              <Text style={styles.statLabel}>Cours</Text>
              <Text style={styles.statValue}>{program.course_count}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons 
                name="head-question" 
                size={24} 
                color={theme.color.primary[500]} 
              />
              <Text style={styles.statLabel}>Quiz</Text>
              <Text style={styles.statValue}>{program.quiz_count}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={24} 
                color={theme.color.primary[500]} 
              />
              <Text style={styles.statLabel}>Durée</Text>
              <Text style={styles.statValue}>4h</Text>
            </View>
          </View> */}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              Description du programme
            </Text>
            <Text style={[styles.description, isDark && styles.descriptionDark]}>
              {program.learning_path.description}
            </Text>
          </View>
        </View>
      </BottomSheetScrollView>

      <View style={[styles.footer, isDark && styles.footerDark]}>
        <View>
          <Text style={styles.priceLabel}>Prix total</Text>
          <Text style={styles.price}>{program.price.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <TouchableOpacity
          style={[styles.button, isInCart && styles.buttonInCart]}
          onPress={onAddToCart}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={isInCart ? "check" : "cart-plus"}
            size={20}
            color="#FFF"
          />
          <Text style={styles.buttonText}>
            {isInCart ? 'Dans le panier' : 'Ajouter au panier'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.secondary,
  },
  imageContainer: {
    width: width,
    height: 200,
    backgroundColor: theme.color.primary[50],
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
    resizeMode: 'cover',
  } as const,
  tags: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  tagText: {
    fontSize: 13,
    color: theme.color.primary[700],
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.color.gray[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.color.gray[600],
    marginTop: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.primary[700],
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionTitleDark: {
    color: '#FFFFFF',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.color.gray[600],
  },
  descriptionDark: {
    color: theme.color.gray[400],
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.color.gray[200],
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderTopColor: theme.color.dark.border,
  },
  priceLabel: {
    fontSize: 13,
    color: theme.color.gray[600],
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.color.primary[500],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonInCart: {
    backgroundColor: theme.color.success,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});