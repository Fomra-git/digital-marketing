"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/actions";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];

/**
 * Uploads a logo / photo directly from the browser to the public "branding"
 * bucket (storage policies decide who may write where), then saves the URL on
 * the record through a server action.
 */
export function ImageUpload({
  organizationId,
  kind,
  entityId,
  name,
  currentUrl,
  onSaved,
  disabled,
  round,
}: {
  organizationId: string;
  kind: "companies" | "projects" | "avatars" | "organization";
  entityId: string;
  name: string;
  currentUrl: string | null;
  onSaved: (url: string | null) => Promise<ActionResult>;
  disabled?: boolean;
  round?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!TYPES.includes(file.type))
      return toast.error("Use a PNG, JPG, WEBP, SVG or GIF image.");
    if (file.size > MAX_BYTES)
      return toast.error("Images must be 5 MB or smaller.");
    setBusy(true);
    try {
      const supabase = createClient();
      const ext =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "png";
      const path = `${organizationId}/${kind}/${entityId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (error) {
        toast.error(
          error.message.includes("row-level security")
            ? "You do not have permission to upload here."
            : "Upload failed. Please try again.",
        );
        return;
      }
      const publicUrl = supabase.storage.from("branding").getPublicUrl(path)
        .data.publicUrl;
      const res = await onSaved(publicUrl);
      if (!res.ok) toast.error(res.error);
      else {
        setUrl(publicUrl);
        toast.success(res.message ?? "Image updated.");
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    const res = await onSaved(null);
    setBusy(false);
    if (!res.ok) toast.error(res.error);
    else {
      setUrl(null);
      toast.success("Image removed.");
    }
  }

  return (
    <div className="flex items-center gap-4">
      <EntityAvatar
        name={name}
        src={url}
        square={!round}
        className="size-16 text-lg"
      />
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept={TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={busy}
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <ImagePlus /> {url ? "Replace" : "Upload"}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || busy}
            onClick={remove}
          >
            <Trash2 /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
