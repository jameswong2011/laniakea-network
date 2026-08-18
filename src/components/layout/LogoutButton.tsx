import { logout } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-[13px] text-muted-foreground hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  );
}
