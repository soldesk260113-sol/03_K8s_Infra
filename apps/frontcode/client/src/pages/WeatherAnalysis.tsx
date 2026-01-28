import {
  ArrowLeft,
  Cloud,
  Droplets,
  Wind,
  Eye,
  Gauge,
  Sun,
  CloudRain,
  Radio,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

export default function WeatherAnalysis() {
  const [, setLocation] = useLocation();
  const locationName = "서울";

  const { data: weather, isLoading, error } =
    trpc.weather.fetch.useQuery({
      location: locationName,
    });

  /* ===============================
     🔥 차트용 데이터 가공 (정수)
  =============================== */
  const hourly = weather?.hourlyData || [];

  const temperatureData = hourly.map((h: any) => ({
    time: h.time ?? h.baseTime ?? "",
    temp: Math.round(h.temp ?? h.ta ?? 0),
    feelsLike: Math.round(h.feelsLike ?? h.taf ?? h.sens ?? 0),
  }));

  const humidityData = hourly.map((h: any) => ({
    time: h.time ?? h.baseTime ?? "",
    humidity: Math.round(h.humidity ?? h.reh ?? 0),
  }));

  const weeklyForecast = weather?.weeklyForecast || [];

  /* ===============================
     로딩 / 에러
  =============================== */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl tech-text text-red-500 mb-2">
            데이터 로드 실패
          </h2>
          <p className="text-muted-foreground mb-6">
            {error?.message || "서버 오류"}
          </p>
          <button
            onClick={() => setLocation("/")}
            className="px-6 py-2 bg-primary/10 border border-primary/20 rounded"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  /* ===============================
     현재 상세 정보 (정수)
  =============================== */
  const currentDetails = [
    {
      label: "온도",
      value: `${Math.round(weather.temperature)}°C`,
      icon: Cloud,
    },
    {
      label: "체감 온도",
      value: `${Math.round(
        weather.feelsLike ?? weather.temperature
      )}°C`,
      icon: Cloud,
    },
    {
      label: "습도",
      value: `${Math.round(weather.humidity)}%`,
      icon: Droplets,
    },
    {
      label: "풍속",
      value: `${Math.round(weather.windSpeed)} m/s`,
      icon: Wind,
    },
    {
      label: "시정",
      value: `${(weather.visibility ?? 15000).toLocaleString()} m`,
      icon: Eye,
    },
    {
      label: "기압",
      value: `${Math.round(weather.pressure ?? 1020)} hPa`,
      icon: Gauge,
    },
    {
      label: "자외선",
      value: `${Math.round(weather.uvIndex ?? 2)}`,
      icon: Sun,
    },
    {
      label: "강수량",
      value: `${Math.round(weather.precipitation ?? 0)} mm`,
      icon: CloudRain,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card/50 border-b border-primary/20 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-primary/10 rounded"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="tech-text text-2xl">날씨 분석</h1>
              {weather.isRealData && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full border border-green-500/30 animate-pulse">
                  <Radio className="w-3 h-3" /> LIVE
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {weather.location}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {/* 현재 정보 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {currentDetails.map((d, i) => {
            const Icon = d.icon;
            return (
              <Card key={i} className="blueprint-card p-4">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary/60" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {d.label}
                    </p>
                    <p className="tech-text text-sm font-bold">
                      {d.value}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 온도 차트 */}
        <Card className="blueprint-card p-6 overflow-x-auto">
          <h2 className="tech-text text-lg mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            시간별 온도 변화 (24시간)
          </h2>

          <div className="h-[320px] min-w-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                <XAxis
                  dataKey="time"
                  tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 700 }}
                  stroke="#94a3b8"
                />

                <YAxis
                  tick={{ fill: "#0f172a", fontSize: 11 }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => Math.round(v).toString()}
                />

                <Tooltip
                  formatter={(v: number) => [`${Math.round(v)}°C`, ""]}
                />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="기온"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="feelsLike"
                  stroke="#60a5fa"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="체감온도"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 습도 차트 */}
        <Card className="blueprint-card p-6 overflow-x-auto">
          <h2 className="tech-text text-lg mb-4 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-400" />
            시간별 습도 변화 (24시간)
          </h2>

          <div className="h-[270px] min-w-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={humidityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                <XAxis
                  dataKey="time"
                  tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 700 }}
                  stroke="#94a3b8"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#0f172a", fontSize: 11 }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => Math.round(v).toString()}
                />

                <Tooltip
                  formatter={(v: number) => [`${Math.round(v)}%`, ""]}
                />

                <Bar
                  dataKey="humidity"
                  fill="#06b6d4"
                  name="습도 (%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 7일 예보 */}
        <div>
          <h2 className="tech-text text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            7일 예보
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weeklyForecast.slice(0, 7).map((day: any, idx: number) => (
              <Card key={idx} className="blueprint-card p-4 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {day.date}
                </p>
                <p className="font-bold text-sm mb-3">
                  {day.day}요일
                </p>
                <div className="text-4xl mb-2">{day.icon}</div>
                <p className="text-xs text-muted-foreground">
                  {day.condition}
                </p>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-red-400">
                    최고 {Math.round(day.high)}°
                  </span>
                  <span className="text-blue-300">
                    최저 {Math.round(day.low)}°
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}