"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/actions";
import type { AttachmentInput } from "@/lib/validations/task";
import { timeAgo } from "@/lib/utils";

export type AttachmentItem = {
  id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
  uploaded_by: string;
  uploader_name: string;
};

function formatBytes(n: number | null) {
  if (n === null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Files go straight from the browser to a private Storage bucket under
 * `{entityId}/…` (storage policies check access), then the record is saved
 * through a server action. Downloads use short-lived signed URLs.
 */
export function FileAttachments({
  bucket,
  entityId,
  items,
  currentUserId,
  canUpload,
  canDeleteAny,
  maxBytes,
  onRegister,
  onDelete,
  getUrl,
}: {
  bucket: string;
  entityId: string;
  items: AttachmentItem[];
  currentUserId: string;
  canUpload: boolean;
  canDeleteAny?: boolean;
  maxBytes: number;
  onRegister: (input: AttachmentInput) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
  getUrl: (path: string) => Promise<ActionResult<{ url: string }>>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList) {
    const supabase = createClient();
    for (const file of Array.from(files)) {
      if (file.size > maxBytes) {
        toast.error(`${file.name} is larger than ${formatBytes(maxBytes)}.`);
        continue;
      }
      setUploading(file.name);
      const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
      const path = `${entityId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (error) {
        toast.error(
          `${file.name}: ${error.message.includes("row-level security") ? "you cannot upload here" : "upload failed"}.`,
        );
        continue;
      }
      const res = await onRegister({
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      if (!res.ok) {
        await supabase.storage.from(bucket).remove([path]);
        toast.error(res.error);
      } else toast.success(`${file.name} attached.`);
    }
    setUploading(null);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  function open(path: string) {
    startTransition(async () => {
      const res = await getUrl(path);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await onDelete(id);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.message);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="size-4" /> No files yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-2.5">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{f.file_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatBytes(f.size_bytes)} · {f.uploader_name} ·{" "}
                  {timeAgo(f.created_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => open(f.storage_path)}
                disabled={pending}
                aria-label={`Download ${f.file_name}`}
              >
                <Download />
              </Button>
              {(f.uploaded_by === currentUserId || canDeleteAny) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(f.id)}
                  disabled={pending}
                  aria-label={`Remove ${f.file_name}`}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <>
          <input
            ref={input}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && void upload(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => input.current?.click()}
            loading={Boolean(uploading)}
          >
            <Upload /> {uploading ? `Uploading ${uploading}…` : "Attach files"}
          </Button>
        </>
      )}
    </div>
  );
}
