"use client";

import { useState } from "react";
import { updateAvatar } from "@/app/(dashboard)/forum/actions";
import { DeskAvatar } from "@/components/laniakea/DeskAvatar";
import { createClient } from "@/lib/supabase/client";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUpload({
  name,
  url,
}: {
  name: string;
  url?: string | null;
}) {
  const [preview, setPreview] = useState(url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Use JPEG, PNG, WebP, or GIF.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("Pictures must be 5 MB or smaller.");
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { data: session } = await supabase.auth.getUser();
    const userId = session.user?.id;

    if (!userId) {
      setPending(false);
      setError("Sign in to upload a picture.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${ext}`;
    const upload = await supabase.storage
      .from("research-media")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (upload.error) {
      setPending(false);
      setError(
        upload.error.message.includes("Bucket not found") ||
          upload.error.message.includes("not found")
          ? "Image storage is missing. Run the forum SQL in Supabase."
          : upload.error.message.includes("row-level security")
            ? "Storage update is blocked. Run the profile-picture SQL in Supabase."
            : upload.error.message
      );
      return;
    }

    const { data } = supabase.storage.from("research-media").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
    const result = await updateAvatar(publicUrl);

    if (result.error) {
      setPending(false);
      setError(result.error);
      return;
    }

    setPreview(publicUrl);
    setMessage(result.message ?? "Picture saved.");
    setPending(false);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <DeskAvatar url={preview} name={name} size="lg" />
      <div className="min-w-0">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground">
          <input
            type="file"
            accept={ACCEPT}
            disabled={pending}
            onChange={onChange}
            className="sr-only"
          />
          <span className="rounded-md border border-border px-2.5 py-1 text-[12px]">
            {pending ? "Uploading…" : preview ? "Change picture" : "Add picture"}
          </span>
        </label>
        {error ? (
          <p className="mt-1 text-[12px] text-loss">{error}</p>
        ) : message ? (
          <p className="mt-1 text-[12px] text-gain">{message}</p>
        ) : (
          <p className="mt-1 text-[12px] text-muted-foreground">
            JPEG, PNG, WebP, or GIF. 5 MB max.
          </p>
        )}
      </div>
    </div>
  );
}
