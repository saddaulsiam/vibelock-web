import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold tracking-tight">404</h2>
        <p className="text-muted-foreground text-lg">
          The page you are looking for does not exist.
        </p>
      </div>
      <Link href="/">
        <Button variant="default">Return to Home</Button>
      </Link>
    </div>
  );
}
