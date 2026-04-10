import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { parseAddStuffCode } from "@/lib/addStuffScanner";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-url";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";

import { Text, View } from "@/components/Themed";
import { useAuth } from "@/providers/auth-provider";

const SCAN_DEBOUNCE_MS = 700;
const apiUrl = getApiBaseUrl();

type BorrowedCopy = {
  borrowId: string;
  copyId: string;
  borrowDate: string;
  expectedReturnDate: string;
  book: {
    bookId: string;
    title: string;
    author: string;
  };
  copy: {
    copyId: string;
    status: "borrowed" | "available";
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TabTwoScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? "light";
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [borrowedCopies, setBorrowedCopies] = useState<BorrowedCopy[]>([]);
  const [borrowedCopiesLoading, setBorrowedCopiesLoading] = useState(true);
  const [borrowedCopiesError, setBorrowedCopiesError] = useState<string | null>(
    null,
  );
  const lastScanAtRef = useRef(0);
  const lastHandledCodeRef = useRef<string | null>(null);
  const alertVisibleRef = useRef(false);
  const scanResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const loadBorrowedCopies = useCallback(async () => {
    if (!user?.id) {
      setBorrowedCopies([]);
      setBorrowedCopiesLoading(false);
      setBorrowedCopiesError(null);
      return;
    }

    setBorrowedCopiesLoading(true);
    setBorrowedCopiesError(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/borrows/me`,
        getAuthenticatedRequestInit({ method: "GET" }),
      );

      if (!response.ok) {
        let message = "Could not load your borrowed copies.";

        try {
          const payload = (await response.json()) as { message?: string };
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      setBorrowedCopies((await response.json()) as BorrowedCopy[]);
    } catch (loadError) {
      setBorrowedCopies([]);
      setBorrowedCopiesError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong.",
      );
    } finally {
      setBorrowedCopiesLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setCameraActive(true);
      lastHandledCodeRef.current = null;
      if (!permission?.granted) {
        requestPermission();
      }
      void loadBorrowedCopies();
      return () => {
        setCameraActive(false);
        lastHandledCodeRef.current = null;
        if (scanResetTimeoutRef.current) {
          clearTimeout(scanResetTimeoutRef.current);
          scanResetTimeoutRef.current = null;
        }
      };
    }, [loadBorrowedCopies, permission, requestPermission]),
  );

  const handleBarcodeScanned = ({
    data,
    type,
  }: {
    data: string;
    type?: string;
  }) => {
    if (scanned || alertVisibleRef.current || !cameraActive) {
      return;
    }

    const now = Date.now();

    if (now - lastScanAtRef.current < SCAN_DEBOUNCE_MS) {
      return;
    }

    lastScanAtRef.current = now;

    const parsed = parseAddStuffCode(data);

    if (!parsed || parsed.kind !== "b") {
      setScanned(true);

      alertVisibleRef.current = true;
      setCameraActive(false);

      Alert.alert(
        "Invalid code",
        "Scan a book copy code in the format b:AAAAAA.",
        [
          {
            text: "OK",
            onPress: () => {
              alertVisibleRef.current = false;
              setCameraActive(true);
            },
          },
        ],
      );

      if (scanResetTimeoutRef.current) {
        clearTimeout(scanResetTimeoutRef.current);
      }

      scanResetTimeoutRef.current = setTimeout(() => setScanned(false), 400);
      return;
    }

    if (lastHandledCodeRef.current === parsed.code) {
      return;
    }

    lastHandledCodeRef.current = parsed.code;
    setScanned(true);

    if (scanResetTimeoutRef.current) {
      clearTimeout(scanResetTimeoutRef.current);
    }

    scanResetTimeoutRef.current = setTimeout(() => setScanned(false), 400);
    router.push({
      pathname: "/copies/[copyId]",
      params: {
        copyId: parsed.code,
      },
    });
  };

  if (!permission?.granted) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: Colors[colorScheme].background },
        ]}
      >
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text>Please grant camera permission to use the QR scanner.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        styles.scrollContent,
        { backgroundColor: Colors[colorScheme].background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.cameraContainer,
          { borderColor: Colors[colorScheme].border },
        ]}
      >
        {cameraActive && (
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "datamatrix"],
            }}
          />
        )}
      </View>

      <View
        style={[
          styles.borrowedSection,
          { backgroundColor: Colors[colorScheme].card },
        ]}
      >
        <Text
          style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
        >
          Currently Borrowed
        </Text>

        {borrowedCopiesLoading ? (
          <View style={styles.stateRow}>
            <ActivityIndicator color={Colors[colorScheme].tint} />
            <Text style={{ color: Colors[colorScheme].muted }}>
              Loading your borrowed copies…
            </Text>
          </View>
        ) : borrowedCopiesError ? (
          <View style={styles.stateRow}>
            <Text style={{ color: Colors[colorScheme].text }}>
              {borrowedCopiesError}
            </Text>
            <Pressable
              onPress={() => void loadBorrowedCopies()}
              style={({ pressed }) => [
                styles.retryButton,
                {
                  backgroundColor: Colors[colorScheme].tint,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.retryButtonText,
                  { color: Colors[colorScheme].background },
                ]}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        ) : borrowedCopies.length ? (
          <View style={styles.borrowedList}>
            {borrowedCopies.map((borrow) => (
              <Pressable
                key={borrow.borrowId}
                onPress={() =>
                  router.push({
                    pathname: "/copies/[copyId]",
                    params: { copyId: borrow.copyId },
                  })
                }
                style={({ pressed }) => [
                  styles.borrowedItem,
                  {
                    borderColor: Colors[colorScheme].border,
                    backgroundColor: Colors[colorScheme].inputBackground,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.borrowedItemTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  {borrow.book.title}
                </Text>
                <Text
                  style={[
                    styles.borrowedItemMeta,
                    { color: Colors[colorScheme].muted },
                  ]}
                >
                  Copy {borrow.copyId} · {borrow.book.author}
                </Text>
                <Text
                  style={[
                    styles.borrowedItemMeta,
                    { color: Colors[colorScheme].muted },
                  ]}
                >
                  Due {formatDate(borrow.expectedReturnDate)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ color: Colors[colorScheme].muted }}>
            You do not currently have any borrowed copies.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 10,
  },
  scrollContent: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
    gap: 12,
  },
  cameraContainer: {
    width: 300,
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#ccc",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  borrowedSection: {
    width: "100%",
    maxWidth: 360,
    marginTop: 4,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stateRow: {
    gap: 10,
    alignItems: "center",
  },
  borrowedList: {
    gap: 10,
  },
  borrowedItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  borrowedItemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  borrowedItemMeta: {
    fontSize: 13,
    fontWeight: "500",
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
