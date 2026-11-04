import { Header } from "@/components/storefront/layout/header";
import { Footer } from "@/components/storefront/layout/footer";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen min-w-0 flex-col">
      {/* ── Full Website Dot Grid (z-20 দিয়ে সব হোয়াইট সেকশনের ওপরে দৃশ্যমান রাখা হয়েছে) ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px)",
          backgroundSize: "30px 30px",
        }}
        aria-hidden="true"
      />

      <Header />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
