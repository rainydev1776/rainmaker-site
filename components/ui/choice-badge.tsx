"use client";

interface ChoiceBadgeProps {
  type: "yes" | "no";
  team: string;
}

const styles = {
  yes: {
    borderRadius: "8px",
    background: "rgba(14, 165, 233, 0.10)",
    boxShadow: "0 1px 0 0 rgba(14, 165, 233, 0.10) inset",
    color: "#0EA5E9",
  },
  no: {
    borderRadius: "8px",
    background: "rgba(255, 0, 102, 0.10)",
    boxShadow: "0 1px 0 0 rgba(255, 0, 102, 0.10) inset",
    color: "#FF0066",
  },
} as const;

export const ChoiceBadge = ({ type, team }: ChoiceBadgeProps) => (
  <span
    className="inline-flex items-center px-3 py-2 text-sm font-medium"
    style={styles[type]}
  >
    {type === "yes" ? "Yes" : "No"} • {team}
  </span>
);

