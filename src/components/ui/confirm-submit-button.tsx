"use client";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export function ConfirmSubmitButton({
  confirmMessage,
  children,
  variant = "danger",
  size = "sm",
  className,
  disabled,
}: {
  confirmMessage: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={buttonClasses(variant, size, className)}
      onClick={(event) => {
        if (!confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
