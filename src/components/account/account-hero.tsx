interface AccountHeroProps {
  name: string | null;
}

export function AccountHero({ name }: AccountHeroProps) {
  // Extract first name or fallback to "BRO"
  const firstName = name?.trim() ? name.trim().split(" ")[0].toUpperCase() : "BRO";

  return (
    <section className="relative w-full overflow-hidden bg-[#0A0D10] text-[#F3F0E8] border-b border-white/10">
      {/* Background brutalist texture and cyan splatter accents */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen bg-cover bg-center"
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
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F3F0E8]/70">
              My Account
            </span>

            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl lg:text-6xl">
              Welcome Back,
              <span className="block mt-1 font-serif italic text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#00D9FF] drop-shadow-[0_0_25px_rgba(0,217,255,0.45)] tracking-normal">
                {firstName}
              </span>
            </h1>

            <p className="mt-4 text-sm font-medium text-[#F3F0E8]/80 sm:text-base">
              Your style. Your account. Your VibeLock.
            </p>
          </div>

          {/* Angled Tag — mobile-first, always visible */}
          <div className="-rotate-12 select-none z-10 hidden md:block">
            <span className="block font-black uppercase tracking-widest text-white/90 text-[10px] xs:text-xs sm:text-sm lg:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              STREETWEAR
            </span>
            <span className="block font-black uppercase tracking-widest text-[#00D9FF] text-[10px] xs:text-xs sm:text-sm lg:text-base drop-shadow-[0_2px_8px_rgba(0,217,255,0.6)]">
              FOR DHAKA
            </span>
            <span className="block font-black uppercase tracking-widest text-white/90 text-[10px] xs:text-xs sm:text-sm lg:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              YOUTH
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
