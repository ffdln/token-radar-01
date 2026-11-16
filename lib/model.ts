// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds
// pre-token protocols the watchlist leaves out. A protocol is pre-token when its index entry records
// no token (no market cap, no CoinGecko id, no symbol). Wrapped, staked and bridged products of a
// token that already trades, bridges, liquid staking and restaking, CEX products, versioned pools and
// exchange-named products are set aside, never ranked as pre-token: their token already trades, so
// pricing them as a launch would be a category error. The live-token protocols are kept apart too and
// shown with the market's own values, never mixed into the ranked board.
//
// Implied value is fitted from the snapshot's own tokenised protocols, never from a hardcoded list
// of names. The comps are the 128 protocols that record a token with a positive market cap and a
// positive TVL (one live protocol, autofinance, records a market cap of -1 and is excluded from the
// fit; the fit reports it). The fit is a log-log regression of market cap on TVL:
//
//   ln(mcap_usd) = INTERCEPT + SLOPE x ln(tvl_usd)
//
// fitted by ordinary least squares on the comps, then tested blind: the comps are split in two by a
// deterministic rule (the parity of the sum of the slug's character codes), the fit is re-run on the
// training half, and its predictions are scored against the held-out half's recorded market caps.
// The fit is weak, and the dashboard says so in plain numbers: TVL explains about a fifth of the
// variance in log market cap, and the blind test's median absolute error is about 96%. Implied value
// is therefore a comps-derived estimate with wide uncertainty, never a price. Growth and maturity are
// bounded adjustments on top of the fitted base, stated below, so the model uses the protocol's TVL,
// its seven-day growth and how long it has run with no token, and no name is ever special-cased:
// the same function scores every row.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The comps fit: the regression, its strength, and its blind test. */
export interface CompsFit {
  /** Protocols the fit ran on: live, positive market cap, positive TVL. */
  n: number;
  /** Live protocols left out of the fit because their recorded market cap is not positive. */
  excluded_nonpositive_mcap: number;
  /** ln(mcap) = intercept + slope x ln(tvl). */
  intercept: number;
  slope: number;
  /** Share of the variance in ln(mcap) the fit explains. */
  r2: number;
  /** Blind split: the training half's size, by slug character-code parity. */
  blind_train_n: number;
  /** Blind split: the held-out half's size. */
  blind_test_n: number;
  /** Median |predicted - recorded| / recorded over the held-out half, in per cent. */
  blind_median_abs_pct: number;
  /** 75th percentile of the same error, in per cent. */
  blind_p75_abs_pct: number;
}

/** The model's constants: the fitted base, and the bounded growth and maturity adjustments. */
export interface ModelConstants {
  /** Fitted intercept of ln(mcap) on ln(tvl), from the snapshot's own comps. */
  fit_intercept: number;
  /** Fitted slope of ln(mcap) on ln(tvl), from the snapshot's own comps. */
  fit_slope: number;
  /** Growth multiplier weight: 1 + clamp(change_7d, floor, cap) / 100 x weight. */
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  /** Maturity multiplier: floor + min(age, days) / days x range. */
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  /** Age in days used when a protocol records no listed_at date. */
  unknown_age_days: number;
}

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2-comps';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    fit_intercept: number;
    fit_slope: number;
    fitted_base_usd: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  fitted_base_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  farm_capital_usd: number;
  farm_gas_usd: number;
  farm_tx_count: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** A protocol set aside from the ranked board, with the reason it was set aside. */
export interface SetAsideRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  reason: string;
}

/** Everything the dashboard needs: the board, the live set, the set-aside set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  fit: CompsFit;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  set_aside_size: number;
  rows: RadarRow[];
  live: LiveRow[];
  set_aside: SetAsideRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The parity of the sum of a slug's character codes: the blind split's deterministic rule. */
export function slugParity(slug: string): number {
  let s = 0;
  for (let i = 0; i < slug.length; i++) s += slug.charCodeAt(i);
  return s % 2;
}

