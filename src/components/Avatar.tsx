import { cn, initials, avatarColor } from "../lib/utils";

interface Props {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export default function Avatar({ name, src, size = "md", className }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover ring-1 ring-ink-200", sizes[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-black/5",
        avatarColor(name || "?"),
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
