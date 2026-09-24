import { CHAIN_ID, VAULT } from "@/lib/strategies/steakhouse-usdg/config";
import { parseMetrics } from "@/lib/strategies/steakhouse-usdg/metrics";

// Edge runtime is deprecated on the current Next.js version; this route has no
// edge-specific requirement, so it runs on the standard nodejs runtime.
export const runtime = "nodejs";

const QUERY = `query($address:String!,$chainId:Int!){ vaultV2ByAddress(address:$address,chainId:$chainId){ address name totalAssetsUsd liquidityUsd sharePrice netApy avgNetApy performanceFee managementFee listed asset{ address symbol decimals price{ usd } } } }`;

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response: Response;
    try {
      response = await fetch("https://api.morpho.org/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { address: VAULT, chainId: CHAIN_ID } }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`Morpho API responded with status ${response.status}`);
    const json = (await response.json()) as { data?: { vaultV2ByAddress?: unknown }; errors?: unknown[] };
    if (json.errors?.length) throw new Error("Morpho API returned an error");
    const strategy = parseMetrics(json.data?.vaultV2ByAddress);
    if (!strategy) throw new Error("Unexpected vault data shape");
    if (!strategy.listed) throw new Error("Vault is no longer listed by Morpho");

    // This is only the moment this server fetched the data, not a proof of when
    // Morpho's indexer last updated it — label it accordingly on the client.
    return Response.json(
      { strategy, fetchedAt: new Date().toISOString() },
      { headers: { "cache-control": "public,max-age=30,s-maxage=45" } },
    );
  } catch (error) {
    return Response.json(
      { error: "Live vault data is unavailable", detail: error instanceof Error ? error.message : "unknown error" },
      { status: 503 },
    );
  }
}
