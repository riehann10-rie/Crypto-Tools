import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeftRight,
  TrendingUp,
  Calculator,
  ShieldAlert,
  Lock,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const IDR_RATE = 16000;

interface Coin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  image: string;
}

function useCoinList() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false"
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCoins(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  return { coins, loading, error, refetch: fetchCoins };
}

function CoinSelect({
  coins,
  value,
  onChange,
}: {
  coins: Coin[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {coins.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} ({c.symbol.toUpperCase()})
        </option>
      ))}
    </select>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "number",
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-600"
      />
    </div>
  );
}

function OutputBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#181818] border border-[#252525] rounded-xl p-4 mt-4">
      {children}
    </div>
  );
}

function OutputRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "red" | "purple";
}) {
  const colorClass =
    highlight === "green"
      ? "text-emerald-400"
      : highlight === "red"
      ? "text-red-400"
      : highlight === "purple"
      ? "text-purple-400"
      : "text-white";
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#252525] last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertCircle className="text-red-400" size={28} />
      <p className="text-gray-400 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-purple-400 text-sm hover:text-purple-300 transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin text-purple-400" size={28} />
    </div>
  );
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUSD(n: number) {
  return `$${fmt(n)}`;
}

function fmtIDR(n: number) {
  return `Rp ${n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function ConverterTool({ coins, loading, error, refetch }: { coins: Coin[]; loading: boolean; error: string | null; refetch: () => void }) {
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("1");

  useEffect(() => {
    if (coins.length && !selectedId) setSelectedId(coins[0].id);
  }, [coins, selectedId]);

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
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Coin</label>
          <CoinSelect coins={coins} value={selectedId} onChange={setSelectedId} />
        </div>
        <Input label="Amount" value={amount} onChange={setAmount} placeholder="1" min={0} />
      </div>
      {coin && (
        <OutputBox>
          <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Converted Value</div>
          <OutputRow label="Current Price (USD)" value={fmtUSD(coin.current_price)} />
          <OutputRow label="USD Value" value={fmtUSD(usdValue)} highlight="purple" />
          <OutputRow label="IDR Value (@ 16,000)" value={fmtIDR(idrValue)} highlight="purple" />
        </OutputBox>
      )}
    </div>
  );
}

function DCACalculator({ coins, loading, error, refetch }: { coins: Coin[]; loading: boolean; error: string | null; refetch: () => void }) {
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("100");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [chartData, setChartData] = useState<{ date: string; portfolio: number; invested: number }[]>([]);
  const [result, setResult] = useState<{ totalInvested: number; currentValue: number; pnl: number; pnlPct: number } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    if (coins.length && !selectedId) setSelectedId(coins[0].id);
  }, [coins, selectedId]);

  const calculate = useCallback(async () => {
    const coin = coins.find((c) => c.id === selectedId);
    if (!coin || !amount || !startDate) return;

    setCalcLoading(true);
    setCalcError(null);

    try {
      const start = new Date(startDate);
      const now = new Date();
      const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
      if (days < 1) { setCalcError("Start date must be in the past."); setCalcLoading(false); return; }

      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${selectedId}/market_chart?vs_currency=usd&days=${Math.min(days, 365)}&interval=daily`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const prices: [number, number][] = data.prices;

      const amountNum = parseFloat(amount) || 0;
      const freqDays = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;

      let totalInvested = 0;
      let totalCoins = 0;
      const chart: typeof chartData = [];

      for (let i = 0; i < prices.length; i++) {
        const [ts, price] = prices[i];
        if (i % freqDays === 0) {
          totalCoins += amountNum / price;
          totalInvested += amountNum;
        }
        const portfolioValue = totalCoins * price;
        const dateStr = new Date(ts).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        chart.push({ date: dateStr, portfolio: parseFloat(portfolioValue.toFixed(2)), invested: parseFloat(totalInvested.toFixed(2)) });
      }

      const currentValue = totalCoins * coin.current_price;
      const pnl = currentValue - totalInvested;
      const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

      setChartData(chart);
      setResult({ totalInvested, currentValue, pnl, pnlPct });
    } catch (e: unknown) {
      setCalcError(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setCalcLoading(false);
    }
  }, [coins, selectedId, amount, frequency, startDate]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={`Could not load coins: ${error}`} onRetry={refetch} />;

  const isProfitable = result ? result.pnl >= 0 : true;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Coin</label>
          <CoinSelect coins={coins} value={selectedId} onChange={setSelectedId} />
        </div>
        <Input label="Investment per Period (USD)" value={amount} onChange={setAmount} placeholder="100" min={1} />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {(["daily", "weekly", "monthly"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  frequency === f
                    ? "bg-purple-600 text-white"
                    : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-purple-500"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <Input label="Start Date" value={startDate} onChange={setStartDate} type="date" />
      </div>
      <button
        onClick={calculate}
        disabled={calcLoading}
        className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        {calcLoading ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
        Calculate DCA
      </button>
      {calcError && <ErrorState message={calcError} />}
      {result && !calcLoading && (
        <OutputBox>
          <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">DCA Results</div>
          <OutputRow label="Total Invested" value={fmtUSD(result.totalInvested)} />
          <OutputRow label="Current Value" value={fmtUSD(result.currentValue)} highlight="purple" />
          <OutputRow label="Total PnL" value={`${isProfitable ? "+" : ""}${fmtUSD(result.pnl)}`} highlight={isProfitable ? "green" : "red"} />
          <OutputRow label="ROI" value={`${isProfitable ? "+" : ""}${fmt(result.pnlPct)}%`} highlight={isProfitable ? "green" : "red"} />
          {chartData.length > 0 && (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} width={50} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#fff", fontSize: 12 }}
                    formatter={(value: number, name: string) => [fmtUSD(value), name === "portfolio" ? "Portfolio" : "Invested"]}
                  />
                  <Line type="monotone" dataKey="invested" stroke="#4b5563" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="portfolio" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 h-0.5 bg-purple-500 inline-block"></span>Portfolio</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 h-0.5 bg-gray-600 inline-block border-dashed"></span>Invested</span>
              </div>
            </div>
          )}
        </OutputBox>
      )}
    </div>
  );
}

function PnLCalculator() {
  const [buyPrice, setBuyPrice] = useState("30000");
  const [sellPrice, setSellPrice] = useState("45000");
  const [coinAmount, setCoinAmount] = useState("0.5");
  const [fee, setFee] = useState("0.1");

  const buy = parseFloat(buyPrice) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const qty = parseFloat(coinAmount) || 0;
  const feeRate = (parseFloat(fee) || 0) / 100;

  const gross = (sell - buy) * qty;
  const totalValue = sell * qty;
  const feeAmount = totalValue * feeRate;
  const net = gross - feeAmount;
  const roi = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
  const isProfit = net >= 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Input label="Buy Price (USD)" value={buyPrice} onChange={setBuyPrice} placeholder="30000" min={0} />
        <Input label="Sell Price (USD)" value={sellPrice} onChange={setSellPrice} placeholder="45000" min={0} />
        <Input label="Coin Amount" value={coinAmount} onChange={setCoinAmount} placeholder="0.5" min={0} />
        <Input label="Trading Fee (%)" value={fee} onChange={setFee} placeholder="0.1" min={0} max={100} />
      </div>
      <OutputBox>
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">PnL Results</div>
        <OutputRow label="Gross Profit / Loss" value={`${gross >= 0 ? "+" : ""}${fmtUSD(gross)}`} highlight={gross >= 0 ? "green" : "red"} />
        <OutputRow label="Trading Fee" value={`-${fmtUSD(feeAmount)}`} />
        <OutputRow label="Net Profit / Loss" value={`${net >= 0 ? "+" : ""}${fmtUSD(net)}`} highlight={isProfit ? "green" : "red"} />
        <OutputRow label="ROI" value={`${roi >= 0 ? "+" : ""}${fmt(roi)}%`} highlight={isProfit ? "green" : "red"} />
      </OutputBox>
    </div>
  );
}

