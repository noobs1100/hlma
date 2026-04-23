import * as SQLite from "expo-sqlite";

import { getAuthenticatedRequestInit } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-url";

const apiUrl = getApiBaseUrl();
const databaseName = "hlma-offline.db";

export type OfflineBook = {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  isbn: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OfflineCopy = {
  copyId: string;
  bookId: string;
  rackId: string;
  status: "borrowed" | "available";
  borrowedByUserId: string | null;
  borrowedByUserName?: string | null;
  borrowedByUserEmail?: string | null;
  borrowedByUserRole?: string | null;
};

export type OfflineRack = {
  rackId: string;
  description: string | null;
  room: string;
  cupboard: string;
  rack: string;
};

export type OfflineBookDetails = {
  book: OfflineBook;
  copies: OfflineCopy[];
};

export type OfflineBorrower = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type OfflineCopyDetails = {
  copy: OfflineCopy & {
    borrowedByUser: OfflineBorrower | null;
    rack: OfflineRack | null;
  };
  book: OfflineBook | null;
  borrows: [];
};

type BookDetailsResponse = OfflineBookDetails;

type SQLiteDatabase = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

let databasePromise: Promise<SQLiteDatabase> | null = null;

function normalizeNullable(value: string | null | undefined) {
  return value ?? null;
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(databaseName);
  }

  const database = await databasePromise;

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS books (
      bookId TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      genre TEXT NOT NULL,
      isbn TEXT,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS books_title_idx ON books(title);
    CREATE INDEX IF NOT EXISTS books_author_idx ON books(author);
    CREATE INDEX IF NOT EXISTS books_genre_idx ON books(genre);
    CREATE INDEX IF NOT EXISTS books_isbn_idx ON books(isbn);

    CREATE TABLE IF NOT EXISTS racks (
      rackId TEXT PRIMARY KEY NOT NULL,
      room TEXT NOT NULL,
      cupboard TEXT NOT NULL,
      rack TEXT NOT NULL,
      description TEXT
    );

    CREATE INDEX IF NOT EXISTS racks_room_idx ON racks(room);
    CREATE INDEX IF NOT EXISTS racks_cupboard_idx ON racks(cupboard);
    CREATE INDEX IF NOT EXISTS racks_rack_idx ON racks(rack);

    CREATE TABLE IF NOT EXISTS copies (
      copyId TEXT PRIMARY KEY NOT NULL,
      bookId TEXT NOT NULL,
      rackId TEXT NOT NULL,
      status TEXT NOT NULL,
      borrowedByUserId TEXT,
      borrowedByUserName TEXT,
      borrowedByUserEmail TEXT,
      borrowedByUserRole TEXT
    );

    CREATE INDEX IF NOT EXISTS copies_book_id_idx ON copies(bookId);
    CREATE INDEX IF NOT EXISTS copies_rack_id_idx ON copies(rackId);
    CREATE INDEX IF NOT EXISTS copies_status_idx ON copies(status);
  `);

  return database;
}

async function upsertBooks(database: SQLiteDatabase, books: OfflineBook[]) {
  if (!books.length) {
    return;
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const book of books) {
      await transaction.runAsync(
        `
          INSERT OR REPLACE INTO books (
            bookId,
            title,
            author,
            genre,
            isbn,
            description,
            createdAt,
            updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          book.bookId,
          book.title,
          book.author,
          book.genre,
          normalizeNullable(book.isbn),
          normalizeNullable(book.description),
          book.createdAt,
          book.updatedAt,
        ],
      );
    }
  });
}

