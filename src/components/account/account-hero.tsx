interface AccountHeroProps {
  name: string | null;
}

export function AccountHero({ name }: AccountHeroProps) {
  // Extract first name or fallback to "BRO"
  const firstName = name?.trim() ? name.trim().split(" ")[0].toUpperCase() : "BRO";

  return (
    <section className="relative w-full overflow-hidden border-b border-white/10 bg-[#0A0D10] text-[#F3F0E8]">
      {/* Background brutalist texture and cyan splatter accents */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-50 mix-blend-screen"
        style={{ backgroundImage: "url('/images/hero/account-hero.png')" }}
        aria-hidden="true"
      />

      {/* Vibrant cyan atmospheric glow */}
      <div
        className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-[#00D9FF]/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-360 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col-reverse items-center justify-between gap-6 py-10 sm:py-12 md:flex-row lg:py-16">
          {/* Left Text Block */}
          <div className="z-10 flex w-full flex-col text-left md:max-w-xl">
            <span className="text-[11px] font-bold tracking-[0.25em] text-[#F3F0E8]/70 uppercase">
              My Account
            </span>

            <h1 className="font-heading mt-3 text-3xl font-black tracking-tight text-white uppercase sm:text-5xl lg:text-6xl">
              Welcome Back,
              <span className="mt-1 block font-serif text-4xl font-extrabold tracking-normal text-[#00D9FF] italic drop-shadow-[0_0_25px_rgba(0,217,255,0.45)] sm:text-6xl lg:text-7xl">
                {firstName}
              </span>
            </h1>

            <p className="mt-4 text-sm font-medium text-[#F3F0E8]/80 sm:text-base">
              Your style. Your account. Your VibeLock.
            </p>
          </div>

          {/* Angled Tag — mobile-first, always visible */}
          <div className="z-10 hidden -rotate-12 select-none md:block">
            <span className="xs:text-xs block text-[10px] font-black tracking-widest text-white/90 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-sm lg:text-base">
              STREETWEAR
            </span>
            <span className="xs:text-xs block text-[10px] font-black tracking-widest text-[#00D9FF] uppercase drop-shadow-[0_2px_8px_rgba(0,217,255,0.6)] sm:text-sm lg:text-base">
              FOR DHAKA
            </span>
            <span className="xs:text-xs block text-[10px] font-black tracking-widest text-white/90 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-sm lg:text-base">
              YOUTH
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
