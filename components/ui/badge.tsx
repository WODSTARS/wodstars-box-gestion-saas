import { clsx } from "clsx";

export function Badge({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "green" | "red" | "blue" }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-black",
        tone === "gold" && "border-wod-gold bg-wod-gold text-black",
        tone === "green" && "border-wod-green bg-wod-green text-black",
        tone === "red" && "border-wod-red bg-wod-red/20 text-red-100",
        tone === "blue" && "border-wod-blue bg-wod-blue text-black"
      )}
    >
      {children}
    </span>
  );
}
