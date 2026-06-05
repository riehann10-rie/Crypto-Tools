import { useState, useEffect, useCallback, useContext, createContext } from "react";
import {
  ArrowLeftRight, TrendingUp, Calculator, ShieldAlert, Lock, Wallet,
  Loader2, AlertCircle, RefreshCw, Sun, Moon, Search,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const IDR_RATE = 16000;
const API_KEY = import.meta.env.VITE_GOLDRUSH_API_KEY as string;
const GR_BASE = "https://api.covalenthq.com/v1";

const CHAINS = [
  { id: "eth-mainnet",       name: "Ethereum"  },
  { id: "matic-mainnet",     name: "Polygon"   },
  { id: "bsc-mainnet",       name: "BNB Chain" },
  { id: "arbitrum-mainnet",  name: "Arbitrum"  },
  { id: "optimism-mainnet",  name: "Optimism"  },
  { id: "base-mainnet",      name: "Base"      },
];

// ─── Theme ────────────────────────────────────────────────────────────────────

interface ThemeCtx { dark: boolean; toggle: () => void; }
const ThemeContext = createContext<ThemeCtx>({ dark: true, toggle: () => {} });
const useTheme = () => useContext(ThemeContext);

function tc(dark: boolean) {
  return {
    page:            dark ? "bg-[#0f0f0f] text-white"                       : "bg-[#f5f5f5] text-gray-900",
    sidebar:         dark ? "bg-[#0f0f0f] border-[#1e1e1e]"                 : "bg-white border-gray-200",
    sidebarTitle:    dark ? "text-white"                                     : "text-gray-900",
    sidebarSub:      dark ? "text-gray-500"                                  : "text-gray-400",
    sidebarFooter:   dark ? "text-gray-600"                                  : "text-gray-400",
    navActive:       dark ? "bg-purple-600/20 text-purple-400 border border-purple-600/30" : "bg-purple-50 text-purple-600 border border-purple-200",
    navInactive:     dark ? "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"         : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
    card:            dark ? "bg-[#181818] border border-[#252525]"           : "bg-white border border-gray-200",
    input:           dark ? "bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-600"          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
    inputSelect:     dark ? "bg-[#1a1a1a] border-[#2a2a2a] text-white"      : "bg-white border-gray-300 text-gray-900",
    label:           dark ? "text-gray-400"                                  : "text-gray-500",
    outputBg:        dark ? "bg-[#181818] border border-[#252525]"           : "bg-gray-50 border border-gray-200",
    outputLabel:     dark ? "text-gray-500"                                  : "text-gray-400",
    outputText:      dark ? "text-white"                                     : "text-gray-900",
    outputDivider:   dark ? "border-[#252525]"                               : "border-gray-200",
    divider:         dark ? "border-[#1e1e1e]"                               : "border-gray-200",
    bottomBar:       dark ? "bg-[#111] border-[#1e1e1e]"                     : "bg-white border-gray-200",
    bottomActive:    dark ? "text-purple-400"                                : "text-purple-600",
    bottomInactive:  dark ? "text-gray-600"                                  : "text-gray-400",
    footer:          dark ? "text-gray-600 border-[#1e1e1e]"                 : "text-gray-400 border-gray-200",
    freqActive:      "bg-purple-600 text-white",
    freqInactive:    dark ? "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-purple-500" : "bg-white border border-gray-300 text-gray-500 hover:border-purple-400",
    disclaimer:      dark ? "text-gray-600"                                  : "text-gray-400",
    skeleton:        dark ? "bg-[#252525] animate-pulse rounded"             : "bg-gray-200 animate-pulse rounded",
    toggleBtn:       dark ? "text-gray-400 hover:text-gray-200 bg-[#1a1a1a] border-[#2a2a2a]" : "text-gray-500 hover:text-gray-700 bg-white border-gray-300",
    walletTabActive: dark ? "border-b-2 border-purple-400 text-purple-400"  : "border-b-2 border-purple-600 text-purple-600",
    walletTabInact:  dark ? "text-gray-500 hover:text-gray-300"              : "text-gray-400 hover:text-gray-600",
    badge:           dark ? "bg-[#252525] text-gray-400"                     : "bg-gray-100 text-gray-500",
    nftCard:         dark ? "bg-[#1e1e1e] border border-[#2a2a2a]"           : "bg-gray-50 border border-gray-200",
    txRow:           dark ? "border-[#252525] hover:bg-[#1e1e1e]"            : "border-gray-100 hover:bg-gray-50",
    chartGrid:       dark ? "#2a2a2a"  : "#e5e7eb",
    chartTick:       dark ? "#6b7280"  : "#9ca3af",
    chartTTBg:       dark ? "#1a1a1a"  : "#ffffff",
    chartTTBorder:   dark ? "#2a2a2a"  : "#e5e7eb",
    chartTTText:     dark ? "#fff"     : "#111",
  };
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Coin { id: string; symbol: string; name: string; current_price: number; image: string; }

interface GRTokenItem {
  contract_name: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  balance: string;
  quote: number | null;
  quote_rate: number | null;
  logo_url?: string;
}

interface GRNFTItem {
  contract_name: string;
  contract_ticker_symbol: string;
  nft_data: {
    token_id: string;
    external_data?: { name?: string; image?: string; image_256?: string; };
  }[] | null;
}

interface GRTxItem {
  block_signed_at: string;
  tx_hash: string;
  from_address: string;
  to_address: string;
  value_quote: number | null;
}

interface ChainData {
  chainId: string;
  chainName: string;
  tokens: GRTokenItem[];
  nfts: GRNFTItem[];
  txs: GRTxItem[];
  error?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCoinList() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoins = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false"
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCoins(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCoins(); }, [fetchCoins]);
  return { coins, loading, error, refetch: fetchCoins };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function CoinSelect({ coins, value, onChange }: { coins: Coin[]; value: string; onChange: (id: string) => void; }) {
  const { dark } = useTheme(); const t = tc(dark);
  return (
    <select
      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors ${t.inputSelect}`}
      value={value} onChange={(e) => onChange(e.target.value)}
    >
      {coins.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>)}
    </select>
  );
}

function Input({ label, value, onChange, type = "number", placeholder, min, max }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; min?: number; max?: number;
}) {
  const { dark } = useTheme(); const t = tc(dark);
  return (
    <div className="flex flex-col gap-1.5">
      <label className={`text-xs font-medium uppercase tracking-wide ${t.label}`}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} min={min} max={max}
        className={`border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors ${t.input}`}
      />
    </div>
  );
}

function OutputBox({ children }: { children: React.ReactNode }) {
  const { dark } = useTheme(); const t = tc(dark);
  return <div className={`rounded-xl p-4 mt-4 ${t.outputBg}`}>{children}</div>;
}

function OutputRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "purple"; }) {
  const { dark } = useTheme(); const t = tc(dark);
  const valColor = highlight === "green" ? "text-emerald-400" : highlight === "red" ? "text-red-400" : highlight === "purple" ? "text-purple-400" : t.outputText;
  return (
    <div className={`flex items-center justify-between py-2 border-b last:border-0 ${t.outputDivider}`}>
      <span className={`text-sm ${t.label}`}>{label}</span>
      <span className={`text-sm font-semibold ${valColor}`}>{value}</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertCircle className="text-red-400" size={28} />
      <p className="text-gray-400 text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1.5 text-purple-400 text-sm hover:text-purple-300 transition-colors">
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-purple-400" size={28} /></div>;
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  const { dark } = useTheme(); const t = tc(dark);
  return (
    <div className="flex flex-col gap-3 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`h-10 w-full ${t.skeleton}`} style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
function fmtUSD(n: number) { return `$${fmt(n)}`; }
function fmtIDR(n: number) { return `Rp ${n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function shortHash(h: string) { return h ? `${h.slice(0, 8)}...${h.slice(-4)}` : "—"; }
function isValidEVM(addr: string) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()); }
function tokenBal(balance: string, decimals: number) {
  try { return parseFloat(balance) / Math.pow(10, decimals); } catch { return 0; }
}

// ─── Converter ────────────────────────────────────────────────────────────────

function ConverterTool({ coins, loading, error, refetch }: { coins: Coin[]; loading: boolean; error: string | null; refetch: () => void; }) {
  const { dark } = useTheme(); const t = tc(dark);
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("1");

  useEffect(() => { if (coins.length && !selectedId) setSelectedId(coins[0].id); }, [coins, selectedId]);

  const coin = coins.find((c) => c.id === selectedId);
  const amountNum = parseFloat(amount) || 0;
  const usdValue = coin ? coin.current_price * amountNum : 0;
  const idrValue = usdValue * IDR_RATE;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={`Could not load coins: ${error}`} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={`text-xs font-medium uppercase tracking-wide ${t.label}`}>Coin</label>
          <CoinSelect coins={coins} value={selectedId} onChange={setSelectedId} />
        </div>
        <Input label="Amount" value={amount} onChange={setAmount} placeholder="1" min={0} />
      </div>
      {coin && (
        <OutputBox>
          <div className={`text-xs mb-3 font-medium uppercase tracking-wide ${t.outputLabel}`}>Converted Value</div>
          <OutputRow label="Current Price (USD)" value={fmtUSD(coin.current_price)} />
          <OutputRow label="USD Value" value={fmtUSD(usdValue)} highlight="purple" />
          <OutputRow label="IDR Value (@ 16,000)" value={fmtIDR(idrValue)} highlight="purple" />
        </OutputBox>
      )}
    </div>
  );
}

// ─── DCA Calculator ───────────────────────────────────────────────────────────

function DCACalculator({ coins, loading, error, refetch }: { coins: Coin[]; loading: boolean; error: string | null; refetch: () => void; }) {
  const { dark } = useTheme(); const t = tc(dark);
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("100");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split("T")[0]; });
  const [chartData, setChartData] = useState<{ date: string; portfolio: number; invested: number }[]>([]);
  const [result, setResult] = useState<{ totalInvested: number; currentValue: number; pnl: number; pnlPct: number } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => { if (coins.length && !selectedId) setSelectedId(coins[0].id); }, [coins, selectedId]);

  const calculate = useCallback(async () => {
    const coin = coins.find((c) => c.id === selectedId);
    if (!coin || !amount || !startDate) return;
    setCalcLoading(true); setCalcError(null);
    try {
      const start = new Date(startDate);
      const days = Math.floor((Date.now() - start.getTime()) / 86400000);
      if (days < 1) { setCalcError("Start date must be in the past."); setCalcLoading(false); return; }
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${selectedId}/market_chart?vs_currency=usd&days=${Math.min(days, 365)}&interval=daily`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const prices: [number, number][] = data.prices;
      const amountNum = parseFloat(amount) || 0;
      const freqDays = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;
      let totalInvested = 0, totalCoins = 0;
      const chart: typeof chartData = [];
      for (let i = 0; i < prices.length; i++) {
        const [ts, price] = prices[i];
        if (i % freqDays === 0) { totalCoins += amountNum / price; totalInvested += amountNum; }
        chart.push({ date: new Date(ts).toLocaleDateString("en-US", { month: "short", year: "2-digit" }), portfolio: parseFloat((totalCoins * price).toFixed(2)), invested: parseFloat(totalInvested.toFixed(2)) });
      }
      const currentValue = totalCoins * coin.current_price;
      const pnl = currentValue - totalInvested;
      setChartData(chart);
      setResult({ totalInvested, currentValue, pnl, pnlPct: totalInvested > 0 ? (pnl / totalInvested) * 100 : 0 });
    } catch (e: unknown) { setCalcError(e instanceof Error ? e.message : "Calculation failed"); }
    finally { setCalcLoading(false); }
  }, [coins, selectedId, amount, frequency, startDate]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={`Could not load coins: ${error}`} onRetry={refetch} />;
  const isProfitable = result ? result.pnl >= 0 : true;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={`text-xs font-medium uppercase tracking-wide ${t.label}`}>Coin</label>
          <CoinSelect coins={coins} value={selectedId} onChange={setSelectedId} />
        </div>
        <Input label="Investment per Period (USD)" value={amount} onChange={setAmount} placeholder="100" min={1} />
        <div className="flex flex-col gap-1.5">
          <label className={`text-xs font-medium uppercase tracking-wide ${t.label}`}>Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {(["daily", "weekly", "monthly"] as const).map((f) => (
              <button key={f} onClick={() => setFrequency(f)} className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${frequency === f ? t.freqActive : t.freqInactive}`}>{f}</button>
            ))}
          </div>
        </div>
        <Input label="Start Date" value={startDate} onChange={setStartDate} type="date" />
      </div>
      <button onClick={calculate} disabled={calcLoading} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
        {calcLoading ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />} Calculate DCA
      </button>
      {calcError && <ErrorState message={calcError} />}
      {result && !calcLoading && (
        <OutputBox>
          <div className={`text-xs mb-3 font-medium uppercase tracking-wide ${t.outputLabel}`}>DCA Results</div>
          <OutputRow label="Total Invested" value={fmtUSD(result.totalInvested)} />
          <OutputRow label="Current Value" value={fmtUSD(result.currentValue)} highlight="purple" />
          <OutputRow label="Total PnL" value={`${isProfitable ? "+" : ""}${fmtUSD(result.pnl)}`} highlight={isProfitable ? "green" : "red"} />
          <OutputRow label="ROI" value={`${isProfitable ? "+" : ""}${fmt(result.pnlPct)}%`} highlight={isProfitable ? "green" : "red"} />
          {chartData.length > 0 && (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                  <XAxis dataKey="date" tick={{ fill: t.chartTick, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: t.chartTick, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} width={50} />
                  <Tooltip contentStyle={{ background: t.chartTTBg, border: `1px solid ${t.chartTTBorder}`, borderRadius: "8px", color: t.chartTTText, fontSize: 12 }}
                    formatter={(value: number, name: string) => [fmtUSD(value), name === "portfolio" ? "Portfolio" : "Invested"]} />
                  <Line type="monotone" dataKey="invested" stroke="#4b5563" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="portfolio" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 h-0.5 bg-purple-500 inline-block"></span>Portfolio</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 h-0.5 bg-gray-500 inline-block"></span>Invested</span>
              </div>
            </div>
          )}
        </OutputBox>
      )}
    </div>
  );
}

