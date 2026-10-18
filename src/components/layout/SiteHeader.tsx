"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { ExternalAnchor } from "@/components/ui/ExternalAnchor";
import { cn } from "@/lib/cn";
import { cartNav, isActivePath, primaryNav, utilityNav } from "@/lib/navigation";
import { site } from "@/lib/site";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SiteHeader() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  function closeMenu(restoreFocus = false) {
    setOpenPath(null);
    if (restoreFocus) {
      menuButtonRef.current?.focus();
    }
  }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches) {
        setOpenPath(null);
      }
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;
    const menuButton = menuButtonRef.current;
    const getItems = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    panel?.querySelector<HTMLElement>("[data-menu-close]")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenPath(null);
        menuButton?.focus();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = getItems();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu = (
    <div
      ref={panelRef}
      id="site-menu"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-obsidian lg:hidden"
    >
      <h2 id={titleId} className="sr-only">
        Menu
      </h2>
      <Container className="flex h-16 items-center justify-between">
        <Wordmark onNavigate={pathname === "/" ? () => closeMenu() : undefined} />
        <button
          type="button"
          data-menu-close
          className="inline-flex size-11 items-center justify-center text-ivory"
          onClick={() => closeMenu(true)}
        >
          <span className="sr-only">Close menu</span>
          <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </button>
      </Container>
      <nav className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto overscroll-contain px-5 pb-12 sm:px-8" aria-label="Primary">
        <ul className="border-t border-ivory/10">
          {[...primaryNav, cartNav, ...utilityNav].map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href} className="border-b border-ivory/10">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 items-center font-editorial text-4xl leading-none",
                    active ? "text-ivory" : "text-silver",
                  )}
                  onClick={active ? () => closeMenu() : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-10 flex flex-col items-start gap-4">
          <ExternalAnchor href={site.instagramUrl} onClick={() => closeMenu()}>
            Instagram
          </ExternalAnchor>
          <ExternalAnchor href={site.etsyUrl} onClick={() => closeMenu()}>
            Etsy
          </ExternalAnchor>
        </div>
        <p className="mt-10 max-w-sm text-sm leading-relaxed text-silver">{site.disclosure}</p>
      </nav>
    </div>
  );

  return (
    <header className="border-b border-ivory/10 bg-obsidian">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Wordmark />
        <nav className="hidden items-center gap-x-5 lg:flex" aria-label="Primary">
          {[...primaryNav, cartNav].map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "py-2 font-sans text-xs uppercase tracking-[0.16em]",
                  active ? "text-ivory" : "text-silver hover:text-ivory",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href={cartNav.href}
          className="py-2 font-sans text-xs uppercase tracking-[0.16em] text-silver hover:text-ivory lg:hidden"
          aria-current={isActivePath(pathname, cartNav.href) ? "page" : undefined}
        >
          {cartNav.label}
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex size-11 items-center justify-center text-ivory lg:hidden"
          aria-expanded={open}
          aria-controls={open ? "site-menu" : undefined}
          aria-haspopup="dialog"
          onClick={() => setOpenPath(pathname)}
        >
          <span className="sr-only">Open menu</span>
          <Menu aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </button>
      </Container>
      {open ? menu : null}
    </header>
  );
}

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" className="block min-w-0 leading-none" aria-label="Luna Fae Leathers, home" onClick={onNavigate}>
      <span className="block font-display text-sm tracking-[0.28em] text-ivory">LUNA FAE</span>
      <span className="mt-1 block font-display text-[0.62rem] tracking-[0.38em] text-silver">LEATHERS</span>
    </Link>
  );
}
