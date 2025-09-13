"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        gap: "20px",
        padding: "20px",
        borderBottom: "1px solid #e1e4e8",
        backgroundColor: "var(--background)",
      }}
    >
      <Link
        href="/projects"
        style={{
          color: pathname === "/projects" ? "#0969da" : "#666",
          textDecoration: "none",
          fontWeight: pathname === "/projects" ? 600 : 400,
        }}
      >
        Projects
      </Link>
      <Link
        href="/settings"
        style={{
          color: pathname.startsWith("/settings") ? "#0969da" : "#666",
          textDecoration: "none",
          fontWeight: pathname.startsWith("/settings") ? 600 : 400,
        }}
      >
        Settings
      </Link>
    </nav>
  );
}
