import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCopyStore } from "@/lib/add-copy-store";
import { getApiBaseUrl } from "@/lib/api-url";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";

const apiUrl = getApiBaseUrl();

type Book = {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  description: string;
};

export default function BookPickerScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSelectedBook = useCopyStore((state) => state.setSelectedBook);

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return books;
    }

    return books.filter((book) => {
      const haystack = [
        book.title,
        book.author,
        book.genre,
        book.isbn,
        book.description,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [books, searchQuery]);

  const loadBooks = useCallback(async () => {
    setError(null);
    setRefreshing(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/books`,
        getAuthenticatedRequestInit({ method: "GET" }),
      );

      if (!response.ok) {
        let message = "Could not load books.";

        try {
          const payload = (await response.json()) as { message?: string };
          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as Book[];
      setBooks(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong.",
      );
      setBooks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    router.back();
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Select Book</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Pick an existing book for the copy.
      </Text>

      <TextInput
        placeholder="Search books"
        placeholderTextColor={colors.inputPlaceholder}
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={[
          styles.searchInput,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />

      <Pressable
        onPress={() => void loadBooks()}
        style={({ pressed }) => [
          styles.refreshButton,
          {
            backgroundColor: colors.tint,
            opacity: pressed || refreshing ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.refreshButtonText, { color: colors.background }]}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </Text>
      </Pressable>

      {loading ? (
        <LoadingSkeleton
          density="compact"
          count={4}
          style={styles.loadingList}
        />
      ) : error ? (
        <View
          style={[
            styles.stateBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.text }}>{error}</Text>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View
          style={[
            styles.stateBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.muted }}>No books found.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredBooks.map((book) => (
            <Pressable
              key={book.bookId}
              onPress={() => handleSelectBook(book)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {book.title}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                {book.author} · {book.genre}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                ISBN: {book.isbn}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  refreshButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  loadingList: {
    marginTop: 4,
  },
  stateBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: "center",
  },
  list: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
  },
});
