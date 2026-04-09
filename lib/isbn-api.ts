export type BookLookupResult = {
  title?: string;
  authors?: string[];
  genre?: string;
  description?: string;
  publisher?: string;
};

export function normalizeIsbn(value: string) {
  return value.replace(/[^\dXx]/g, "").toUpperCase();
}

function pickFirstString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

async function lookupGoogleBooks(
  isbn: string,
): Promise<BookLookupResult | null> {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        authors?: string[];
        categories?: string[];
        description?: string;
        publisher?: string;
      };
    }>;
  };

  const volumeInfo = payload.items?.[0]?.volumeInfo;

  if (!volumeInfo?.title) {
    return null;
  }

  return {
    title: volumeInfo.title.trim(),
    authors: volumeInfo.authors?.map((author) => author.trim()).filter(Boolean),
    genre: volumeInfo.categories?.[0]?.trim(),
    description: pickFirstString(volumeInfo.description) ?? undefined,
    publisher: pickFirstString(volumeInfo.publisher) ?? undefined,
  };
}

async function lookupOpenLibrary(
  isbn: string,
): Promise<BookLookupResult | null> {
  const response = await fetch(
    `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`,
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    title?: string;
    description?: string | { value?: string };
    publishers?: string[];
    subjects?: string[];
    authors?: Array<{ key?: string }>;
  };

  const authorNames = await Promise.all(
    (payload.authors ?? [])
      .map((author) => author.key)
      .filter((key): key is string => Boolean(key))
      .slice(0, 5)
      .map(async (authorKey) => {
        const authorResponse = await fetch(
          `https://openlibrary.org${authorKey}.json`,
        );

        if (!authorResponse.ok) {
          return null;
        }

        const authorPayload = (await authorResponse.json()) as {
          name?: string;
        };
        return pickFirstString(authorPayload.name);
      }),
  );

  const authors = authorNames.filter((name): name is string => Boolean(name));
  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : payload.description?.value?.trim();

  if (!payload.title) {
    return null;
  }

  return {
    title: payload.title.trim(),
    authors: authors.length ? authors : undefined,
    genre: payload.subjects?.[0]?.trim(),
    description: description || undefined,
    publisher: payload.publishers?.[0]?.trim(),
  };
}

export async function lookupBookByIsbn(
  isbnInput: string,
): Promise<BookLookupResult | null> {
  const isbn = normalizeIsbn(isbnInput);

  if (!isbn) {
    return null;
  }

  const googleBooksResult = await lookupGoogleBooks(isbn);
  if (googleBooksResult) {
    return googleBooksResult;
  }

  return lookupOpenLibrary(isbn);
}
