import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_POSTS,
  DEMO_USERS,
  type DemoPostSeed,
  type DemoUserSeed,
} from "@/lib/research/demo-catalog";
import { PASSIVE_DRAIN_HP, voteCostHp } from "@/lib/research/economy";
import { recordSubtopicParticipation } from "@/lib/research/subtopic-ranks";
import {
  HP_TRANSACTION_BUY,
  HP_TRANSACTION_DRAIN,
  HP_TRANSACTION_STAKE,
  HP_TRANSACTION_VOTE,
  RESEARCH_POST_STATUS_LIVE,
  VOTE_STRENGTH_MAX,
  signedVoteValue,
  type SubTopic,
} from "@/types";

export const DEMO_PASSWORD = "LaniakeaDemo!26";
export { DEMO_POSTS, DEMO_USERS, type DemoPostSeed, type DemoUserSeed };

export type DemoSeedResult = {
  usersCreated: number;
  usersUpdated: number;
  postsCreated: number;
  postsSkipped: number;
  transactionsCreated: number;
  votesCreated: number;
  warnings: string[];
};

type SeededUser = DemoUserSeed & { id: string };

function demoEmail(username: string) {
  return `${username.replace(/_/g, ".")}@demo.laniakea.network`;
}

function hoursAgoIso(hoursAgo: number) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function isMissingSchema(message: string) {
  return (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("Could not find")
  );
}

function createAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

async function findProfileByUsername(
  supabase: SupabaseClient,
  username: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}

async function insertProfile(
  supabase: SupabaseClient,
  user: DemoUserSeed,
  id: string
) {
  const withTokens = await supabase.from("profiles").insert({
    id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    tier: user.tier,
    current_hp: user.current_hp,
    utility_tokens: user.utility_tokens,
  });

  if (!withTokens.error) {
    return { error: null };
  }

  if (!withTokens.error.message.includes("utility_tokens")) {
    return { error: withTokens.error.message };
  }

  const legacy = await supabase.from("profiles").insert({
    id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    tier: user.tier,
    current_hp: user.current_hp,
  });

  return { error: legacy.error?.message ?? null };
}

function profileFields(user: DemoUserSeed, includeTokens: boolean) {
  return {
    display_name: user.display_name,
    role: user.role,
    tier: user.tier,
    current_hp: user.current_hp,
    updated_at: new Date().toISOString(),
    ...(includeTokens ? { utility_tokens: user.utility_tokens } : {}),
  };
}

async function writeDemoProfile(
  client: SupabaseClient,
  id: string,
  user: DemoUserSeed
) {
  const withTokens = await client
    .from("profiles")
    .update(profileFields(user, true))
    .eq("id", id)
    .select("id, tier, current_hp, role")
    .maybeSingle();

  if (!withTokens.error) {
    return { row: withTokens.data, error: null };
  }

  if (!withTokens.error.message.includes("utility_tokens")) {
    return { row: null, error: withTokens.error.message };
  }

  const legacy = await client
    .from("profiles")
    .update(profileFields(user, false))
    .eq("id", id)
    .select("id, tier, current_hp, role")
    .maybeSingle();

  return { row: legacy.data, error: legacy.error?.message ?? null };
}

function profileMatchesCatalog(
  row: { tier?: string | null; current_hp?: number | null; role?: string | null } | null,
  user: DemoUserSeed
) {
  return (
    row?.tier === user.tier &&
    row?.current_hp === user.current_hp &&
    row?.role === user.role
  );
}

async function applyDemoProfileAsSelf(user: DemoUserSeed, id: string) {
  const authClient = createAuthClient();
  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: demoEmail(user.username),
    password: DEMO_PASSWORD,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  const written = await writeDemoProfile(authClient, id, user);
  await authClient.auth.signOut();

  if (written.error) {
    return { error: written.error };
  }

  if (!profileMatchesCatalog(written.row, user)) {
    return {
      error: `Signed in as ${user.username}, but tier/HP did not change.`,
    };
  }

  return { error: null };
}

async function applyDemoProfileAttributes(
  supabase: SupabaseClient,
  id: string,
  user: DemoUserSeed
) {
  const asAdmin = await writeDemoProfile(supabase, id, user);

  if (!asAdmin.error && profileMatchesCatalog(asAdmin.row, user)) {
    return { error: null };
  }

  const asSelf = await applyDemoProfileAsSelf(user, id);

  if (!asSelf.error) {
    return { error: null };
  }

  return {
    error:
      asAdmin.error ??
      `Could not set ${user.username} to ${user.tier} / ${user.current_hp} HP. RLS is blocking admin writes. ${asSelf.error}`,
  };
}

