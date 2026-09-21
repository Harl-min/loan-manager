"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StatusDialog from "@/components/StatusDialog";

const ACCT_URL = process.env.NEXT_PUBLIC_NEXT_DATA_AUTH_URL;

type Profile = {
  // Fields used by the form
  name: string;
  email: string;
  phone: string | null;
  mailingAddress: string | null;

  // Notification prefs (kept local for now)
  remindPaymentDue: boolean;
  notifyPaymentPosted: boolean;
  notifySecurityAlerts: boolean;

  // Extra fields returned by the new API (optional)
  id?: number;
  profile?: string;
  customer_no?: string;
  is_verified?: boolean;
  created_at?: string;
};

export default function SettingsPage() {
  const { data: session, status } = useSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState<"profile" | "prefs" | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const getAccessToken = () => {
    return (
      (session as any)?.accessToken ||
      (session as any)?.access_token ||
      (session as any)?.token ||
      undefined
    ) as string | undefined;
  };

  // ------------------------------------------------------------
  // LOAD PROFILE – runs only when we actually have a stable session
  // ------------------------------------------------------------
  useEffect(() => {
    // Wait until NextAuth has finished loading
    if (status !== "authenticated") return;
    if (!session?.user?.email) return;
    const user = session.user;

    const token = getAccessToken();
    if (!token) {
      console.warn(
        "No accessToken on session. Update the session callback in auth.ts and re-login.",
      );
      setProfile({
        name: user.name ?? "",
        email: user.email ?? "",
        phone: null,
        mailingAddress: null,
        remindPaymentDue: false,
        notifyPaymentPosted: false,
        notifySecurityAlerts: false,
      });
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch(`${ACCT_URL}api/v1/auth/profile`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data = await response.json();
        console.log("GET /api/v1/auth/profile response:", data);

        if (cancelled) return; // ignore late responses

        if (!response.ok) {
          throw new Error(
            data?.detail || data?.message || "Failed to load profile",
          );
        }

        setProfile({
          name: data.full_name ?? user.name ?? "",
          email: data.email ?? user.email ?? "",
          phone: data.phone_number ?? null,
          mailingAddress: null,
          remindPaymentDue: false,
          notifyPaymentPosted: false,
          notifySecurityAlerts: false,
          id: data.id,
          profile: data.profile,
          customer_no: data.customer_no,
          is_verified: data.is_verified,
          created_at: data.created_at,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load profile:", error);

        setProfile({
          name: user.name ?? "",
          email: user.email ?? "",
          phone: null,
          mailingAddress: null,
          remindPaymentDue: false,
          notifyPaymentPosted: false,
          notifySecurityAlerts: false,
        });
      }
    }

    loadProfile();

    return () => {
      cancelled = true; // prevent state updates after unmount / re-run
    };
  }, [
    status,
    session?.user?.email,
    // only re-run if the actual token value changes
    (session as any)?.accessToken,
  ]);

  const [statusDialog, setStatusDialog] = useState<{
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  buttonText: string;
}>({
  open: false,
  type: "error",
  title: "",
  message: "",
  buttonText: "Close",
});

const closeStatusDialog = () => {
  setStatusDialog((prev) => ({ ...prev, open: false }));
};

  if (!profile) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  // ------------------------------------------------------------
  // SAVE PROFILE (full_name + phone_number only)
  // ------------------------------------------------------------
 async function saveProfile() {
  if (!profile) return;

  setSaving("profile");

  try {
    const token = getAccessToken();

    if (!token) {
      throw new Error("No access token available. Please log in again.");
    }

    const payload = {
      full_name: profile.name,
      phone_number: profile.phone ?? "",
    };

    console.log("PUT /api/v1/auth/profile payload:", payload);

    const response = await fetch(`${ACCT_URL}api/v1/auth/profile`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    console.log("PUT /api/v1/auth/profile response:", data);

    if (!response.ok) {
      throw new Error(
        data?.detail || data?.message || "Failed to save profile",
      );
    }

    if (data?.full_name || data?.phone_number) {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: data.full_name ?? prev.name,
              phone: data.phone_number ?? prev.phone,
            }
          : prev,
      );
    }

    setStatusDialog({
      open: true,
      type: "success",
      title: "Profile updated",
      message:
        data?.message || "Your profile has been saved successfully.",
      buttonText: "Done",
    });
  } catch (error: any) {
    console.error("Failed to save profile:", error);
    setStatusDialog({
      open: true,
      type: "error",
      title: "Update failed",
      message:
        error?.message ||
        "Unable to save your profile. Please try again.",
      buttonText: "Close",
    });
  } finally {
    setSaving(null);
  }
}

// ------------------------------------------------------------
// SAVE PREFERENCES
// ------------------------------------------------------------
async function savePrefs() {
  if (!profile) return;

  setSaving("prefs");

  try {
    console.log("Saving preferences (local only for now):", {
      remindPaymentDue: profile.remindPaymentDue,
      notifyPaymentPosted: profile.notifyPaymentPosted,
      notifySecurityAlerts: profile.notifySecurityAlerts,
    });

    setStatusDialog({
      open: true,
      type: "success",
      title: "Preferences saved",
      message: "Your notification preferences have been saved.",
      buttonText: "Done",
    });
  } catch (error: any) {
    console.error("Failed to save preferences:", error);
    setStatusDialog({
      open: true,
      type: "error",
      title: "Save failed",
      message:
        error?.message ||
        "Unable to save preferences. Please try again.",
      buttonText: "Close",
    });
  } finally {
    setSaving(null);
  }
}

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-primary">Profile & Settings</h1>

      {/* PROFILE CARD */}
      <Card className="mt-6">
        <h2 className="font-semibold text-primary">Profile</h2>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input
            label="Full name"
            value={profile.name}
            onChange={(e) =>
              setProfile({
                ...profile,
                name: e.target.value,
              })
            }
          />

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Email" value={profile.email} disabled />
            </div>
          </div>

          <Input
            label="Phone"
            value={profile.phone ?? ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                phone: e.target.value,
              })
            }
          />
        </div>

        <Button
          className="mt-4"
          trackLabel="Save changes"
          onClick={saveProfile}
          disabled={saving === "profile"}
        >
          {saving === "profile" ? "Saving…" : "Save changes"}
        </Button>
      </Card>

      {/* ALERTS & NOTIFICATIONS */}
      <Card className="mt-6">
        <h2 className="font-semibold text-primary">Alerts & Notifications</h2>

        <Toggle
          className="mt-4"
          label="Payment due reminders"
          description="Notify me a few days before my payment is due."
          checked={profile.remindPaymentDue}
          onChange={(v) =>
            setProfile({
              ...profile,
              remindPaymentDue: v,
            })
          }
        />

        <Toggle
          className="mt-4"
          label="Payment posted"
          description="Confirm when a payment is received and posted."
          checked={profile.notifyPaymentPosted}
          onChange={(v) =>
            setProfile({
              ...profile,
              notifyPaymentPosted: v,
            })
          }
        />

        <Toggle
          className="mt-4"
          label="Security alerts"
          description="Password changes and new device logins."
          checked={profile.notifySecurityAlerts}
          onChange={(v) =>
            setProfile({
              ...profile,
              notifySecurityAlerts: v,
            })
          }
        />

        <Button
          className="mt-4"
          trackLabel="Save preferences"
          onClick={savePrefs}
          disabled={saving === "prefs"}
        >
          {saving === "prefs" ? "Saving…" : "Save preferences"}
        </Button>
      </Card>

      {savedMsg && (
        <p className="mt-4 text-sm text-success">{savedMsg}</p>
      )}
      <StatusDialog
  open={statusDialog.open}
  type={statusDialog.type}
  title={statusDialog.title}
  message={statusDialog.message}
  buttonText={statusDialog.buttonText}
  onClose={closeStatusDialog}
/>
    </div>
    
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  className,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        className ?? ""
      }`}
    >
      <div>
        <div className="text-sm font-medium text-foreground">
          {label}
        </div>

        <div className="text-xs text-muted">
          {description}
        </div>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          data-track-label={`Toggle:${label}`}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="track" />
      </label>
    </div>
  );
}