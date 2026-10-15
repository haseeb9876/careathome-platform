"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SubmitButton({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
    >
      {pending && <LoaderCircle size={16} className="spin" />}
      {pending ? "Saving…" : children}
    </Button>
  );
}
