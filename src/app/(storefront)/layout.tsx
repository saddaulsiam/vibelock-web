import { AnnouncementBar } from "@/components/storefront/layout/announcement-bar";
import { Header } from "@/components/storefront/layout/header";
import { Footer } from "@/components/storefront/layout/footer";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AnnouncementBar />
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
