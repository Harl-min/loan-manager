// components/DisableContextMenu.tsx
"use client";

import { useEffect } from "react";

export default function DisableContextMenu() {
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    // F12
    if (e.key === "F12") e.preventDefault();
    // Ctrl+Shift+I / J / C
    if (
      e.ctrlKey &&
      e.shiftKey &&
      ["I", "J", "C"].includes(e.key.toUpperCase())
    ) {
      e.preventDefault();
    }
    // Ctrl+U (view source)
    if (e.ctrlKey && e.key.toLowerCase() === "u") e.preventDefault();
  };

  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, []);

useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);


  return null;
}