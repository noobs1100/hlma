import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getApiBaseUrl } from "@/lib/api-url";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";

const apiUrl = getApiBaseUrl();

export type CoverAutofillSuggested = {
  title?: string;
  author?: string;
  genre?: string;
  description?: string;
};

type CoverAutofillModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuggested: (suggested: CoverAutofillSuggested) => void;
};

export default function CoverAutofillModal({
  visible,
  onClose,
  onSuggested,
}: CoverAutofillModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCameraActive(false);
      setBusy(false);
      return;
    }

    console.log("[cover-autofill] modal opened");
    setCameraActive(true);

    if (!permission?.granted) {
      console.log("[cover-autofill] requesting camera permission");
      void requestPermission();
    } else {
      console.log("[cover-autofill] camera permission already granted");
    }
  }, [permission?.granted, requestPermission, visible]);

  const headline = useMemo(() => "Scan Book Cover", []);

  const takePhotoAndAutofill = async () => {
    if (busy) return;

    try {
      console.log("[cover-autofill] start capture+autofill");
      if (!permission?.granted) {
        console.log("[cover-autofill] permission not granted; requesting");
        const result = await requestPermission();
        console.log("[cover-autofill] permission result:", result.granted);
        if (!result.granted) {
          return;
        }
      }

      setBusy(true);
      setCameraActive(false);

      console.log("[cover-autofill] taking picture");
      const photo = await (cameraRef.current as any)?.takePictureAsync?.({
        base64: true,
        quality: 0.6,
        skipProcessing: true,
      });

      const base64: string | undefined = photo?.base64;

      if (!base64) {
        throw new Error("Could not capture photo.");
      }

      console.log("[cover-autofill] captured; base64 length:", base64.length);
      console.log("[cover-autofill] calling backend autofill endpoint");
      const response = await fetch(
        `${apiUrl}/api/books/autofill-from-cover`,
        getAuthenticatedRequestInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: "image/jpeg",
          }),
        }),
      );

      console.log("[cover-autofill] backend response:", response.status);
      if (!response.ok) {
        let message = "Could not autofill from cover photo.";
        try {
          const payload = (await response.json()) as { message?: string };
          if (payload?.message) message = payload.message;
        } catch {
          // keep default
        }
        throw new Error(message);
      }

      const payload = (await response.json()) as { suggested?: CoverAutofillSuggested };
      const suggested = payload?.suggested ?? {};

      console.log("[cover-autofill] suggested fields:", {
        hasTitle: Boolean(suggested.title),
        hasAuthor: Boolean(suggested.author),
        hasGenre: Boolean(suggested.genre),
        hasDescription: Boolean(suggested.description),
      });
      onSuggested(suggested);
      console.log("[cover-autofill] closing modal (handoff to review UI)");
      onClose();
    } catch (error) {
      console.error("[cover-autofill] failed:", error);
      Alert.alert(
        "Cover scan failed",
        error instanceof Error ? error.message : "Something went wrong.",
        [{ text: "OK" }],
      );
      setCameraActive(true);
    } finally {
      console.log("[cover-autofill] done");
      setBusy(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>{headline}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Take a clear photo of the front cover. We’ll suggest title, author, genre, and description.
        </Text>

        {permission?.granted ? (
          <View style={[styles.cameraFrame, { borderColor: colors.border }]}>
            {cameraActive ? (
              <CameraView
                ref={(ref) => {
                  cameraRef.current = ref;
                }}
                style={styles.camera}
                facing="back"
              />
            ) : (
              <View style={styles.busyOverlay}>
                {busy ? <ActivityIndicator size="large" color={colors.tint} /> : null}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.permissionCard, { borderColor: colors.border }]}>
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
              Camera Permission Required
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              Please grant camera permission to take a cover photo.
            </Text>
            <Pressable
              onPress={requestPermission}
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                Allow Camera
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={takePhotoAndAutofill}
            disabled={!permission?.granted || busy}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.tint,
                opacity: pressed || busy || !permission?.granted ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.background }]}>
              {busy ? "Analyzing..." : "Take Photo"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={busy}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Close
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 320,
  },
  cameraFrame: {
    width: 300,
    height: 380,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  busyOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  actions: {
    width: "100%",
    marginTop: "auto",
    gap: 10,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