// ─── PnL Calculator ───────────────────────────────────────────────────────────

function PnLCalculator() {
  const [buyPrice, setBuyPrice] = useState("30000");
  const [sellPrice, setSellPrice] = useState("45000");
  const [coinAmount, setCoinAmount] = useState("0.5");
  const [fee, setFee] = useState("0.1");
  const buy = parseFloat(buyPrice) || 0, sell = parseFloat(sellPrice) || 0;
  const qty = parseFloat(coinAmount) || 0, feeRate = (parseFloat(fee) || 0) / 100;
  const gross = (sell - buy) * qty, feeAmount = sell * qty * feeRate;
  const net = gross - feeAmount, roi = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Input label="Buy Price (USD)" value={buyPrice} onChange={setBuyPrice} placeholder="30000" min={0} />
        <Input label="Sell Price (USD)" value={sellPrice} onChange={setSellPrice} placeholder="45000" min={0} />
        <Input label="Coin Amount" value={coinAmount} onChange={setCoinAmount} placeholder="0.5" min={0} />
        <Input label="Trading Fee (%)" value={fee} onChange={setFee} placeholder="0.1" min={0} max={100} />
      </div>
      <OutputBox>
        <OutputRow label="Gross Profit / Loss" value={`${gross >= 0 ? "+" : ""}${fmtUSD(gross)}`} highlight={gross >= 0 ? "green" : "red"} />
        <OutputRow label="Trading Fee" value={`-${fmtUSD(feeAmount)}`} />
        <OutputRow label="Net Profit / Loss" value={`${net >= 0 ? "+" : ""}${fmtUSD(net)}`} highlight={net >= 0 ? "green" : "red"} />
        <OutputRow label="ROI" value={`${roi >= 0 ? "+" : ""}${fmt(roi)}%`} highlight={roi >= 0 ? "green" : "red"} />
      </OutputBox>
    </div>
  );
}