function PositionSizeCalculator() {
  const [portfolio, setPortfolio] = useState("10000");
  const [riskPct, setRiskPct] = useState("2");
  const [entryPrice, setEntryPrice] = useState("30000");
  const [stopLoss, setStopLoss] = useState("28000");

  const port = parseFloat(portfolio) || 0;
  const risk = parseFloat(riskPct) || 0;
  const entry = parseFloat(entryPrice) || 0;
  const stop = parseFloat(stopLoss) || 0;

  const maxLoss = (port * risk) / 100;
  const priceDiff = Math.abs(entry - stop);
  const riskPerCoin = priceDiff;
  const numCoins = riskPerCoin > 0 ? maxLoss / riskPerCoin : 0;
  const positionSizeUSD = numCoins * entry;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Input label="Portfolio Size (USD)" value={portfolio} onChange={setPortfolio} placeholder="10000" min={0} />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Risk Percentage (1–5%)</label>
          <input
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={riskPct}
            onChange={(e) => setRiskPct(e.target.value)}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1%</span>
            <span className="text-purple-400 font-semibold">{riskPct}%</span>
            <span>5%</span>
          </div>
        </div>
        <Input label="Entry Price (USD)" value={entryPrice} onChange={setEntryPrice} placeholder="30000" min={0} />
        <Input label="Stop Loss Price (USD)" value={stopLoss} onChange={setStopLoss} placeholder="28000" min={0} />
      </div>
      <OutputBox>
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Position Size</div>
        <OutputRow label="Position Size (USD)" value={fmtUSD(positionSizeUSD)} highlight="purple" />
        <OutputRow label="Coins to Buy" value={`${fmt(numCoins, 6)}`} highlight="purple" />
        <OutputRow label="Maximum Loss" value={fmtUSD(maxLoss)} highlight="red" />
        <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-[#252525]">
          Not financial advice. Use risk management and always do your own research.
        </p>
      </OutputBox>
    </div>
  );
}

