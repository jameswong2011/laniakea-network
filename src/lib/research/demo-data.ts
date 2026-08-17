import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { VOTE_COST_HP } from "@/lib/research/economy";
import { recordSubtopicParticipation } from "@/lib/research/subtopic-ranks";
import {
  HP_TRANSACTION_STAKE,
  HP_TRANSACTION_VOTE,
  RESEARCH_POST_STATUS_LIVE,
  VOTE_DOWN,
  VOTE_UP,
  type Role,
  type SubTopic,
  type Tier,
} from "@/types";

export const DEMO_PASSWORD = "LaniakeaDemo!26";

export type DemoUserSeed = {
  username: string;
  display_name: string;
  tier: Tier;
  role: Exclude<Role, "admin">;
  current_hp: number;
  utility_tokens: number;
};

export type DemoPostSeed = {
  title: string;
  body: string;
  sub_topic: SubTopic;
  current_health: number;
  authorUsername: string;
  hoursAgo: number;
};

export const DEMO_USERS: DemoUserSeed[] = [
  {
    username: "demo_vale_hart",
    display_name: "Vale Hart",
    tier: "Bronze",
    role: "member",
    current_hp: 52,
    utility_tokens: 70,
  },
  {
    username: "demo_nara_quinn",
    display_name: "Nara Quinn",
    tier: "Bronze",
    role: "member",
    current_hp: 74,
    utility_tokens: 85,
  },
  {
    username: "demo_elio_voss",
    display_name: "Elio Voss",
    tier: "Bronze",
    role: "elite",
    current_hp: 91,
    utility_tokens: 60,
  },
  {
    username: "demo_mira_chen",
    display_name: "Mira Chen",
    tier: "Silver",
    role: "member",
    current_hp: 124,
    utility_tokens: 90,
  },
  {
    username: "demo_jonas_reed",
    display_name: "Jonas Reed",
    tier: "Silver",
    role: "member",
    current_hp: 158,
    utility_tokens: 110,
  },
  {
    username: "demo_priya_shah",
    display_name: "Priya Shah",
    tier: "Silver",
    role: "elite",
    current_hp: 181,
    utility_tokens: 95,
  },
  {
    username: "demo_owen_blake",
    display_name: "Owen Blake",
    tier: "Gold",
    role: "member",
    current_hp: 236,
    utility_tokens: 100,
  },
  {
    username: "demo_sasha_kline",
    display_name: "Sasha Kline",
    tier: "Gold",
    role: "member",
    current_hp: 279,
    utility_tokens: 120,
  },
  {
    username: "demo_helen_ortiz",
    display_name: "Helen Ortiz",
    tier: "Gold",
    role: "elite",
    current_hp: 318,
    utility_tokens: 80,
  },
  {
    username: "demo_marcus_dale",
    display_name: "Marcus Dale",
    tier: "Platinum",
    role: "member",
    current_hp: 372,
    utility_tokens: 130,
  },
  {
    username: "demo_yuna_park",
    display_name: "Yuna Park",
    tier: "Platinum",
    role: "member",
    current_hp: 448,
    utility_tokens: 140,
  },
  {
    username: "demo_theo_nilsen",
    display_name: "Theo Nilsen",
    tier: "Platinum",
    role: "elite",
    current_hp: 511,
    utility_tokens: 105,
  },
  {
    username: "demo_irene_wahl",
    display_name: "Irene Wahl",
    tier: "Masters",
    role: "member",
    current_hp: 646,
    utility_tokens: 160,
  },
  {
    username: "demo_cyrus_ade",
    display_name: "Cyrus Ade",
    tier: "Masters",
    role: "member",
    current_hp: 762,
    utility_tokens: 175,
  },
  {
    username: "demo_lina_moreau",
    display_name: "Lina Moreau",
    tier: "Masters",
    role: "elite",
    current_hp: 891,
    utility_tokens: 150,
  },
];

