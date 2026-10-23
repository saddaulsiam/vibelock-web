import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-vl-white relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:ring-offset-2"
          aria-label="VibeLock — go to homepage"
        >
          <Image
            src="/images/vibelock-logo.png"
            alt="VibeLock Emblem"
            width={32}
            height={32}
            className="h-auto w-auto object-contain"
          />
          <span className="font-heading text-xl font-black tracking-wider text-vl-black uppercase">
            VIBELOCK
          </span>
        </Link>
      </div>
      {children}
    </div>
  );
}
