import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Fragment } from "@/generated/prisma";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type VisualPickPayload = { path: string; tag?: string };

interface FragmentWebProps {
  data: Fragment;
  /** Bumps iframe key so optimistic preview refreshes as files stream in. */
  bustKey?: number;
  /** Fired when preview posts LC_VISUAL_PICK (see /api/preview/bridge). */
  // eslint-disable-next-line no-unused-vars
  onVisualPick?: (payload: VisualPickPayload) => void;
}

const FragmentWeb = ({
  data,
  bustKey = 0,
  onVisualPick,
}: FragmentWebProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getSafeUrl = () => {
    const raw =
      (data.sandboxUrl && data.sandboxUrl.trim()) ||
      (data.persistentPreviewUrl && data.persistentPreviewUrl.trim()) ||
      "";
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol)) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  };

  const safeUrl = getSafeUrl();

  /** Cache-bust sandbox URL when `previewRev` bumps so the iframe reloads without remounting (keeps postMessage bridge stable). */
  const iframeSrc = useMemo(() => {
    if (!safeUrl) return undefined;
    if (bustKey == null || bustKey <= 0) return safeUrl;
    try {
      const u = new URL(safeUrl);
      u.searchParams.set("_lc_rev", String(bustKey));
      return u.toString();
    } catch {
      return undefined;
    }
  }, [safeUrl, bustKey]);

  useEffect(() => {
    if (!onVisualPick) return;
    const handler = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const p = e.data as { type?: string; path?: string; tag?: string };
      if (p?.type === "LC_VISUAL_PICK" && p.path) {
        onVisualPick({ path: p.path, tag: p.tag });
        toast.message(`Selected: ${p.path}`);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onVisualPick]);

  const [fragmentKey, setFragmentKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const onRefresh = () => {
    setFragmentKey((prev) => prev + 1);
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(safeUrl || "")
      .then(() => {
        setCopied(true);
        toast.success("Link copied");
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch(() => {
        toast.error("Something went wrong. Please try again.");
      });
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="p-2 border-b bg-sidebar flex items-center gap-x-2">
        <Hint text="Click to refresh" side="bottom" align="start">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCcwIcon />
          </Button>
        </Hint>
        <Hint text="Click to copy" side="bottom">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 justify-start text-start font-normal"
            disabled={!safeUrl || copied}
            onClick={handleCopy}
          >
            <span className="truncate">{safeUrl ?? "Invalid preview URL"}</span>
          </Button>
        </Hint>
        <Hint text="Open in a new tab" side="bottom" align="start">
          <Button
            size="sm"
            disabled={!safeUrl}
            variant="outline"
            onClick={() => {
              if (!safeUrl) {
                return;
              }

              window.open(safeUrl, "_blank");
            }}
          >
            <ExternalLinkIcon />
          </Button>
        </Hint>
      </div>
      <iframe
        ref={iframeRef}
        key={fragmentKey}
        title="Sandbox preview"
        className="h-full w-full min-h-[400px] border-0 bg-background"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads"
        referrerPolicy="no-referrer-when-downgrade"
        loading="lazy"
        src={iframeSrc}
      />
    </div>
  );
};

export { FragmentWeb };
