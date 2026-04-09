import Colors from "@/constants/Colors";
import { getApiBaseUrl } from "@/lib/api-url";
import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { router } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Searchbar } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useColorScheme } from "./useColorScheme";

const apiUrl = getApiBaseUrl();

type Book = {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  description: string;
};

const Search = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [books, setBooks] = React.useState<Book[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const skipNextDebounceRef = React.useRef(false);

  const loadBooks = React.useCallback(
    async (query: string, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const trimmedQuery = query.trim();
        const url = new URL(`${apiUrl}/api/books`);

        if (trimmedQuery) {
          url.searchParams.set("query", trimmedQuery);
        }

        const response = await fetch(
          url.toString(),
          getAuthenticatedRequestInit({ signal }),
        );

        if (!response.ok) {
          let message = "Could not load books.";

          try {
            const payload = (await response.json()) as { message?: string };

            if (payload?.message) {
              message = payload.message;
            }
          } catch {
            // Fall back to the default error message.
          }

          throw new Error(message);
        }

        const payload = (await response.json()) as Book[];
        setBooks(payload);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Something went wrong while searching.",
        );
        setBooks([]);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    React.useCallback(() => {
      skipNextDebounceRef.current = true;
      void loadBooks(searchQuery);
    }, [loadBooks, searchQuery]),
  );

  React.useEffect(() => {
    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false;
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      void loadBooks(searchQuery, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadBooks, searchQuery]);

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search books"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchArea, { backgroundColor: colors.inputBackground }]}
        placeholderTextColor={colors.inputPlaceholder}
        inputStyle={{ color: colors.inputText }}
        keyboardAppearance={colorScheme === "dark" ? "dark" : "light"}
      />

      {loading && (
        <View style={styles.stateRow}>
          <ActivityIndicator color={colors.tint} />
          <Text style={[styles.stateText, { color: colors.muted }]}>
            Searching books…
          </Text>
        </View>
      )}

      {!loading && error && (
        <Text style={[styles.errorText, { color: "#dc2626" }]}>{error}</Text>
      )}

      {!loading && !error && books.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          No books found.
        </Text>
      )}

      <FlatList
        data={books}
        keyExtractor={(item) => item.bookId}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={styles.list}
        contentContainerStyle={styles.results}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/books/[bookId]",
                params: { bookId: item.bookId },
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
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              {item.author} · {item.genre}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              ISBN: {item.isbn}
            </Text>
            <Text
              style={[styles.cardDescription, { color: colors.text }]}
              numberOfLines={3}
            >
              {item.description}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
};

export default Search;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchArea: {
    margin: 10,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  stateText: {
    fontSize: 14,
  },
  errorText: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 14,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 14,
  },
  results: {
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  list: {
    flex: 1,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  cardDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
});
