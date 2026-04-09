import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

type CodeScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  headline: string;
  subtitle: string;
};

export default function CodeScannerModal({
  visible,
  onClose,
  onScan,
  headline,
  subtitle,
}: CodeScannerModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const lastScanAtRef = useRef(0);
  const lastHandledCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setCameraActive(false);
      return;
    }

    setCameraActive(true);

    if (!permission?.granted) {
      void requestPermission();
    }
  }, [permission?.granted, requestPermission, visible]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const now = Date.now();

    if (now - lastScanAtRef.current < 700) {
      return;
    }

    lastScanAtRef.current = now;

    if (lastHandledCodeRef.current === data) {
      return;
    }

    lastHandledCodeRef.current = data;
    onScan(data.trim());
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
          {subtitle}
        </Text>

        {permission?.granted ? (
          <View style={[styles.scannerFrame, { borderColor: colors.border }]}>
            {cameraActive && (
              <CameraView
                style={styles.camera}
                onBarcodeScanned={handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "datamatrix"],
                }}
              />
            )}
          </View>
        ) : (
          <View style={[styles.permissionCard, { borderColor: colors.border }]}>
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
              Camera Permission Required
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              Please grant camera permission to scan this code.
            </Text>
            <Pressable
              onPress={requestPermission}
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            >
              <Text
                style={[styles.primaryButtonText, { color: colors.background }]}
              >
                Allow Camera
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onClose}
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
  scannerFrame: {
    width: 300,
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
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
    minWidth: 140,
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
