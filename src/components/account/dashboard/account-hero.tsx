interface AccountHeroProps {
  name: string | null;
}

export function AccountHero({ name }: AccountHeroProps) {
  const firstName = name?.trim() ? name.trim().split(" ")[0] : null;

  return (
    <section className="relative w-full border-b border-white/10 bg-vl-dark-900 text-vl-white-300">
      <div className="relative mx-auto max-w-360 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 pt-18 pb-6 sm:pt-24 sm:pb-10 md:flex-row md:items-end">
          {/* Left Text Block */}
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-vl-cyan" />
              <span className="text-2xs sm:text-compact font-bold tracking-streetwear text-vl-white-300/60 uppercase">
                Account Portal
              </span>
            </div>

            <h1 className="mt-1.5 text-xl font-black tracking-tight text-white uppercase sm:text-2xl lg:text-3xl">
              Welcome, {firstName || "Member"}
            </h1>

            <p className="mt-0.5 text-xs text-vl-white-300/70 sm:text-sm">
              Manage your orders, saved addresses, and profile details.
            </p>
          </div>

          {/* Right Brand Stamp */}
          <div className="hidden text-right md:block">
            <span className="text-compact font-semibold tracking-widest text-vl-white-300/40 uppercase">
              VibeLock Official
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
