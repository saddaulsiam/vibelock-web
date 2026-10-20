// import Image from "next/image";

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
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/images/Collection campaign background.png')" }}
        aria-hidden="true"
      />
      
      {/* Vibrant cyan atmospheric glow */}
      {/* <div 
        className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-[#00D9FF]/15 blur-3xl" 
        aria-hidden="true" 
      /> */}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col-reverse items-center justify-between gap-6 py-10 sm:py-12 md:flex-row lg:py-14">
          
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

          {/* Right Streetwear Model & Angled Tag */}
          <div className="relative flex w-full items-center justify-center md:w-auto md:justify-end">
            {/* Streetwear Dhaka Tag */}
            <div className="absolute -left-4 top-6 z-20 hidden -rotate-12 select-none sm:block md:-left-12 lg:-left-16">
              <span className="block font-black uppercase tracking-widest text-white/90 text-xs sm:text-sm lg:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                STREETWEAR
              </span>
              <span className="block font-black uppercase tracking-widest text-[#00D9FF] text-xs sm:text-sm lg:text-base drop-shadow-[0_2px_8px_rgba(0,217,255,0.6)]">
                FOR DHAKA
              </span>
              <span className="block font-black uppercase tracking-widest text-white/90 text-xs sm:text-sm lg:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                YOUTH
              </span>
            </div>

            {/* Model Image with cyan slash backdrop */}
            {/* <div className="relative h-64 w-64 sm:h-80 sm:w-80 lg:h-96 lg:w-96">
              <div 
                className="absolute inset-0 -rotate-6 scale-95 rounded-2xl bg-gradient-to-tr from-[#00D9FF]/30 to-transparent blur-md"
                aria-hidden="true" 
              />
              <Image
                src="/images/hero/hero-slide1.png"
                alt="VibeLock Streetwear Campaign Model"
                fill
                priority
                sizes="(max-width: 768px) 256px, (max-width: 1200px) 320px, 384px"
                className="rounded-2xl object-cover object-top drop-shadow-2xl"
              />
            </div> */}
          </div>

        </div>
      </div>
    </section>
  );
}
