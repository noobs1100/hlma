import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type Borrow = {
  borrowId: string;
  copyId: string;
  userId: string;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate: string | null;
  user: Borrower | null;
};

type CopyDetailsResponse = {
  copy: Copy;
  book: Book | null;
  borrows: Borrow[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function CopyDetailsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ bookId?: string; copyId?: string }>();
  const bookId = typeof params.bookId === "string" ? params.bookId : null;
  const copyId = typeof params.copyId === "string" ? params.copyId : null;
  const [details, setDetails] = useState<CopyDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!copyId) {
      setError("Copy not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiUrl}/api/copies/${copyId}/details`,
        getAuthenticatedRequestInit({ method: "GET" }),
      );

      if (!response.ok) {
        let message = "Could not load the copy details.";

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

      setDetails((await response.json()) as CopyDetailsResponse);
    } catch (loadError) {
      setDetails(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }, [copyId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.heading, { color: colors.text }]}>
            Copy Info
          </Text>
          <Text style={[styles.subheading, { color: colors.muted }]}>
            Shows the current borrower and borrow history.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={colors.tint} />
          <Text style={{ color: colors.muted }}>Loading copy details…</Text>
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
      ) : details ? (
        <View style={styles.content}>
          {details.book ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.muted }]}>
                Book
              </Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {details.book.title}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.muted }]}>
                {details.book.author} · {details.book.genre}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.muted }]}>
              Copy
            </Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {details.copy.copyId}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              Rack {details.copy.rackId}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>
              Status: {details.copy.status}
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Current Borrower
            </Text>
            {details.copy.borrowedByUser ? (
              <View style={styles.infoBlock}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {details.copy.borrowedByUser.name}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.muted }]}>
                  {details.copy.borrowedByUser.email}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.muted }]}>
                  Role: {details.copy.borrowedByUser.role}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.muted }}>
                This copy is currently available.
              </Text>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Borrow History
            </Text>
            <Text style={[styles.sectionMeta, { color: colors.muted }]}>
              {details.borrows.length} record
              {details.borrows.length === 1 ? "" : "s"}
            </Text>
          </View>

          {details.borrows.length ? (
            <View style={styles.list}>
              {details.borrows.map((borrow) => (
                <View
                  key={borrow.borrowId}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {borrow.user?.name ?? "Unknown borrower"}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    Borrowed: {formatDate(borrow.borrowDate)}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    Expected return: {formatDate(borrow.expectedReturnDate)}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>
                    Returned: {formatDate(borrow.returnDate)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.stateBlock,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.muted }}>
                No borrow history found.
              </Text>
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
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardMeta: {
    fontSize: 14,
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
  infoBlock: {
    gap: 4,
  },
  list: {
    gap: 10,
  },
});
