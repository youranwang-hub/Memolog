import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ClientLayout } from "@/components/auth/client-layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memolog",
  description: "你的个人第二大脑",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background">
        <ClientLayout>{children}</ClientLayout>
        <Toaster />
      </body>
    </html>
  );
}