// ─── Position Size ────────────────────────────────────────────────────────────

function PositionSizeCalculator() {
  const { dark } = useTheme(); const t = tc(dark);
  const [portfolio, setPortfolio] = useState("10000");
  const [riskPct, setRiskPct] = useState("2");
  const [entryPrice, setEntryPrice] = useState("30000");
  const [stopLoss, setStopLoss] = useState("28000");
  const port = parseFloat(portfolio) || 0, risk = parseFloat(riskPct) || 0;
  const entry = parseFloat(entryPrice) || 0, stop = parseFloat(stopLoss) || 0;
  const maxLoss = (port * risk) / 100, priceDiff = Math.abs(entry - stop);
  const numCoins = priceDiff > 0 ? maxLoss / priceDiff : 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Input label="Portfolio Size (USD)" value={portfolio} onChange={setPortfolio} placeholder="10000" min={0} />
        <div className="flex flex-col gap-1.5">
          <label className={`text-xs font-medium uppercase tracking-wide ${t.label}`}>Risk Percentage (1–5%)</label>
          <input type="range" min={1} max={5} step={0.5} value={riskPct} onChange={(e) => setRiskPct(e.target.value)} className="w-full accent-purple-500" />
          <div className={`flex justify-between text-xs ${t.label}`}>
            <span>1%</span><span className="text-purple-400 font-semibold">{riskPct}%</span><span>5%</span>
          </div>
        </div>
        <Input label="Entry Price (USD)" value={entryPrice} onChange={setEntryPrice} placeholder="30000" min={0} />
        <Input label="Stop Loss Price (USD)" value={stopLoss} onChange={setStopLoss} placeholder="28000" min={0} />
      </div>
      <OutputBox>
        <OutputRow label="Position Size (USD)" value={fmtUSD(numCoins * entry)} highlight="purple" />
        <OutputRow label="Coins to Buy" value={fmt(numCoins, 6)} highlight="purple" />
        <OutputRow label="Maximum Loss" value={fmtUSD(maxLoss)} highlight="red" />
        <p className={`text-xs mt-3 pt-3 border-t ${t.outputDivider} ${t.disclaimer}`}>Not financial advice. Use risk management and always do your own research.</p>
      </OutputBox>
    </div>
  );
}

