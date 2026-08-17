import { logout } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="h-6 border border-border bg-panel-elevated px-2 font-data text-[10px] tracking-[0.12em] text-muted-foreground uppercase hover:bg-muted hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  );
}
