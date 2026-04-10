import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  AddStuffKind,
  AddStuffScanResult,
  parseAddStuffCode,
} from "@/lib/addStuffScanner";

type AddStuffScannerModalProps = {
  kind?: AddStuffKind;
  onClose?: () => void;
  onScan?: (result: AddStuffScanResult) => void;
};

export default function AddStuffScannerModal({
  kind = "r",
  onClose,
  onScan,
}: AddStuffScannerModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(true);
  const [lastResult, setLastResult] = useState<AddStuffScanResult | null>(null);
  const lastScanAtRef = useRef(0);
  const lastHandledCodeRef = useRef<string | null>(null);
  const alertVisibleRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setCameraActive(true);
      if (!permission?.granted) {
        requestPermission();
      }

      return () => {
        setCameraActive(false);
      };
    }, [permission, requestPermission]),
  );

  const headline = useMemo(
    () => (kind === "r" ? "Scan Rack Code" : "Scan Book Code"),
    [kind],
  );

  const showInvalidCodeAlert = (title: string, message: string) => {
    alertVisibleRef.current = true;
    setCameraActive(false);

    Alert.alert(title, message, [
      {
        text: "OK",
        onPress: () => {
          lastHandledCodeRef.current = null;
          alertVisibleRef.current = false;
          setCameraActive(true);
        },
      },
    ]);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (alertVisibleRef.current || !cameraActive) {
      return;
    }

    const now = Date.now();

    if (now - lastScanAtRef.current < 500) {
      return;
    }

    lastScanAtRef.current = now;

    if (lastHandledCodeRef.current === data) {
      return;
    }

    lastHandledCodeRef.current = data;

    const parsed = parseAddStuffCode(data);

    if (!parsed) {
      setLastResult(null);
      showInvalidCodeAlert(
        "Invalid code",
        "Expected format: r:AAAAAA or b:AAAAAA",
      );
      return;
    }

    if (parsed.kind !== kind) {
      setLastResult(null);
      showInvalidCodeAlert(
        "Wrong code type",
        `This screen expects a ${kind === "r" ? "rack" : "book"} code.`,
      );
      return;
    }

    setLastResult(parsed);
    onScan?.(parsed);
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Camera Permission Required
        </Text>
        <Text style={{ color: colors.muted, textAlign: "center" }}>
          Please grant camera permission to scan codes.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{headline}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Scan a Data Matrix or QR code in the format {kind}:AAAAAA
      </Text>

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

      {lastResult && (
        <View
          style={[
            styles.resultCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.resultLabel, { color: colors.muted }]}>
            Last scanned
          </Text>
          <Text style={[styles.resultValue, { color: colors.text }]}>
            {lastResult.raw}
          </Text>
          <Text style={[styles.resultMeta, { color: colors.tint }]}>
            Type: {lastResult.kind === "r" ? "Rack" : "Book"} · ID:{" "}
            {lastResult.code}
          </Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
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
  resultCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  resultMeta: {
    fontSize: 13,
    fontWeight: "600",
  },
  actions: {
    width: "100%",
    marginTop: "auto",
    gap: 10,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
