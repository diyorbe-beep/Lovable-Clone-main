import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Fragment } from "@/generated/prisma";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface FragmentWebProps {
  data: Fragment;
}

const FragmentWeb = ({ data }: FragmentWebProps) => {
  const getSafeUrl = () => {
    try {
      const url = new URL(data.sandboxUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  };

  const safeUrl = getSafeUrl();

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
        key={fragmentKey}
        title="Sandbox preview"
        className="h-full w-full min-h-[400px] border-0 bg-background"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads"
        referrerPolicy="no-referrer-when-downgrade"
        loading="lazy"
        src={safeUrl ?? undefined}
      />
    </div>
  );
};

export { FragmentWeb };