export const DEMO_POSTS: DemoPostSeed[] = [
  {
    title: "UnitedHealth utilization reset: the multiple is the risk, not membership",
    body: "Membership trends remain intact. The debate is medical-cost trend and how long the Street will pay a premium multiple while utilization normalizes. We would rather own the name on a 5–7% drawdown than chase the first print that looks clean. Watch Medicare Advantage risk scores and outpatient intensity; if both stabilize together, the earnings trough is closer than the tape implies. Position as a quality compounder, not a momentum health-care trade.",
    sub_topic: "Healthcare",
    current_health: 118,
    authorUsername: "demo_lina_moreau",
    hoursAgo: 4,
  },
  {
    title: "Eli Lilly obesity franchise: capacity, net price, and the 2027 cliff",
    body: "Demand is not the question. Manufacturing scale and net pricing are. The bull case needs another step-up in incretin capacity without a disorderly price war in the next cohort of oral competitors. We model a slower volume ramp and still get an attractive free-cash-yield by 2027 if the franchise holds share in the high-value indication. The risk is not a demand air-pocket; it is a two-year period where capex stays elevated and the multiple compresses anyway.",
    sub_topic: "Healthcare",
    current_health: 44,
    authorUsername: "demo_helen_ortiz",
    hoursAgo: 11,
  },
  {
    title: "Hospital labor has peaked; regional systems are the cleaner expression",
    body: "Contract labor and wage inflation look rolled over in the better-run regional systems. National chains still carry integration and payer-mix noise. We prefer operators with a single-state density story and a credible ambulatory shift. If admissions stay flattish, margin recovery comes from mix and agency-spend reversal, not top-line heroics. This is a 12-month operating-leverage tape, not a volume-recovery tape.",
    sub_topic: "Healthcare",
    current_health: 76,
    authorUsername: "demo_mira_chen",
    hoursAgo: 20,
  },
  {
    title: "Novo Nordisk: the compounding risk is manufacturing, not prescriptions",
    body: "Prescription momentum remains exceptional. The constraint is still fill rates and the pace at which new capacity is qualified. We would fade narrative spikes around any single-quarter beat and accumulate on manufacturing slippage. The franchise can absorb a slower script trend; it cannot absorb a loss of confidence in supply. Treat this as an industrial-scale problem wearing a health-care multiple.",
    sub_topic: "Healthcare",
    current_health: 22,
    authorUsername: "demo_nara_quinn",
    hoursAgo: 31,
  },
  {
    title: "JPMorgan NII: deposit beta is the only number that matters from here",
    body: "Loan growth is fine. Fee income is fine. The stock will trade the path of deposit costs versus the implied forward curve. If beta stays contained as cuts arrive, NII is more resilient than a simple peak-rate fade suggests. We are not paying for a re-acceleration in dealmaking; we are paying for a balance sheet that can defend the dividend and still grow tangible book. Prefer this over a basket of regionals until the deposit story is cleaner.",
    sub_topic: "Banks",
    current_health: 132,
    authorUsername: "demo_cyrus_ade",
    hoursAgo: 6,
  },
  {
    title: "European bank capital return is real; the risk is political, not credit",
    body: "CET1 is excess, not theoretical. Buybacks and special dividends are the equity story. Credit quality is not the near-term break. The break is a political intervention on distributions or a sudden change in the sovereign-bank loop. We would own the surplus-capital names with already-announced return programs and avoid the ones that still need a regulatory blessing every quarter. This is a cash-return book with a policy tail.",
    sub_topic: "Banks",
    current_health: 58,
    authorUsername: "demo_theo_nilsen",
    hoursAgo: 15,
  },
  {
    title: "US regionals: CRE is in the price; fee income is not",
    body: "Office CRE has been marked in the better disclosures. The next distinction is who can grow treasury-management and wealth fees while the securities book still rolls. We want cheap deposits, a contained office book, and a fee line that is not just mortgage. The cheap names that are only cheap on a tangible-book print are value traps if they cannot generate capital internally. Underwrite the operating account, not the office footnote.",
    sub_topic: "Banks",
    current_health: 36,
    authorUsername: "demo_jonas_reed",
    hoursAgo: 27,
  },
  {
    title: "CrowdStrike: platform attach is the bull case, not endpoint share",
    body: "Endpoint share is already in the multiple. The next 24 months are about module attach, net retention, and whether the platform can keep displacing point products after a noisy incident year. We would own it as a platform-expansion story with a higher bar for execution, not as a clean-growth multiple. If attach stalls, the stock becomes a high-quality compounder at a lower number. That is still interesting. Chasing a re-rating on logos alone is not.",
    sub_topic: "Cybersecurity",
    current_health: 101,
    authorUsername: "demo_irene_wahl",
    hoursAgo: 8,
  },
  {
    title: "Palo Alto: SASE mix versus a crowded network-security tape",
    body: "The strategic case is the mix shift into SASE and a tighter software attachment story. The tactical case is that every large-cap network-security name is selling a version of the same consolidation pitch. We want evidence of deal size expansion, not just billings optics. Prefer this on a pullback when the market treats it as a hardware leftover. Do not pay a software multiple for a transition that still has to be proven in the next two prints.",
    sub_topic: "Cybersecurity",
    current_health: 47,
    authorUsername: "demo_sasha_kline",
    hoursAgo: 18,
  },
  {
    title: "Cyber budgets are not discretionary this cycle; buy seat-expansion vendors",
    body: "Boards are not cutting the cyber line the way they cut marketing. The better vendors are still expanding seats and modules inside existing accounts. That is a different underwriting problem than a new-logo land-grab. We would rather own the names with demonstrated net-retention and a path to platform pricing than the ones that need a new category to justify the print. This is a maintenance-capex industry wearing a growth multiple. Underwrite it that way.",
    sub_topic: "Cybersecurity",
    current_health: 83,
    authorUsername: "demo_priya_shah",
    hoursAgo: 22,
  },
  {
    title: "Cyber insurance pricing is the leading indicator for vendor spend",
    body: "When insurance pricing tightens, control requirements follow, and that shows up in vendor attach with a lag. We are watching primary cyber-insurance rates and claims frequency as a cleaner tell than CIO surveys. If pricing stays firm, the spending cycle has another year. If it breaks, the first cut is not the platform vendor; it is the long tail of point tools. Position accordingly: own the control plane, not the catalog.",
    sub_topic: "Cybersecurity",
    current_health: 19,
    authorUsername: "demo_elio_voss",
    hoursAgo: 40,
  },
  {
    title: "Microsoft Azure: inference is a margin story before it is a revenue story",
    body: "The Azure print will keep looking noisy while training clusters and inference workloads move around. The investment question is whether incremental AI revenue drops through at a better margin than the last wave of consumption. We think it does, with a lag. That supports the multiple if capex discipline holds. It does not support paying any price for a single-quarter acceleration. Own it as the default enterprise distribution layer, not as a pure-play AI beta.",
    sub_topic: "Technology",
    current_health: 141,
    authorUsername: "demo_lina_moreau",
    hoursAgo: 3,
  },
  {
    title: "TSMC is the bottleneck equity; everything else is a derivative",
    body: "If you need one clean expression of the AI hardware cycle, it is still the foundry that can actually deliver leading-edge wafers. Downstream names are claims on the same scarce capacity with more customer and product risk. We would rather hold the bottleneck and finance the rest around it. The bear case is a sharper capex pause from the largest customers. Even then, the utilization math is better here than in most of the equipment tape.",
    sub_topic: "Technology",
    current_health: 88,
    authorUsername: "demo_yuna_park",
    hoursAgo: 13,
  },
  {
    title: "Apple services: the multiple needs net adds, not just installed base",
    body: "Services growth that is only price and mix will not hold this multiple if hardware units stay soft. We need to see net adds in the higher-value subscriptions, not just ARPU on a flat base. The stock can work as a cash-return vehicle either way. It cannot work as a growth compounder without a cleaner services unit story. We are patient, not reflexive buyers, until the next couple of prints separate price from participation.",
    sub_topic: "Technology",
    current_health: 41,
    authorUsername: "demo_owen_blake",
    hoursAgo: 25,
  },
  {
    title: "NVIDIA CUDA lock-in versus custom silicon: a 24-month debate, not a quarter",
    body: "Custom silicon will take share at the margin. That is not the same as breaking the software lock. The next two years are about how much inference moves off the general-purpose GPU and at what price. We would not run a binary short on that headline. We would also not treat every pullback as a gift if the largest customers start signaling a longer interpolation cycle. Size the position as a cycle, not as a religion.",
    sub_topic: "Technology",
    current_health: 29,
    authorUsername: "demo_vale_hart",
    hoursAgo: 38,
  },
  {
    title: "The last mile of disinflation is a labor story, not a goods story",
    body: "Goods deflation has done the easy work. The remaining CPI gap is housing and services, which means wages, quits, and the unemployment rate, not container rates. We would fade the first clean goods print that the market treats as mission accomplished. Duration can still work, but the path is choppier than a simple 'cuts are here' slogan. Position for a labor-market glide path, not a goods-led victory lap.",
    sub_topic: "Macro",
    current_health: 96,
    authorUsername: "demo_irene_wahl",
    hoursAgo: 9,
  },
  {
    title: "Treasury term premium: fade the first 25bp, not the cycle",
    body: "A single cut does not dissolve term premium if issuance stays heavy and the front end is already priced. We would sell the first celebratory rally in long duration and keep dry powder for a proper growth scare. The curve can steepen for the wrong reasons. That is not a reason to be structurally short duration; it is a reason to be tactical. The better expression is intermediates until the labor data forces the long end to do real work.",
    sub_topic: "Macro",
    current_health: 53,
    authorUsername: "demo_marcus_dale",
    hoursAgo: 16,
  },
  {
    title: "Dollar tightness and EM: fund the surplus names only",
    body: "A sticky dollar is not a blanket EM short. It is a screen. We want current-account surplus, credible local policy, and an export mix that is not just China-beta. The rest of the complex is a funding trade dressed up as a growth story. If the dollar breaks, those names will work too — later, and with worse risk/reward. Until then, be paid to wait in the surplus set.",
    sub_topic: "Macro",
    current_health: 67,
    authorUsername: "demo_sasha_kline",
    hoursAgo: 29,
  },
  {
    title: "Saudi spare capacity is the ceiling; US shale is the floor",
    body: "The oil tape is a corridor, not a trend, until one of those two constraints moves. We would fade both the $100 spike narrative and the structural-demand-death narrative. The tradable range is defined by OPEC+ reaction function on the way up and US shale response on the way down. Equities that only work outside that corridor are options, not core holdings. Prefer balance-sheet strength and buyback coverage inside the range.",
    sub_topic: "Energy",
    current_health: 109,
    authorUsername: "demo_cyrus_ade",
    hoursAgo: 7,
  },
  {
    title: "European gas storage is a weather option, not a structural short",
    body: "Storage looks comfortable until a late-winter draw or a supply interruption reopens the risk premium. We would not run a structural short on European gas-linked equities from a full-storage headline. We would also not pay a crisis multiple for a weather option. The cleaner book is the midstream and utility names that get paid to move and store molecules either way. Leave the directional gas bet to the curve.",
    sub_topic: "Energy",
    current_health: 38,
    authorUsername: "demo_owen_blake",
    hoursAgo: 21,
  },
  {
    title: "US power: interconnection queues are the constraint, not generation tech",
    body: "The bottleneck is not whether solar, gas, or nuclear can be built in theory. It is whether projects can get a queue position, a transformer, and a wire. That supports the owners of scarce interconnect and the equipment names tied to grid hardware. It is a slower, more political capex cycle than a simple data-center megawatt headline. Underwrite permitting and copper, not the press release.",
    sub_topic: "Energy",
    current_health: 72,
    authorUsername: "demo_yuna_park",
    hoursAgo: 14,
  },
  {
    title: "Oil majors' buybacks survive $70; the cut is in growth capex",
    body: "The integrated majors have already told the market what they will protect: the dividend and a base buyback. Growth projects slip first. That is not bearish for the equity if the market is still underwriting a growth-capex renaissance. We would own the names that can hold distributions at $70 and treat $90 as surplus, not as a new baseline. This is a cash-return sector again. Trade it that way.",
    sub_topic: "Energy",
    current_health: 16,
    authorUsername: "demo_elio_voss",
    hoursAgo: 44,
  },
];

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

