import Link from "next/link";
import { Container } from "@/components/shared/container";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t">
      <Container>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 py-12">
          {/* Brand & Info */}
          <div className="flex flex-col space-y-4">
            <Link href="/" className="font-bold text-xl tracking-tight">
              VibeLock
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Bangladesh men&apos;s streetwear brand for modern Dhaka youth. Minimal, confident, and
              premium.
            </p>
          </div>

          {/* Shop */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-sm">Shop</h4>
            <nav className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <Link href="/collections/men" className="hover:text-foreground transition-colors">
                Men
              </Link>
              <Link
                href="/collections/new-arrivals"
                className="hover:text-foreground transition-colors"
              >
                New Arrivals
              </Link>
              <Link
                href="/collections/clothing"
                className="hover:text-foreground transition-colors"
              >
                Clothing
              </Link>
              <Link
                href="/collections/footwear"
                className="hover:text-foreground transition-colors"
              >
                Footwear
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-sm">Support</h4>
            <nav className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <Link href="/faq" className="hover:text-foreground transition-colors">
                FAQ
              </Link>
              <Link href="/shipping" className="hover:text-foreground transition-colors">
                Shipping & Returns
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact Us
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-sm">Contact</h4>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <p>Website: vibelock.com.bd</p>
              <p>Mobile: 01311333277</p>
              <p>Address: Thana More, Chatmohar, Pabna</p>
            </div>
          </div>
        </div>

        <div className="border-t py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {currentYear} VibeLock. All rights reserved.</p>
          <div className="flex space-x-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
