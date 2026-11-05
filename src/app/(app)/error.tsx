"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      title="This page could not be loaded"
      message="A temporary problem stopped this page from loading. Your data is safe. Try again in a moment."
      onRetry={retry}
    />
  );
}
