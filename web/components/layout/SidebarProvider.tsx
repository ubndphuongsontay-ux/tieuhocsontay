"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";

const KEY = "st-sidebar-collapsed";
const EVT = "st-sidebar";

function subscribe(onChange: () => void) {
  window.addEventListener(EVT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

type SidebarCtx = {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
  toggleCollapsed: () => void;
};

const Ctx = createContext<SidebarCtx | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = useCallback((v: boolean) => {
    window.localStorage.setItem(KEY, v ? "1" : "0");
    window.dispatchEvent(new Event(EVT));
  }, []);

  return (
    <Ctx.Provider
      value={{
        collapsed,
        mobileOpen,
        setCollapsed,
        setMobileOpen,
        toggleCollapsed: () => setCollapsed(!collapsed),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
