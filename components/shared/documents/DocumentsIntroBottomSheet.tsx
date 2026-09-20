import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { HapticType, useHaptics } from '@/hooks/useHaptics';

interface DocumentsIntroBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called when the user finishes the carousel via the last slide's action
   * button (not when they skip/dismiss) -- used to navigate to the Documents
   * page. */
  onFinish?: () => void;
  isDark: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'school-outline' as const,
    title: 'Nouveau ! Tous tes cours, du 6e à la Terminale',
    description:
      "On a rassemblé plein d'anciennes épreuves et sujets pour t'entraîner, classés par classe. Va voir, il y en a peut-être déjà pour toi !",
  },
  {
    icon: 'folder-multiple-outline' as const,
    title: 'Facile à retrouver',
    description:
      "Chaque classe a ses propres dossiers, bien rangés. Tu cliques, tu avances, et tu sais toujours où tu es.",
  },
  {
    icon: 'pin-outline' as const,
    title: 'Garde ce qui t\'intéresse à portée de main',
    description:
      "Épingle un document pour le retrouver en un clic, et coche-le une fois terminé pour suivre ta progression.",
  },
];

/**
 * Shown once on first app open (gated by the same "documents_par_niveau_enabled"
 * feature flag as the feature itself) to advertise the new level-documents
 * catalog (6e -> Terminale exam papers/subjects).
 */
export const DocumentsIntroBottomSheet: React.FC<DocumentsIntroBottomSheetProps> = ({
  visible,
  onClose,
  onFinish,
  isDark,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { trigger } = useHaptics();
  const insets = useSafeAreaInsets();

  const isLastSlide = activeIndex === SLIDES.length - 1;
  const slideWidth = Math.min(screenWidth - 40, 400);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(index);
  };

  const handleNext = () => {
    trigger(HapticType.LIGHT);
    if (isLastSlide) {
      onFinish?.();
      onClose();
      return;
    }
    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: true });
    setActiveIndex(nextIndex);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver={true}
      statusBarTranslucent
      propagateSwipe={Platform.OS === 'ios'}
    >
      <View style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: 24 + insets.bottom }]}>
        <View style={[styles.handle, isDark && styles.handleDark]} />

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ width: slideWidth }}
        >
          {SLIDES.map((slide, index) => (
            <View key={index} style={[styles.slide, { width: slideWidth }]}>
              <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
                <MaterialCommunityIcons name={slide.icon} size={40} color={theme.color.primary[500]} />
              </View>
              <Text style={[styles.title, isDark && styles.titleDark]}>{slide.title}</Text>
              <Text style={[styles.description, isDark && styles.descriptionDark]}>
                {slide.description}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                isDark && styles.dotDark,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>{isLastSlide ? 'Découvrir' : 'Suivant'}</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {!isLastSlide && (
          <TouchableOpacity style={styles.skipButton} onPress={onClose}>
            <Text style={[styles.skipButtonText, isDark && styles.skipButtonTextDark]}>Passer</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { margin: 0, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  sheetDark: { backgroundColor: theme.color.dark.background.secondary },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.color.gray[300],
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  handleDark: { backgroundColor: theme.color.gray[600] },
  slide: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${theme.color.primary[500]}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerDark: { backgroundColor: `${theme.color.primary[500]}30` },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleDark: { color: '#FFFFFF' },
  description: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  descriptionDark: { color: theme.color.gray[400] },
  dotsContainer: { flexDirection: 'row', gap: 6, marginTop: 20, marginBottom: 16 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.gray[300],
  },
  dotDark: { backgroundColor: theme.color.gray[600] },
  dotActive: { backgroundColor: theme.color.primary[500], width: 20 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 8,
    backgroundColor: theme.color.primary[500],
    width: '100%',
  },
  primaryButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: { marginTop: 12, paddingVertical: 8 },
  skipButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.color.gray[500],
  },
  skipButtonTextDark: { color: theme.color.gray[400] },
});

export default DocumentsIntroBottomSheet;