/** Ordinary least squares for ln(mcap) on ln(tvl), closed form; null when the sample is too small. */
function logLogFit(rows: SnapshotProtocol[]): { intercept: number; slope: number; r2: number } | null {
  const n = rows.length;
  if (n < 3) return null;
  let sx = 0;
  let sy = 0;
  for (const p of rows) {
    sx += Math.log(p.tvl_usd);
    sy += Math.log(p.mcap_usd!);
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  let sst = 0;
  for (const p of rows) {
    const x = Math.log(p.tvl_usd) - mx;
    const y = Math.log(p.mcap_usd!) - my;
    sxx += x * x;
    sxy += x * y;
    sst += y * y;
  }
  if (sxx <= 0 || sst <= 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ssr = 0;
  for (const p of rows) {
    const r = Math.log(p.mcap_usd!) - (intercept + slope * Math.log(p.tvl_usd));
    ssr += r * r;
  }
  return { intercept, slope, r2: 1 - ssr / sst };
}

/** The comps: tokenised protocols with a positive market cap and a positive TVL. */
export function compsOf(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/**
 * The comps fit and its blind test, from the snapshot alone. The blind split is the slug parity rule:
 * even-parity comps train the fit, odd-parity comps are held out and scored against their recorded
 * market caps. Every number the dashboard reports comes from this function.
 */
export function fitComps(snapshot: Snapshot): CompsFit {
  const comps = compsOf(snapshot);
  const excluded = snapshot.protocols.filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd <= 0).length;
  const fit = logLogFit(comps);
  if (fit === null) throw new SnapshotError('snapshot.json has too few tokenised protocols to fit the comps model');
  const train = comps.filter((p) => slugParity(p.slug) === 0);
  const test = comps.filter((p) => slugParity(p.slug) === 1);
  const trainFit = logLogFit(train);
  if (trainFit === null) throw new SnapshotError('snapshot.json has too few training comps for the blind test');
  const errs = test
    .map((p) => Math.abs(Math.exp(trainFit.intercept + trainFit.slope * Math.log(p.tvl_usd)) - p.mcap_usd!) / p.mcap_usd!)
    .sort((a, b) => a - b);
  const median = errs.length > 0 ? errs[Math.floor(errs.length / 2)]! : 0;
  const p75 = errs.length > 0 ? errs[Math.floor((errs.length * 3) / 4)]! : 0;
  return {
    n: comps.length,
    excluded_nonpositive_mcap: excluded,
    intercept: fit.intercept,
    slope: fit.slope,
    r2: fit.r2,
    blind_train_n: train.length,
    blind_test_n: test.length,
    blind_median_abs_pct: median * 100,
    blind_p75_abs_pct: p75 * 100,
  };
}

/** The model's constants, built from the fitted comps. */
export function modelConstants(fit: CompsFit): ModelConstants {
  return {
    fit_intercept: fit.intercept,
    fit_slope: fit.slope,
    growth_weight: 0.5,
    growth_floor: -60,
    growth_cap: 120,
    maturity_floor: 0.6,
    maturity_range: 0.4,
    maturity_days: 1095,
    unknown_age_days: 365,
  };
}

/** The fitted base value and the multipliers one protocol gets under the model. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): { implied: number; base: number; growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const base = Math.exp(model.fit_intercept + model.fit_slope * Math.log(protocol.tvl_usd));
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult));
  return { implied, base, growthPct, growthMult, maturityMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Exchange names: a protocol beginning with one is the exchange's own product. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Why a pre-token protocol is set aside from the ranked board, or null when it may be ranked.
 * The rule mirrors the watchlist's own exclusions, so a protocol the watchlist names is never
 * set aside: the watchlist is the floor, and the board covers all of it.
 */
export function setAsideReason(p: SnapshotProtocol): string | null {
  if (EXCLUDED_CATEGORIES.has(p.category ?? '')) {
    if (p.category === 'CEX') return 'CEX product';
    if (p.category === 'Bridge' || p.category === 'Canonical Bridge') return 'bridge product';
    return 'staked or restaked product';
  }
  if (VERSIONED.test(p.name)) return 'versioned pool';
  if (WRAPPED_WORD.test(p.name)) return 'wrapped or staked product';
  for (const e of EXCHANGE_PREFIXES) if (p.name.startsWith(e)) return 'exchange product';
  return null;
}

/** Whether a protocol is one the board may rank: pre-token and not set aside. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && setAsideReason(p) === null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every rankable pre-token protocol the watchlist leaves out, whatever its TVL.
  // No rankable protocol is left behind: the board is the whole pre-token universe the rules allow.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      fit_intercept: model.fit_intercept,
      fit_slope: model.fit_slope,
      fitted_base_usd: Math.round(s.base),
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** What one transaction costs on a chain, in whole US dollars, from the chain's usual gas. */
export function gasPerTx(chain: string): number {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 6;
  if (c === 'solana') return 1;
  if (c === 'bitcoin') return 2;
  if (c === 'tron' || c === 'bsc' || c === 'binance' || c === 'bnb chain') return 1;
  if (c === 'base' || c === 'arbitrum' || c === 'optimism' || c === 'polygon' || c === 'zksync' || c === 'linea' || c === 'blast' || c === 'scroll' || c === 'mode' || c === 'world chain' || c === 'unichain' || c === 'ink' || c === 'abstract') return 1;
  return 2;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
export function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
export function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** How many transactions the plan makes: setup, one a week while holding, and the final check. */
export function txCountFor(age: number | null): number {
  return 2 + Math.ceil(holdDaysFor(age) / 7) + 1;
}

/** The whole plan's gas, in whole US dollars, from the chain's gas and the transaction count. */
export function gasTotalFor(p: SnapshotProtocol, age: number | null): number {
  return gasPerTx(chainOf(p)) * txCountFor(age);
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('risk curator') || c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} curator vault on ${chain} and keep the vault shares.`;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the supply open.`;
  if (c.includes('dex') || c.includes('amm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Deposit $${capital} of USDC into ${name}'s main yield vault on ${chain} and keep the shares.`;
  if (c.includes('leveraged farm')) return `Open a $${capital} leveraged position in ${name}'s main farm on ${chain} and keep it open.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('synthetic') || c.includes('algo-stables')) return `Mint $${capital} of the synthetic asset through ${name} on ${chain} and hold it.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('liquid staking')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The weekly qualifying action, flavored by the category. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'Make one qualifying action each week, such as a supply top-up, a small borrow or a vote.';
  if (c.includes('dex') || c.includes('amm')) return 'Make one qualifying action each week, such as a swap, a liquidity top-up or a vote.';
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) return 'Make one qualifying action each week, such as a small trade, a margin top-up or a vote.';
  if (c.includes('rwa')) return 'Make one qualifying action each week, such as a mint top-up, a hold check or a vote.';
  if (c.includes('prediction')) return 'Make one qualifying action each week, such as a new market position or a vote.';
  return 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.';
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 * Gas is priced per transaction on the protocol's own chain, so the same plan costs about $6 a
 * transaction on Ethereum and about $1 on a cheap chain.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasPerTx(chain);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: `about $${gas} of gas for the first transaction`,
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: weeklyFor(p),
      cost: `about $${gas} of gas a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** The pre-token protocols set aside from the ranked board, by TVL, with their reason. */
export function setAsideRows(snapshot: Snapshot): SetAsideRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && setAsideReason(p) !== null)
    .sort((a, b) => b.tvl_usd - a.tvl_usd)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      reason: setAsideReason(p)!,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  const age = row.age_days;
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    fitted_base_usd: row.model.fitted_base_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    farm_capital_usd: capitalFor({ tvl_usd: row.tvl_usd } as SnapshotProtocol),
    farm_gas_usd: gasTotalFor({ chains: row.chains, tvl_usd: row.tvl_usd } as SnapshotProtocol, age),
    farm_tx_count: txCountFor(age),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const fit = fitComps(snapshot);
  const model = modelConstants(fit);
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const setAside = setAsideRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    fit,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    set_aside_size: setAside.length,
    rows: board.map(radarRow),
    live,
    set_aside: setAside,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