// ─── Token Unlock ─────────────────────────────────────────────────────────────

function TokenUnlockChecker() {
  const { dark } = useTheme(); const t = tc(dark);
  const [tokenName, setTokenName] = useState("Example Token");
  const [totalSupply, setTotalSupply] = useState("1000000000");
  const [circSupply, setCircSupply] = useState("300000000");
  const [unlockAmount, setUnlockAmount] = useState("50000000");
  const [unlockDate, setUnlockDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split("T")[0]; });
  const total = parseFloat(totalSupply) || 0, circ = parseFloat(circSupply) || 0, unlock = parseFloat(unlockAmount) || 0;
  const unlockPctTotal = total > 0 ? (unlock / total) * 100 : 0;
  const unlockPctCirc = circ > 0 ? (unlock / circ) * 100 : 0;
  const pressure = unlockPctCirc >= 10 ? "High" : unlockPctCirc >= 3 ? "Medium" : "Low";
  const pressureColor = pressure === "High" ? "text-red-400" : pressure === "Medium" ? "text-yellow-400" : "text-emerald-400";
  const pressureDot = pressure === "High" ? "bg-red-400" : pressure === "Medium" ? "bg-yellow-400" : "bg-emerald-400";
  const daysUntil = Math.ceil((new Date(unlockDate).getTime() - Date.now()) / 86400000);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Input label="Token Name" value={tokenName} onChange={setTokenName} type="text" placeholder="Example Token" />
        <Input label="Total Supply" value={totalSupply} onChange={setTotalSupply} placeholder="1000000000" min={0} />
        <Input label="Circulating Supply" value={circSupply} onChange={setCircSupply} placeholder="300000000" min={0} />
        <Input label="Unlock Amount" value={unlockAmount} onChange={setUnlockAmount} placeholder="50000000" min={0} />
        <Input label="Unlock Date" value={unlockDate} onChange={setUnlockDate} type="date" />
      </div>
      <OutputBox>
        <div className={`text-xs mb-3 font-medium uppercase tracking-wide ${t.outputLabel}`}>Unlock Analysis</div>
        <OutputRow label="Token" value={tokenName || "—"} />
        <OutputRow label="Unlock % of Total Supply" value={`${fmt(unlockPctTotal)}%`} />
        <OutputRow label="Unlock % of Circulating" value={`${fmt(unlockPctCirc)}%`} />
        <OutputRow label="Days Until Unlock" value={daysUntil > 0 ? `${daysUntil} days` : daysUntil === 0 ? "Today" : "Past"} />
        <div className="flex items-center justify-between py-2 mt-1">
          <span className={`text-sm ${t.label}`}>Sell Pressure</span>
          <span className={`text-sm font-bold ${pressureColor} flex items-center gap-1.5`}>
            <span className={`w-2 h-2 rounded-full ${pressureDot}`}></span>{pressure}
          </span>
        </div>
        <p className={`text-xs mt-2 pt-2 border-t ${t.outputDivider} ${t.disclaimer}`}>Pressure based on unlock as % of circulating supply: &lt;3% Low, 3–10% Medium, &gt;10% High</p>
      </OutputBox>
    </div>
  );
}

