"use client";

import * as React from "react";
import { useLayoutEffect, useRef, useState, useCallback } from "react";

export interface TabStyle {
  background: string;
  boxShadow?: string;
  borderRadius?: string;
  textColor?: string;
}

export interface AnimatedTabsProps {
  tabs: {
    label: string;
    value?: string;
    style?: TabStyle;
    icon?: React.ReactNode;
  }[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function AnimatedTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
}: AnimatedTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(
    value || defaultValue || tabs[0]?.value || tabs[0]?.label
  );

  // Use controlled value if provided, otherwise use internal state
  const activeTab = value !== undefined ? value : internalActiveTab;
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const activeTabData = tabs.find(
    (tab) => (tab.value || tab.label) === activeTab
  );
  const activeStyle = activeTabData?.style || {
    background: "#0EA5E9",
    borderRadius: "8px",
  };

  const updateClipPath = useCallback(() => {
    const container = containerRef.current;
    const activeTabElement = activeTabRef.current;

    if (container && activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement;
      const containerWidth = container.offsetWidth;

      if (containerWidth > 0) {
        const clipRight =
          100 - ((offsetLeft + offsetWidth) / containerWidth) * 100;
        const clipLeft = (offsetLeft / containerWidth) * 100;

        container.style.clipPath = `inset(0 ${clipRight.toFixed(
          1
        )}% 0 ${clipLeft.toFixed(1)}% round 20px)`;
      }
    }
  }, []);

  useLayoutEffect(() => {
    updateClipPath();
  }, [activeTab, tabs.length, updateClipPath]);

  const handleTabClick = (tab: { label: string; value?: string }) => {
    const tabValue = tab.value || tab.label;
    setInternalActiveTab(tabValue);
    onValueChange?.(tabValue);
  };

  const getTabValue = (tab: { label: string; value?: string }) =>
    tab.value || tab.label;

  return (
    <div className="relative flex w-full">
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 z-10 flex overflow-hidden [clip-path:inset(0px_50%_0px_0%_round_20px)] [transition:clip-path_0.25s_ease,background_0.25s_ease,box-shadow_0.25s_ease]"
        style={{
          background: activeStyle.background,
          boxShadow: activeStyle.boxShadow,
          borderRadius: activeStyle.borderRadius,
        }}
      >
        {tabs.map((tab, index) => (
          <div
            key={index}
            className="flex h-9 flex-1 items-center justify-center gap-2 text-sm font-medium text-center"
            style={{ color: activeStyle.textColor || "#fff" }}
          >
            {tab.icon}
            {tab.label}
          </div>
        ))}
      </div>

      {tabs.map((tab, index) => {
        const isActive = activeTab === getTabValue(tab);

        return (
          <button
            key={index}
            ref={isActive ? activeTabRef : null}
            onClick={() => handleTabClick(tab)}
            className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 text-sm font-medium text-[#757575] text-center"
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
