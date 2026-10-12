export type GuestStackParamList = {
  Landing: undefined;
  Overview: undefined;
  Login: undefined;
  Signup: undefined;
};

export type TabParamList = {
  Feed: undefined;
  Search: undefined;
  Write: undefined;
  Ranking: undefined;
  You: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  Overview: undefined;
  Landing: undefined;
  Compose: { draftId?: string } | undefined;
  Thread: { postId: string };
  Desk: { username: string };
  Inbox: undefined;
  Drafts: undefined;
  Saved: undefined;
  Wallet: undefined;
  Account: undefined;
  Assistant:
    | {
        postId?: string;
        locked?: boolean;
        summary?: string | null;
        ticker?: string | null;
        conviction?: string | null;
        claims?: string[];
        risks?: string[];
        agreement?: string | null;
        objection?: string | null;
        commentCount?: number;
        meaning?: { id: string; title: string; summary: string }[] | null;
      }
    | undefined;
};
