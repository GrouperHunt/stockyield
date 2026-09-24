// Read-only on-chain check of a token address BEFORE it is published on the site.
// Usage: node tests/verify-token.mjs 0xTokenAddress   (uses the public Robinhood Chain RPC)
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const addr = process.argv[2];
if (!/^0x[0-9a-fA-F]{40}$/.test(addr ?? "")) { console.log("Usage: node tests/verify-token.mjs 0x<40 hex chars>"); process.exit(1); }
const call = async (data) => {
  const r = await (await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: addr, data }, "latest"] }) })).json();
  return r.error ? null : r.result;
};
const str = (hex) => { if (!hex || hex.length < 130) return null; const len = parseInt(hex.slice(66, 130), 16); return Buffer.from(hex.slice(130, 130 + len * 2), "hex").toString("utf8"); };
const chain = await (await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) })).json();
const code = await (await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [addr, "latest"] }) })).json();
const name = str(await call("0x06fdde03")), symbol = str(await call("0x95d89b41"));
const dec = await call("0x313ce567"), supply = await call("0x18160ddd");
console.log("chainId      :", parseInt(chain.result, 16), "(expected 4663)");
console.log("has bytecode :", code.result && code.result !== "0x" ? `yes (${(code.result.length - 2) / 2} bytes)` : "NO — nothing is deployed at this address");
console.log("name         :", name);
console.log("symbol       :", symbol, symbol === "SYELD" ? "(matches SYELD)" : "(!! expected SYELD)");
console.log("decimals     :", dec ? parseInt(dec, 16) : null);
console.log("totalSupply  :", supply ? (BigInt(supply) / 10n ** BigInt(dec ? parseInt(dec, 16) : 18)).toString() + " tokens" : null);
