import { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  error?: string | null;
  loading?: boolean;
};

export default function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  error,
  loading,
}: AuthScreenProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {subtitle}
        </Text>

        {error ? (
          <Text style={[styles.error, { color: "#ef4444" }]}>{error}</Text>
        ) : null}

        {children}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>
              Working…
            </Text>
          </View>
        ) : null}

        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    gap: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  error: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  loadingText: {
    fontSize: 14,
  },
});
