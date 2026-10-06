"use client";

import * as React from "react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { SectionHeading } from "@/components/storefront/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/storefront/product-card";
import { Separator } from "@/components/ui/separator";

const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Classic Charcoal Hoodie",
    slug: "classic-charcoal-hoodie",
    price: 2490,
    image: "/placeholder.jpg",
    badge: { label: "New", variant: "new" as const },
  },
  {
    id: "2",
    name: "Urban Oversized Tee",
    slug: "urban-oversized-tee",
    price: 1290,
    originalPrice: 1590,
    image: "/placeholder.jpg",
    badge: { label: "Sale", variant: "sale" as const },
  },
  {
    id: "3",
    name: "Minimalist Cargo Pants",
    slug: "minimalist-cargo-pants",
    price: 3200,
    image: "/placeholder.jpg",
  },
];

export default function DesignSystemShowcase() {
  return (
    <main className="flex-1">
      <Section className="bg-primary text-primary-foreground py-16 md:py-24">
        <Container>
          <div className="max-w-2xl space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              VibeLock Design System
            </h1>
            <p className="text-lg opacity-80">
              Phase 1B: Visual foundation for modern Dhaka youth streetwear.
            </p>
          </div>
        </Container>
      </Section>

      <Container className="space-y-24 py-12">
        {/* Colors */}
        <section>
          <SectionHeading
            title="Brand Colors"
            description="Core palette mapped to semantic tailwind tokens."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-24 rounded-md bg-brand-charcoal border shadow-sm"></div>
              <p className="text-sm font-medium">Deep Charcoal</p>
              <p className="text-xs text-muted-foreground">#101114</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-md bg-brand-offwhite border shadow-sm"></div>
              <p className="text-sm font-medium">Warm Off-White</p>
              <p className="text-xs text-muted-foreground">#F3F0E8</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 rounded-md bg-brand-cyan border shadow-sm"></div>
              <p className="text-sm font-medium">Accent Cyan</p>
              <p className="text-xs text-muted-foreground">#00D9FF</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Typography */}
        <section>
          <SectionHeading
            title="Typography"
            description="Clean, modern hierarchy using Inter font."
          />
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-5xl font-bold tracking-tight">Display Heading</h1>
              <p className="text-sm text-muted-foreground mt-1">
                text-5xl font-bold tracking-tight
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Section Heading</h2>
              <p className="text-sm text-muted-foreground mt-1">
                text-3xl font-semibold tracking-tight
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium tracking-tight">Component Heading</h3>
              <p className="text-sm text-muted-foreground mt-1">
                text-xl font-medium tracking-tight
              </p>
            </div>
            <div>
              <p className="text-base leading-7">
                Body text. The quick brown fox jumps over the lazy dog. Designed for excellent
                readability across all devices, maintaining a premium feel.
              </p>
              <p className="text-sm text-muted-foreground mt-1">text-base leading-7</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Components */}
        <section>
          <SectionHeading title="UI Primitives" description="Core interactive elements." />

          <div className="grid md:grid-cols-2 gap-12">
            {/* Buttons */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="default">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            {/* Inputs & Forms */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Inputs & Forms</h3>
              <div className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="hello@vibelock.com" />
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Badges</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Cards</h3>
              <Card>
                <CardHeader>
                  <CardTitle>Premium Fit</CardTitle>
                  <CardDescription>Designed for the urban landscape.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Content goes here. Card component abstracts away background, border, and
                    shadows.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Separator />

        {/* Storefront Previews */}
        <section>
          <SectionHeading
            title="Storefront Components"
            description="Presentational e-commerce components."
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {MOCK_PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
