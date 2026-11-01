import { requireRole } from "@/lib/auth/authorization";

export const metadata = {
  title: "POS Counter | VibeLock",
  description: "In-store physical retail Point of Sale billing counter",
};

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  // Enforces at least STAFF role (Staff, Manager, or Admin)
  await requireRole("STAFF");

  return <div className="h-screen w-screen overflow-hidden bg-[#f2f2f2] text-vl-black font-sans antialiased">{children}</div>;
}

