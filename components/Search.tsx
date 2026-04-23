import LoadingSkeleton from "@/components/LoadingSkeleton";
import Colors from "@/constants/Colors";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Searchbar } from "react-native-paper";
import { useColorScheme } from "./useColorScheme";
import {
  getCachedBooks,
  refreshBooksCache,
  type OfflineBook,
} from "@/lib/offline-cache";

const Search = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [books, setBooks] = React.useState<OfflineBook[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const didFocusOnceRef = React.useRef(false);
  const loadSequenceRef = React.useRef(0);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadBooks = React.useCallback(async () => {
    const loadSequence = ++loadSequenceRef.current;
    const trimmedQuery = debouncedSearchQuery.trim();

    setError(null);
    setLoading(true);

    const cachedBooks = await getCachedBooks(trimmedQuery);

    if (loadSequence !== loadSequenceRef.current) {
      return;
    }

    const hasCachedBooks = cachedBooks.length > 0;
    setBooks(cachedBooks);

    if (hasCachedBooks) {
      setLoading(false);
      setRefreshing(true);
    }

    try {
      await refreshBooksCache();

      if (loadSequence !== loadSequenceRef.current) {
        return;
      }

      const refreshedBooks = await getCachedBooks(trimmedQuery);
      if (loadSequence !== loadSequenceRef.current) {
        return;
      }

      setBooks(refreshedBooks);
    } catch (loadError) {
      if (!hasCachedBooks && loadSequence === loadSequenceRef.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Something went wrong.",
        );
        setBooks([]);
      }
    } finally {
      if (loadSequence === loadSequenceRef.current) {
        if (hasCachedBooks) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    }
  }, [debouncedSearchQuery]);

  React.useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  useFocusEffect(
    React.useCallback(() => {
      if (didFocusOnceRef.current) {
        void loadBooks();
        return;
      }

      didFocusOnceRef.current = true;
    }, [loadBooks]),
  );

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

      {loading ? (
        <LoadingSkeleton
          density="expanded"
          count={4}
          style={styles.loadingList}
        />
      ) : null}

      {refreshing ? (
        <LoadingSkeleton variant="inline" style={styles.loadingStrip} />
      ) : null}

      {!loading && error && (
        <Text style={[styles.errorText, { color: "#dc2626" }]}>
          {error}
        </Text>
      )}

      {!loading && !error && books.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          No books found.
        </Text>
      )}

      {!loading ? (
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
                ISBN: {item.isbn ?? "—"}
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
      ) : null}
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
  loadingList: {
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  loadingStrip: {
    marginHorizontal: 16,
    marginBottom: 8,
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
