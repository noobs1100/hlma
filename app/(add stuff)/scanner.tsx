import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AddStuffScannerModal from "@/components/AddStuffScannerModal";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { AddStuffKind } from "@/lib/addStuffScanner";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-url";

const apiUrl = getApiBaseUrl();

type RackFormState = {
  room: string;
  cupboard: string;
  rack: string;
  description: string;
};

const initialFormState: RackFormState = {
  room: "",
  cupboard: "",
  rack: "",
  description: "",
};

export default function AddStuffScannerScreen() {
  const params = useLocalSearchParams<{
    kind?: string;
    rackId?: string;
    returnTo?: string;
  }>();
  const kind = params.kind === "b" ? "b" : ("r" as AddStuffKind);
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [scanResult, setScanResult] = useState<{
    kind: AddStuffKind;
    code: string;
    raw: string;
  } | null>(() => {
    if (params.rackId && kind === "r") {
      return {
        kind: "r",
        code: params.rackId,
        raw: `r:${params.rackId}`,
      };
    }

    return null;
  });
  const [form, setForm] = useState<RackFormState>(initialFormState);
  const [loading, setLoading] = useState(false);

  const validationError = useMemo(() => {
    if (!scanResult || scanResult.kind !== "r") {
      return null;
    }

    if (!form.room.trim()) return "Please enter room.";
    if (!form.cupboard.trim()) return "Please enter cupboard.";
    if (!form.rack.trim()) return "Please enter rack.";

    return null;
  }, [form, scanResult]);

  const updateField = (field: keyof RackFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!scanResult || scanResult.kind !== "r") {
      return;
    }

    if (validationError) {
      Alert.alert("Error", validationError, [{ text: "OK" }]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/racks`,
        getAuthenticatedRequestInit({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rackId: scanResult.code,
            room: form.room.trim(),
            cupboard: form.cupboard.trim(),
            rack: form.rack.trim(),
            description: form.description.trim() || null,
          }),
        }),
      );

      if (!response.ok) {
        let message = "Could not create the rack.";

        try {
          const payload = (await response.json()) as { message?: string };
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Ignore JSON parsing issues and fall back to the default message.
        }

        throw new Error(message);
      }

      setForm(initialFormState);
      setScanResult(null);

      Alert.alert("Success", "Rack created successfully.", [
        {
          text: "OK",
          onPress: () => {
            const returnTo =
              typeof params.returnTo === "string" ? params.returnTo : null;

            if (returnTo) {
              router.replace({
                pathname: returnTo as never,
                params: { selectedRackId: scanResult.code },
              } as never);
              return;
            }

            router.replace({
              pathname: "/racks",
              params: { selectedRackId: scanResult.code },
            });
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Something went wrong.",
        [{ text: "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (result: {
    kind: AddStuffKind;
    code: string;
    raw: string;
  }) => {
    setScanResult(result);
    setForm(initialFormState);
  };

  const renderScanner = () =>
    params.rackId ? null : (
      <AddStuffScannerModal
        kind={kind}
        onClose={() => router.back()}
        onScan={handleScan}
      />
    );

  if (!scanResult) {
    return renderScanner();
  }

  if (scanResult.kind !== "r") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Code Scanned</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {scanResult.raw}
        </Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <Text
            style={[styles.primaryButtonText, { color: colors.background }]}
          >
            Close
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.label, { color: colors.muted }]}>
              Scanned Rack Code
            </Text>
            <Text style={[styles.scannedValue, { color: colors.text }]}>
              {scanResult.raw}
            </Text>
          </View>

          <TextInput
            placeholder="Rack ID"
            placeholderTextColor={colors.inputPlaceholder}
            value={scanResult.code}
            editable={false}
            style={[
              styles.input,
              styles.readOnlyInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            selectTextOnFocus={false}
          />

          <TextInput
            placeholder="Room"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.room}
            onChangeText={(value) => updateField("room", value)}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="Cupboard"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.cupboard}
            onChangeText={(value) => updateField("cupboard", value)}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="Rack"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.rack}
            onChangeText={(value) => updateField("rack", value)}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="Description"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.description}
            onChangeText={(value) => updateField("description", value)}
            style={[
              styles.input,
              styles.multilineInput,
              { borderColor: colors.border, color: colors.text },
            ]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.tint,
                opacity: pressed || loading ? 0.85 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text
              style={[styles.primaryButtonText, { color: colors.background }]}
            >
              {loading ? "Submitting..." : "Submit Rack"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => {
              setScanResult(null);
              setForm(initialFormState);
            }}
            disabled={loading}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Scan Again
            </Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 320,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  scannedValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  readOnlyInput: {
    opacity: 0.8,
  },
  multilineInput: {
    minHeight: 120,
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
