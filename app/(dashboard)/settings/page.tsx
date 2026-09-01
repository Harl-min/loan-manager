"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  mailingAddress: string | null;
  emailVerified: boolean;
  remindPaymentDue: boolean;
  notifyPaymentPosted: boolean;
  notifySecurityAlerts: boolean;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState<"profile" | "prefs" | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ user: Profile }>("/profile").then((r) => setProfile(r.user));
  }, []);

  if (!profile) return <p className="text-sm text-muted">Loading…</p>;

  async function saveProfile() {
    if (!profile) return;
    setSaving("profile");
    await api.patch("/profile", {
      name: profile.name,
      phone: profile.phone ?? "",
      mailingAddress: profile.mailingAddress ?? "",
    });
    setSaving(null);
    setSavedMsg("Profile saved.");
    setTimeout(() => setSavedMsg(null), 2000);
  }

  async function savePrefs() {
    if (!profile) return;
    setSaving("prefs");
    await api.patch("/profile", {
      remindPaymentDue: profile.remindPaymentDue,
      notifyPaymentPosted: profile.notifyPaymentPosted,
      notifySecurityAlerts: profile.notifySecurityAlerts,
    });
    setSaving(null);
    setSavedMsg("Preferences saved.");
    setTimeout(() => setSavedMsg(null), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>

      <Card className="mt-6">
        <h2 className="font-semibold text-foreground">Profile</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input
            label="Full name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Email" value={profile.email} disabled />
            </div>
            {!profile.emailVerified && (
              <Button variant="secondary" trackLabel="Verify email" size="md">
                Verify
              </Button>
            )}
          </div>
          <Input
            label="Phone"
            value={profile.phone ?? ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          {/* <Input
            label="Mailing address"
            value={profile.mailingAddress ?? ""}
            onChange={(e) => setProfile({ ...profile, mailingAddress: e.target.value })}
          /> */}
        </div>
        <Button className="mt-4" trackLabel="Save changes" onClick={saveProfile} disabled={saving === "profile"}>
          {saving === "profile" ? "Saving…" : "Save changes"}
        </Button>
      </Card>


      <Card className="mt-6">
        <h2 className="font-semibold text-foreground">Alerts & Notifications</h2>
        <Toggle
          className="mt-4"
          label="Payment due reminders"
          description="Notify me a few days before my payment is due."
          checked={profile.remindPaymentDue}
          onChange={(v) => setProfile({ ...profile, remindPaymentDue: v })}
        />
        <Toggle
          className="mt-4"
          label="Payment posted"
          description="Confirm when a payment is received and posted."
          checked={profile.notifyPaymentPosted}
          onChange={(v) => setProfile({ ...profile, notifyPaymentPosted: v })}
        />
        <Toggle
          className="mt-4"
          label="Security alerts"
          description="Password changes and new device logins."
          checked={profile.notifySecurityAlerts}
          onChange={(v) => setProfile({ ...profile, notifySecurityAlerts: v })}
        />
        <Button className="mt-4" trackLabel="Save preferences" onClick={savePrefs} disabled={saving === "prefs"}>
          {saving === "prefs" ? "Saving…" : "Save preferences"}
        </Button>
      </Card>

      {savedMsg && <p className="mt-4 text-sm text-success">{savedMsg}</p>}
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
    <div className={`flex items-center justify-between ${className ?? ""}`}>
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted">{description}</div>
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
