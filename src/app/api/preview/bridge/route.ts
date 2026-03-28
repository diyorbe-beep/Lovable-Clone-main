import { env } from "@/config/env";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Loads inside the sandbox preview (cross-origin). Enables click-to-map via data-dev-source.
 */
export async function GET(req: NextRequest) {
  const parent =
    req.nextUrl.searchParams.get("parent") ||
    env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3008";

  const safeParent = parent.replace(/\\/g, "/").replace(/["'<>]/g, "");

  const script = `(function(){
  var PARENT = ${JSON.stringify(safeParent)};
  function pick(el){
    var t = el && el.closest && el.closest("[data-dev-source]");
    if(!t) return;
    var path = t.getAttribute("data-dev-source") || "";
    var sel = t.tagName ? t.tagName.toLowerCase() : "";
    if(window.parent && window.parent !== window){
      window.parent.postMessage({ type: "LC_VISUAL_PICK", path: path, tag: sel }, PARENT);
    }
  }
  document.addEventListener("click", function(e){ pick(e.target); }, true);
})();`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
