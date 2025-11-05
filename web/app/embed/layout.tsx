"use client";

import type { Metadata } from "next";
import "../globals.css";
import "./embed.css";

// Minimal metadata for embed - no favicon/icons
// export const metadata: Metadata = {
//   title: "Chat",
//   description: "Customer support chat",
//   icons: {
//     icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💬</text></svg>",
//   },
// };

export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style jsx global>{`
        /* Add your global embed styles here */

        /* Example: Remove margins/padding */
        /* svg {
          display: none;
        } */

        /* Add more global styles as needed */
      `}</style>
      {children}
    </>
  );
}