async function applyCatalogViaRpc(supabase: SupabaseClient) {
  const payload = DEMO_USERS.map((user) => ({
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    tier: user.tier,
    current_hp: user.current_hp,
  }));

  const { error } = await supabase.rpc("apply_demo_profile_seed", { payload });

  if (!error) {
    return { error: null };
  }

  if (
    isMissingSchema(error.message) ||
    error.message.includes("apply_demo_profile_seed")
  ) {
    return { error: null };
  }

  return { error: error.message };
}

async function waitForProfile(
  supabase: SupabaseClient,
  username: string,
  userId?: string | null
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (userId) {
      const byId = await supabase
        .from("profiles")
        .select("id, username, role")
        .eq("id", userId)
        .maybeSingle();

      if (byId.data) {
        return { profile: byId.data, error: null };
      }
    }

    const byName = await findProfileByUsername(supabase, username);

    if (byName.profile || byName.error) {
      return byName;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { profile: null, error: null };
}

async function ensureDemoUser(
  supabase: SupabaseClient,
  user: DemoUserSeed,
  adminUserId: string
): Promise<{ user: SeededUser | null; created: boolean; error: string | null }> {
  const existing = await findProfileByUsername(supabase, user.username);

  if (existing.error) {
    return { user: null, created: false, error: existing.error };
  }

  if (existing.profile) {
    if (existing.profile.id === adminUserId || existing.profile.role === "admin") {
      return {
        user: { ...user, id: existing.profile.id },
        created: false,
        error: null,
      };
    }

    return {
      user: { ...user, id: existing.profile.id },
      created: false,
      error: null,
    };
  }

  const generatedId = crypto.randomUUID();
  const inserted = await insertProfile(supabase, user, generatedId);

  if (!inserted.error) {
    return { user: { ...user, id: generatedId }, created: true, error: null };
  }

  const authClient = createAuthClient();
  const { data, error } = await authClient.auth.signUp({
    email: demoEmail(user.username),
    password: DEMO_PASSWORD,
    options: {
      data: {
        username: user.username,
        display_name: user.display_name,
        tier: user.tier,
        role: user.role,
        current_hp: user.current_hp,
      },
    },
  });

  if (error && !error.message.toLowerCase().includes("already")) {
    return {
      user: null,
      created: false,
      error: `Could not create ${user.username}: ${inserted.error}. Auth fallback: ${error.message}`,
    };
  }

  if (data.session && data.user?.id) {
    const written = await writeDemoProfile(authClient, data.user.id, user);
    await authClient.auth.signOut();

    if (profileMatchesCatalog(written.row, user)) {
      return {
        user: { ...user, id: data.user.id },
        created: true,
        error: null,
      };
    }
  }

  const found = await waitForProfile(supabase, user.username, data.user?.id);

  if (!found.profile) {
    return {
      user: null,
      created: false,
      error: `Created auth user for ${user.username}, but no profile row was found.`,
    };
  }

  if (found.profile.id === adminUserId || found.profile.role === "admin") {
    return {
      user: { ...user, id: found.profile.id },
      created: false,
      error: null,
    };
  }

  return {
    user: { ...user, id: found.profile.id },
    created: Boolean(data.user?.id && !error),
    error: null,
  };
}

async function insertDemoPost(
  supabase: SupabaseClient,
  post: DemoPostSeed,
  authorId: string
) {
  const createdAt = hoursAgoIso(post.hoursAgo);
  const payload = {
    author_id: authorId,
    title: post.title,
    body: post.body,
    status: RESEARCH_POST_STATUS_LIVE,
    current_health: post.current_health,
    original_stake: post.current_health,
    sub_topic: post.sub_topic,
    created_at: createdAt,
    updated_at: createdAt,
  };

  const withTopic = await supabase
    .from("research_posts")
    .insert(payload)
    .select("id")
    .single();

  if (!withTopic.error && withTopic.data) {
    return { id: withTopic.data.id as string, error: null };
  }

  if (withTopic.error && !withTopic.error.message.includes("sub_topic")) {
    const withoutDates = await supabase
      .from("research_posts")
      .insert({
        author_id: authorId,
        title: post.title,
        body: post.body,
        status: RESEARCH_POST_STATUS_LIVE,
        current_health: post.current_health,
        sub_topic: post.sub_topic,
      })
      .select("id")
      .single();

    if (!withoutDates.error && withoutDates.data) {
      return { id: withoutDates.data.id as string, error: null };
    }

    return {
      id: null,
      error: withoutDates.error?.message ?? withTopic.error.message,
    };
  }

  const legacy = await supabase
    .from("research_posts")
    .insert({
      author_id: authorId,
      title: post.title,
      body: post.body,
      status: RESEARCH_POST_STATUS_LIVE,
      current_health: post.current_health,
    })
    .select("id")
    .single();

  if (!legacy.error && legacy.data) {
    return { id: legacy.data.id as string, error: null };
  }

  return { id: null, error: legacy.error?.message ?? "Failed to insert post." };
}

async function insertLedger(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    amount: number;
    type: string;
    description: string;
    post_id?: string;
    created_at?: string;
  }
) {
  const base = {
    user_id: row.user_id,
    amount: row.amount,
    type: row.type,
    description: row.description,
  };

  const attempts = [
    { ...base, post_id: row.post_id ?? null, created_at: row.created_at },
    { ...base, post_id: row.post_id ?? null },
    { ...base, created_at: row.created_at },
    base,
  ];

  let lastError: string | null = null;

  for (const payload of attempts) {
    const { error } = await supabase.from("hp_transactions").insert(payload);

    if (!error) {
      return { error: null };
    }

    lastError = error.message;

    if (
      !error.message.includes("post_id") &&
      !error.message.includes("created_at")
    ) {
      return { error: error.message };
    }
  }

  return { error: lastError };
}

