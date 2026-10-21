import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="text-foreground text-2xl font-bold tracking-tight transition-opacity hover:opacity-80"
        >
          VibeLock
        </Link>
      </div>
      {children}
    </div>
  );
}
