import type { ComponentPropsWithoutRef, ElementType } from "react";

type GlassSurfaceVariant = "card" | "panel" | "sidebar";

type GlassSurfaceProps<T extends ElementType> = {
  as?: T;
  variant?: GlassSurfaceVariant;
  interactive?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

const variantClasses: Record<GlassSurfaceVariant, string> = {
  card: "",
  panel: "glass-surface--panel",
  sidebar: "glass-surface--sidebar",
};

export function GlassSurface<T extends ElementType = "div">({
  as,
  variant = "card",
  interactive = false,
  className,
  ...props
}: GlassSurfaceProps<T>) {
  const Component = as ?? "div";
  const classes = [
    "glass-surface",
    variantClasses[variant],
    interactive && "glass-surface--interactive",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Component className={classes} {...props} />;
}
