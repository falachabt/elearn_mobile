import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
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
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(event.scale, 5));
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onEnd(() => {
      if (scale.value < 1.2) {
        resetZoom();
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
        // Bound checks to prevent dragging offscreen
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
      } else {
        scale.value = withTiming(2.5);
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

  const handleClose = () => {
    resetZoom();
    onClose();
  };

  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Semi-transparent dark background */}
        <View style={styles.background} />

        {/* Close Button */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Interactive Image Container */}
        <View style={styles.imageContainer}>
          <GestureDetector gesture={combinedGestures}>
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            </Animated.View>
          </GestureDetector>
        </View>
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
    right: 16,
    zIndex: 10,
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
  },
  imageContainer: {
    flex: 1,
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
