import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 relative">
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="font-bold text-2xl tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          VibeLock
        </Link>
      </div>
      {children}
    </div>
  );
}
