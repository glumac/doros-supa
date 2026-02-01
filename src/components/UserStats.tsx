import { useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import LogoutButton from './LogoutButton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  useUserStats,
  useUserDailyCompletions,
  useUserWeeklyCompletions,
  useUserMonthlyCompletions,
} from "../hooks/useUserStats";
import { useFollowers, useFollowing } from "../hooks/useUserProfile";
import { ProfileTabs } from "./ProfileTabs";
import { getAvatarPlaceholder } from "../utils/avatarPlaceholder";
import { removeStyle } from "../utils/styleDefs";
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
  createSafeDate,
} from "../utils/dateUtils";
import {
  fillDailyData,
  fillWeeklyData,
  fillMonthlyData,
} from "../utils/chartDataUtils";
import { findFirstPomodoroInRange } from "../lib/queries";

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
  const navigate = useNavigate();

  const { data: followers } = useFollowers(userProfile?.id);
  const { data: following } = useFollowing(userProfile?.id);
  const followerCount = followers?.length ?? 0;
  const followingCount = following?.length ?? 0;

  // Parse timeframe from URL
  const timeframeParam = searchParams.get("timeframe") || "this-week";
  const viewParam = searchParams.get("view") as ChartView | null;

  // Determine if custom date range
  const isCustomRange = timeframeParam.includes(",");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomInputs, setShowCustomInputs] = useState(false);

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
        setShowCustomInputs(true);
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
    if (preset === "custom") {
      setShowCustomInputs(true);
      // Set default date range if not already set (last 30 days)
      if (!customStart || !customEnd) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const startStr = toISOString(start).split('T')[0] || '';
        const endStr = toISOString(end).split('T')[0] || '';
        setCustomStart(startStr);
        setCustomEnd(endStr);
        const params = new URLSearchParams();
        params.set("timeframe", `${startStr},${endStr}`);
        setSearchParams(params);
      }
    } else {
      setShowCustomInputs(false);
      const params = new URLSearchParams();
      params.set("timeframe", preset);
      setSearchParams(params);
    }
  };

  // Handle custom date range
  const handleCustomDateChange = (start: string, end: string) => {
    if (start && end) {
      // Validate that end is not before start
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (endDate < startDate) {
        // Don't update if invalid range
        return;
      }
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

  // Format chart data with date range metadata for navigation
  const chartData = useMemo(() => {
    // Handle all-time view (no date range)
    if (!startDate || !endDate) {
      if (chartView === "month") {
        return (monthlyData || []).map((d) => {
          const monthStart = d.month_start;
          const monthEnd = new Date(monthStart + "T12:00:00");
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0); // Last day of the month
          monthEnd.setHours(23, 59, 59, 999);

          return {
            date: new Date(monthStart + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            count: Number(d.count),
            startDate: monthStart,
            endDate: monthEnd.toISOString().split('T')[0],
          };
        });
      } else if (chartView === "year") {
        // Group monthly data by year for yearly view
        const yearlyMap = new Map<number, { count: number; firstMonth: string; lastMonth: string }>();
        (monthlyData || []).forEach((d) => {
          const year = new Date(d.month_start + "T12:00:00").getFullYear();
          const existing = yearlyMap.get(year);
          if (!existing) {
            yearlyMap.set(year, { count: Number(d.count), firstMonth: d.month_start, lastMonth: d.month_start });
          } else {
            existing.count += Number(d.count);
            if (d.month_start < existing.firstMonth) existing.firstMonth = d.month_start;
            if (d.month_start > existing.lastMonth) existing.lastMonth = d.month_start;
          }
        });
        return Array.from(yearlyMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([year, { count, firstMonth, lastMonth }]) => {
            const yearStart = `${year}-01-01`;
            const yearEnd = `${year}-12-31`;
            return {
              date: year.toString(),
              count,
              startDate: yearStart,
              endDate: yearEnd,
            };
          });
      }
      return [];
    }

    // Convert ISO strings to local dates, handling timezone properly
    const startUTC = new Date(startDate);
    const endUTC = new Date(endDate);

    // Create safe local dates from the UTC dates
    const start = createSafeDate(
      `${startUTC.getFullYear()}-${String(startUTC.getMonth() + 1).padStart(2, '0')}-${String(startUTC.getDate()).padStart(2, '0')}`
    );
    const end = createSafeDate(
      `${endUTC.getFullYear()}-${String(endUTC.getMonth() + 1).padStart(2, '0')}-${String(endUTC.getDate()).padStart(2, '0')}`
    );

    if (chartView === "day") {
      const filledData = fillDailyData(dailyData || [], start, end);
      return filledData.map((d) => ({
        // Parse as local date to avoid timezone shift (YYYY-MM-DD + T12:00 prevents UTC interpretation)
        date: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: Number(d.count),
        startDate: d.date,
        endDate: d.date,
      }));
    } else if (chartView === "week") {
      const filledData = fillWeeklyData(weeklyData || [], start, end);
      return filledData.map((d, index) => {
        const weekStart = d.week_start;
        const weekEnd = new Date(weekStart + "T12:00:00");
        weekEnd.setDate(weekEnd.getDate() + 6);

        return {
          date: `Week ${index + 1}`,
          count: Number(d.count),
          startDate: weekStart,
          endDate: weekEnd.toISOString().split('T')[0],
        };
      });
    } else if (chartView === "month") {
      const filledData = fillMonthlyData(monthlyData || [], start, end);
      return filledData.map((d) => {
        const monthStart = d.month_start;
        const monthEnd = new Date(monthStart + "T12:00:00");
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0); // Last day of the month
        monthEnd.setHours(23, 59, 59, 999);

        return {
          // Parse as local date to avoid timezone shift
          date: new Date(monthStart + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          count: Number(d.count),
          startDate: monthStart,
          endDate: monthEnd.toISOString().split('T')[0],
        };
      });
    }
    return [];
  }, [chartView, dailyData, weeklyData, monthlyData, startDate, endDate]);

  // Handle chart bar click
  const handleBarClick = async (data: any) => {
    if (!userProfile?.id || !data || data.count === 0) return;

    const { startDate: rangeStart, endDate: rangeEnd } = data;
    if (!rangeStart || !rangeEnd) return;

    // Navigate immediately to page 1 for instant feedback
    navigate(`/user/${userProfile.id}?page=1`);

    // Find the first pomodoro in the background
    try {
      const result = await findFirstPomodoroInRange(
        userProfile.id,
        rangeStart + "T00:00:00",
        rangeEnd + "T23:59:59",
        20 // pageSize
      );

      if (result) {
        // Navigate to the correct page with the pomodoro hash
        navigate(`/user/${userProfile.id}?page=${result.pageNumber}#pomodoro-${result.pomodoroId}`);
      }
    } catch (error) {
      console.error("Error finding pomodoro:", error);
      // Stay on page 1 if there's an error
    }
  };

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
    <div className="cq-user-stats-container min-h-screen bg-gray-50 back-pattern">
      {/* Profile Header - matches UserProfile */}
      <div className="cq-user-stats-header relative flex flex-col mb-4">
        <div className="cq-user-stats-banner-container flex flex-col justify-center items-center">
          <img
            className="cq-user-stats-banner w-full h-28 2xl:h-40 shadow-lg object-cover"
            src="/tomatoes-header.jpg"
            alt="Profile banner"
          />
          <img
            className="cq-user-stats-avatar rounded-full w-20 h-20 -mt-10 shadow-xl object-cover"
            src={userProfile?.avatar_url || getAvatarPlaceholder(80)}
            alt="user-pic"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getAvatarPlaceholder(80);
            }}
          />
        </div>
        {/* Name row with logout right-aligned */}
        <div className="cq-user-stats-name-row w-full mt-3 px-4 md:px-8">
          <div className="flex items-center justify-between">
            <div className="w-20" />
            <h1 className="cq-user-stats-name text-green-700 font-medium text-5xl text-center flex-1">
              {userProfile?.user_name}
            </h1>
            <LogoutButton />
          </div>
        </div>

        {/* Followers/Following Stats */}
        <div className="cq-user-stats-stats flex justify-center gap-6 mt-3 mb-2">
          <Link
            to={`/user/${userProfile.id}`}
            className="cq-user-stats-followers-button text-center hover:underline cursor-pointer"
            aria-label={`View ${followerCount} followers`}
          >
            <div className="cq-user-stats-followers-count font-bold text-lg">{followerCount}</div>
            <div className="cq-user-stats-followers-label text-gray-600 text-sm">Followers</div>
          </Link>
          <Link
            to={`/user/${userProfile.id}`}
            className="cq-user-stats-following-button text-center hover:underline cursor-pointer"
            aria-label={`View ${followingCount} following`}
          >
            <div className="cq-user-stats-following-count font-bold text-lg">{followingCount}</div>
            <div className="cq-user-stats-following-label text-gray-600 text-sm">Following</div>
          </Link>
        </div>
      </div>

      {/* Profile Tabs - outside max-w-7xl to match UserProfile */}
      <ProfileTabs userId={userProfile.id} />

      <div className="max-w-7xl mx-auto p-6">
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

            {showCustomInputs && (
              <div className="cq-user-stats-custom-date-range flex items-center gap-2" data-testid="custom-date-range">
                <label htmlFor="start-date" className="sr-only">Start Date</label>
                <input
                  id="start-date"
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
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
                  min={customStart || undefined}
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
                      onClick={handleBarClick}
                      cursor="pointer"
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