async function upsertCopies(database: SQLiteDatabase, copies: OfflineCopy[]) {
  if (!copies.length) {
    return;
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const copy of copies) {
      await transaction.runAsync(
        `
          INSERT OR REPLACE INTO copies (
            copyId,
            bookId,
            rackId,
            status,
            borrowedByUserId,
            borrowedByUserName,
            borrowedByUserEmail,
            borrowedByUserRole
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          copy.copyId,
          copy.bookId,
          copy.rackId,
          copy.status,
          normalizeNullable(copy.borrowedByUserId),
            normalizeNullable(copy.borrowedByUserName),
            normalizeNullable(copy.borrowedByUserEmail),
            normalizeNullable(copy.borrowedByUserRole),
        ],
      );
    }
  });
}

export async function upsertRacks(racks: OfflineRack[]) {
  if (!racks.length) {
    return;
  }

  const database = await getDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const rack of racks) {
      await transaction.runAsync(
        `
          INSERT OR REPLACE INTO racks (
            rackId,
            room,
            cupboard,
            rack,
            description
          ) VALUES (?, ?, ?, ?, ?)
        `,
        [
          rack.rackId,
          rack.room,
          rack.cupboard,
          rack.rack,
          normalizeNullable(rack.description),
        ],
      );
    }
  });
}

export async function getCachedBookDetails(
  bookId: string,
): Promise<OfflineBookDetails | null> {
  const database = await getDatabase();

  const book = await database.getFirstAsync<OfflineBook>(
    `
      SELECT bookId, title, author, genre, isbn, description, createdAt, updatedAt
      FROM books
      WHERE bookId = ?
      LIMIT 1
    `,
    [bookId],
  );

  if (!book) {
    return null;
  }

  const copies = await database.getAllAsync<OfflineCopy>(
    `
      SELECT copyId, bookId, rackId, status, borrowedByUserId
      FROM copies
      WHERE bookId = ?
      ORDER BY copyId
    `,
    [bookId],
  );

  return { book, copies };
}

export async function getCachedCopyDetails(
  copyId: string,
): Promise<OfflineCopyDetails | null> {
  const database = await getDatabase();

  const copy = await database.getFirstAsync<OfflineCopy>(
    `
      SELECT
        copyId,
        bookId,
        rackId,
        status,
        borrowedByUserId,
        borrowedByUserName,
        borrowedByUserEmail,
        borrowedByUserRole
      FROM copies
      WHERE copyId = ?
      LIMIT 1
    `,
    [copyId],
  );

  if (!copy) {
    return null;
  }

  const book = await database.getFirstAsync<OfflineBook>(
    `
      SELECT bookId, title, author, genre, isbn, description, createdAt, updatedAt
      FROM books
      WHERE bookId = ?
      LIMIT 1
    `,
    [copy.bookId],
  );

  const rack = await database.getFirstAsync<OfflineRack>(
    `
      SELECT rackId, room, cupboard, rack, description
      FROM racks
      WHERE rackId = ?
      LIMIT 1
    `,
    [copy.rackId],
  );

  return {
    copy: {
      ...copy,
      borrowedByUser: copy.borrowedByUserId
        ? {
            id: copy.borrowedByUserId,
            name: copy.borrowedByUserName ?? "Unknown",
            email: copy.borrowedByUserEmail ?? "",
            role: copy.borrowedByUserRole ?? "",
          }
        : null,
      rack,
    },
    book,
    borrows: [],
  };
}

export async function getCachedBooks(query: string): Promise<OfflineBook[]> {
  const database = await getDatabase();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return database.getAllAsync<OfflineBook>(`
      SELECT bookId, title, author, genre, isbn, description, createdAt, updatedAt
      FROM books
      ORDER BY createdAt DESC
    `);
  }

  const searchPattern = `%${trimmedQuery}%`;

  return database.getAllAsync<OfflineBook>(
    `
      SELECT bookId, title, author, genre, isbn, description, createdAt, updatedAt
      FROM books
      WHERE title LIKE ? COLLATE NOCASE
        OR author LIKE ? COLLATE NOCASE
        OR genre LIKE ? COLLATE NOCASE
        OR COALESCE(isbn, '') LIKE ? COLLATE NOCASE
        OR COALESCE(description, '') LIKE ? COLLATE NOCASE
      ORDER BY createdAt DESC
    `,
    [
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    ],
  );
}

export async function getCachedRacks(query: string = ""): Promise<OfflineRack[]> {
  const database = await getDatabase();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return database.getAllAsync<OfflineRack>(`
      SELECT rackId, room, cupboard, rack, description
      FROM racks
      ORDER BY rackId DESC
    `);
  }

  const searchPattern = `%${trimmedQuery}%`;

  return database.getAllAsync<OfflineRack>(
    `
      SELECT rackId, room, cupboard, rack, description
      FROM racks
      WHERE rackId LIKE ? COLLATE NOCASE
        OR room LIKE ? COLLATE NOCASE
        OR cupboard LIKE ? COLLATE NOCASE
        OR rack LIKE ? COLLATE NOCASE
        OR COALESCE(description, '') LIKE ? COLLATE NOCASE
      ORDER BY rackId DESC
    `,
    [
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    ],
  );
}

export async function refreshBooksCache(): Promise<OfflineBook[]> {
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
      // Keep the default error message.
    }

    throw new Error(message);
  }

  const payload = (await response.json()) as OfflineBook[];
  const database = await getDatabase();

  await upsertBooks(database, payload);

  return payload;
}

export async function refreshRacksCache(): Promise<OfflineRack[]> {
  const response = await fetch(
    `${apiUrl}/api/racks`,
    getAuthenticatedRequestInit({ method: "GET" }),
  );

  if (!response.ok) {
    let message = "Could not load racks.";

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

  const payload = (await response.json()) as OfflineRack[];

  await upsertRacks(payload);

  return payload;
}

export async function refreshBookDetailsCache(
  bookId: string,
): Promise<OfflineBookDetails | null> {
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

  const payload = (await response.json()) as BookDetailsResponse;
  const database = await getDatabase();

  await upsertBooks(database, [payload.book]);
  await upsertCopies(database, payload.copies);

  return payload;
}

export async function refreshCopyDetailsCache(
  copyId: string,
): Promise<OfflineCopyDetails | null> {
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

  const payload = (await response.json()) as {
    copy: OfflineCopy & {
      borrowedByUser: OfflineBorrower | null;
      rack: OfflineRack | null;
    };
    book: OfflineBook | null;
    borrows: [];
  };

  const database = await getDatabase();

  if (payload.book) {
    await upsertBooks(database, [payload.book]);
  }

  if (payload.copy.rack) {
    await upsertRacks([payload.copy.rack]);
  }

  await upsertCopies(database, [
    {
      copyId: payload.copy.copyId,
      bookId: payload.copy.bookId,
      rackId: payload.copy.rackId,
      status: payload.copy.status,
      borrowedByUserId: payload.copy.borrowedByUserId,
      borrowedByUserName: payload.copy.borrowedByUser?.name ?? null,
      borrowedByUserEmail: payload.copy.borrowedByUser?.email ?? null,
      borrowedByUserRole: payload.copy.borrowedByUser?.role ?? null,
    },
  ]);

  return payload;
}