async function insertOptionalLedger(
  supabase: SupabaseClient,
  row: Parameters<typeof insertLedger>[1],
  result: DemoSeedResult
) {
  const ledger = await insertLedger(supabase, row);

  if (!ledger.error) {
    result.transactionsCreated += 1;
    return;
  }

  if (
    ledger.error.includes("hp_transactions_type_check") ||
    ledger.error.includes("type")
  ) {
    return;
  }

  result.warnings.push(ledger.error);
}

async function seedOpeningLedger(
  supabase: SupabaseClient,
  userId: string,
  result: DemoSeedResult
) {
  await insertOptionalLedger(
    supabase,
    {
      user_id: userId,
      amount: 20,
      type: HP_TRANSACTION_BUY,
      created_at: hoursAgoIso(96),
      description: "Demo seed: token desk buy",
    },
    result
  );

  await insertOptionalLedger(
    supabase,
    {
      user_id: userId,
      amount: PASSIVE_DRAIN_HP,
      type: HP_TRANSACTION_DRAIN,
      created_at: hoursAgoIso(72),
      description: "Demo seed: passive drain",
    },
    result
  );
}

async function recordTopicQuietly(
  supabase: SupabaseClient,
  userId: string,
  subTopic: SubTopic,
  hpDelta: number,
  warnings: string[]
) {
  const topic = await recordSubtopicParticipation(
    supabase,
    userId,
    subTopic,
    hpDelta
  );

  if (topic.error && !isMissingSchema(topic.error)) {
    warnings.push(topic.error);
    return false;
  }

  return !topic.error;
}

