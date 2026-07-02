import { clsx } from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ className, variant = "ghost", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "min-h-10 rounded-md border px-3 text-sm font-black transition",
        variant === "primary" && "border-wod-gold bg-wod-gold text-black hover:bg-[#ffdc5a]",
        variant === "ghost" && "border-wod-line bg-wod-panel2 text-wod-text hover:border-wod-gold hover:text-wod-gold",
        variant === "danger" && "border-red-500/50 bg-red-500/10 text-red-200 hover:bg-red-500 hover:text-white",
        className
      )}
      {...props}
    />
  );
}
