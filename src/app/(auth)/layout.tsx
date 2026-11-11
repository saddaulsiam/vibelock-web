export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-vl-dark-900 text-vl-white-300 antialiased selection:bg-vl-cyan selection:text-vl-dark-900">
      {children}
    </div>
  );
}
