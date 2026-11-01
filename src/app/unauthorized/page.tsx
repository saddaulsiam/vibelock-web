import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <ShieldAlert className="text-destructive mb-4 h-16 w-16" />
      <h1 className="font-heading text-vl-black mb-2 text-3xl font-black">403 - Forbidden</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        You do not have permission to access this page. If you believe this is an error, please
        contact support or check your account level.
      </p>
      <Link href="/">
        <Button variant="brand" className="font-heading font-bold tracking-wider uppercase">
          Return to Home
        </Button>
      </Link>
    </div>
  );
}
