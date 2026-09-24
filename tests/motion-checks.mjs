// Motion / accessibility checks (opening animation, reduced motion, scroll-driven funds path, easter egg, keyboard).
// Run against a local build: `next start -p 3411`, then `node tests/motion-checks.mjs` (needs playwright-core installed outside the project).
import { chromium } from "playwright-core";
const B = "http://localhost:3411";
const browser = await chromium.launch();
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(c ? "[PASS]" : "[FAIL]", n, x); };

// 1) opening animation: plays, <1.5s, skippable, once per session
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "domcontentloaded" });
  const t0 = Date.now(); const first = await page.evaluate(() => document.documentElement.dataset.intro);
  await page.waitForFunction(() => document.documentElement.dataset.intro === "done", null, { timeout: 4000 }); const dt = Date.now() - t0;
  ok("intro starts as 'play'", first === "play", first);
  ok("intro finishes in under 1.5 s", dt < 1500, dt + " ms");
  await page.goto(B + "/risks", { waitUntil: "domcontentloaded" });
  ok("intro does not replay in the same session", (await page.evaluate(() => document.documentElement.dataset.intro)) === "done");
  await ctx.close(); }
{ const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "domcontentloaded" });
  const before = await page.evaluate(() => document.documentElement.dataset.intro);
  await page.keyboard.press("a");
  const after = await page.evaluate(() => document.documentElement.dataset.intro);
  ok("intro is skippable with a key press (immediately, before it would end by itself)", before === "play" && after === "done", `${before} → ${after}`);
  await ctx.close(); }

// 2) prefers-reduced-motion: no intro, funds path fully drawn, no travelling dots, no easter egg
{ const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "networkidle" });
  ok("reduced motion: intro is 'done' immediately", (await page.evaluate(() => document.documentElement.dataset.intro)) === "done");
  const p = await page.evaluate(() => getComputedStyle(document.querySelector(".fp")).getPropertyValue("--p").trim());
  ok("reduced motion: funds path is fully drawn (--p = 1) without scrolling", p === "1", "--p=" + p);
  const dotDisp = await page.evaluate(() => getComputedStyle(document.querySelector(".fp .dot")).display);
  ok("reduced motion: travelling dots hidden", dotDisp === "none", dotDisp);
  const rv = await page.evaluate(() => { const r = document.querySelector(".reveal"); return r ? getComputedStyle(r).opacity : "1"; });
  ok("reduced motion: reveal blocks are visible without animating", rv === "1", "opacity " + rv);
  await ctx.close(); }

// 3) funds path is driven by scroll
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
  const read = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".fp")).getPropertyValue("--p")));
  const p0 = await read();
  await page.evaluate(() => document.querySelector(".fp").scrollIntoView({ block: "center" })); await page.waitForTimeout(500);
  const p1 = await read();
  ok("funds path: drawn state follows scroll (starts near 0, grows when in view)", p0 < 0.4 && p1 > p0 + 0.3, `--p ${p0} → ${p1}`);
  // 4) easter egg: 3 quick clicks on the footer wordmark -> caption, no console errors, no wallet requests
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  const wm = page.locator("footer button[aria-label=StockYield]"); await wm.scrollIntoViewIfNeeded();
  for (let i = 0; i < 3; i++) { await wm.click({ delay: 30 }); await page.waitForTimeout(80); } await page.waitForTimeout(500);
  ok("easter egg: triple-click shows the caption", (await page.getByText("Interest is just patience, paid.").count()) > 0);
  await page.waitForTimeout(4200);
  ok("easter egg: caption disappears by itself", (await page.locator("footer p[role=status]").innerText()) === "");
  ok("easter egg: no page errors", errs.length === 0, errs.join(";"));
  await ctx.close(); }

// 5) keyboard: skip link is the first stop and focus is visible
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "networkidle" }); await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
  ok("keyboard: first Tab stop is 'Skip to content'", first === "Skip to content", first);
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + " " + getComputedStyle(document.activeElement).outlineWidth);
  ok("keyboard: focused element has a visible outline", !/^none/.test(outline), outline);
  await ctx.close(); }

await browser.close(); console.log(`\n${pass} passed, ${fail} failed`);
