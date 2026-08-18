"use client";

import Link from "next/link";
import { useState } from "react";
import { markNotificationsRead } from "@/app/(dashboard)/forum/actions";
import {
  notificationCopy,
  notificationHref,
  type NotificationRow,
} from "@/lib/research/forum";

export function NotificationMenu({
  items,
  unread,
}: {
  items: NotificationRow[];
  unread: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-full items-center px-2.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        Inbox
        {unread > 0 ? (
          <span className="ml-1.5 rounded-full bg-gain-muted px-1.5 text-[10px] text-gain">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-30 mt-1 w-80 rounded-xl border border-border bg-panel p-2 shadow-lg">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[13px] font-medium text-foreground">Inbox</p>
            {unread > 0 ? (
              <form action={markNotificationsRead}>
                <button
                  type="submit"
                  className="text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Mark read
                </button>
              </form>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="px-1 py-3 text-[13px] text-muted-foreground">
              No replies yet.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1 overflow-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={notificationHref(item)}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-2 py-1.5 text-[13px] leading-snug hover:bg-muted ${
                      item.read_at
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {notificationCopy(item)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
