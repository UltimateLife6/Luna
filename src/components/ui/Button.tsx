import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

type SharedProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type LinkButtonProps = SharedProps & {
  href: string;
};

function buttonClasses(variant: Variant, size: Size, className?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2 border px-6 text-center font-sans uppercase tracking-[0.16em] transition-colors",
    size === "sm" ? "min-h-10 text-[0.68rem]" : "min-h-12 text-xs",
    variant !== "ghost" && "w-full sm:w-auto",
    variant === "primary" && "border-transparent bg-burgundy text-ivory hover:bg-oxblood",
    variant === "secondary" && "border-ivory/60 bg-transparent text-ivory hover:border-ivory",
    variant === "ghost" && "border-transparent bg-transparent px-0 text-ivory hover:text-silver",
    "disabled:pointer-events-none disabled:opacity-40",
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps | LinkButtonProps) {
  const classes = buttonClasses(variant, size, className);

  if ("href" in props && typeof props.href === "string") {
    const external = /^https?:\/\//.test(props.href);

    if (external) {
      return (
        <a href={props.href} className={classes} target="_blank" rel="noopener noreferrer">
          {children}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    }

    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = props;

  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
