import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Customer Account Dashboard</h1>
      <p className="mb-4 text-zinc-500">
        This is a protected page. Only authenticated users can see this.
      </p>

      <div className="flex gap-4">
        <Link href="/account/orders">
          <Button variant="default">View My Orders</Button>
        </Link>
        <Link href="/account/security">
          <Button variant="outline">Security Settings</Button>
        </Link>
      </div>
    </div>
  );
}
