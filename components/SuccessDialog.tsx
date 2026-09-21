"use client";

import Button from "@/components/ui/Button";

type SuccessDialogProps = {
  open: boolean;
  title?: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
};

export default function SuccessDialog({
  open,
  title = "Registration successful",
  message = "Your email has been verified successfully. You can now log in to your account.",
  buttonText = "Continue to Login",
  onClose,
}: SuccessDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-brand bg-background p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-dialog-title"
      >
        {/* Success Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2
            id="success-dialog-title"
            className="text-xl font-bold text-foreground"
          >
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            {message}
          </p>
        </div>

        {/* Action */}
        <div className="mt-6">
          <Button
            type="button"
            trackLabel={buttonText}
            className="w-full"
            onClick={onClose}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}

