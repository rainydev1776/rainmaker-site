import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { appSlice } from "@/features/app/appSlice";

const rootReducer = combineReducers({
  app: appSlice.reducer,
});

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types for serializable check (useful for Firestore timestamps)
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
      }),
    devTools: process.env.NODE_ENV !== "production",
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
