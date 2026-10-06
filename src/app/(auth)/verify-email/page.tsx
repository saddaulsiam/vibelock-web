import { verifyEmailAction } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface VerifyEmailPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const token =
    typeof resolvedSearchParams.token === "string" ? resolvedSearchParams.token : undefined;

  if (!token) {
    redirect("/login");
  }

  const result = await verifyEmailAction({ token });

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
        <CardDescription>
          {result.success
            ? "Your email has been verified successfully."
            : "There was a problem verifying your email."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        {result.success ? (
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        ) : (
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
        )}
        <p className="text-center text-sm text-muted-foreground mt-2">
          {result.error || "You can now safely close this window or return to the login page."}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        {result.success ? (
          <Link href="/login" className="w-full">
            <Button className="w-full">Return to Login</Button>
          </Link>
        ) : (
          <Link href="/resend-verification" className="w-full">
            <Button className="w-full" variant="outline">
              Request New Verification Link
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
