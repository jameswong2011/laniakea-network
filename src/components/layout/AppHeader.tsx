"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { HpReadout } from "@/components/laniakea/HpReadout";
import { NotificationMenu } from "@/components/laniakea/NotificationMenu";
import { SearchBox } from "@/components/laniakea/SearchBox";
import { DeskAvatar } from "@/components/laniakea/DeskAvatar";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { TokenReadout } from "@/components/laniakea/TokenReadout";
import { FeedStatusFilter } from "@/components/laniakea/FeedStatusFilter";
import { FeedTierFilter } from "@/components/laniakea/FeedTierFilter";
import {
  feedSingleTopicHref,
  parseFeedStatuses,
  parseFeedTiers,
  parseFeedTopics,
} from "@/lib/research/feed";
import { profilePath, type NotificationRow } from "@/lib/research/forum";
import type { Profile, SubTopic } from "@/types";

function navClassName(active: boolean) {
  return `flex h-full shrink-0 items-center whitespace-nowrap px-3 text-[13px] ${
    active
      ? "text-foreground shadow-[inset_0_-2px_0_0_var(--gain)]"
      : "text-muted-foreground hover:text-foreground"
  }`;
}

function menuLinkClassName(active: boolean) {
  return `flex h-10 items-center px-3 text-[14px] ${
    active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/70"
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
  const tierParam = searchParams.getAll("tier");
  const statusParam = searchParams.getAll("status");
  const selectedTopics = parseFeedTopics(
    topicParam.length > 0 ? topicParam : undefined
  );
  const selectedTiers = parseFeedTiers(
    tierParam.length > 0 ? tierParam : undefined
  );
  const selectedStatuses = parseFeedStatuses(
    statusParam.length > 0 ? statusParam : undefined
  );
  const onFeed = pathname === "/feed" || pathname.startsWith("/feed/");
  const mainFeedActive =
    onFeed &&
    selectedTopics == null &&
    selectedTiers == null &&
    selectedStatuses == null;

  return (
    <nav className="hidden min-w-0 flex-1 items-stretch overflow-x-auto md:flex">
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
            {topic}
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

function MobilePrimaryNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const topicParam = searchParams.getAll("topic");
  const tierParam = searchParams.getAll("tier");
  const statusParam = searchParams.getAll("status");
  const selectedTopics = parseFeedTopics(
    topicParam.length > 0 ? topicParam : undefined
  );
  const selectedTiers = parseFeedTiers(
    tierParam.length > 0 ? tierParam : undefined
  );
  const selectedStatuses = parseFeedStatuses(
    statusParam.length > 0 ? statusParam : undefined
  );
  const onFeed = pathname === "/feed" || pathname.startsWith("/feed/");
  const mainFeedActive =
    onFeed &&
    selectedTopics == null &&
    selectedTiers == null &&
    selectedStatuses == null;

  return (
    <nav className="flex h-10 items-stretch overflow-x-auto border-t border-border md:hidden">
      <Link href="/feed" className={navClassName(mainFeedActive)}>
        Feed
      </Link>
      <Link
        href="/ranking"
        className={navClassName(isActivePath(pathname, "/ranking"))}
      >
        Ranking
      </Link>
    </nav>
  );
}

function HeaderMenuFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onFeed = pathname === "/feed";
  const topicParam = searchParams.getAll("topic");
  const tierParam = searchParams.getAll("tier");
  const statusParam = searchParams.getAll("status");
  const selectedTopics = onFeed
    ? parseFeedTopics(topicParam.length > 0 ? topicParam : undefined)
    : null;
  const selectedTiers = onFeed
    ? parseFeedTiers(tierParam.length > 0 ? tierParam : undefined)
    : null;
  const selectedStatuses = onFeed
    ? parseFeedStatuses(statusParam.length > 0 ? statusParam : undefined)
    : null;

  return (
    <div className="flex flex-col gap-3 border-b border-border px-3 py-2.5">
      <div>
        <p className="mb-1.5 font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Feed by outcome
        </p>
        <FeedStatusFilter
          selectedStatuses={selectedStatuses}
          selectedTopics={selectedTopics}
          selectedTiers={selectedTiers}
        />
      </div>
      <div>
        <p className="mb-1.5 font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Feed by tier
        </p>
        <FeedTierFilter
          selectedTiers={selectedTiers}
          selectedTopics={selectedTopics}
          selectedStatuses={selectedStatuses}
        />
      </div>
    </div>
  );
}

function HeaderMenu({
  profile,
  isAuthenticated,
}: {
  profile: Profile | null;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!isAuthenticated) {
    return null;
  }

  const items = [
    { href: "/feed", label: "Main Feed" },
    { href: "/ranking", label: "Ranking" },
    { href: "/search", label: "Search" },
    { href: "/drafts", label: "Drafts" },
    { href: "/saved", label: "Saved" },
    { href: "/wallet", label: "Wallet" },
    { href: "/dashboard", label: "Account" },
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="flex items-stretch md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-header-menu"
        onClick={() => setOpen((value) => !value)}
        className={navClassName(open)}
      >
        {open ? "Close" : "Menu"}
      </button>
      {open ? (
        <div
          id="mobile-header-menu"
          className="absolute top-full right-0 left-0 z-40 border-b border-border bg-surface"
        >
          {profile ? (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <DeskAvatar
                url={profile.avatar_url}
                name={profile.display_name}
                size="xs"
              />
              <Link
                href={profilePath(profile.username)}
                className="min-w-0 truncate text-[13px] text-muted-foreground"
              >
                @{profile.username}
              </Link>
              <TierBadge tier={profile.tier} size="sm" />
              <TokenReadout value={profile.utility_tokens} />
            </div>
          ) : null}
          <Suspense fallback={null}>
            <HeaderMenuFilters />
          </Suspense>
          <nav className="flex flex-col py-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={menuLinkClassName(isActivePath(pathname, item.href))}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border px-3 py-2.5">
            <LogoutButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AppHeader({
  profile = null,
  isAuthenticated = false,
  engagedTopics = [],
  notifications = [],
  unreadCount = 0,
}: {
  profile?: Profile | null;
  isAuthenticated?: boolean;
  engagedTopics?: SubTopic[];
  notifications?: NotificationRow[];
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <header className="relative shrink-0 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex h-12 items-stretch justify-between">
        <div className="flex min-w-0 items-stretch">
          <Link
            href={isAuthenticated ? "/feed" : "/"}
            className="flex shrink-0 items-center gap-2 border-r border-border px-2.5 sm:px-3"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-panel-elevated text-[10px] font-semibold tracking-wide text-foreground">
              LN
            </span>
            <span className="hidden font-heading text-[18px] text-foreground sm:inline">
              Laniakea
            </span>
          </Link>

          {isAuthenticated ? (
            <Suspense
              fallback={
                <nav className="hidden min-w-0 flex-1 items-stretch md:flex">
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
            <nav className="hidden items-stretch md:flex">
              <div className="hidden items-center px-2 lg:flex">
                <SearchBox compact />
              </div>
              <Link
                href="/search"
                className={`${navClassName(isActivePath(pathname, "/search"))} lg:hidden`}
              >
                Search
              </Link>
              <NotificationMenu items={notifications} unread={unreadCount} />
              <Link
                href="/drafts"
                className={navClassName(isActivePath(pathname, "/drafts"))}
              >
                Drafts
              </Link>
              <Link
                href="/saved"
                className={navClassName(isActivePath(pathname, "/saved"))}
              >
                Saved
              </Link>
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
          <div className="flex items-center gap-1.5 px-2 sm:gap-2">
            {profile ? (
              <span className="hidden md:inline">
                <TierBadge tier={profile.tier} size="md" />
              </span>
            ) : (
              <span className="hidden text-[12px] text-muted-foreground sm:inline">
                —
              </span>
            )}
            <Link href={isAuthenticated ? "/wallet" : "/login"} className="shrink-0">
              <HpReadout value={profile?.current_hp ?? null} />
            </Link>
            <Link
              href={isAuthenticated ? "/wallet" : "/login"}
              className="hidden shrink-0 md:inline"
            >
              <TokenReadout value={profile?.utility_tokens ?? null} />
            </Link>
            {profile ? (
              <Link
                href={profilePath(profile.username)}
                className="hidden items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground lg:flex"
              >
                <DeskAvatar
                  url={profile.avatar_url}
                  name={profile.display_name}
                  size="xs"
                />
                <span className="max-w-[8rem] truncate">@{profile.username}</span>
              </Link>
            ) : null}
          </div>
          {isAuthenticated ? (
            <div className="flex items-stretch md:hidden">
              <NotificationMenu items={notifications} unread={unreadCount} />
            </div>
          ) : null}
          {profile?.role === "admin" ? (
            <Link
              href="/admin"
              className={`hidden md:flex ${navClassName(isActivePath(pathname, "/admin"))}`}
            >
              Admin
            </Link>
          ) : null}
          {isAuthenticated ? (
            <div className="hidden items-center border-l border-border px-3 md:flex">
              <LogoutButton />
            </div>
          ) : null}
          <HeaderMenu profile={profile} isAuthenticated={isAuthenticated} />
        </div>
      </div>
      {isAuthenticated ? (
        <Suspense fallback={null}>
          <MobilePrimaryNav />
        </Suspense>
      ) : null}
    </header>
  );
}
