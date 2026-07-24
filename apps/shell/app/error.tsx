"use client";
import { ErrorScreen } from "@makeup/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen reset={reset} />;
}
