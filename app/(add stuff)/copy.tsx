import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import CodeScannerModal from "@/components/CodeScannerModal";
import IsbnScannerModal from "@/components/IsbnScannerModal";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-url";
import { parseAddStuffCode } from "@/lib/addStuffScanner";

const apiUrl = getApiBaseUrl();

type Book = {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  description: string;
};

type Rack = {
  rackId: string;
  room: string;
  cupboard: string;
  rack: string;
  description: string | null;
};

type CreateCopyResponse = {
  copyId: string;
  bookId: string;
  rackId: string;
  status: "available" | "borrowed";
  borrowedByUserId: string | null;
};

export default function AddCopyScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{
    selectedBookId?: string;
    selectedRackId?: string;
    selectedCopyId?: string;
    isbn?: string;
  }>();
  const [copyId, setCopyId] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [pendingRackId, setPendingRackId] = useState<string | null>(null);
  const [copyScannerVisible, setCopyScannerVisible] = useState(false);
  const [isbnScannerVisible, setIsbnScannerVisible] = useState(false);
  const [rackScannerVisible, setRackScannerVisible] = useState(false);
  const [loadingBook, setLoadingBook] = useState(false);
  const [loadingRack, setLoadingRack] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedBookId =
    typeof params.selectedBookId === "string" ? params.selectedBookId : null;
  const selectedRackId =
    typeof params.selectedRackId === "string" ? params.selectedRackId : null;
  const selectedCopyId =
    typeof params.selectedCopyId === "string" ? params.selectedCopyId : null;
  const initialIsbn = typeof params.isbn === "string" ? params.isbn : null;

  useEffect(() => {
    if (selectedCopyId) {
      setCopyId(selectedCopyId);
    }
  }, [selectedCopyId]);

  useEffect(() => {
    if (initialIsbn && !copyId) {
      // Keep the ISBN handy if the user comes back from book creation.
    }
  }, [copyId, initialIsbn]);

  useEffect(() => {
    if (!selectedBookId) {
      return;
    }

    let isActive = true;
    setLoadingBook(true);

    void fetch(
      `${apiUrl}/api/books/${selectedBookId}`,
      getAuthenticatedRequestInit(),
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load the selected book.");
        }

        return (await response.json()) as Book;
      })
      .then((book) => {
        if (isActive) {
          setSelectedBook(book);
        }
      })
      .catch(() => {
        if (isActive) {
          setSelectedBook(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoadingBook(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedBookId]);

  useEffect(() => {
    if (!selectedRackId) {
      return;
    }

    let isActive = true;
    setLoadingRack(true);

    void fetch(
      `${apiUrl}/api/racks/${selectedRackId}`,
      getAuthenticatedRequestInit(),
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load the selected rack.");
        }

        return (await response.json()) as Rack;
      })
      .then((rack) => {
        if (isActive) {
          setSelectedRack(rack);
          setPendingRackId(null);
        }
      })
      .catch(() => {
        if (isActive) {
          setSelectedRack(null);
          setPendingRackId(selectedRackId);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoadingRack(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedRackId]);

  const validationError = useMemo(() => {
    if (!copyId.trim()) {
      return "Please scan or enter the copy code.";
    }

    if (!selectedBook) {
      return "Please select a book.";
    }

    if (!selectedRack) {
      if (pendingRackId) {
        return "Rack not found. Please select an existing rack.";
      }

      return "Please select a rack.";
    }

    return null;
  }, [copyId, selectedBook, selectedRack]);

  const handleCopyScan = (rawCode: string) => {
    const parsed = parseAddStuffCode(rawCode);

    if (!parsed || parsed.kind !== "b") {
      Alert.alert("Invalid code", "Scan a copy code in the format b:AAAAAA.");
      return;
    }

    setCopyId(parsed.code);
    setCopyScannerVisible(false);
  };

  const handleIsbnScan = async (isbn: string) => {
    setIsbnScannerVisible(false);
    setLoadingBook(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/books?query=${encodeURIComponent(isbn)}`,
        getAuthenticatedRequestInit(),
      );

      if (!response.ok) {
        throw new Error("Could not search for the book.");
      }

      const payload = (await response.json()) as Book[];
      const exactMatch = payload.find((book) => book.isbn === isbn);

      if (exactMatch) {
        setSelectedBook(exactMatch);
        return;
      }

      router.push({
        pathname: "/(add stuff)/book",
        params: {
          isbn,
          returnTo: "/(add stuff)/copy",
        },
      });
    } catch (error) {
      Alert.alert(
        "Lookup failed",
        error instanceof Error ? error.message : "Could not find the book.",
        [{ text: "OK" }],
      );
    } finally {
      setLoadingBook(false);
    }
  };

  const handleRackScan = async (rawCode: string) => {
    const parsed = parseAddStuffCode(rawCode);

    if (!parsed || parsed.kind !== "r") {
      Alert.alert("Invalid code", "Scan a rack code in the format r:AAAAAA.");
      return;
    }

    setRackScannerVisible(false);

    try {
      setLoadingRack(true);

      const response = await fetch(
        `${apiUrl}/api/racks/${parsed.code}`,
        getAuthenticatedRequestInit(),
      );

      if (response.status === 404) {
        setSelectedRack(null);
        setPendingRackId(parsed.code);

        Alert.alert(
          "Rack not found",
          "This rack does not exist yet. Please select an existing rack.",
          [{ text: "OK" }],
        );

        return;
      }

      if (!response.ok) {
        throw new Error("Could not load the rack.");
      }

      const rack = (await response.json()) as Rack;
      setSelectedRack(rack);
      setPendingRackId(null);
    } catch (error) {
      Alert.alert(
        "Lookup failed",
        error instanceof Error ? error.message : "Could not load the rack.",
        [{ text: "OK" }],
      );
    } finally {
      setLoadingRack(false);
    }
  };

  const handleSubmit = async () => {
    if (validationError) {
      Alert.alert("Error", validationError, [{ text: "OK" }]);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/copies`,
        getAuthenticatedRequestInit({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            copyId: copyId.trim(),
            bookId: selectedBook?.bookId,
            rackId: selectedRack?.rackId,
            status: "available",
          }),
        }),
      );

      if (!response.ok) {
        let message = "Could not create the copy.";

        try {
          const payload = (await response.json()) as { message?: string };
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Fall back to the default message.
        }

        throw new Error(message);
      }

      const created = (await response.json()) as CreateCopyResponse;
      setCopyId("");
      setSelectedBook(null);
      setSelectedRack(null);

      Alert.alert("Success", "Copy created successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);

      return created;
    } catch (submitError) {
      Alert.alert(
        "Error",
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.",
        [{ text: "OK" }],
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CodeScannerModal
        visible={copyScannerVisible}
        onClose={() => setCopyScannerVisible(false)}
        onScan={handleCopyScan}
        headline="Scan Copy Code"
        subtitle="Scan the Data Matrix or QR code that belongs to this physical copy."
      />
      <IsbnScannerModal
        visible={isbnScannerVisible}
        onClose={() => setIsbnScannerVisible(false)}
        onScan={handleIsbnScan}
      />
      <CodeScannerModal
        visible={rackScannerVisible}
        onClose={() => setRackScannerVisible(false)}
        onScan={handleRackScan}
        headline="Scan Rack Code"
        subtitle="Scan the rack Data Matrix or QR code."
      />

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
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              1. Copy Code
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
              Scan the code on the physical copy.
            </Text>

            <View
              style={[
                styles.valueBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                },
              ]}
            >
              <Text style={[styles.valueLabel, { color: colors.muted }]}>
                Copy Code
              </Text>
              <Text style={[styles.valueText, { color: colors.text }]}>
                {copyId || "Not scanned yet"}
              </Text>
            </View>

            <Pressable
              onPress={() => setCopyScannerVisible(true)}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text
                style={[styles.primaryButtonText, { color: colors.background }]}
              >
                Scan and Add ID
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              2. Associated Book
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
              Scan an ISBN or choose a book from the list.
            </Text>

            <View
              style={[
                styles.valueBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                },
              ]}
            >
              <Text style={[styles.valueLabel, { color: colors.muted }]}>
                Selected Book
              </Text>
              <Text style={[styles.valueText, { color: colors.text }]}>
                {loadingBook
                  ? "Loading..."
                  : selectedBook
                    ? `${selectedBook.title} · ${selectedBook.author}`
                    : "No book selected"}
              </Text>
              {selectedBook && (
                <Text style={[styles.valueMeta, { color: colors.muted }]}>
                  ISBN: {selectedBook.isbn}
                </Text>
              )}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => setIsbnScannerVisible(true)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBackground,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Scan ISBN Barcode
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(add stuff)/book-picker",
                    params: {
                      returnTo: "/(add stuff)/copy",
                      selectedCopyId: copyId,
                      selectedRackId:
                        selectedRack?.rackId ?? selectedRackId ?? "",
                      isbn: initialIsbn ?? "",
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBackground,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Select from List
                </Text>
              </Pressable>
            </View>

            {initialIsbn && !selectedBook && (
              <Text style={[styles.hintText, { color: colors.muted }]}>
                You can add the book details if this ISBN is new.
              </Text>
            )}

            {initialIsbn && !selectedBookId && !loadingBook && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(add stuff)/book",
                    params: {
                      isbn: initialIsbn,
                      returnTo: "/(add stuff)/copy",
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: colors.background },
                  ]}
                >
                  Add Book Info
                </Text>
              </Pressable>
            )}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              3. Rack
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
              Scan the rack or choose it from the rack list.
            </Text>

            <View
              style={[
                styles.valueBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                },
              ]}
            >
              <Text style={[styles.valueLabel, { color: colors.muted }]}>
                Selected Rack
              </Text>
              <Text style={[styles.valueText, { color: colors.text }]}>
                {loadingRack
                  ? "Loading..."
                  : selectedRack
                    ? selectedRack.rackId
                    : "No rack selected"}
              </Text>
              {selectedRack && (
                <Text style={[styles.valueMeta, { color: colors.muted }]}>
                  {selectedRack.room} · {selectedRack.cupboard} ·{" "}
                  {selectedRack.rack}
                </Text>
              )}
              {!selectedRack && pendingRackId && (
                <Text style={[styles.valueMeta, { color: "#dc2626" }]}>
                  Rack {pendingRackId} was not found.
                </Text>
              )}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => setRackScannerVisible(true)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBackground,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Scan Rack Code
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(add stuff)/rack-picker",
                    params: {
                      returnTo: "/(add stuff)/copy",
                      selectedCopyId: copyId,
                      selectedBookId:
                        selectedBook?.bookId ?? selectedBookId ?? "",
                      isbn: initialIsbn ?? "",
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBackground,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Select from List
                </Text>
              </Pressable>
            </View>
          </View>

          {validationError && (
            <Text style={[styles.errorText, { color: "#dc2626" }]}>
              {validationError}
            </Text>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: colors.tint,
                opacity: pressed || submitting ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[styles.submitButtonText, { color: colors.background }]}
            >
              {submitting ? "Saving..." : "Create Copy"}
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
  content: {
    padding: 16,
    gap: 14,
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 13,
  },
  valueBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  valueLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  valueText: {
    fontSize: 16,
    fontWeight: "700",
  },
  valueMeta: {
    fontSize: 13,
  },
  hintText: {
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
    paddingHorizontal: 14,
    alignItems: "center",
    flexGrow: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
