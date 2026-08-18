"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { HpReadout } from "@/components/laniakea/HpReadout";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { TokenReadout } from "@/components/laniakea/TokenReadout";
import { feedSingleTopicHref, parseFeedTopics } from "@/lib/research/feed";
import { SUB_TOPIC_CODES, type Profile, type SubTopic } from "@/types";

function navClassName(active: boolean) {
  return `flex h-full shrink-0 items-center px-2.5 font-data text-[10px] tracking-[0.14em] uppercase ${
    active
      ? "bg-panel-elevated text-foreground shadow-[inset_0_-2px_0_0_var(--gain)]"
      : "text-muted-foreground hover:bg-panel-elevated hover:text-foreground"
  }`;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AuthenticatedLeftNav({
  engagedTopics,
}: {
  engagedTopics: SubTopic[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const topicParam = searchParams.getAll("topic");
  const selectedTopics = parseFeedTopics(
    topicParam.length > 0 ? topicParam : undefined
  );
  const onFeed = pathname === "/feed" || pathname.startsWith("/feed/");
  const mainFeedActive = onFeed && selectedTopics == null;

  return (
    <nav className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
      <Link href="/feed" className={navClassName(mainFeedActive)}>
        Main Feed
      </Link>
      {engagedTopics.map((topic) => {
        const href = feedSingleTopicHref(topic);
        const active =
          onFeed &&
          selectedTopics != null &&
          selectedTopics.includes(topic);

        return (
          <Link key={topic} href={href} className={navClassName(active)}>
            <span className="sm:hidden">{SUB_TOPIC_CODES[topic]}</span>
            <span className="hidden sm:inline">{topic}</span>
          </Link>
        );
      })}
      <Link
        href="/ranking"
        className={navClassName(isActivePath(pathname, "/ranking"))}
      >
        Ranking
      </Link>
    </nav>
  );
}

export function AppHeader({
  profile = null,
  isAuthenticated = false,
  engagedTopics = [],
}: {
  profile?: Profile | null;
  isAuthenticated?: boolean;
  engagedTopics?: SubTopic[];
}) {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-border bg-surface">
      <div className="flex h-9 items-stretch justify-between">
        <div className="flex min-w-0 flex-1 items-stretch">
          <Link
            href={isAuthenticated ? "/feed" : "/"}
            className="flex shrink-0 items-center gap-2 border-r border-border px-2.5"
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
            <Suspense
              fallback={
                <nav className="flex min-w-0 flex-1 items-stretch">
                  <span className={navClassName(false)}>Main Feed</span>
                </nav>
              }
            >
              <AuthenticatedLeftNav engagedTopics={engagedTopics} />
            </Suspense>
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

        <div className="flex shrink-0 items-stretch">
          {isAuthenticated ? (
            <nav className="flex items-stretch">
              <Link
                href="/wallet"
                className={navClassName(isActivePath(pathname, "/wallet"))}
              >
                Wallet
              </Link>
              <Link
                href="/dashboard"
                className={navClassName(isActivePath(pathname, "/dashboard"))}
              >
                Account
              </Link>
            </nav>
          ) : null}
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
              <Link
                href="/dashboard"
                className="hidden max-w-[8rem] truncate font-data text-[11px] text-muted-foreground hover:text-foreground md:inline"
              >
                @{profile.username}
              </Link>
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
