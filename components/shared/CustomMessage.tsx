import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface CustomMessageProps {
  message: string;
  type: 'error' | 'success';
}

const CustomMessage = ({ message, type }: CustomMessageProps) => {
  if (!message) return null;

  return (
    <View style={[styles.container, type === "error" ? styles.error : styles.success]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 5,
    margin: 10,
  },
  error: {
    backgroundColor: "red",
  },
  success: {
    backgroundColor: "green",
  },
  text: {
    color: "white",
    textAlign: "center",
  },
});

export default CustomMessage;