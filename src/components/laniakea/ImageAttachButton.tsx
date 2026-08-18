"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 5 * 1024 * 1024;

export function ImageAttachButton({
  onInsert,
  disabled = false,
}: {
  onInsert: (markdown: string) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
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
      setError("Images must be 5 MB or smaller.");
      return;
    }

    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data: session } = await supabase.auth.getUser();
    const userId = session.user?.id;

    if (!userId) {
      setPending(false);
      setError("Sign in to attach images.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage
      .from("research-media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upload.error) {
      setPending(false);
      setError(
        upload.error.message.includes("Bucket not found") ||
          upload.error.message.includes("not found")
          ? "Image storage is missing. Run the forum SQL in Supabase."
          : upload.error.message
      );
      return;
    }

    const { data } = supabase.storage.from("research-media").getPublicUrl(path);
    onInsert(`\n![${file.name.replace(/[[\]]/g, "")}](${data.publicUrl})\n`);
    setPending(false);
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground">
      <input
        type="file"
        accept={ACCEPT}
        disabled={disabled || pending}
        onChange={onChange}
        className="sr-only"
      />
      <span className="rounded-md border border-border px-2.5 py-1 text-[12px]">
        {pending ? "Uploading…" : "Add image"}
      </span>
      {error ? <span className="text-[12px] text-loss">{error}</span> : null}
    </label>
  );
}
