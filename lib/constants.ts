/**
 * Application-wide constants
 */

export const APP_NAME = "Rainmaker";

export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
} as const;

/**
 * Animation variants for framer-motion
 * Use with LazyMotion's m component for tree-shaking
 */
export const MOTION_VARIANTS = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  fadeInDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  slideInLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  slideInRight: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },
  stagger: {
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
} as const;

/**
 * Default transition for animations
 */
export const MOTION_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

