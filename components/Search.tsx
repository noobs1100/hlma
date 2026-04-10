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
import { useQuery } from "@tanstack/react-query";

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const didFocusOnceRef = React.useRef(false);
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const booksQuery = useQuery({
    queryKey: ["books", debouncedSearchQuery.trim()],
    queryFn: async ({ signal }) => {
      const trimmedQuery = debouncedSearchQuery.trim();
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

      return (await response.json()) as Book[];
    },
    staleTime: 30_000,
  });

  const { refetch } = booksQuery;

  useFocusEffect(
    React.useCallback(() => {
      if (didFocusOnceRef.current) {
        void refetch();
        return;
      }

      didFocusOnceRef.current = true;
    }, [refetch]),
  );

  const books = booksQuery.data ?? [];
  const loading = booksQuery.isPending || booksQuery.isFetching;
  const error = booksQuery.error;
  const errorMessage = error instanceof Error ? error.message : null;

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

      {!loading && errorMessage && (
        <Text style={[styles.errorText, { color: "#dc2626" }]}>
          {errorMessage}
        </Text>
      )}

      {!loading && !errorMessage && books.length === 0 && (
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