function TokenUnlockChecker() {
  const [tokenName, setTokenName] = useState("Example Token");
  const [totalSupply, setTotalSupply] = useState("1000000000");
  const [circSupply, setCircSupply] = useState("300000000");
  const [unlockAmount, setUnlockAmount] = useState("50000000");
  const [unlockDate, setUnlockDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });

  const total = parseFloat(totalSupply) || 0;
  const circ = parseFloat(circSupply) || 0;
  const unlock = parseFloat(unlockAmount) || 0;

  const unlockPctTotal = total > 0 ? (unlock / total) * 100 : 0;
  const unlockPctCirc = circ > 0 ? (unlock / circ) * 100 : 0;

  const pressure =
    unlockPctCirc >= 10 ? "High" : unlockPctCirc >= 3 ? "Medium" : "Low";
  const pressureColor =
    pressure === "High" ? "text-red-400" : pressure === "Medium" ? "text-yellow-400" : "text-emerald-400";

  const daysUntil = Math.ceil(
    (new Date(unlockDate).getTime() - Date.now()) / 86400000
  );

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
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Unlock Analysis</div>
        <OutputRow label="Token" value={tokenName || "—"} />
        <OutputRow label="Unlock % of Total Supply" value={`${fmt(unlockPctTotal)}%`} />
        <OutputRow label="Unlock % of Circulating" value={`${fmt(unlockPctCirc)}%`} />
        <OutputRow label="Days Until Unlock" value={daysUntil > 0 ? `${daysUntil} days` : daysUntil === 0 ? "Today" : "Past"} />
        <div className="flex items-center justify-between py-2 mt-1">
          <span className="text-gray-400 text-sm">Sell Pressure</span>
          <span className={`text-sm font-bold ${pressureColor} flex items-center gap-1.5`}>
            <span className={`w-2 h-2 rounded-full ${pressure === "High" ? "bg-red-400" : pressure === "Medium" ? "bg-yellow-400" : "bg-emerald-400"}`}></span>
            {pressure}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-[#252525]">
          Pressure based on unlock as % of circulating supply: &lt;3% Low, 3–10% Medium, &gt;10% High
        </div>
      </OutputBox>
    </div>
  );
}

const TABS = [
  { id: "converter", label: "Converter", icon: ArrowLeftRight },
  { id: "dca", label: "DCA", icon: TrendingUp },
  { id: "pnl", label: "PnL", icon: Calculator },
  { id: "position", label: "Position", icon: ShieldAlert },
  { id: "unlock", label: "Unlock", icon: Lock },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("converter");
  const { coins, loading, error, refetch } = useCoinList();

  const renderContent = () => {
    switch (activeTab) {
      case "converter":
        return <ConverterTool coins={coins} loading={loading} error={error} refetch={refetch} />;
      case "dca":
        return <DCACalculator coins={coins} loading={loading} error={error} refetch={refetch} />;
      case "pnl":
        return <PnLCalculator />;
      case "position":
        return <PositionSizeCalculator />;
      case "unlock":
        return <TokenUnlockChecker />;
    }
  };

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-[#1e1e1e] py-8 px-4 fixed h-full">
        <div className="mb-8 px-2">
          <h1 className="text-lg font-bold text-white tracking-tight">Crypto Tools</h1>
          <p className="text-xs text-gray-500 mt-0.5">Trader's Toolkit</p>
        </div>
        <nav className="flex flex-col gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-purple-600/20 text-purple-400 border border-purple-600/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <p className="text-xs text-gray-600 leading-relaxed">
            Data powered by CoinGecko | Not financial advice.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-56 flex flex-col min-h-screen pb-20 md:pb-0">
        <div className="flex-1 flex flex-col items-center px-4 py-8">
          <div className="w-full max-w-[640px]">
            <h2 className="text-xl font-semibold text-white mb-6">{activeLabel}</h2>
            {renderContent()}
          </div>
        </div>
        {/* Desktop Footer */}
        <footer className="hidden md:block text-center py-4 text-xs text-gray-600 border-t border-[#1e1e1e]">
          Data powered by CoinGecko | Not financial advice.
        </footer>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111] border-t border-[#1e1e1e] flex z-50">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
              activeTab === id ? "text-purple-400" : "text-gray-600"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