// ─── Wallet Tracker ───────────────────────────────────────────────────────────

async function fetchChainData(chainId: string, chainName: string, address: string): Promise<ChainData> {
  const headers = { Authorization: `Bearer ${API_KEY}` };
  const addr = address.trim();
  const base: ChainData = { chainId, chainName, tokens: [], nfts: [], txs: [] };

  try {
    const [tokRes, nftRes, txRes] = await Promise.allSettled([
      fetch(`${GR_BASE}/${chainId}/address/${addr}/balances_v2/`, { headers }),
      fetch(`${GR_BASE}/${chainId}/address/${addr}/balances_nft/`, { headers }),
      fetch(`${GR_BASE}/${chainId}/address/${addr}/transactions_v2/?page-size=10`, { headers }),
    ]);

    if (tokRes.status === "fulfilled" && tokRes.value.ok) {
      const j = await tokRes.value.json();
      base.tokens = j?.data?.items ?? [];
    }
    if (nftRes.status === "fulfilled" && nftRes.value.ok) {
      const j = await nftRes.value.json();
      base.nfts = j?.data?.items ?? [];
    }
    if (txRes.status === "fulfilled" && txRes.value.ok) {
      const j = await txRes.value.json();
      base.txs = j?.data?.items ?? [];
    }
  } catch (e: unknown) {
    base.error = e instanceof Error ? e.message : "Fetch failed";
  }
  return base;
}

