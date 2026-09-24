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
  await page.goto(B + "/how-it-works", { waitUntil: "networkidle" });
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
  await page.goto(B + "/how-it-works", { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
  const read = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".fp")).getPropertyValue("--p")));
  const p0 = await read();
  await page.evaluate(() => document.querySelector(".fp").scrollIntoView({ block: "center" })); await page.waitForTimeout(500);
  const p1 = await read();
  ok("funds path (How it works): drawn state follows scroll (grows as it comes into view)", p1 > p0 + 0.2, `--p ${p0} → ${p1}`);
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

// 6) hero ribbon + green funds path (SVG/CSS only)
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "networkidle" }); await page.waitForTimeout(1500);
  const anim = await page.evaluate(() => getComputedStyle(document.querySelector(".ribbon-shine")).animationName);
  ok("ribbon: a light travels over the logo surface (CSS animation running)", anim === "shine", anim);
  await page.mouse.move(60, 400); await page.waitForTimeout(200);
  const mx = await page.evaluate(() => parseFloat(document.querySelector(".ribbon-layer").style.getPropertyValue("--mx")));
  ok("ribbon: mouse parallax follows the pointer (--mx negative at the left edge)", mx < -0.7, "--mx=" + mx);
  const off = () => page.evaluate(() => [0, 1, 2, 3].map((k) => parseFloat(document.querySelector("#s" + k).style.strokeDashoffset)));
  const lit = () => page.evaluate(() => [0, 1, 2, 3].map((k) => document.querySelector("#n" + k).dataset.lit));
  const o0 = await off();
  ok("path: at the top of the page only the first stretch has started drawing", o0[1] === 1 && o0[2] === 1 && o0[3] === 1 && o0[0] < 1, JSON.stringify(o0));
  // start point of the path sits on the ribbon's tail anchor
  const dist = await page.evaluate(() => { const d = document.querySelector("#s0").getAttribute("d").match(/M([\d.]+) ([\d.]+)/); const root = document.querySelector("#s0").closest("svg").parentElement.parentElement.getBoundingClientRect(); const t = document.querySelector('[data-flow="tail"]').getBoundingClientRect(); return Math.hypot(+d[1] - (t.left - root.left), +d[2] - (t.top - root.top)); });
  ok("path: starts exactly at the ribbon's tail", dist < 2, dist.toFixed(2) + "px");
  // scroll down step by step: each node lights only when reached, the path is fully drawn at the end
  const seen = [];
  for (let y = 0; y <= 4000; y += 300) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); seen.push((await lit()).filter((x) => x === "true").length); }
  ok("path: nodes light up one after another while scrolling (never out of order)", seen.every((n, i) => i === 0 || n >= seen[i - 1]) && seen[seen.length - 1] === 4 && seen.includes(1), seen.join(","));
  const oEnd = await off();
  ok("path: fully drawn once the last node is reached", oEnd.every((v) => v < 0.05), JSON.stringify(oEnd));
  const dash = await page.evaluate(() => getComputedStyle(document.querySelector("#iface")).strokeDasharray);
  ok("path: the StockYield interface link is dashed", /\d/.test(dash) && dash !== "none", dash);
  await ctx.close(); }
{ const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
  const st = await page.evaluate(() => ({ shine: getComputedStyle(document.querySelector(".ribbon-shine")).opacity + "/" + getComputedStyle(document.querySelector(".ribbon-shine")).animationName, off: [0, 1, 2, 3].map((k) => parseFloat(document.querySelector("#s" + k).style.strokeDashoffset)), lit: [0, 1, 2, 3].map((k) => document.querySelector("#n" + k).dataset.lit) }));
  ok("reduced motion: no travelling light", /^0\//.test(st.shine) || /none/.test(st.shine), st.shine);
  ok("reduced motion: the whole path is already drawn and every node lit, without scrolling", st.off.every((v) => v === 0) && st.lit.every((x) => x === "true"), JSON.stringify(st));
  await ctx.close(); }
{ const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 99999)); await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, lit: [0, 1, 2, 3].map((k) => document.querySelector("#n" + k).dataset.lit), x: +document.querySelector("#n0").getAttribute("cx") }));
  ok("mobile 375px: no horizontal scroll; the path runs in the left margin and reaches all nodes", r.sw <= r.cw && r.x >= 8 && r.x <= 16 && r.lit.every((v) => v === "true"), `cx=${r.x} lit=${r.lit}`);
  await ctx.close(); }

await browser.close(); console.log(`\n${pass} passed, ${fail} failed`);
