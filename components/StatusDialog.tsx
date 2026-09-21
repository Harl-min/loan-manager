"use client";

import Button from "@/components/ui/Button";

type StatusDialogProps = {
  open: boolean;
  type: "success" | "error";
  title?: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
};

export default function StatusDialog({
  open,
  type,
  title,
  message,
  buttonText = "Close",
  onClose,
}: StatusDialogProps) {
  if (!open) return null;

  const isSuccess = type === "success";

  const defaultTitle = isSuccess
    ? "Success"
    : "Service Unavailable";

  const defaultMessage = isSuccess
    ? "Your request was completed successfully."
    : "Unable to complete your request. Please try again.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-brand bg-background p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-dialog-title"
      >
        {/* Icon */}
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            isSuccess ? "bg-primary/10" : "bg-warning/10"
          }`}
        >
          {isSuccess ? (
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
          ) : (
            <span className="text-xl font-bold text-warning">!</span>
          )}
        </div>

        {/* Content */}
        <div className="text-center">
          <h2
            id="status-dialog-title"
            className="text-xl font-bold text-foreground"
          >
            {title ?? defaultTitle}
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            {message ?? defaultMessage}
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