function PortfolioTab({ chains, chainFilter, dark }: { chains: ChainData[]; chainFilter: string; dark: boolean; }) {
  const t = tc(dark);
  const filtered = chainFilter === "all" ? chains : chains.filter((c) => c.chainId === chainFilter);
  const allTokens = filtered.flatMap((c) => c.tokens.map((tok) => ({ ...tok, chainName: c.chainName })));
  const byValue = [...allTokens].sort((a, b) => (b.quote ?? 0) - (a.quote ?? 0)).filter((tok) => (tok.quote ?? 0) > 0.01);
  const totalUSD = byValue.reduce((s, tok) => s + (tok.quote ?? 0), 0);
  const chainBreakdown = filtered.map((c) => ({ name: c.chainName, value: c.tokens.reduce((s, tok) => s + (tok.quote ?? 0), 0) })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

  if (byValue.length === 0) return <p className={`text-sm text-center py-8 ${t.label}`}>No token balances found on selected chains.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl p-4 ${t.outputBg}`}>
        <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${t.outputLabel}`}>Total Portfolio Value</div>
        <div className="text-2xl font-bold text-purple-400">{fmtUSD(totalUSD)}</div>
        <div className={`text-sm mt-0.5 ${t.label}`}>{fmtIDR(totalUSD * IDR_RATE)}</div>
      </div>
      {chainBreakdown.length > 1 && (
        <div className={`rounded-xl p-4 ${t.outputBg}`}>
          <div className={`text-xs font-medium uppercase tracking-wide mb-3 ${t.outputLabel}`}>By Chain</div>
          {chainBreakdown.map((c) => (
            <div key={c.name} className={`flex items-center justify-between py-2 border-b last:border-0 ${t.outputDivider}`}>
              <span className={`text-sm ${t.label}`}>{c.name}</span>
              <span className={`text-sm font-semibold ${t.outputText}`}>{fmtUSD(c.value)}</span>
            </div>
          ))}
        </div>
      )}
      <div className={`rounded-xl p-4 ${t.outputBg}`}>
        <div className={`text-xs font-medium uppercase tracking-wide mb-3 ${t.outputLabel}`}>Token Holdings</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={t.label}>
                <th className="text-left pb-2 font-medium text-xs uppercase pr-4">Token</th>
                <th className="text-right pb-2 font-medium text-xs uppercase pr-4">Balance</th>
                <th className="text-right pb-2 font-medium text-xs uppercase pr-4">Price</th>
                <th className="text-right pb-2 font-medium text-xs uppercase">Value</th>
              </tr>
            </thead>
            <tbody>
              {byValue.map((tok, i) => (
                <tr key={i} className={`border-t ${t.outputDivider}`}>
                  <td className="py-2 pr-4">
                    <div className={`font-medium ${t.outputText}`}>{tok.contract_ticker_symbol}</div>
                    <div className={`text-xs ${t.label}`}>{tok.chainName}</div>
                  </td>
                  <td className={`py-2 pr-4 text-right ${t.outputText}`}>{fmt(tokenBal(tok.balance, tok.contract_decimals), 4)}</td>
                  <td className={`py-2 pr-4 text-right ${t.label}`}>{tok.quote_rate ? fmtUSD(tok.quote_rate) : "—"}</td>
                  <td className="py-2 text-right font-semibold text-purple-400">{fmtUSD(tok.quote ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NFTsTab({ chains, chainFilter, dark }: { chains: ChainData[]; chainFilter: string; dark: boolean; }) {
  const t = tc(dark);
  const filtered = chainFilter === "all" ? chains : chains.filter((c) => c.chainId === chainFilter);
  const allNFTs = filtered.flatMap((c) =>
    c.nfts.flatMap((col) =>
      (col.nft_data ?? []).map((nft) => ({ colName: col.contract_name, tokenId: nft.token_id, chainName: c.chainName, image: nft.external_data?.image_256 || nft.external_data?.image || null }))
    )
  );
  if (allNFTs.length === 0) return <p className={`text-sm text-center py-8 ${t.label}`}>No NFTs found on selected chains.</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {allNFTs.map((nft, i) => (
        <div key={i} className={`rounded-xl overflow-hidden ${t.nftCard}`}>
          {nft.image ? (
            <img src={nft.image} alt={`${nft.colName} #${nft.tokenId}`} className="w-full aspect-square object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className={`w-full aspect-square flex items-center justify-center ${dark ? "bg-[#252525]" : "bg-gray-100"}`}>
              <span className={`text-xs ${t.label}`}>No image</span>
            </div>
          )}
          <div className="p-2">
            <div className={`text-xs font-semibold truncate ${t.outputText}`}>{nft.colName}</div>
            <div className={`text-xs ${t.label}`}>#{nft.tokenId} · {nft.chainName}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionsTab({ chains, chainFilter, dark }: { chains: ChainData[]; chainFilter: string; dark: boolean; }) {
  const t = tc(dark);
  const filtered = chainFilter === "all" ? chains : chains.filter((c) => c.chainId === chainFilter);
  const allTxs = filtered.flatMap((c) => c.txs.map((tx) => ({ ...tx, chainName: c.chainName }))).sort((a, b) => new Date(b.block_signed_at).getTime() - new Date(a.block_signed_at).getTime()).slice(0, 50);
  if (allTxs.length === 0) return <p className={`text-sm text-center py-8 ${t.label}`}>No transactions found on selected chains.</p>;
  return (
    <div className={`rounded-xl overflow-hidden ${t.outputBg}`}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase ${t.outputLabel}`}>Date</th>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase ${t.outputLabel}`}>Tx Hash</th>
            <th className={`text-left px-4 py-3 text-xs font-medium uppercase ${t.outputLabel}`}>Chain</th>
            <th className={`text-right px-4 py-3 text-xs font-medium uppercase ${t.outputLabel}`}>Value (USD)</th>
          </tr>
        </thead>
        <tbody>
          {allTxs.map((tx, i) => (
            <tr key={i} className={`border-t transition-colors ${t.txRow}`}>
              <td className={`px-4 py-3 ${t.label} whitespace-nowrap`}>{new Date(tx.block_signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</td>
              <td className={`px-4 py-3 font-mono text-xs ${t.outputText}`}>{shortHash(tx.tx_hash)}</td>
              <td className={`px-4 py-3 ${t.label}`}>{tx.chainName}</td>
              <td className={`px-4 py-3 text-right font-semibold ${tx.value_quote && tx.value_quote > 0 ? "text-emerald-400" : t.label}`}>{tx.value_quote ? fmtUSD(tx.value_quote) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WalletTracker() {
  const { dark } = useTheme(); const t = tc(dark);
  const [address, setAddress] = useState("");
  const [chains, setChains] = useState<ChainData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletTab, setWalletTab] = useState<"portfolio" | "nfts" | "transactions">("portfolio");
  const [chainFilter, setChainFilter] = useState("all");
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!isValidEVM(address)) { setError("Enter a valid EVM address (0x followed by 40 hex characters)."); return; }
    setLoading(true); setError(null); setSearched(true);
    try {
      const results = await Promise.all(CHAINS.map((c) => fetchChainData(c.id, c.name, address)));
      setChains(results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch wallet data");
    } finally { setLoading(false); }
  }, [address]);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") search(); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text" value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={handleKey}
          placeholder="0x... wallet address"
          className={`flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors font-mono ${t.input}`}
        />
        <button onClick={search} disabled={loading} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {loading ? "Loading" : "Search"}
        </button>
      </div>

      {error && <ErrorState message={error} />}

      {loading && (
        <div>
          <p className={`text-xs mb-3 ${t.label}`}>Fetching data from 6 chains...</p>
          <SkeletonRows count={6} />
        </div>
      )}

      {!loading && searched && chains.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <label className={`text-xs font-medium uppercase tracking-wide ${t.label}`}>Chain</label>
            <select
              value={chainFilter} onChange={(e) => setChainFilter(e.target.value)}
              className={`border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500 transition-colors ${t.inputSelect}`}
            >
              <option value="all">All Chains</option>
              {CHAINS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className={`flex gap-4 border-b ${t.divider}`}>
            {(["portfolio", "nfts", "transactions"] as const).map((tab) => (
              <button key={tab} onClick={() => setWalletTab(tab)} className={`pb-2 text-sm font-medium capitalize transition-colors ${walletTab === tab ? t.walletTabActive : t.walletTabInact}`}>
                {tab === "nfts" ? "NFTs" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {walletTab === "portfolio"     && <PortfolioTab     chains={chains} chainFilter={chainFilter} dark={dark} />}
          {walletTab === "nfts"          && <NFTsTab          chains={chains} chainFilter={chainFilter} dark={dark} />}
          {walletTab === "transactions"  && <TransactionsTab  chains={chains} chainFilter={chainFilter} dark={dark} />}

          <p className={`text-xs text-center pt-2 ${t.disclaimer}`}>Data via GoldRush by Covalent. Not financial advice.</p>
        </>
      )}
    </div>
  );
}

// ─── Nav Tabs ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "converter", label: "Converter", icon: ArrowLeftRight },
  { id: "dca",       label: "DCA",       icon: TrendingUp     },
  { id: "pnl",       label: "PnL",       icon: Calculator     },
  { id: "position",  label: "Position",  icon: ShieldAlert    },
  { id: "unlock",    label: "Unlock",    icon: Lock           },
  { id: "wallet",    label: "Wallet",    icon: Wallet         },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    try { const s = localStorage.getItem("ct-theme"); return s !== null ? s === "dark" : true; }
    catch { return true; }
  });
  const toggleTheme = useCallback(() => {
    setDark((prev) => { const next = !prev; try { localStorage.setItem("ct-theme", next ? "dark" : "light"); } catch {} return next; });
  }, []);

  const [activeTab, setActiveTab] = useState<TabId>("converter");
  const { coins, loading, error, refetch } = useCoinList();
  const t = tc(dark);

  const renderContent = () => {
    switch (activeTab) {
      case "converter": return <ConverterTool coins={coins} loading={loading} error={error} refetch={refetch} />;
      case "dca":       return <DCACalculator coins={coins} loading={loading} error={error} refetch={refetch} />;
      case "pnl":       return <PnLCalculator />;
      case "position":  return <PositionSizeCalculator />;
      case "unlock":    return <TokenUnlockChecker />;
      case "wallet":    return <WalletTracker />;
    }
  };

  const activeLabel = TABS.find((tb) => tb.id === activeTab)?.label;

  return (
    <ThemeContext.Provider value={{ dark, toggle: toggleTheme }}>
      <div className={`min-h-screen flex transition-colors duration-200 ${t.page}`}>

        {/* Desktop Sidebar */}
        <aside className={`hidden md:flex flex-col w-56 border-r py-8 px-4 fixed h-full transition-colors duration-200 ${t.sidebar}`}>
          <div className="mb-8 px-2">
            <h1 className={`text-lg font-bold tracking-tight ${t.sidebarTitle}`}>Crypto Tools</h1>
            <p className={`text-xs mt-0.5 ${t.sidebarSub}`}>Trader's Toolkit</p>
          </div>
          <nav className="flex flex-col gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === id ? t.navActive : t.navInactive}`}>
                <Icon size={16} />{label}
              </button>
            ))}
          </nav>
          <div className={`mt-auto px-2 text-xs leading-relaxed ${t.sidebarFooter}`}>
            Data powered by CoinGecko | Not financial advice.
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-56 flex flex-col min-h-screen pb-20 md:pb-0">
          {/* Top bar */}
          <div className={`flex items-center justify-between px-4 md:px-8 py-4 border-b ${t.divider}`}>
            <h2 className={`text-lg font-semibold ${t.sidebarTitle}`}>{activeLabel}</h2>
            <button onClick={toggleTheme} aria-label="Toggle theme"
              className={`p-2 rounded-lg border transition-colors ${t.toggleBtn}`}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center px-4 py-6">
            <div className="w-full max-w-[640px]">{renderContent()}</div>
          </div>

          <footer className={`hidden md:block text-center py-4 text-xs border-t ${t.footer}`}>
            Data powered by CoinGecko | Not financial advice.
          </footer>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex z-50 transition-colors duration-200 ${t.bottomBar}`}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[9px] font-medium transition-colors ${activeTab === id ? t.bottomActive : t.bottomInactive}`}>
              <Icon size={17} />{label}
            </button>
          ))}
        </nav>
      </div>
    </ThemeContext.Provider>
  );
}
