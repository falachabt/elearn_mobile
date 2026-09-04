import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ZoomableImageProps {
  uri: string;
  onZoomStateChange: (zoomed: boolean) => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ uri, onZoomStateChange }) => {
  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  const prevTranslationX = useSharedValue(0);
  const prevTranslationY = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1);
    translationX.value = withTiming(0);
    translationY.value = withTiming(0);
    prevTranslationX.value = 0;
    prevTranslationY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      runOnJS(onZoomStateChange)(true);
    })
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(event.scale, 5));
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onEnd(() => {
      if (scale.value < 1.2) {
        resetZoom();
        runOnJS(onZoomStateChange)(false);
      }
    });

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      if (scale.value > 1) {
        translationX.value = prevTranslationX.value + event.translationX;
        translationY.value = prevTranslationY.value + event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value > 1) {
        const maxTx = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxTy = (SCREEN_HEIGHT * (scale.value - 1)) / 2;

        if (translationX.value > maxTx) {
          translationX.value = withSpring(maxTx);
        } else if (translationX.value < -maxTx) {
          translationX.value = withSpring(-maxTx);
        }

        if (translationY.value > maxTy) {
          translationY.value = withSpring(maxTy);
        } else if (translationY.value < -maxTy) {
          translationY.value = withSpring(-maxTy);
        }

        prevTranslationX.value = translationX.value;
        prevTranslationY.value = translationY.value;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (scale.value > 1) {
        resetZoom();
        runOnJS(onZoomStateChange)(false);
      } else {
        scale.value = withTiming(2.5);
        runOnJS(onZoomStateChange)(true);
      }
    });

  const combinedGestures = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Simultaneous(panGesture, doubleTapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translationY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View style={styles.imageContainer}>
      <GestureDetector gesture={combinedGestures}>
        <Animated.View style={[styles.imageWrapper, animatedStyle]}>
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      setIsZoomed(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
      });
    }
  }, [visible, initialIndex]);

  const handleClose = () => {
    setIsZoomed(false);
    onClose();
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  };

  const goToIndex = (idx: number) => {
    if (idx < 0 || idx >= images.length) return;
    scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
    setActiveIndex(idx);
  };

  if (!images.length) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        <View style={styles.background} />

        <SafeAreaView style={styles.header}>
          {images.length > 1 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{activeIndex + 1} / {images.length}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={!isZoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
        >
          {images.map((uri, idx) => (
            <View key={idx} style={styles.page}>
              <ZoomableImage uri={uri} onZoomStateChange={setIsZoomed} />
            </View>
          ))}
        </ScrollView>

        {images.length > 1 && !isZoomed && (
          <>
            {activeIndex > 0 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={() => goToIndex(activeIndex - 1)}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <MaterialCommunityIcons name="chevron-left" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {activeIndex < images.length - 1 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={() => goToIndex(activeIndex + 1)}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <MaterialCommunityIcons name="chevron-right" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <View style={styles.dotsRow}>
              {images.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => goToIndex(idx)}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                >
                  <View style={[styles.dot, idx === activeIndex && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  header: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 'auto',
  },
  page: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
