"use client";

import { useEffect, useState } from "react";

type ApiErrorDialogProps = {
  open: boolean;
  message?: string;
};

export default function ApiErrorDialog({
  open,
  message = "Unable to connect to the loan service. Please check your internet connection and try again.",
}: ApiErrorDialogProps) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-error-title"
        className="w-full max-w-md rounded-brand bg-surface p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
            !
          </div>

          <div>
            <h2
              id="api-error-title"
              className="font-semibold text-foreground"
            >
              Service Unavailable
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}