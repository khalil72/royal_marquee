import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export function NotFoundState({
  title = "Booking not found",
  backHref = "/bookings",
  backLabel = "Back to bookings",
}: {
  title?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <EmptyState
      icon={SearchX}
      title={title}
      description="It may have been deleted, or the link is incorrect."
      action={
        <Button asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      }
    />
  );
}
