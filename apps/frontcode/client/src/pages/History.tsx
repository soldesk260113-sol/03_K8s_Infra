import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Cloud, Zap, ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface HistoryRecord {
  id: number;
  type: "weather" | "energy";
  title: string;
  description: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export default function History() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<"all" | "weather" | "energy">(
    "all"
  );

  // 히스토리 데이터 쿼리
  const weatherQuery = trpc.weather.latest.useQuery();
  const energyQuery = trpc.energy.list.useQuery();

  const weatherRecords = weatherQuery.data?.map(w => ({
    id: w.id,
    type: 'weather' as const,
    title: w.location,
    description: `${w.condition}, ${w.temperature}°C`,
    timestamp: new Date(w.createdAt),
    data: w as any
  })) || [];

  const energyRecords = energyQuery.data?.map(e => ({
    id: e.id,
    type: 'energy' as const,
    title: e.facility,
    description: `${e.consumption}kWh usage (${e.energyType})`,
    timestamp: new Date(e.recordDate),
    data: e as any
  })) || [];

  const history: HistoryRecord[] = [...weatherRecords, ...energyRecords].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  const filteredHistory =
    selectedType === "all" ? history : history.filter((h) => h.type === selectedType);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "weather":
        return <Cloud className="w-5 h-5" />;
      case "energy":
        return <Zap className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "weather":
        return "날씨";
      case "energy":
        return "에너지";
      default:
        return "기타";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "weather":
        return "text-primary/60";
      case "energy":
        return "text-yellow-400/60";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <div className="bg-card/50 border-b border-primary/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-primary/10 rounded-none transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="tech-text text-2xl">데이터 히스토리</h1>
              <p className="text-muted-foreground text-sm">조회한 모든 데이터의 기록을 확인하세요</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors rounded-none">
            <Download className="w-4 h-4" />
            <span className="text-sm font-bold">내보내기</span>
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 p-6">
        {/* 필터 탭 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "weather", "energy"].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type as any)}
              className={`px-4 py-2 rounded-none border transition-all ${selectedType === type
                ? "bg-primary/20 border-primary/60 text-primary"
                : "bg-card/50 border-primary/20 text-muted-foreground hover:bg-primary/10"
                }`}
            >
              {type === "all" ? "전체" : getTypeLabel(type)}
            </button>
          ))}
        </div>

        {/* 히스토리 목록 */}
        <div className="space-y-3">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((record) => (
              <div
                key={record.id}
                className="blueprint-card p-4 hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* 아이콘 */}
                  <div className={`p-3 rounded-none bg-card/50 border border-primary/20 ${getTypeColor(record.type)}`}>
                    {getTypeIcon(record.type)}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm mb-1">{record.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{record.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                      <span>{getTypeLabel(record.type)}</span>
                      <span>•</span>
                      <span>{record.timestamp.toLocaleString("ko-KR")}</span>
                    </div>
                  </div>

                  {/* 상세 보기 버튼 */}
                  <button className="px-3 py-1 text-xs bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors rounded-none whitespace-nowrap">
                    상세보기
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">히스토리가 없습니다</p>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {filteredHistory.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button className="px-3 py-1 text-xs bg-card/50 border border-primary/20 hover:bg-primary/10 transition-colors rounded-none">
              이전
            </button>
            <span className="text-xs text-muted-foreground">1 / 5</span>
            <button className="px-3 py-1 text-xs bg-card/50 border border-primary/20 hover:bg-primary/10 transition-colors rounded-none">
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
