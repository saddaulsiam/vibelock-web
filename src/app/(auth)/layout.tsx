export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-vl-dark-900 text-vl-white-300 selection:bg-vl-cyan selection:text-vl-dark-900 min-h-screen antialiased">
      {children}
    </div>
  );
}
