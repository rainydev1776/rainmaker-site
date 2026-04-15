import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  isLoading: boolean;
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
}

const initialState: AppState = {
  isLoading: false,
  theme: "system",
  sidebarOpen: true,
};

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setTheme: (state, action: PayloadAction<AppState["theme"]>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
  },
  selectors: {
    selectIsLoading: (state) => state.isLoading,
    selectTheme: (state) => state.theme,
    selectSidebarOpen: (state) => state.sidebarOpen,
  },
});

export const { setLoading, setTheme, toggleSidebar, setSidebarOpen } =
  appSlice.actions;

export const { selectIsLoading, selectTheme, selectSidebarOpen } =
  appSlice.selectors;

