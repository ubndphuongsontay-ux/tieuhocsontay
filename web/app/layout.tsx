import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Shell } from "@/components/Shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Tổng quan · Tiểu học Sơn Tây",
    template: "%s · Tiểu học Sơn Tây",
  },
  description: "Hệ thống quản lý nhà trường — Trường Tiểu học Sơn Tây, bảy phân hiệu.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  return (
    <html lang="vi" className={cn(sans.variable, "h-full antialiased")}>
      <body className="min-h-full font-sans">
        <TooltipProvider>
          {session ? <Shell>{children}</Shell> : children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
