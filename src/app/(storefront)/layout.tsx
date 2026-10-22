import { Header } from "@/components/storefront/layout/header";
import { Footer } from "@/components/storefront/layout/footer";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      {/* <AnnouncementBar /> */}
      <Header />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