async function updateDemoProfile(
  supabase: SupabaseClient,
  id: string,
  user: DemoUserSeed
) {
  const withTokens = await supabase
    .from("profiles")
    .update({
      display_name: user.display_name,
      role: user.role,
      tier: user.tier,
      current_hp: user.current_hp,
      utility_tokens: user.utility_tokens,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (!withTokens.error || !withTokens.error.message.includes("utility_tokens")) {
    return { error: withTokens.error?.message ?? null };
  }

  const legacy = await supabase
    .from("profiles")
    .update({
      display_name: user.display_name,
      role: user.role,
      tier: user.tier,
      current_hp: user.current_hp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return { error: legacy.error?.message ?? null };
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

    const updated = await updateDemoProfile(supabase, existing.profile.id, user);

    return {
      user: { ...user, id: existing.profile.id },
      created: false,
      error: updated.error,
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

  const userId = data.user?.id;
  let found = userId
    ? { profile: { id: userId, username: user.username, role: user.role }, error: null }
    : await findProfileByUsername(supabase, user.username);

  if (!found.profile) {
    found = await findProfileByUsername(supabase, user.username);
  }

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

  const updated = await updateDemoProfile(supabase, found.profile.id, user);

  return {
    user: { ...user, id: found.profile.id },
    created: Boolean(data.user?.id && !error),
    error: updated.error,
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
    } else {
      result.usersUpdated += 1;
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
    .select("id, title")
    .in("title", titles);

  const existingByTitle = new Map(
    ((existingPosts ?? []) as { id: string; title: string }[]).map((post) => [
      post.title,
      post.id,
    ])
  );

  const createdPostIds: {
    id: string;
    authorId: string;
    health: number;
    hoursAgo: number;
    subTopic: SubTopic;
  }[] = [];

  for (const post of DEMO_POSTS) {
    const existingId = existingByTitle.get(post.title);

    if (existingId) {
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

  const voteTargets = createdPostIds.map((post, index) => {
    const peer = seededUsers[(index * 3 + 1) % seededUsers.length];
    const adminVote = index % 3 === 0;

    return {
      post,
      voterId:
        peer && peer.id !== post.authorId ? peer.id : seededUsers.find((user) => user.id !== post.authorId)?.id,
      includeAdmin: adminVote && post.authorId !== adminUserId,
    };
  });

  for (const target of voteTargets) {
    if (target.voterId) {
      await insertDemoVote(
        supabase,
        {
          voterId: target.voterId,
          post: target.post,
          hoursAgo: Math.max(target.post.hoursAgo * 0.45, 0.5),
        },
        result
      );
    }

    if (target.includeAdmin) {
      await insertDemoVote(
        supabase,
        {
          voterId: adminUserId,
          post: target.post,
          hoursAgo: Math.max(target.post.hoursAgo * 0.2, 0.25),
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
  },
  result: DemoSeedResult
) {
  if (input.voterId === input.post.authorId) {
    return;
  }

  const value = input.post.health <= 40 ? VOTE_DOWN : VOTE_UP;
  const { error: voteError } = await supabase.from("votes").insert({
    user_id: input.voterId,
    post_id: input.post.id,
    value,
  });

  if (voteError) {
    if (voteError.code !== "23505" && !isMissingSchema(voteError.message)) {
      result.warnings.push(voteError.message);
    }
    return;
  }

  result.votesCreated += 1;

  const voteLedger = await insertLedger(supabase, {
    user_id: input.voterId,
    amount: VOTE_COST_HP,
    type: HP_TRANSACTION_VOTE,
    post_id: input.post.id,
    created_at: hoursAgoIso(input.hoursAgo),
    description: `${value === VOTE_UP ? "Upvote" : "Downvote"} on research post ${input.post.id}`,
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
    VOTE_COST_HP,
    result.warnings
  );
}
