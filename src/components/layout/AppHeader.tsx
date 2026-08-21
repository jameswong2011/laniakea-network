"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { HpReadout } from "@/components/laniakea/HpReadout";
import { NotificationMenu } from "@/components/laniakea/NotificationMenu";
import { SearchBox } from "@/components/laniakea/SearchBox";
import { DeskAvatar } from "@/components/laniakea/DeskAvatar";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { TokenReadout } from "@/components/laniakea/TokenReadout";
import { feedSingleTopicHref, parseFeedTopics } from "@/lib/research/feed";
import { profilePath, type NotificationRow } from "@/lib/research/forum";
import { SUB_TOPIC_CODES, type Profile, type SubTopic } from "@/types";

function navClassName(active: boolean) {
  return `flex h-full shrink-0 items-center whitespace-nowrap px-3 text-[13px] ${
    active
      ? "text-foreground shadow-[inset_0_-2px_0_0_var(--gain)]"
      : "text-muted-foreground hover:text-foreground"
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
    <header className="shrink-0 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex h-12 items-stretch justify-between">
        <div className="flex min-w-0 flex-1 items-stretch">
          <Link
            href={isAuthenticated ? "/feed" : "/"}
            className="flex shrink-0 items-center gap-2 border-r border-border px-3"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-panel-elevated text-[10px] font-semibold tracking-wide text-foreground">
              LN
            </span>
            <span className="font-heading text-[18px] text-foreground">
              Laniakea
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
          <div className="flex items-center gap-2 px-2">
            {profile ? (
              <TierBadge tier={profile.tier} size="md" />
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
              className="hidden shrink-0 sm:inline"
            >
              <TokenReadout value={profile?.utility_tokens ?? null} />
            </Link>
            {profile ? (
              <Link
                href={profilePath(profile.username)}
                className="hidden items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground md:flex"
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
          {profile?.role === "admin" ? (
            <Link
              href="/admin"
              className={navClassName(isActivePath(pathname, "/admin"))}
            >
              Admin
            </Link>
          ) : null}
          {isAuthenticated ? (
            <div className="flex items-center border-l border-border px-3">
              <LogoutButton />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
