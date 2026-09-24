// Mock-wallet browser checks (no keys, no funds): wrong network, API down, receipt timeout, loading position.
// Run: build with NEXT_PUBLIC_ENABLE_TRANSACTIONS=true, `next start -p 3411`, then `node tests/mock-wallet-fixes.mjs`
// Needs playwright-core (+ a Chromium) installed OUTSIDE the project; it is deliberately not a project dependency.
import { chromium } from "playwright-core";
const URL = "http://localhost:3411/";
const ADDR = "0x1111111111111111111111111111111111111111";
const USDG = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";
const zero32 = "0x" + "0".repeat(64);
const w = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");
let results = [];
const ok = (name, cond, extra = "") => { results.push([cond ? "PASS" : "FAIL", name, extra]); console.log(cond ? "[PASS]" : "[FAIL]", name, extra); };

let blockTick = 0;
function rpcHandler(delayMs = 0, simMode = null, badConfig = false, gateError = false) {
  const one = (r) => {
    const { method, params, id } = r; let result = null;
    if (method === "eth_chainId") result = "0x1237";
    else if (method === "eth_blockNumber") result = "0x" + (16 + blockTick++).toString(16); // advances so viem keeps polling for receipts
    else if (method === "eth_getBalance") result = w(10n ** 18n);
    else if (method === "eth_getTransactionReceipt") result = null;
    else if (method === "eth_getTransactionByHash") result = { hash: params[0], from: ADDR, to: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd", nonce: "0x1", blockHash: null, blockNumber: null, transactionIndex: null, input: "0x", value: "0x0", gas: "0x30000", gasPrice: "0x1", type: "0x0", chainId: "0x1237", v: "0x0", r: "0x1", s: "0x1" }; // pending tx, so viem keeps waiting
    else if (method === "eth_getBlockByNumber") result = { number: "0x10", hash: "0x" + "1".repeat(64), timestamp: "0x1", baseFeePerGas: "0x1", transactions: [], gasLimit: "0x1c9c380", parentHash: "0x" + "0".repeat(64) };
    else if (method === "eth_call") {
      const to = params[0].to.toLowerCase(), d = (params[0].data || params[0].input || "").slice(0, 10);
      if (d === "0x70a08231") result = to === USDG ? w(5000n * 10n ** 6n) : w(1000n * 10n ** 18n);
      else if (d === "0x07a2d13a") result = w(1000n * 10n ** 6n);
      else if (d === "0xdd62ed3e") result = w(0);
      else if (d === "0x38d52e0f") result = "0x" + "0".repeat(24) + (badConfig ? "2".repeat(40) : USDG.slice(2)); // vault.asset()
      else if (d === "0x313ce567") result = w(6); // USDG.decimals()
      else if (["0x7e729ac4","0x93ab2ab7","0x54cde13e","0x8eede801"].includes(d)) { if (gateError) return { jsonrpc: "2.0", id, error: { code: -32000, message: "gate read failed" } }; result = zero32; }
      else if (simMode && ["0xb460af94", "0x6e553f65", "0x095ea7b3"].includes(d)) {
        return simMode === "revert"
          ? { jsonrpc: "2.0", id, error: { code: 3, message: "execution reverted", data: "0x4e487b71" + "0".repeat(62) + "11" } }
          : { jsonrpc: "2.0", id, error: { code: -32000, message: "upstream unavailable" } };
      } else result = w(1);
    } else if (method === "eth_estimateGas") result = "0x30000";
    else if (method === "eth_gasPrice") result = "0x1";
    else if (method === "eth_maxPriorityFeePerGas") result = "0x1";
    return { jsonrpc: "2.0", id, result };
  };
  return async (route) => {
    const body = JSON.parse(route.request().postData());
    if (delayMs) await new Promise(r => setTimeout(r, delayMs));
    const res = Array.isArray(body) ? body.map(one) : one(body);
    await route.fulfill({ status: 200, contentType: "application/json", headers: {"access-control-allow-origin":"*"}, body: JSON.stringify(res) });
  };
}

async function setup(browser, { chain = "0x1237", rejectSwitch = false, delay = 0, apiDown = false, install = false, receiptStatus = null, path = "/", simMode = null, reject = false, badConfig = false, receiptError = false, liquidityUsd = 36000000, gateError = false, apiDelay = 0, noWallet = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  if (!noWallet) await page.addInitScript(({ ADDR, chain, rejectSwitch, reject }) => {
    window.__calls = []; window.__ls = {}; let cur = chain;
    window.ethereum = {
      request: async ({ method, params }) => {
        window.__calls.push(method);
        if (method === "eth_accounts" || method === "eth_requestAccounts") return [ADDR];
        if (method === "eth_chainId") return cur;
        if (method === "wallet_switchEthereumChain") { if (rejectSwitch) { const e = new Error("User rejected"); e.code = 4001; throw e; } cur = "0x1237"; return null; }
        if (method === "eth_sendTransaction") { if (reject) { const e = new Error("User rejected the request."); e.code = 4001; throw e; } return "0x" + "ab".repeat(32); }
        if (method === "eth_estimateGas") return "0x30000";
        if (method === "eth_getTransactionCount") return "0x1";
        if (method === "eth_gasPrice" || method === "eth_maxPriorityFeePerGas") return "0x1";
        if (method === "eth_getBlockByNumber") return { baseFeePerGas: "0x1", number: "0x10", timestamp: "0x1", transactions: [], gasLimit: "0x1c9c380" };
        return null;
      },
      on(ev, cb) { (window.__ls[ev] ||= []).push(cb); }, removeListener() {},
    };
    window.__ls = window.__ls || {}; window.__emit = (ev, arg) => (window.__ls[ev] || []).forEach((cb) => cb(arg));
  }, { ADDR, chain, rejectSwitch, reject });
  const base = rpcHandler(delay, simMode, badConfig, gateError);
  const receipt = (status) => ({ status, transactionHash: "0x" + "ab".repeat(32), blockNumber: "0x10", blockHash: "0x" + "1".repeat(64), transactionIndex: "0x0", from: ADDR, to: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd", cumulativeGasUsed: "0x1", gasUsed: "0x1", effectiveGasPrice: "0x1", logs: [], logsBloom: "0x" + "0".repeat(512), type: "0x2", contractAddress: null });
  await page.route("https://rpc.mainnet.chain.robinhood.com/**", async (route) => {
    const body = JSON.parse(route.request().postData());
    const isRcpt = (r) => r.method === "eth_getTransactionReceipt";
    const rs = typeof receiptStatus === "function" ? receiptStatus() : receiptStatus;
    if ((rs || receiptError) && (Array.isArray(body) ? body.some(isRcpt) : isRcpt(body))) {
      const one = (r) => receiptError && isRcpt(r) ? { jsonrpc: "2.0", id: r.id, error: { code: -32000, message: "rpc hiccup" } } : { jsonrpc: "2.0", id: r.id, result: isRcpt(r) && rs ? receipt(rs) : null };
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(Array.isArray(body) ? body.map(one) : one(body)) });
    }
    return base(route);
  });
  if (liquidityUsd !== 36000000) await page.route("**/api/strategy", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ strategy: { address: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd", name: "Steakhouse USDG", totalAssetsUsd: 492000000, liquidityUsd, totalAssets: 492000000, liquidity: liquidityUsd, sharePrice: 1.0078, netApy: 0.0391, avgNetApy: 0.0392, performanceFee: 0, managementFee: 0, listed: true, assetPriceUsd: 1 }, fetchedAt: new Date().toISOString() }) }));
  if (apiDelay) await page.route("**/api/strategy", async (r) => { await new Promise((x) => setTimeout(x, apiDelay)); await r.continue(); });
  if (apiDown) await page.route("**/api/strategy", r => r.fulfill({ status: 503, body: '{"error":"x"}', contentType: "application/json" }));
  if (install) await page.clock.install();
  await page.goto(URL.replace(/\/$/, "") + path);
  return { ctx, page };
}
const btn = (page) => page.locator("#earn-module button").filter({ hasText: /Earn with USDG|Withdraw USDG|Switch to Robinhood Chain|Connect Wallet|Transactions pending|Vault gate|Vault configuration|Enter an amount|Amount exceeds|ETH needed|Data outdated|Vault data|Loading|Simulation|Checking/i }).last();

const browser = await chromium.launch();

// A: wrong network
{ const { ctx, page } = await setup(browser, { chain: "0x1" }); await page.waitForTimeout(1500);
  const b = btn(page); const txt = await b.innerText();
  ok("A1 wrong network: CTA reads 'Switch to Robinhood Chain'", /Switch to Robinhood Chain/.test(txt), txt.trim());
  ok("A2 wrong network: CTA is enabled", await b.isEnabled());
  await b.click(); await page.waitForTimeout(800);
  const calls = await page.evaluate(() => window.__calls);
  ok("A3 click calls wallet_switchEthereumChain", calls.includes("wallet_switchEthereumChain"));
  ok("A4 after switch the wrong-network banner is gone", (await page.getByText("wrong network").count()) === 0);
  await ctx.close(); }
{ const { ctx, page } = await setup(browser, { chain: "0x1", rejectSwitch: true }); await page.waitForTimeout(1500);
  await btn(page).click(); await page.waitForTimeout(600);
  ok("A5 rejected switch: shows 'rejected' message, no addChain", (await page.getByText(/rejected the network switch/i).count()) > 0 && !(await page.evaluate(() => window.__calls)).includes("wallet_addEthereumChain"));
  await ctx.close(); }

// B: Morpho API down
{ const { ctx, page } = await setup(browser, { apiDown: true }); await page.waitForTimeout(2500);
  await page.locator("#earn-module").getByRole("button", { name: /^withdraw$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(1800); // debounce + simulation
  const b = btn(page);
  ok("B1 API down: Withdraw button enabled", (await b.innerText()).includes("Withdraw USDG") && await b.isEnabled(), (await b.innerText()).trim());
  await page.screenshot({ path: "b-api-down-withdraw.png" });
  await page.locator("#earn-module").getByRole("button", { name: /^deposit$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  ok("B2 API down: Deposit still disabled (needs fresh data)", !(await btn(page).isEnabled()));
  await ctx.close(); }

// C: receipt never arrives -> pending
{ const { ctx, page } = await setup(browser, { install: true }); await page.waitForTimeout(2500);
  await page.locator("#earn-module").getByRole("button", { name: /^withdraw$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  await btn(page).click(); await page.waitForTimeout(1500);
  await page.clock.fastForward(200000); await page.waitForTimeout(1500);
  const dlg = await page.getByRole("dialog").innerText().catch(() => "");
  ok("C1 receipt timeout: dialog says 'Still pending', not an error", /Still pending/.test(dlg) && /do not resend/i.test(dlg), dlg.replace(/\n/g," | ").slice(0,120));
  ok("C2 explorer link to the sent tx is shown", (await page.locator('a[href*="/tx/0xabab"]').count()) > 0);
  ok("C3 no 'Transaction not completed' error toast", (await page.getByText("Transaction not completed").count()) === 0);
  await page.screenshot({ path: "c-pending.png" });
  await ctx.close(); }

// D: position loading is not zero
{ const { ctx, page } = await setup(browser, { delay: 2500, path: "/position" }); await page.waitForTimeout(700);
  const t = await page.locator("main").innerText();
  ok("D1 while position loads: no '$0.00 supplied' and no '0' shares", !/\$0\.00 supplied/.test(t) && /Loading/.test(t), (t.match(/Loading[^\n]*/g)||[]).slice(0,3).join(" / "));
  await page.waitForTimeout(12000);
  const t2 = await page.locator("main").innerText();
  ok("D2 after load: real value appears", /\$99[89]\.|\$1,000\./.test(t2));
  await ctx.close(); }

// E: reverted receipt -> failure text is visible (toast and dialog), never "confirmed"
{ const { ctx, page } = await setup(browser, { receiptStatus: "0x0" }); await page.waitForTimeout(2500);
  await page.locator("#earn-module").getByRole("button", { name: /^withdraw$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  await btn(page).click();
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: /reverted on-chain/ });
  await toast.first().waitFor({ timeout: 8000 }).catch(() => {});
  const t = (await toast.allInnerTexts()).join(" / ").replace(/\n+/g, " | ");
  ok("E1 reverted receipt: toast says the withdrawal reverted on-chain", /Transaction not completed/.test(t) && /withdrawal transaction reverted on-chain/i.test(t), t);
  ok("E2 reverted receipt: never shown as confirmed", (await page.getByText("Transaction confirmed").count()) === 0);
  await ctx.close(); }

// F: a read still in flight when the wallet disconnects must not resurface after reconnecting
{ const { ctx, page } = await setup(browser, { delay: 3000, path: "/position" }); await page.waitForTimeout(800);
  await page.evaluate(() => window.__emit("accountsChanged", [])); await page.waitForTimeout(8500); // the old read resolves now
  await page.getByRole("button", { name: /Connect Wallet/i }).first().click(); await page.waitForTimeout(800); // new read still pending
  const t = await page.locator("main").innerText();
  ok("F1 disconnect then reconnect: shows Loading, never the old read's value", /Loading position/i.test(t) && !/[0-9] USDG/.test(t.split("Earn with USDG")[0]), (t.match(/Loading position[^\n]*|\$[0-9,.]+ supplied/) || [""])[0]);
  await ctx.close(); }

// G: account switched while a transaction is pending -> old operation is invalidated
{ const { ctx, page } = await setup(browser, { install: true }); await page.waitForTimeout(2500);
  await page.locator("#earn-module").getByRole("button", { name: /^withdraw$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  await btn(page).click(); await page.waitForTimeout(1500);
  await page.evaluate(() => window.__emit("accountsChanged", ["0x2222222222222222222222222222222222222222"])); await page.waitForTimeout(500);
  await page.clock.fastForward(200000); await page.waitForTimeout(1500);
  ok("G1 account switched mid-operation: dialog closed, old 'Still pending' not shown", (await page.getByRole("dialog").count()) === 0 && (await page.getByText("Still pending").count()) === 0);
  await ctx.close(); }


// H: Yield Check shows real simulation states, and the CTA says why it is blocked
for (const [mode, expectWord, expectCta] of [[null, "Passed", /Withdraw USDG/], ["revert", "Failed", /Simulation failed/], ["error", "Unavailable", /Withdraw USDG/]]) {
  const { ctx, page } = await setup(browser, { simMode: mode }); await page.waitForTimeout(2500);
  await page.locator("#earn-module").getByRole("button", { name: /^withdraw$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(2200);
  const row = await page.locator("#earn-module li", { hasText: "Are data and simulation current?" }).innerText();
  const simLine = row.split("\n").slice(row.split("\n").findIndex((x) => /Transaction simulation/.test(x))).join(" | ");
  const cta = await btn(page).innerText();
  ok(`H simulation ${mode ?? "ok"}: Yield Check shows ${expectWord}, CTA "${cta.trim()}"`, simLine.includes(expectWord) && expectCta.test(cta), simLine.slice(0, 120));
  await ctx.close();
}

// I: rejecting the signature is its own state ("Rejected by user"), not a failure
{ const { ctx, page } = await setup(browser, { reject: true }); await page.waitForTimeout(2500);
  await page.locator("#earn-module").getByRole("button", { name: /^withdraw$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  await btn(page).click(); await page.waitForTimeout(2500);
  const d = await page.getByRole("dialog").innerText().catch(() => "");
  ok("I1 rejected signature: dialog says 'Rejected by user' and 'Nothing was sent'", /Rejected by user/i.test(d) && /Nothing was sent/.test(d), d.replace(/\n+/g, " | ").slice(0, 100));
  ok("I2 rejected signature: no error toast", (await page.getByText("Transaction not completed").count()) === 0);
  await ctx.close(); }

// J: deposit = two steps, the deposit is re-simulated after approval, ends Confirmed
{ const { ctx, page } = await setup(browser, { receiptStatus: "0x1" }); await page.waitForTimeout(2500);
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(2200);
  await btn(page).click(); await page.waitForTimeout(6000);
  const d = await page.getByRole("dialog").innerText().catch(() => "");
  ok("J1 deposit: Step 1 of 2 (Approve) and Step 2 of 2 (Deposit) shown, ends Confirmed", /Step 1 of 2/.test(d) && /Step 2 of 2/.test(d) && /Confirmed/i.test(d), d.replace(/\n+/g, " | ").slice(0, 150));
  ok("J2 deposit: the post-approval deposit simulation is shown as Passed", /Deposit simulation/.test(d) && /Passed/.test(d));
  await ctx.close(); }

// K: if the on-chain asset no longer matches the configured one, nothing can be sent
{ const { ctx, page } = await setup(browser, { badConfig: true }); await page.waitForTimeout(2500);
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(1500);
  const cta = await btn(page).innerText(); const yc = await page.locator("#earn-module").innerText();
  ok("K1 asset mismatch: CTA reads 'Vault configuration mismatch' and is disabled", /configuration mismatch/i.test(cta) && !(await btn(page).isEnabled()), cta.trim());
  ok("K2 asset mismatch: Yield Check shows Failed for the vault asset", /Vault asset is USDG[\s\S]*Failed/.test(yc));
  await ctx.close(); }

// L: an RPC error while polling AFTER the tx was sent is "pending", never "failed"
{ const { ctx, page } = await setup(browser, { receiptError: true }); await page.waitForTimeout(2500);
  await page.locator("#earn-module").getByRole("button", { name: /^withdraw$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(1800);
  await btn(page).click(); await page.waitForTimeout(3500);
  const d = await page.getByRole("dialog").innerText().catch(() => "");
  ok("L1 receipt polling error after send: dialog says 'Still pending' (never 'Failed', no resend invitation)", /Still pending/.test(d) && !/Failed/i.test(d.split("\n").slice(0, 3).join(" ")), d.replace(/\n+/g, " | ").slice(0, 90));
  ok("L2 no 'Transaction not completed' toast in that case", (await page.getByText("Transaction not completed").count()) === 0);
  await ctx.close(); }

// M: API-reported liquidity never blocks a withdrawal the chain would allow (it only limits what MAX fills in)
{ const { ctx, page } = await setup(browser, { liquidityUsd: 5 }); await page.waitForTimeout(2500);
  await page.locator("#earn-module").getByRole("button", { name: /^withdraw$/i }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(2200);
  const b = btn(page);
  ok("M1 API says liquidity is $5, user withdraws 10: button stays enabled (simulation decides)", /Withdraw USDG/.test(await b.innerText()) && (await b.isEnabled()), (await b.innerText()).trim());
  ok("M2 a plain warning explains the amount is above the reported liquidity", (await page.getByText(/more than the liquidity last reported/).count()) > 0);
  await page.locator('#earn-module button:has-text("Max")').click();
  ok("M3 MAX fills in at most the reported liquidity (5)", parseFloat(await page.locator('input[aria-label="Amount"]').inputValue()) <= 5.000001);
  await ctx.close(); }

// N: an unavailable check is never shown as ready
{ const { ctx, page } = await setup(browser, { gateError: true }); await page.waitForTimeout(3000);
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(2200);
  const t = await page.locator("#earn-module").innerText();
  ok("N1 gate read fails: Yield Check says 'Checks incomplete', not 'Ready to sign'", /CHECKS INCOMPLETE/i.test(t) && !/READY TO SIGN/i.test(t));
  await ctx.close(); }

// O: account switched while the approval is confirming -> no deposit is ever sent afterwards
{ let status = null; const { ctx, page } = await setup(browser, { receiptStatus: () => status }); await page.waitForTimeout(2500);
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(2200);
  await btn(page).click(); await page.waitForTimeout(1500); // approval sent, waiting for its receipt
  await page.evaluate(() => window.__emit("accountsChanged", ["0x2222222222222222222222222222222222222222"])); await page.waitForTimeout(300);
  status = "0x1"; await page.waitForTimeout(6000); // the approval now "confirms"
  const sent = (await page.evaluate(() => window.__calls)).filter((m) => m === "eth_sendTransaction").length;
  ok("O1 account switched during approval: only the approval was sent, no deposit followed", sent === 1, "eth_sendTransaction x" + sent);
  await ctx.close(); }

// P: no zero-looking value is ever shown for unknown data (skeleton while loading, "Unavailable" on failure)
{ const { ctx, page } = await setup(browser, { apiDelay: 4000, noWallet: true }); await page.waitForTimeout(1200);
  const strip = page.locator("section[aria-label='Vault metrics']");
  const loading = await strip.innerText();
  ok("P1 while metrics load: no digits and no % in the metric strip, skeletons shown", !/[0-9%]/.test(loading.replace(/0[1-4]/g, "")) && (await strip.locator(".skeleton").count()) >= 4, loading.replace(/\n+/g, " | ").slice(0, 110));
  const all = await page.locator("main").innerText();
  ok("P2 while loading: no '0.00' / '00.00' anywhere on Earn", !/0\.00|00\.00/.test(all.replace(/Balance[^\n]*/g, "")), (all.match(/\d*0\.00%?/g) || []).join(","));
  await page.waitForTimeout(6000);
  const loaded = await strip.innerText();
  ok("P3 loaded: TVL and liquidity are in USDG (not % or $), fees read '0%'", /VAULT TVL[\s\S]*USDG/i.test(loaded) && !/TVL\s*\n?\s*\d+(\.\d+)?%/i.test(loaded) && /0% · 0%/.test(loaded), loaded.replace(/\n+/g, " | ").slice(0, 160));
  ok("P4 loaded: no '0.00%' anywhere in the strip", !/0\.00%/.test(loaded));
  await ctx.close(); }
{ const { ctx, page } = await setup(browser, { apiDown: true, noWallet: true }); await page.waitForTimeout(3000);
  const t = await page.locator("section[aria-label='Vault metrics']").innerText();
  ok("P5 API down: the strip says Unavailable (4x) and shows no numbers", (t.match(/Unavailable/g) || []).length >= 4 && !/[0-9]+(\.[0-9]+)?%|USDG/.test(t.replace(/Net APY|Vault TVL|Liquidity|Vault fees|Management · performance|Variable · after vault fees|in USDG/g, "")), t.replace(/\n+/g, " | ").slice(0, 120));
  await ctx.close(); }

// Q: with no wallet, Yield Check is a single line; the full list appears after connecting
{ const { ctx, page } = await setup(browser, { noWallet: true }); await page.waitForTimeout(2500);
  const yc = await page.locator("#earn-module section[aria-labelledby=yc-title]").innerText();
  ok("Q1 no wallet: Yield Check shows only 'Connect your wallet to run the checks.'", /Connect your wallet to run the checks\./.test(yc) && !/Where do the funds go/i.test(yc), yc.replace(/\n+/g, " | "));
  await ctx.close(); }
{ const { ctx, page } = await setup(browser); await page.waitForTimeout(2500);
  const yc = await page.locator("#earn-module section[aria-labelledby=yc-title]").innerText();
  ok("Q2 wallet connected: the full five-question list is shown", /Where do the funds go/i.test(yc) && /Are data and simulation current/i.test(yc));
  await ctx.close(); }

await browser.close();
console.log("\n" + results.filter(r => r[0]==="PASS").length + " passed, " + results.filter(r => r[0]==="FAIL").length + " failed");
