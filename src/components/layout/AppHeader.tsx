"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { HpReadout } from "@/components/laniakea/HpReadout";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { TokenReadout } from "@/components/laniakea/TokenReadout";
import type { Profile } from "@/types";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed" },
  { href: "/ranking", label: "Ranking" },
  { href: "/wallet", label: "Wallet" },
  { href: "/dashboard", label: "Account" },
] as const;

function navClassName(active: boolean) {
  return `flex h-full items-center px-2.5 font-data text-[10px] tracking-[0.14em] uppercase ${
    active
      ? "bg-panel-elevated text-foreground shadow-[inset_0_-2px_0_0_var(--gain)]"
      : "text-muted-foreground hover:bg-panel-elevated hover:text-foreground"
  }`;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({
  profile = null,
  isAuthenticated = false,
}: {
  profile?: Profile | null;
  isAuthenticated?: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-border bg-surface">
      <div className="flex h-9 items-stretch justify-between">
        <div className="flex min-w-0 items-stretch">
          <Link
            href={isAuthenticated ? "/feed" : "/"}
            className="flex items-center gap-2 border-r border-border px-2.5"
          >
            <span className="flex h-5 w-5 items-center justify-center border border-border bg-panel-elevated font-data text-[9px] font-semibold tracking-wide text-foreground">
              LN
            </span>
            <span className="text-[12px] font-medium tracking-tight text-foreground">
              Laniakea
            </span>
            <span className="hidden font-data text-[9px] tracking-[0.16em] text-muted-foreground uppercase sm:inline">
              Network
            </span>
          </Link>

          {isAuthenticated ? (
            <nav className="flex items-stretch">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navClassName(isActivePath(pathname, item.href))}
                >
                  {item.href === "/feed" ? (
                    <>
                      <span className="sm:hidden">Feed</span>
                      <span className="hidden sm:inline">Enter the floor</span>
                    </>
                  ) : (
                    item.label
                  )}
                </Link>
              ))}
            </nav>
          ) : (
            <nav className="flex items-stretch">
              <Link href="/login" className={navClassName(pathname === "/login")}>
                Login
              </Link>
              <Link
                href="/signup"
                className={navClassName(pathname === "/signup")}
              >
                Sign up
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-stretch">
          <div className="flex items-center gap-1.5 px-2">
            {profile ? (
              <TierBadge tier={profile.tier} size="md" />
            ) : (
              <span className="hidden font-data text-[10px] text-muted-foreground sm:inline">
                —
              </span>
            )}
            <Link href={isAuthenticated ? "/wallet" : "/login"} className="shrink-0">
              <HpReadout value={profile?.current_hp ?? null} />
            </Link>
            <Link
              href={isAuthenticated ? "/wallet" : "/login"}
              className="hidden shrink-0 sm:inline"
            >
              <TokenReadout value={profile?.utility_tokens ?? null} />
            </Link>
            {profile ? (
              <span className="hidden max-w-[8rem] truncate font-data text-[11px] text-muted-foreground md:inline">
                @{profile.username}
              </span>
            ) : null}
          </div>
          {profile?.role === "admin" ? (
            <Link
              href="/admin"
              className={navClassName(isActivePath(pathname, "/admin"))}
            >
              Admin
            </Link>
          ) : null}
          {isAuthenticated ? (
            <div className="flex items-center border-l border-border px-2">
              <LogoutButton />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
