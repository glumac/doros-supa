import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RiArrowLeftLine } from "react-icons/ri";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import {
  useUserStats,
  useUserDailyCompletions,
  useUserWeeklyCompletions,
  useUserMonthlyCompletions,
} from "../hooks/useUserStats";
import { ProfileTabs } from "./ProfileTabs";
import {
  getThisWeekStartEST,
  getThisWeekEndEST,
  getLastWeekStartEST,
  getLastWeekEndEST,
  getThisMonthStartEST,
  getThisMonthEndEST,
  getThisYearStartEST,
  getThisYearEndEST,
  getLastYearStartEST,
  getLastYearEndEST,
  getDaysBetween,
  toISOString,
  parseDate,
} from "../utils/dateUtils";

type TimeframePreset =
  | "this-week"
  | "last-week"
  | "this-month"
  | "this-year"
  | "last-year"
  | "all-time"
  | "custom";

type ChartView = "day" | "week" | "month" | "year";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

function StatCard({ title, value, subtitle, loading, className = "" }: StatCardProps) {
  return (
    <div className={`cq-stat-card bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="cq-stat-card-title text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title}
      </h3>
      {loading ? (
        <div className="cq-stat-card-loading mt-2 h-8 bg-gray-200 rounded animate-pulse w-20" />
      ) : (
        <p className="cq-stat-card-value mt-2 text-3xl font-bold text-gray-900">{value}</p>
      )}
      {subtitle && <p className="cq-stat-card-subtitle mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

export function UserStats() {
  const { userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse timeframe from URL
  const timeframeParam = searchParams.get("timeframe") || "this-week";
  const viewParam = searchParams.get("view") as ChartView | null;

  // Determine if custom date range
  const isCustomRange = timeframeParam.includes(",");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Calculate date range based on timeframe
  const { startDate, endDate, timeframe } = useMemo(() => {
    let start: Date;
    let end: Date;
    let preset: TimeframePreset;

    if (isCustomRange) {
      const [startStr, endStr] = timeframeParam.split(",");
      if (startStr && endStr) {
        start = parseDate(startStr);
        end = new Date(parseDate(endStr));
        end.setHours(23, 59, 59, 999);
        preset = "custom";
        setCustomStart(startStr);
        setCustomEnd(endStr);
      } else {
        // Invalid custom range, fall back to this-week
        start = getThisWeekStartEST();
        end = getThisWeekEndEST();
        preset = "this-week";
      }
    } else {
      preset = timeframeParam as TimeframePreset;
      switch (preset) {
        case "last-week":
          start = getLastWeekStartEST();
          end = getLastWeekEndEST();
          break;
        case "this-month":
          start = getThisMonthStartEST();
          end = getThisMonthEndEST();
          break;
        case "this-year":
          start = getThisYearStartEST();
          end = getThisYearEndEST();
          break;
        case "last-year":
          start = getLastYearStartEST();
          end = getLastYearEndEST();
          break;
        case "all-time":
          return {
            startDate: undefined,
            endDate: undefined,
            timeframe: "all-time" as TimeframePreset,
          };
        case "this-week":
        default:
          start = getThisWeekStartEST();
          end = getThisWeekEndEST();
          preset = "this-week";
          break;
      }
    }

    return {
      startDate: toISOString(start),
      endDate: toISOString(end),
      timeframe: preset,
    };
  }, [timeframeParam, isCustomRange]);

  // Determine appropriate chart view based on timeframe and user preference
  const { chartView, availableViews } = useMemo(() => {
    if (!startDate || !endDate) {
      // All time - show month/year toggle (if >2 years of data)
      return {
        chartView: (viewParam || "month") as ChartView,
        availableViews: ["month", "year"] as ChartView[],
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = getDaysBetween(start, end);

    // Smart view selection based on Option C logic
    if (timeframe === "this-week" || timeframe === "last-week") {
      // Week view: day only
      return { chartView: "day" as ChartView, availableViews: ["day"] as ChartView[] };
    } else if (timeframe === "this-month") {
      // This Month: day/week toggle
      return {
        chartView: (viewParam || "day") as ChartView,
        availableViews: ["day", "week"] as ChartView[],
      };
    } else if (timeframe === "this-year" || timeframe === "last-year") {
      // Year presets: day/week/month toggle
      return {
        chartView: (viewParam || "day") as ChartView,
        availableViews: ["day", "week", "month"] as ChartView[],
      };
    } else if (dayCount <= 30) {
      // Custom ≤30 days: day/week toggle
      return {
        chartView: (viewParam || "day") as ChartView,
        availableViews: ["day", "week"] as ChartView[],
      };
    } else if (dayCount <= 365) {
      // Custom 31-365 days: day/week/month toggle
      return {
        chartView: (viewParam || "day") as ChartView,
        availableViews: ["day", "week", "month"] as ChartView[],
      };
    } else {
      // >365 days: month/year toggle
      return {
        chartView: (viewParam || "month") as ChartView,
        availableViews: ["month", "year"] as ChartView[],
      };
    }
  }, [startDate, endDate, timeframe, viewParam]);

  // Fetch stats and chart data
  const { data: stats, isLoading: statsLoading } = useUserStats(
    userProfile?.id,
    startDate,
    endDate
  );

  const { data: dailyData } = useUserDailyCompletions(
    userProfile?.id,
    startDate,
    endDate
  );

  const { data: weeklyData } = useUserWeeklyCompletions(
    userProfile?.id,
    startDate,
    endDate
  );

  const { data: monthlyData } = useUserMonthlyCompletions(
    userProfile?.id,
    startDate,
    endDate
  );

  // Handle timeframe selection
  const handleTimeframeChange = (preset: TimeframePreset) => {
    const params = new URLSearchParams();
    params.set("timeframe", preset);
    setSearchParams(params);
  };

  // Handle custom date range
  const handleCustomDateChange = (start: string, end: string) => {
    if (start && end) {
      const params = new URLSearchParams();
      params.set("timeframe", `${start},${end}`);
      setSearchParams(params);
    }
  };

  // Handle view change
  const handleViewChange = (view: ChartView) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", view);
    setSearchParams(params);
  };

  // Format chart data
  const chartData = useMemo(() => {
    if (chartView === "day") {
      return (dailyData || []).map((d: any) => ({
        // Parse as local date to avoid timezone shift (YYYY-MM-DD + T12:00 prevents UTC interpretation)
        date: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: Number(d.count),
      }));
    } else if (chartView === "week") {
      return (weeklyData || []).map((d: any, index: number) => ({
        date: `Week ${index + 1}`,
        count: Number(d.count),
      }));
    } else if (chartView === "month") {
      return (monthlyData || []).map((d: any) => ({
        // Parse as local date to avoid timezone shift
        date: new Date(d.month_start + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        count: Number(d.count),
      }));
    }
    return [];
  }, [chartView, dailyData, weeklyData, monthlyData]);

  // Timeframe preset buttons
  const presets: { label: string; value: TimeframePreset }[] = [
    { label: "This Week", value: "this-week" },
    { label: "Last Week", value: "last-week" },
    { label: "This Month", value: "this-month" },
    { label: "This Year", value: "this-year" },
    { label: "Last Year", value: "last-year" },
    { label: "All Time", value: "all-time" },
    { label: "Custom", value: "custom" },
  ];

  if (!userProfile) {
    return (
      <div className="cq-user-stats-container min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500">Please log in to view your stats.</p>
        </div>
      </div>
    );
  }

  const hasData = stats && stats.total_pomodoros > 0;

  return (
    <div className="cq-user-stats-container min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="cq-user-stats-header mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">My Stats</h1>
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RiArrowLeftLine />
              <span>Back to Feed</span>
            </Link>
          </div>
        </div>

        {/* Profile Tabs */}
        <ProfileTabs userId={userProfile.id} />

        {/* Timeframe Selector */}
        <div className="cq-user-stats-timeframe-selector mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleTimeframeChange(preset.value)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    timeframe === preset.value
                      ? "active bg-red-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-label={preset.label}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {timeframe === "custom" && (
              <div className="cq-user-stats-custom-date-range flex items-center gap-2">
                <label htmlFor="start-date" className="sr-only">Start Date</label>
                <input
                  id="start-date"
                  type="date"
                  value={customStart}
                  onChange={(e) => {
                    setCustomStart(e.target.value);
                    if (customEnd) handleCustomDateChange(e.target.value, customEnd);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Start date"
                />
                <span className="text-gray-500">to</span>
                <label htmlFor="end-date" className="sr-only">End Date</label>
                <input
                  id="end-date"
                  type="date"
                  value={customEnd}
                  onChange={(e) => {
                    setCustomEnd(e.target.value);
                    if (customStart) handleCustomDateChange(customStart, e.target.value);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="End date"
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="cq-user-stats-grid grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Pomodoros"
            value={stats?.total_pomodoros?.toLocaleString() || 0}
            subtitle="Created this period"
            loading={statsLoading}
            className="cq-user-stats-pomodoros"
          />
          <StatCard
            title="Completed"
            value={stats?.completed_pomodoros?.toLocaleString() || 0}
            subtitle="This period"
            loading={statsLoading}
            className="cq-user-stats-completed"
          />
          <StatCard
            title="Active Days"
            value={stats?.active_days?.toLocaleString() || 0}
            subtitle={`out of ${stats?.total_days || 0} days`}
            loading={statsLoading}
            className="cq-user-stats-active-days"
          />
        </div>

        {/* Empty State */}
        {!statsLoading && !hasData && (
          <div className="cq-user-stats-empty text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500 text-lg">
              No pomodoros yet in this period. Start your first session!
            </p>
            <Link
              to="/"
              className="text-blue-500 hover:underline mt-4 inline-block"
            >
              Go to Timer →
            </Link>
          </div>
        )}

        {/* Chart Section */}
        {hasData && (
          <>
            {/* View Controls (context-aware) */}
            {availableViews.length > 1 && (
              <div className="cq-user-stats-view-controls mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">View by:</span>
                  {availableViews.map((view) => (
                    <label key={view} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="chart-view"
                        value={view}
                        checked={chartView === view}
                        onChange={() => handleViewChange(view)}
                        className="text-red-600 focus:ring-red-500"
                        aria-label={`View by ${view}`}
                      />
                      <span className="text-sm capitalize">{view}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="cq-user-stats-chart bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {chartView === "day" && "Daily Completions"}
                {chartView === "week" && "Weekly Completions"}
                {chartView === "month" && "Monthly Completions"}
                {chartView === "year" && "Yearly Completions"}
              </h2>
              <div className="cq-user-stats-daily-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#ef4444"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
