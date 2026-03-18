import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";

export const metadata = {
  title: "RealChat — Real-time Messaging",
  description: "A scalable real-time chat application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
        <footer className="mt-auto py-2 text-center text-dark-500 text-xs">
          RealChat — Conçu par Bazagod
        </footer>
      </body>
    </html>
  );
}
