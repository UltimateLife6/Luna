import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ExternalAnchorProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function ExternalAnchor({ href, children, className, onClick }: ExternalAnchorProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 text-sm text-ivory underline decoration-burgundy underline-offset-4 transition-colors hover:decoration-ivory",
        className,
      )}
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
