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

function rpcHandler(delayMs = 0) {
  const one = (r) => {
    const { method, params, id } = r; let result = null;
    if (method === "eth_chainId") result = "0x1237";
    else if (method === "eth_blockNumber") result = "0x10";
    else if (method === "eth_getBalance") result = w(10n ** 18n);
    else if (method === "eth_getTransactionReceipt") result = null;
    else if (method === "eth_getBlockByNumber") result = { number: "0x10", hash: "0x" + "1".repeat(64), timestamp: "0x1", baseFeePerGas: "0x1", transactions: [], gasLimit: "0x1c9c380", parentHash: "0x" + "0".repeat(64) };
    else if (method === "eth_call") {
      const to = params[0].to.toLowerCase(), d = (params[0].data || params[0].input || "").slice(0, 10);
      if (d === "0x70a08231") result = to === USDG ? w(5000n * 10n ** 6n) : w(1000n * 10n ** 18n);
      else if (d === "0x07a2d13a") result = w(1000n * 10n ** 6n);
      else if (d === "0xdd62ed3e") result = w(0);
      else if (["0x7e729ac4","0x93ab2ab7","0x54cde13e","0x8eede801"].includes(d)) result = zero32;
      else result = w(1);
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

async function setup(browser, { chain = "0x1237", rejectSwitch = false, delay = 0, apiDown = false, install = false, receiptStatus = null, holdReads = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(({ ADDR, chain, rejectSwitch }) => {
    window.__calls = []; window.__ls = {}; let cur = chain;
    window.ethereum = {
      request: async ({ method, params }) => {
        window.__calls.push(method);
        if (method === "eth_accounts" || method === "eth_requestAccounts") return [ADDR];
        if (method === "eth_chainId") return cur;
        if (method === "wallet_switchEthereumChain") { if (rejectSwitch) { const e = new Error("User rejected"); e.code = 4001; throw e; } cur = "0x1237"; return null; }
        if (method === "eth_sendTransaction") return "0x" + "ab".repeat(32);
        if (method === "eth_estimateGas") return "0x30000";
        if (method === "eth_getTransactionCount") return "0x1";
        if (method === "eth_gasPrice" || method === "eth_maxPriorityFeePerGas") return "0x1";
        if (method === "eth_getBlockByNumber") return { baseFeePerGas: "0x1", number: "0x10", timestamp: "0x1", transactions: [], gasLimit: "0x1c9c380" };
        return null;
      },
      on(ev, cb) { (window.__ls[ev] ||= []).push(cb); }, removeListener() {},
    };
    window.__ls = window.__ls || {}; window.__emit = (ev, arg) => (window.__ls[ev] || []).forEach((cb) => cb(arg));
  }, { ADDR, chain, rejectSwitch });
  const base = rpcHandler(delay);
  const receipt = (status) => ({ status, transactionHash: "0x" + "ab".repeat(32), blockNumber: "0x10", blockHash: "0x" + "1".repeat(64), transactionIndex: "0x0", from: ADDR, to: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd", cumulativeGasUsed: "0x1", gasUsed: "0x1", effectiveGasPrice: "0x1", logs: [], logsBloom: "0x" + "0".repeat(512), type: "0x2", contractAddress: null });
  await page.route("https://rpc.mainnet.chain.robinhood.com/**", async (route) => {
    const body = JSON.parse(route.request().postData());
    const isRcpt = (r) => r.method === "eth_getTransactionReceipt";
    if (receiptStatus && (Array.isArray(body) ? body.some(isRcpt) : isRcpt(body))) {
      const one = (r) => ({ jsonrpc: "2.0", id: r.id, result: isRcpt(r) ? receipt(receiptStatus) : null });
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(Array.isArray(body) ? body.map(one) : one(body)) });
    }
    return base(route);
  });
  if (apiDown) await page.route("**/api/strategy", r => r.fulfill({ status: 503, body: '{"error":"x"}', contentType: "application/json" }));
  if (install) await page.clock.install();
  await page.goto(URL);
  return { ctx, page };
}
const btn = (page) => page.locator("aside button").filter({ hasText: /Earn with USDG|Withdraw USDG|Switch to Robinhood Chain|Connect wallet|Transactions pending|Vault gate/ }).last();

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
  await page.getByRole("tab", { name: "Withdraw" }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  const b = btn(page);
  ok("B1 API down: Withdraw button enabled", (await b.innerText()).includes("Withdraw USDG") && await b.isEnabled(), (await b.innerText()).trim());
  await page.screenshot({ path: "b-api-down-withdraw.png" });
  await page.getByRole("tab", { name: "Deposit" }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  ok("B2 API down: Deposit still disabled (needs fresh data)", !(await btn(page).isEnabled()));
  await ctx.close(); }

// C: receipt never arrives -> pending
{ const { ctx, page } = await setup(browser, { install: true }); await page.waitForTimeout(2500);
  await page.getByRole("tab", { name: "Withdraw" }).click();
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
{ const { ctx, page } = await setup(browser, { delay: 2500 }); await page.waitForTimeout(700);
  const t = await page.locator("main").innerText();
  ok("D1 while position loads: no '$0.00 supplied' and no '0' shares", !/\$0\.00 supplied/.test(t) && /Loading/.test(t), (t.match(/Loading[^\n]*/g)||[]).slice(0,3).join(" / "));
  await page.waitForTimeout(12000);
  const t2 = await page.locator("main").innerText();
  ok("D2 after load: real value appears", /\$99[89]\.|\$1,000\./.test(t2));
  await ctx.close(); }

// E: reverted receipt -> failure text is visible (toast and dialog), never "confirmed"
{ const { ctx, page } = await setup(browser, { receiptStatus: "0x0" }); await page.waitForTimeout(2500);
  await page.getByRole("tab", { name: "Withdraw" }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  await btn(page).click();
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: /reverted on-chain/ });
  await toast.first().waitFor({ timeout: 8000 }).catch(() => {});
  const t = (await toast.allInnerTexts()).join(" / ").replace(/\n+/g, " | ");
  ok("E1 reverted receipt: toast says the withdrawal reverted on-chain", /Transaction not completed/.test(t) && /withdrawal transaction reverted on-chain/i.test(t), t);
  ok("E2 reverted receipt: never shown as confirmed", (await page.getByText("Transaction confirmed").count()) === 0);
  await ctx.close(); }

// F: a read still in flight when the wallet disconnects must not resurface after reconnecting
{ const { ctx, page } = await setup(browser, { delay: 3000 }); await page.waitForTimeout(800);
  await page.evaluate(() => window.__emit("accountsChanged", [])); await page.waitForTimeout(8500); // the old read resolves now
  await page.getByRole("button", { name: /Connect wallet/ }).first().click(); await page.waitForTimeout(800); // new read still pending
  const t = await page.locator("main").innerText();
  ok("F1 disconnect then reconnect: shows Loading, never the old read's value", /Loading position/.test(t) && !/supplied/.test(t), (t.match(/Loading position[^\n]*|\$[0-9,.]+ supplied/) || [""])[0]);
  await ctx.close(); }

// G: account switched while a transaction is pending -> old operation is invalidated
{ const { ctx, page } = await setup(browser, { install: true }); await page.waitForTimeout(2500);
  await page.getByRole("tab", { name: "Withdraw" }).click();
  await page.locator('input[aria-label="Amount"]').fill("10"); await page.waitForTimeout(300);
  await btn(page).click(); await page.waitForTimeout(1500);
  await page.evaluate(() => window.__emit("accountsChanged", ["0x2222222222222222222222222222222222222222"])); await page.waitForTimeout(500);
  await page.clock.fastForward(200000); await page.waitForTimeout(1500);
  ok("G1 account switched mid-operation: dialog closed, old 'Still pending' not shown", (await page.getByRole("dialog").count()) === 0 && (await page.getByText("Still pending").count()) === 0);
  await ctx.close(); }

await browser.close();
console.log("\n" + results.filter(r => r[0]==="PASS").length + " passed, " + results.filter(r => r[0]==="FAIL").length + " failed");
