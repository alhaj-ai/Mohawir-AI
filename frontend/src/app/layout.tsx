import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منظومة مُحاوِر الذكية | منصة المقابلات والتوظيف بالذكاء الاصطناعي",
  description: "المنصة العربية الرائدة لمحاكاة المقابلات الوظيفية بالذكاء الاصطناعي متعدد الوكلاء لسوق العمل في الخليج والشرق الأوسط",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
