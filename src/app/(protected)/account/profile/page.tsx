import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/authorization";
import { ProfileForm } from "@/components/account/profile-form";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export const metadata: Metadata = { title: "Profile | VibeLock", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-2xl">
        <Link href="/account" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#101114]"><ArrowLeft className="size-4" /> Back to account</Link>
        <header className="mb-8 border-b border-[#101114]/15 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Customer area</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">Update the name used on your VibeLock account.</p>
        </header>
        <div className="border border-[#101114]/10 bg-white p-5 sm:p-6">
          <ProfileForm initialName={user.name ?? ""} />
          <p className="mt-5 text-xs leading-5 text-muted-foreground">Email changes are not available here because this account uses the existing verification and authentication flow.</p>
        </div>
      </Container>
    </Section>
  );
}
