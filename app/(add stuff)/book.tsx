import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import CoverAutofillModal, {
  type CoverAutofillSuggested,
} from "@/components/CoverAutofillModal";
import IsbnScannerModal from "@/components/IsbnScannerModal";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { lookupBookByIsbn, normalizeIsbn } from "@/lib/isbn-api";
import { getApiBaseUrl } from "../../lib/api-url";

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
  const [coverModalVisible, setCoverModalVisible] = useState(false);
  const [coverSuggested, setCoverSuggested] =
    useState<CoverAutofillSuggested | null>(null);
  const [coverReviewVisible, setCoverReviewVisible] = useState(false);

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
        isbn: form.isbn.trim() ? form.isbn.trim() : null,
        description: form.description.trim() ? form.description.trim() : null,
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

  const applyCoverSuggestions = () => {
    if (!coverSuggested) return;

    setForm((current) => ({
      ...current,
      ...(coverSuggested.title ? { title: coverSuggested.title } : null),
      ...(coverSuggested.author ? { author: coverSuggested.author } : null),
      ...(coverSuggested.genre ? { genre: coverSuggested.genre } : null),
      ...(coverSuggested.description
        ? { description: coverSuggested.description }
        : null),
    }));

    setCoverReviewVisible(false);
    setCoverSuggested(null);
  };

  const closeCoverReview = () => {
    setCoverReviewVisible(false);
    setCoverSuggested(null);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CoverAutofillModal
        visible={coverModalVisible}
        onClose={() => setCoverModalVisible(false)}
        onSuggested={(suggested) => {
          setCoverSuggested(suggested);
          setCoverReviewVisible(true);
        }}
      />
      <IsbnScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleIsbnScanned}
      />
      <Modal
        visible={coverReviewVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCoverReview}
      >
        <View
          style={[
            styles.reviewBackdrop,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[
              styles.reviewCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.reviewTitle, { color: colors.text }]}>
              Verify autofill
            </Text>
            <Text style={[styles.reviewSubtitle, { color: colors.muted }]}>
              Review the suggested details. Nothing will be submitted until you
              press Submit.
            </Text>

            {coverSuggested &&
            (coverSuggested.title ||
              coverSuggested.author ||
              coverSuggested.genre ||
              coverSuggested.description) ? (
              <View style={styles.reviewFields}>
                {coverSuggested.title ? (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.muted }]}>
                      Title
                    </Text>
                    <Text style={[styles.reviewValue, { color: colors.text }]}>
                      {coverSuggested.title}
                    </Text>
                  </View>
                ) : null}
                {coverSuggested.author ? (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.muted }]}>
                      Author
                    </Text>
                    <Text style={[styles.reviewValue, { color: colors.text }]}>
                      {coverSuggested.author}
                    </Text>
                  </View>
                ) : null}
                {coverSuggested.genre ? (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.muted }]}>
                      Genre
                    </Text>
                    <Text style={[styles.reviewValue, { color: colors.text }]}>
                      {coverSuggested.genre}
                    </Text>
                  </View>
                ) : null}
                {coverSuggested.description ? (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.muted }]}>
                      Description
                    </Text>
                    <Text
                      style={[styles.reviewValue, { color: colors.text }]}
                      numberOfLines={6}
                    >
                      {coverSuggested.description}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={{ color: colors.muted }}>
                No details were detected from the cover photo.
              </Text>
            )}

            <View style={styles.reviewActions}>
              <Pressable
                onPress={applyCoverSuggestions}
                style={({ pressed }) => [
                  styles.reviewPrimary,
                  {
                    backgroundColor: colors.tint,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                disabled={!coverSuggested}
              >
                <Text
                  style={[styles.reviewPrimaryText, { color: colors.background }]}
                >
                  Apply to form
                </Text>
              </Pressable>

              <Pressable
                onPress={closeCoverReview}
                style={[
                  styles.reviewSecondary,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[styles.reviewSecondaryText, { color: colors.text }]}>
                  Discard
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          <View style={styles.headerBlock}>
            <Text style={[styles.kicker, { color: colors.muted }]}>Add stuff</Text>
            <Text style={[styles.title, { color: colors.text }]}>Add a book</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Scan an ISBN or fill in the details manually.</Text>
          </View>

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

          <Pressable
            onPress={() => setCoverModalVisible(true)}
            disabled={scanningIsbn || loading}
            style={({ pressed }) => [
              styles.scanButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                opacity: pressed || scanningIsbn || loading ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.scanButtonText, { color: colors.text }]}>
              Take Cover Photo (Autofill)
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
            style={[
              styles.input,
              {
                color: colors.inputText,
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="Author"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.author}
            onChangeText={(value) => updateField("author", value)}
            style={[
              styles.input,
              {
                color: colors.inputText,
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="Genre"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.genre}
            onChangeText={(value) => updateField("genre", value)}
            style={[
              styles.input,
              {
                color: colors.inputText,
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
            cursorColor={colors.tint}
            selectionColor={colors.tint}
          />

          <TextInput
            placeholder="ISBN"
            placeholderTextColor={colors.inputPlaceholder}
            value={form.isbn}
            onChangeText={(value) => updateField("isbn", value)}
            style={[
              styles.input,
              {
                color: colors.inputText,
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
            autoCapitalize="none"
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
              {
                color: colors.inputText,
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  headerBlock: {
    gap: 4,
    marginBottom: 2,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  scanButton: {
    borderRadius: 12,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 20,
  },
  multilineInput: {
    minHeight: 120,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  reviewBackdrop: {
    flex: 1,
    padding: 16,
    justifyContent: "flex-end",
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  reviewSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewFields: {
    gap: 10,
  },
  reviewRow: {
    gap: 4,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reviewValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  reviewActions: {
    gap: 10,
    marginTop: 6,
  },
  reviewPrimary: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  reviewPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
  },
  reviewSecondary: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  reviewSecondaryText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
