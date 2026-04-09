import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-url";

const apiUrl = getApiBaseUrl();

type Book = {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  description: string;
};

type Borrower = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Copy = {
  copyId: string;
  bookId: string;
  rackId: string;
  status: "borrowed" | "available";
  borrowedByUserId: string | null;
  borrowedByUser: Borrower | null;
};

type BookDetailsResponse = {
  book: Book;
  copies: Copy[];
};

export default function BookDetailsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ bookId?: string }>();
  const bookId = typeof params.bookId === "string" ? params.bookId : null;
  const [details, setDetails] = useState<BookDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!bookId) {
      setError("Book not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/books/${bookId}/details`,
        getAuthenticatedRequestInit({ method: "GET" }),
      );

      if (!response.ok) {
        let message = "Could not load the book details.";

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

      setDetails((await response.json()) as BookDetailsResponse);
    } catch (loadError) {
      setDetails(null);
      setError(
        loadError instanceof Error ? loadError.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const book = details?.book ?? null;

  const title = useMemo(() => {
    if (book?.title) {
      return book.title;
    }

    return "Book Details";
  }, [book?.title]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Stack.Screen options={{ title }} />

      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.heading, { color: colors.text }]}>Book Info</Text>
          <Text style={[styles.subheading, { color: colors.muted }]}>Copies live in the same stack.</Text>
        </View>
        <Pressable
          onPress={() => void loadDetails()}
          style={({ pressed }) => [
            styles.refreshButton,
            { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.refreshButtonText, { color: colors.background }]}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.tint} />
          <Text style={{ color: colors.muted }}>Loading book details…</Text>
        </View>
      ) : error ? (
        <View
          style={[
            styles.stateBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.text }}>{error}</Text>
        </View>
      ) : book ? (
        <View style={styles.content}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>{book.title}</Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              {book.author} · {book.genre}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>ISBN: {book.isbn}</Text>
            <Text style={[styles.cardDescription, { color: colors.text }]}>
              {book.description}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Copies</Text>
            <Text style={[styles.sectionMeta, { color: colors.muted }]}>
              {details?.copies.length ?? 0} total
            </Text>
          </View>

          {details?.copies.length ? (
            <View style={styles.list}>
              {details.copies.map((copy) => (
                <Pressable
                  key={copy.copyId}
                  onPress={() =>
                    router.push({
                      pathname: "/books/[bookId]/copies/[copyId]",
                      params: { bookId: bookId ?? copy.bookId, copyId: copy.copyId },
                    })
                  }
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{copy.copyId}</Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    Rack {copy.rackId} · {copy.status}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    {copy.borrowedByUser
                      ? `Borrowed by ${copy.borrowedByUser.name}`
                      : "Currently available"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.stateBlock,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.muted }}>No copies found for this book.</Text>
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
  },
  subheading: {
    marginTop: 4,
    fontSize: 14,
  },
  refreshButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  stateBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  content: {
    gap: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardMeta: {
    fontSize: 14,
  },
  cardDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionMeta: {
    fontSize: 13,
  },
  list: {
    gap: 10,
  },
});
