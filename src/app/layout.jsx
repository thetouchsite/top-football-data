import "../index.css";
import Providers from "./providers";

export const metadata = {
  title: "Top Football Pulse",
  description: "Dashboard calcio con Next.js, API Node.js e MongoDB.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
