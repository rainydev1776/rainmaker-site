export const dynamic = "force-dynamic";

type GodviewKpisResponse = {
  ok: boolean;
  windowDays: number;
  since: string;
  users: {
    totalUsers: number;
    c9Users: number;
    enabledBots: number;
    coverageEnabledUsers: number;
    coverageUsedUsers: number;
  };
  coverage: {
    coverageBuyCount: number;
    pairsTotal: number;
    pairsClosed: number;
    pairsRecovered: number;
    recoveredUsd: number;
  };
  revenue: {
    performanceFeeUsd: number;
  };
  error?: string;
};

function fmtUsd(n: number): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

async function fetchGodviewKpis(): Promise<GodviewKpisResponse | null> {
  const backendBase =
    String(process.env.GODVIEW_BACKEND_URL || "").trim() ||
    "https://walrus-app-tddno.ondigitalocean.app";
  const token = String(process.env.GODVIEW_TOKEN || "").trim();
  if (!token) return null;

  const url = `${backendBase.replace(/\/$/, "")}/c9/godview/kpis?days=30`;
  const r = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json", "x-c9-internal": token },
    cache: "no-store",
  });
  const txt = await r.text().catch(() => "");
  if (!r.ok) {
    return { ok: false, windowDays: 30, since: "", users: { totalUsers: 0, c9Users: 0, enabledBots: 0, coverageEnabledUsers: 0, coverageUsedUsers: 0 }, coverage: { coverageBuyCount: 0, pairsTotal: 0, pairsClosed: 0, pairsRecovered: 0, recoveredUsd: 0 }, revenue: { performanceFeeUsd: 0 }, error: `backend_${r.status}:${txt.slice(0, 200)}` };
  }
  try {
    return JSON.parse(txt) as GodviewKpisResponse;
  } catch {
    return { ok: false, windowDays: 30, since: "", users: { totalUsers: 0, c9Users: 0, enabledBots: 0, coverageEnabledUsers: 0, coverageUsedUsers: 0 }, coverage: { coverageBuyCount: 0, pairsTotal: 0, pairsClosed: 0, pairsRecovered: 0, recoveredUsd: 0 }, revenue: { performanceFeeUsd: 0 }, error: `bad_json:${txt.slice(0, 200)}` };
  }
}

export default async function GodviewPage() {
  const kpis = await fetchGodviewKpis();

  return (
    <div className="flex w-full min-h-screen flex-col p-4 sm:p-6" style={{ background: "#0B0B0D" }}>
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Godview</h1>
            <p className="mt-1 text-sm text-[#757575]">Internal KPIs (server-side)</p>
          </div>
          <div className="text-xs text-[#757575]">
            coverage + fees • last 30d
          </div>
        </div>

        {!kpis ? (
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-[#d0d0d0]">
            <div className="font-medium text-white">Not configured</div>
            <div className="mt-2 text-[#757575]">
              Set <code className="font-mono">GODVIEW_TOKEN</code> and (optionally){" "}
              <code className="font-mono">GODVIEW_BACKEND_URL</code> in Vercel.
            </div>
          </div>
        ) : kpis.ok ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-xs text-[#757575]">Users</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-white">
                <div>
                  <div className="text-[#757575] text-xs">Total</div>
                  <div className="font-semibold">{kpis.users.totalUsers}</div>
                </div>
                <div>
                  <div className="text-[#757575] text-xs">C9 access</div>
                  <div className="font-semibold">{kpis.users.c9Users}</div>
                </div>
                <div>
                  <div className="text-[#757575] text-xs">Enabled bots</div>
                  <div className="font-semibold">{kpis.users.enabledBots}</div>
                </div>
                <div>
                  <div className="text-[#757575] text-xs">Coverage enabled</div>
                  <div className="font-semibold">{kpis.users.coverageEnabledUsers}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-xs text-[#757575]">Coverage</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-white">
                <div>
                  <div className="text-[#757575] text-xs">Users used (30d)</div>
                  <div className="font-semibold">{kpis.users.coverageUsedUsers}</div>
                </div>
                <div>
                  <div className="text-[#757575] text-xs">Buy legs (30d)</div>
                  <div className="font-semibold">{kpis.coverage.coverageBuyCount}</div>
                </div>
                <div>
                  <div className="text-[#757575] text-xs">Pairs (detected)</div>
                  <div className="font-semibold">
                    {kpis.coverage.pairsTotal} <span className="text-[#757575]">/ closed {kpis.coverage.pairsClosed}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[#757575] text-xs">Recovered (approx)</div>
                  <div className="font-semibold">{fmtUsd(kpis.coverage.recoveredUsd)}</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#757575]">
                “Recovered” is computed from realized sell <code className="font-mono">pnl_usd</code> where a coverage main leg lost and the paired hedge leg won.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4 md:col-span-2">
              <div className="text-xs text-[#757575]">Revenue</div>
              <div className="mt-2 text-sm text-white">
                <span className="text-[#757575]">Performance fee (30d): </span>
                <span className="font-semibold">{fmtUsd(kpis.revenue.performanceFeeUsd)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            <div className="font-medium">Godview error</div>
            <div className="mt-2 font-mono text-xs break-all">{kpis.error || "unknown"}</div>
          </div>
        )}
      </div>
    </div>
  );
}


