import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SourceProvider } from "@/components/providers/SourceContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { cookies } from "next/headers";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrument = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "NEXA Watchtower | IDS Dashboard",
  description: "Next-generation Intrusion Detection System Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${instrument.variable} antialiased flex bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SourceProvider>
            <SidebarProvider defaultOpen={defaultOpen}>
              <AppSidebar />
              <main className="flex-1 min-w-0 flex flex-col">
                <Navbar />
                <div className="px-6 pb-8">{children}</div>
              </main>
            </SidebarProvider>
          </SourceProvider>
        </ThemeProvider>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            style: {
              background: "#0c0f17",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              borderRadius: "12px",
              padding: "14px 16px",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
            },
            classNames: {
              title: "text-sm font-semibold text-white",
              description: "text-xs !text-gray-200 mt-0.5 block",
              closeButton: "bg-transparent text-gray-400 hover:text-white border-0 hover:bg-slate-800 transition",
            },
          }}
        />
      </body>
    </html>
  );
}
