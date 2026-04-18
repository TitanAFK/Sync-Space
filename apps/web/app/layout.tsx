import "./globals.css"; // This is the magic line that connects Tailwind
import { Providers } from "./providers";

export const metadata = {
  title: "Sync Space",
  description: "Collaborative Real-time Whiteboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}