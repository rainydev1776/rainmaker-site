/**
 * Shared style constants used across the application
 * Centralizes repeated style patterns for consistency and easier maintenance
 */

// Colors
export const colors = {
  // Primary brand colors
  cyan: "#0EA5E9",
  green: "#0EE957",
  pink: "#FF0066",

  // Background colors
  bgDark: "#0D0D0F",
  bgCard: "#141416",
  bgPanel: "#0E0E10",

  // Border colors
  borderSubtle: "#2A2A2A",
  borderDark: "#292929",

  // Text colors
  textMuted: "#757575",
} as const;

// Commonly used style objects
export const cardStyles = {
  /** Main card background with gradient and inset shadow */
  default: {
    background:
      "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
  },

  /** Card with double ring border */
  outlined: {
    borderRadius: "12px",
    background:
      "linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.02) 100%), #0D0D0F",
    boxShadow: "0 0 0 1px #292929, 0 0 0 2px #0A0A0A",
  },

  /** Table/list container */
  table: {
    background: "#141416",
    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
  },
} as const;

export const inputStyles = {
  /** Default input field styling */
  default: {
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.02)",
    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
  },
} as const;

export const buttonStyles = {
  /** Primary action button (cyan) */
  primary: {
    borderRadius: "124px",
    background: "#0EA5E9",
    boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
  },

  /** Secondary/subtle button */
  secondary: {
    background: "rgba(255, 255, 255, 0.02)",
    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
  },

  /** Share PNL button */
  share: {
    background: "#121214",
    boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
  },
} as const;

// Table header style
export const tableHeaderStyle = {
  background: "#141416",
  boxShadow: "inset 0 -1px 0 0 #FFFFFF05, 0 1px 0 0 #2A2A2A",
} as const;

// Choice row background
export const choiceRowStyle = {
  background:
    "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
} as const;

