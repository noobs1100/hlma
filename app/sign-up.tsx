import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import AuthScreen from "@/components/AuthScreen";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  signUpWithEmail,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/auth-helpers";
import { useAuth } from "@/providers/auth-provider";

export default function SignUpScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { isAuthenticated, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading]);

  const validationError = useMemo(() => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return null;
    }

    if (!validateName(name)) {
      return "Enter your name.";
    }

    if (!validateEmail(email)) {
      return "Enter a valid email address.";
    }

    if (!validatePassword(password)) {
      return "Password must be at least 8 characters.";
    }

    return null;
  }, [email, name, password]);

  const handleSignUp = async () => {
    if (!validateName(name)) {
      setError("Enter your name.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signUpWithEmail(name, email, password);
      router.replace("/sign-in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title="Create account"
      subtitle="Join the app with your email and password."
      loading={loading || isLoading}
      error={error ?? validationError}
      footer={
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.tint }]}> 
            Already have an account? Sign in
          </Text>
        </Pressable>
      }
    >
      <TextInput
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError(null);
        }}
        placeholder="Name"
        placeholderTextColor={colors.inputPlaceholder}
        autoCapitalize="words"
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.inputText,
          },
        ]}
      />

      <TextInput
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(null);
        }}
        placeholder="Email"
        placeholderTextColor={colors.inputPlaceholder}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.inputText,
          },
        ]}
      />

      <TextInput
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError(null);
        }}
        placeholder="Password"
        placeholderTextColor={colors.inputPlaceholder}
        secureTextEntry
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.inputText,
          },
        ]}
      />

      <Pressable
        onPress={handleSignUp}
        disabled={loading || Boolean(validationError)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.tint,
            opacity: pressed || loading ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          Create Account
        </Text>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  link: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
