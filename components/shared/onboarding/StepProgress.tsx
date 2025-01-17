import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

interface StepProgressProps {
  step: number;
  totalSteps: number;
}

const StepProgress: React.FC<StepProgressProps> = ({ step, totalSteps }) => {
  const steps = [];
  for (let i = 1; i <= totalSteps; i++) {
    steps.push(
      <View
        key={i}
        style={[
          styles.step,
          {
            backgroundColor: i <= step ? theme.color.primary[500] : "#E0E0E0",
          },
        ]}
      />
    );
  }
  return <View style={styles.progressContainer}>{steps}</View>;
};

const styles = StyleSheet.create( {
    progressContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 20,
      },
      step: {
        flex: 1,
        height: 10,
        marginHorizontal: 2,
        borderRadius: 5,
      },
});

export default StepProgress;