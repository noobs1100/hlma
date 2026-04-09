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
} from "react-native";

import IsbnScannerModal from "@/components/IsbnScannerModal";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getApiBaseUrl } from "../../lib/api-url";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { lookupBookByIsbn, normalizeIsbn } from "@/lib/isbn-api";

const apiUrl = getApiBaseUrl();

type BookFormState = {
  title: string;
  author: string;
  genre: string;
  isbn: string;
  description: string;
};

const initialFormState: BookFormState = {
  title: "",
  author: "",
  genre: "",
  isbn: "",
  description: "",
};

export default function AddBookScreen() {
  const params = useLocalSearchParams<{ isbn?: string; returnTo?: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [form, setForm] = useState<BookFormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [scanningIsbn, setScanningIsbn] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    if (typeof params.isbn === "string" && params.isbn.trim()) {
      setForm((current) => ({
        ...current,
        isbn: params.isbn ?? current.isbn,
      }));
    }
  }, [params.isbn]);

  const validationError = useMemo(() => {
    const requiredFields: Array<keyof BookFormState> = [
      "title",
      "author",
      "genre",
      "isbn",
      "description",
    ];

    const missingField = requiredFields.find((field) => !form[field].trim());

    if (!missingField) {
      return null;
    }

    return `Please enter ${missingField}.`;
  }, [form]);

  const updateField = (field: keyof BookFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleIsbnScanned = async (isbn: string) => {
    const normalizedIsbn = normalizeIsbn(isbn);

    setScannerVisible(false);
    setScanningIsbn(true);

    try {
      const bookInfo = await lookupBookByIsbn(normalizedIsbn);

      if (!bookInfo) {
        throw new Error("Could not find book details for this ISBN.");
      }

      setForm((current) => ({
        ...current,
        isbn: normalizedIsbn,
        title: bookInfo.title ?? current.title,
        author: bookInfo.authors?.join(", ") ?? current.author,
        genre: bookInfo.genre ?? bookInfo.publisher ?? current.genre,
        description: bookInfo.description ?? current.description,
      }));
    } catch (error) {
      Alert.alert(
        "Lookup failed",
        error instanceof Error ? error.message : "Could not load book details.",
        [{ text: "OK" }],
      );

      setForm((current) => ({ ...current, isbn: normalizedIsbn }));
    } finally {
      setScanningIsbn(false);
    }
  };

  const handleSubmit = async () => {
    if (validationError) {
      Alert.alert("Error", validationError, [{ text: "OK" }]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/books`,
        getAuthenticatedRequestInit({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: form.title.trim(),
            author: form.author.trim(),
            genre: form.genre.trim(),
            isbn: form.isbn.trim(),
            description: form.description.trim(),
          }),
        }),
      );

      if (!response.ok) {
        let message = "Could not create the book.";

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

      const returnTo =
        typeof params.returnTo === "string" ? params.returnTo : null;
      const createdBookId = (await response.json()) as { bookId: string };

      Alert.alert("Success", "Book created successfully.", [
        {
          text: "OK",
          onPress: () => {
            if (returnTo && createdBookId) {
              router.replace({
                pathname: returnTo as never,
                params: { selectedBookId: createdBookId.bookId },
              } as never);
              return;
            }

            router.back();
          },
        },
      ]);
    } catch (submitError) {
      Alert.alert(
        "Error",
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.",
        [{ text: "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <IsbnScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleIsbnScanned}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          <Pressable
            onPress={() => setScannerVisible(true)}
            disabled={scanningIsbn || loading}
            style={({ pressed }) => [
              styles.scanButton,
              {
                backgroundColor: colors.tint,
                opacity: pressed || scanningIsbn || loading ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.scanButtonText, { color: colors.background }]}>
              Scan ISBN Barcode
            </Text>
          </Pressable>

          {scanningIsbn && (
            <Text style={[styles.statusText, { color: colors.muted }]}>
              Looking up book details…
            </Text>
          )}

          <TextInput
            placeholder="Title"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.title}
            onChangeText={(value) => updateField("title", value)}
            style={styles.input}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="Author"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.author}
            onChangeText={(value) => updateField("author", value)}
            style={styles.input}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="Genre"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.genre}
            onChangeText={(value) => updateField("genre", value)}
            style={styles.input}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="ISBN"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.isbn}
            onChangeText={(value) => updateField("isbn", value)}
            style={styles.input}
            autoCapitalize="none"
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="Description"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.description}
            onChangeText={(value) => updateField("description", value)}
            style={[styles.input, styles.multilineInput]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.tint,
                opacity: pressed || loading ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              {loading ? "Submitting..." : "Submit"}
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
    gap: 12,
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: 24,
  },
  scanButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 120,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
