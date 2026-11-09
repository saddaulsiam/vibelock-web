import { Header } from "@/components/storefront/layout/header";
import { Footer } from "@/components/storefront/layout/footer";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen min-w-0 flex-col">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />

      <Header />
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
