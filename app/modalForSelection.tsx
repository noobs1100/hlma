import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

const modalForSelection = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />

      <Button
        mode="contained"
        buttonColor={colors.tint}
        textColor={colors.background}
        style={styles.button}
      >
        Add New BOOK
      </Button>

      <Button
        mode="contained"
        buttonColor={colors.tint}
        textColor={colors.background}
        style={styles.button}
        onPress={() => router.push("/(add stuff)/scanner?kind=r")}
      >
        Add New Rack
      </Button>

      <Button
        mode="contained"
        buttonColor={colors.tint}
        textColor={colors.background}
        style={styles.button}
      >
        Generate Bar Code PDF
      </Button>
    </View>
  );
};

export default modalForSelection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  button: {
    borderRadius: 8,
  },
});
