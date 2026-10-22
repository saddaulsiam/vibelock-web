import { Container } from "@/components/shared/container";
import { StorefrontNewsletterForm } from "./newsletter-form";

export function Newsletter() {
  return (
    <section className="relative border-y border-white/10 bg-[#070B0E] py-10 text-white sm:py-12">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          {/* Left Content */}
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
              STAY IN THE LOOP
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white uppercase sm:text-2xl lg:text-3xl">
              JOIN OUR NEWSLETTER
            </h2>
            <p className="mt-1 text-xs text-[#F3F0E8]/60">
              Be the first to know about new drops, exclusive offers and more.
            </p>
          </div>

          {/* Right Newsletter Subscription Form */}
          <StorefrontNewsletterForm />
        </div>
      </Container>
    </section>
  );
}
