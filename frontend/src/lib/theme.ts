import { useEffect, useState } from "react";

/** Current look: "day" when the light theme is on (html[data-theme="akatsuki"]), else "night". */
export function useTheme(): "day" | "night" {
  const read = () => (document.documentElement.getAttribute("data-theme") === "akatsuki" ? "day" : "night");
  const [v, setV] = useState<"day" | "night">(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setV(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return v;
}
