# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/ffdln/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/ffdln/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Launch Radar — a token launch radar that ranks pre-token protocols by an implied value fitted from the snapshot's own tokenised comps, and gives each one a costed farm plan. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.

## The model

Implied value is fitted, not asserted. The comps are the snapshot's 128 protocols that record a token with a positive market cap and a positive TVL; a log-log regression of market cap on TVL gives `ln(mcap) = 6.96 + 0.52 x ln(tvl)`, then a bounded growth adjustment (seven-day TVL change, clamped to -60%..+120%, weight 0.5) and a bounded maturity adjustment (0.6 + age/1095 x 0.4) are applied. The fit is weak and the dashboard says so: R2 = 0.19, blind-test median absolute error 96% (69 train / 59 held out, split by a deterministic slug rule). An implied value is a comps-derived estimate with wide uncertainty, never a price.

The board ranks all 198 rankable pre-token protocols: the 40 watchlist protocols plus 158 more the list leaves out. Wrapped, staked and bridged products of a token that already trades, bridges, liquid staking/restaking, CEX products, versioned pools and exchange-named products are set aside with their reason (144 protocols); the 24 largest live-token protocols are shown apart with their market caps.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes the ranked board to `/output/board.json`, the dashboard's data to `/output/data.js`, copies `dashboard/` and `screenshots/` to `/output`, and writes `/output/dossier.json` with the vendored make.fun library. Two runs write the same bytes.

## The dashboard

`dashboard/` is a static page with no network: a sortable, filterable board ranked by implied value, a detail drawer per protocol (the model's own inputs, recomputed in the page, and the farm plan), a live-token view and a set-aside view. Each farm plan's capital follows the protocol's TVL ($50–$250), its gas follows the protocol's own chain (about $6 a transaction on Ethereum, about $1 on a cheap chain), and its hold follows the protocol's age (30–60 days).

---

<sub>Entered on [make.fun](https://make.fun/?ref=630zkzd1&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
