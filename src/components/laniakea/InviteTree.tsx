import type { InviteNode } from "@/lib/admin/metrics";

export function InviteTree({ nodes }: { nodes: InviteNode[] }) {
  if (nodes.length === 0) {
    return <p className="px-3 py-3 text-[14px] text-muted-foreground">No invite lines yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2 px-3 py-3">
      {nodes.map((node) => (
        <InviteBranch key={node.id} node={node} />
      ))}
    </ul>
  );
}

function InviteBranch({ node }: { node: InviteNode }) {
  return (
    <li className="border-l border-border pl-3">
      <p className="text-[14px] text-foreground">
        {node.displayName}{" "}
        <span className="text-muted-foreground">@{node.username}</span>
      </p>
      <p className="font-data text-[11px] text-muted-foreground">
        {node.tier} · {node.referralUtl} UTL residual · {node.children.length} direct
      </p>
      {node.children.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {node.children.map((child) => (
            <InviteBranch key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