export async function seedDemoData(
  supabase: SupabaseClient,
  adminUserId: string
): Promise<DemoSeedResult> {
  const result: DemoSeedResult = {
    usersCreated: 0,
    usersUpdated: 0,
    postsCreated: 0,
    postsSkipped: 0,
    transactionsCreated: 0,
    votesCreated: 0,
    warnings: [],
  };

  const seededUsers: SeededUser[] = [];

  for (const user of DEMO_USERS) {
    const ensured = await ensureDemoUser(supabase, user, adminUserId);

    if (ensured.error) {
      result.warnings.push(ensured.error);
    }

    if (!ensured.user) {
      continue;
    }

    seededUsers.push(ensured.user);

    if (ensured.created) {
      result.usersCreated += 1;
      await seedOpeningLedger(supabase, ensured.user.id, result);
    } else {
      result.usersUpdated += 1;
    }
  }

  const rpc = await applyCatalogViaRpc(supabase);

  if (rpc.error) {
    result.warnings.push(rpc.error);
  }

  for (const user of seededUsers) {
    if (user.id === adminUserId) {
      continue;
    }

    const applied = await applyDemoProfileAttributes(supabase, user.id, user);

    if (applied.error) {
      result.warnings.push(applied.error);
    }
  }

  if (seededUsers.length === 0) {
    result.warnings.push(
      "No demo users could be created. Profile inserts may require an auth.users row or a looser RLS policy."
    );
    return result;
  }

  const usersByUsername = new Map(seededUsers.map((user) => [user.username, user]));
  const titles = DEMO_POSTS.map((post) => post.title);
  const { data: existingPosts } = await supabase
    .from("research_posts")
    .select("id, title, author_id")
    .in("title", titles);

  const existingByTitle = new Map(
    (
      (existingPosts ?? []) as {
        id: string;
        title: string;
        author_id: string;
      }[]
    ).map((post) => [post.title, post])
  );

  const createdPostIds: {
    id: string;
    authorId: string;
    health: number;
    hoursAgo: number;
    subTopic: SubTopic;
  }[] = [];

  for (const post of DEMO_POSTS) {
    const existing = existingByTitle.get(post.title);

    if (existing) {
      const author = usersByUsername.get(post.authorUsername);

      if (author && existing.author_id !== author.id) {
        const { error: authorError } = await supabase
          .from("research_posts")
          .update({ author_id: author.id })
          .eq("id", existing.id);

        if (authorError) {
          result.warnings.push(
            `“${post.title}” exists but is not authored by ${post.authorUsername}: ${authorError.message}`
          );
        }
      }

      result.postsSkipped += 1;
      continue;
    }

    const author = usersByUsername.get(post.authorUsername);

    if (!author) {
      result.warnings.push(`Missing author ${post.authorUsername} for “${post.title}”.`);
      continue;
    }

    const inserted = await insertDemoPost(supabase, post, author.id);

    if (!inserted.id) {
      result.warnings.push(inserted.error ?? `Failed to insert “${post.title}”.`);
      continue;
    }

    result.postsCreated += 1;
    createdPostIds.push({
      id: inserted.id,
      authorId: author.id,
      health: post.current_health,
      hoursAgo: post.hoursAgo,
      subTopic: post.sub_topic,
    });

    const stake = Math.max(post.current_health, 1);
    const ledger = await insertLedger(supabase, {
      user_id: author.id,
      amount: stake,
      type: HP_TRANSACTION_STAKE,
      post_id: inserted.id,
      created_at: hoursAgoIso(post.hoursAgo),
      description: `Stake on ${post.sub_topic} research post ${inserted.id}`,
    });

    if (ledger.error) {
      result.warnings.push(ledger.error);
    } else {
      result.transactionsCreated += 1;
    }

    const recorded = await recordTopicQuietly(
      supabase,
      author.id,
      post.sub_topic,
      stake,
      result.warnings
    );

    if (recorded) {
      await supabase
        .from("subtopic_ranks")
        .update({
          tier: author.tier,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", author.id)
        .eq("sub_topic", post.sub_topic);
    }
  }

  for (const [index, post] of createdPostIds.entries()) {
    const voterIds = [
      seededUsers[(index * 3 + 1) % seededUsers.length]?.id,
      seededUsers[(index * 5 + 2) % seededUsers.length]?.id,
      index % 2 === 0 ? adminUserId : null,
    ].filter((id): id is string => Boolean(id) && id !== post.authorId);

    const uniqueVoters = [...new Set(voterIds)];

    for (const [voteIndex, voterId] of uniqueVoters.entries()) {
      await insertDemoVote(
        supabase,
        {
          voterId,
          post,
          hoursAgo: Math.max(post.hoursAgo * (0.5 - voteIndex * 0.15), 0.25),
          strength: ((index + voteIndex) % VOTE_STRENGTH_MAX) + 1,
        },
        result
      );
    }
  }

  return result;
}

async function insertDemoVote(
  supabase: SupabaseClient,
  input: {
    voterId: string;
    post: {
      id: string;
      authorId: string;
      health: number;
      hoursAgo: number;
      subTopic: SubTopic;
    };
    hoursAgo: number;
    strength: number;
  },
  result: DemoSeedResult
) {
  if (input.voterId === input.post.authorId) {
    return;
  }

  const direction = input.post.health <= 40 ? "down" : "up";
  const value = signedVoteValue(direction, input.strength);
  const cost = voteCostHp(input.strength);
  const withHealth = await supabase.from("votes").insert({
    user_id: input.voterId,
    post_id: input.post.id,
    value,
    health_at_vote: input.post.health,
  });
  const { error: voteError } =
    withHealth.error && withHealth.error.message.includes("health_at_vote")
      ? await supabase.from("votes").insert({
          user_id: input.voterId,
          post_id: input.post.id,
          value,
        })
      : withHealth;

  if (voteError) {
    if (voteError.code !== "23505" && !isMissingSchema(voteError.message)) {
      result.warnings.push(voteError.message);
    }
    return;
  }

  result.votesCreated += 1;

  const voteLedger = await insertLedger(supabase, {
    user_id: input.voterId,
    amount: cost,
    type: HP_TRANSACTION_VOTE,
    post_id: input.post.id,
    created_at: hoursAgoIso(input.hoursAgo),
    description: `${direction === "up" ? "Upvote" : "Downvote"} ${input.strength} on research post ${input.post.id}`,
  });

  if (voteLedger.error) {
    result.warnings.push(voteLedger.error);
  } else {
    result.transactionsCreated += 1;
  }

  await recordTopicQuietly(
    supabase,
    input.voterId,
    input.post.subTopic,
    cost,
    result.warnings
  );
}
