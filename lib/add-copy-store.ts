import { create } from "zustand";

export type CopyBook = {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  description: string;
};

export type CopyRack = {
  rackId: string;
  room: string;
  cupboard: string;
  rack: string;
  description: string | null;
};

type CopyStoreState = {
  copyId: string;
  selectedBook: CopyBook | null;
  selectedRack: CopyRack | null;
  pendingRackId: string | null;
  initialIsbn: string | null;
  setCopyId: (copyId: string) => void;
  setSelectedBook: (book: CopyBook | null) => void;
  setSelectedRack: (rack: CopyRack | null) => void;
  setPendingRackId: (rackId: string | null) => void;
  setInitialIsbn: (isbn: string | null) => void;
  reset: () => void;
};

const createInitialState = () => ({
  copyId: "",
  selectedBook: null,
  selectedRack: null,
  pendingRackId: null,
  initialIsbn: null,
});

export const useCopyStore = create<CopyStoreState>((set) => ({
  ...createInitialState(),
  setCopyId: (copyId) => set({ copyId }),
  setSelectedBook: (selectedBook) => set({ selectedBook }),
  setSelectedRack: (selectedRack) => set({ selectedRack }),
  setPendingRackId: (pendingRackId) => set({ pendingRackId }),
  setInitialIsbn: (initialIsbn) => set({ initialIsbn }),
  reset: () => set(createInitialState()),
}));
