import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { RiHomeFill } from "react-icons/ri";
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
import {
  useAdminStats,
  useDailyPomodoros,
  useDailySignups,
  useRecentActiveUsers,
} from "../hooks/useAdminDashboard";
import { getAvatarPlaceholder } from "../utils/avatarPlaceholder";
import { fillDailyData } from "../utils/chartDataUtils";
import { createSafeDate } from "../utils/dateUtils";

type TimeRange = "7d" | "30d" | "all" | "custom";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string | undefined;
  loading?: boolean | undefined;
}

function StatCard({ title, value, subtitle, loading }: StatCardProps) {
  return (
    <div className="cq-admin-stat-card bg-white rounded-lg shadow-md p-6">
      <h3 className="cq-admin-stat-title text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title}
      </h3>
      {loading ? (
        <div className="cq-admin-stat-loading mt-2 h-8 bg-gray-200 rounded animate-pulse w-20" />
      ) : (
        <p className="cq-admin-stat-value mt-2 text-3xl font-bold text-gray-900">{value}</p>
      )}
      {subtitle && <p className="cq-admin-stat-subtitle mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function TimeRangeSelector({
  selected,
  onSelect,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
}) {
  const buttons: { label: string; value: TimeRange }[] = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "All time", value: "all" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="cq-admin-time-range-selector flex flex-wrap items-center gap-2">
      <div className="cq-admin-time-range-buttons flex rounded-lg border border-gray-300 overflow-hidden">
        {buttons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => onSelect(btn.value)}
            className={`cq-admin-time-range-button px-4 py-2 text-sm font-medium transition-colors ${
              selected === btn.value
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {selected === "custom" && (
        <div className="cq-admin-custom-date-range flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="cq-admin-custom-start-date px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="cq-admin-date-separator text-gray-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="cq-admin-custom-end-date px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEnd, setCustomEnd] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (timeRange) {
      case "7d":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case "custom":
        start = customStart ? new Date(customStart) : null;
        return {
          startDate: start ? start.toISOString() : undefined,
          endDate: customEnd ? new Date(customEnd + "T23:59:59").toISOString() : undefined,
        };
      case "all":
      default:
        return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: start?.toISOString(),
      endDate: end.toISOString(),
    };
  }, [timeRange, customStart, customEnd]);

  const { data: stats, isLoading: statsLoading } = useAdminStats(startDate, endDate);
  const { data: dailyPomodoros, isLoading: pomodorosLoading } = useDailyPomodoros(
    startDate || "2020-01-01",
    endDate || new Date().toISOString()
  );
  const { data: dailySignups, isLoading: signupsLoading } = useDailySignups(
    startDate || "2020-01-01",
    endDate || new Date().toISOString()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const pomodoroChartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    // Convert ISO strings to local dates, handling timezone properly
    const startUTC = new Date(startDate || "2020-01-01");
    const endUTC = new Date(endDate || new Date().toISOString());

    const start = createSafeDate(
      `${startUTC.getFullYear()}-${String(startUTC.getMonth() + 1).padStart(2, '0')}-${String(startUTC.getDate()).padStart(2, '0')}`
    );
    const end = createSafeDate(
      `${endUTC.getFullYear()}-${String(endUTC.getMonth() + 1).padStart(2, '0')}-${String(endUTC.getDate()).padStart(2, '0')}`
    );

    const filledData = fillDailyData(dailyPomodoros || [], start, end);
    return filledData.map((d) => ({
      date: formatDate(d.date + "T12:00:00"),
      count: Number(d.count),
    }));
  }, [dailyPomodoros, startDate, endDate]);

  const signupChartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    // Convert ISO strings to local dates, handling timezone properly
    const startUTC = new Date(startDate || "2020-01-01");
    const endUTC = new Date(endDate || new Date().toISOString());

    const start = createSafeDate(
      `${startUTC.getFullYear()}-${String(startUTC.getMonth() + 1).padStart(2, '0')}-${String(startUTC.getDate()).padStart(2, '0')}`
    );
    const end = createSafeDate(
      `${endUTC.getFullYear()}-${String(endUTC.getMonth() + 1).padStart(2, '0')}-${String(endUTC.getDate()).padStart(2, '0')}`
    );

    const filledData = fillDailyData(dailySignups || [], start, end);
    return filledData.map((d) => ({
      date: formatDate(d.date + "T12:00:00"),
      count: Number(d.count),
    }));
  }, [dailySignups, startDate, endDate]);

  const { data: recentUsers, isLoading: recentUsersLoading } = useRecentActiveUsers(20);

  // Format relative time (e.g., "2 minutes ago")
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };

  return (
    <div className="cq-admin-dashboard min-h-screen bg-gray-50 p-6">
      <div className="cq-admin-dashboard-container max-w-7xl mx-auto">
        <div className="cq-admin-header mb-8">
          <div className="cq-admin-header-top flex items-center justify-between">
            <h1 className="cq-admin-title text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <Link
              to="/"
              className="cq-admin-home-link flex items-center gap-2 text-slate-500 hover:text-green-800 transition-all duration-200"
            >
              <RiHomeFill />
              <span>Home</span>
            </Link>
          </div>
          <p className="cq-admin-subtitle mt-2 text-gray-600">
            Monitor app metrics and user activity
          </p>
        </div>

        <div className="cq-admin-time-range-wrapper mb-6">
          <TimeRangeSelector
            selected={timeRange}
            onSelect={setTimeRange}
            customStart={customStart || ""}
            customEnd={customEnd || ""}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        </div>

        <div className="cq-admin-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.total_users?.toLocaleString() || 0}
            {...(timeRange !== "all" && {
              subtitle: `+${stats?.new_users || 0} new in period`
            })}
            loading={statsLoading}
          />
          <StatCard
            title="Pomodoros Completed"
            value={stats?.completed_pomodoros?.toLocaleString() || 0}
            {...(stats?.total_pomodoros && {
              subtitle: `${stats.total_pomodoros.toLocaleString()} total created`
            })}
            loading={statsLoading}
          />
          <StatCard
            title="Engagement"
            value={
              ((stats?.total_likes || 0) + (stats?.total_comments || 0)).toLocaleString()
            }
            subtitle={`${stats?.total_likes || 0} likes, ${stats?.total_comments || 0} comments`}
            loading={statsLoading}
          />
          <StatCard
            title="Active Users"
            value={stats?.active_users?.toLocaleString() || 0}
            subtitle="Users with completed pomodoros"
            loading={statsLoading}
          />
        </div>

        <div className="cq-admin-charts-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="cq-admin-pomodoros-chart bg-white rounded-lg shadow-md p-6">
            <h2 className="cq-admin-chart-title text-lg font-semibold text-gray-900 mb-4">
              Daily Pomodoros Completed
            </h2>
            {pomodorosLoading ? (
              <div className="cq-admin-chart-loading h-64 bg-gray-100 rounded animate-pulse" />
            ) : pomodoroChartData.length === 0 ? (
              <div className="cq-admin-chart-empty h-64 flex items-center justify-center text-gray-500">
                No data for selected period
              </div>
            ) : (
              <div className="cq-admin-chart-content">
                <ResponsiveContainer width="100%" height={256}>
                  <LineChart data={pomodoroChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={{ fill: "#dc2626", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="cq-admin-signups-chart bg-white rounded-lg shadow-md p-6">
            <h2 className="cq-admin-chart-title text-lg font-semibold text-gray-900 mb-4">
              Daily New Users
            </h2>
            {signupsLoading ? (
              <div className="cq-admin-chart-loading h-64 bg-gray-100 rounded animate-pulse" />
            ) : signupChartData.length === 0 ? (
              <div className="cq-admin-chart-empty h-64 flex items-center justify-center text-gray-500">
                No data for selected period
              </div>
            ) : (
              <div className="cq-admin-chart-content">
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={signupChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Recently Active Users */}
        <div className="cq-admin-recent-users bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="cq-admin-chart-title text-lg font-semibold text-gray-900 mb-4">
            Recently Active Users
          </h2>
          {recentUsersLoading ? (
            <div className="cq-admin-recent-users-loading space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                </div>
              ))}
            </div>
          ) : !recentUsers || recentUsers.length === 0 ? (
            <div className="cq-admin-recent-users-empty text-center py-8 text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="cq-admin-recent-users-list space-y-2">
              {recentUsers.map((user) => (
                <Link
                  key={user.id}
                  to={`/user/${user.id}`}
                  className="cq-admin-recent-user-item cq-admin-recent-user-link flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={user.avatar_url || getAvatarPlaceholder(40)}
                    alt={user.user_name}
                    className="cq-admin-recent-user-avatar w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getAvatarPlaceholder(40);
                    }}
                  />
                  <span className="cq-admin-recent-user-name flex-1 font-medium text-gray-900">
                    {user.user_name}
                  </span>
                  <span className="cq-admin-recent-user-time text-sm text-gray-500">
                    {formatRelativeTime(user.last_seen_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
