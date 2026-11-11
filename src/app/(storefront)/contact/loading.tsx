import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContactLoading() {
  return (
    <div
      role="status"
      aria-label="Loading contact interface"
      className="flex flex-col bg-vl-white-300 text-vl-dark-900"
    >
      {/* ── 1. Hero Header Banner Skeleton ── */}
      <section className="relative overflow-hidden border-b border-white/10 bg-vl-dark-900 pt-24 pb-16 text-vl-white-300 sm:pt-28 sm:pb-20">
        <Container className="relative z-10">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full bg-vl-cyan/60" />
              <Skeleton className="h-3.5 w-48 bg-white/10" />
            </div>
            <Skeleton className="h-10 w-3/4 bg-white/15 sm:h-12" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full bg-white/10" />
              <Skeleton className="h-4 w-4/5 bg-white/10" />
            </div>
          </div>
        </Container>
      </section>

      {/* ── 2. Split Contact Interface Skeleton ── */}
      <section className="py-14 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
            {/* Left Column: Direct Touchpoints & Store Location (Col 5) */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Card 1: Direct Hotline & Channels */}
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm space-y-5">
                <div className="space-y-1.5 border-b border-vl-dark-900/10 pb-4">
                  <Skeleton className="h-3 w-32 bg-vl-dark-900/10" />
                  <Skeleton className="h-5 w-40 bg-vl-dark-900/10" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="size-8 shrink-0 rounded-lg bg-vl-dark-900/10" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3.5 w-24 bg-vl-dark-900/10" />
                        <Skeleton className="h-4 w-48 bg-vl-dark-900/10" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Physical Flagship Outlet */}
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm space-y-4">
                <Skeleton className="h-3 w-32 bg-vl-dark-900/10" />
                <Skeleton className="h-5 w-44 bg-vl-dark-900/10" />
                <Skeleton className="h-4 w-full bg-vl-dark-900/10" />
                <Skeleton className="h-4 w-2/3 bg-vl-dark-900/10" />
              </div>
            </div>

            {/* Right Column: Contact Form Skeleton (Col 7) */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 space-y-6">
                <div className="space-y-1.5 border-b border-vl-dark-900/10 pb-4">
                  <Skeleton className="h-3 w-28 bg-vl-dark-900/10" />
                  <Skeleton className="h-6 w-48 bg-vl-dark-900/10" />
                  <Skeleton className="h-3.5 w-64 bg-vl-dark-900/10" />
                </div>

                {/* Form Fields Grid */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-20 bg-vl-dark-900/10" />
                      <Skeleton className="h-10 w-full rounded-xs bg-vl-dark-900/10" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-24 bg-vl-dark-900/10" />
                      <Skeleton className="h-10 w-full rounded-xs bg-vl-dark-900/10" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28 bg-vl-dark-900/10" />
                    <Skeleton className="h-10 w-full rounded-xs bg-vl-dark-900/10" />
                  </div>

                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24 bg-vl-dark-900/10" />
                    <Skeleton className="h-10 w-full rounded-xs bg-vl-dark-900/10" />
                  </div>

                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-20 bg-vl-dark-900/10" />
                    <Skeleton className="h-28 w-full rounded-xs bg-vl-dark-900/10" />
                  </div>

                  <Skeleton className="h-11 w-full rounded-full bg-vl-dark-900/15 sm:w-44" />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

