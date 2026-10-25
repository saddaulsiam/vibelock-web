export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#101114] text-[#F3F0E8] antialiased selection:bg-[#00D9FF] selection:text-[#101114]">
      {children}
    </div>
  );
}
