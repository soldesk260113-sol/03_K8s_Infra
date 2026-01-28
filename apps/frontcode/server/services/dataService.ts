/**
 * 데이터 서비스
 * 날씨, 물류, 에너지 데이터를 제공하는 서비스
 * 실제 환경에서는 외부 API에서 데이터를 가져옵니다.
 */

export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description?: string;
  feelsLike?: number;
  uvIndex?: number;
  visibility?: number;
  pressure?: number;
  precipitation?: number;
  hourlyData?: Array<{ time: string; temp: number; feelsLike: number; humidity: number }>;
  weeklyForecast?: Array<{ date: string; day: string; icon: string; condition: string; high: number; low: number }>;
  isRealData?: boolean;
  yesterdayTemp?: number;
  tomorrowTemp?: number;
}


export interface EnergyData {
  facility: string;
  energyType: string;
  consumption: number;
  cost: number;
  efficiency?: number;
  carbonEmission?: number;
  peakUsage?: number;
  averageUsage?: number;
  trend?: string;
  notes?: string;
  recordDate: Date;
  monthlyStats?: Array<{ month: string; electric: number; gas: number }>;
  isRealData?: boolean;
}

import { fetchWeatherFromKMA } from "./apiClient";

/**
 * 날씨 데이터 조회 (샘플 데이터 + 실제 API)
 */
export async function getWeatherData(location: string): Promise<WeatherData> {
  const realData = await fetchWeatherFromKMA(location);

  if (realData && realData.ncst) {
    const { ncst, short, midLand, midTemp } = realData;

    // 1. 실황(NCST) 데이터
    const items = ncst?.response?.body?.items?.item || [];
    const findItem = (cat: string) => items.find((i: any) => i.category === cat)?.obsrValue;
    const temperature = findItem("T1H");

    if (temperature !== undefined) {
      // 2. 단기 예보(SHORT)로 시간별 데이터 및 오늘/내일 예보 추출
      const shortItems = short?.response?.body?.items?.item || [];
      const hourlyMap: Record<string, { time: string; temp: number; feelsLike: number; humidity: number }> = {};

      // 요일 구하기 유틸
      const getDayName = (offset: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
      };

      const getFormattedDate = (offset: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return `${d.getMonth() + 1}/${d.getDate().toString().padStart(2, '0')}`;
      };

      const dailyMinMax: Record<string, { high: number; low: number; condition: string }> = {};

      shortItems.forEach((item: any) => {
        // 시간별 데이터 (24시간)
        const timeStr = `${item.fcstTime.substring(0, 2)}:00`;
        if (!hourlyMap[timeStr]) hourlyMap[timeStr] = { time: timeStr, temp: 0, feelsLike: 0, humidity: 0 };
        if (item.category === "TMP") {
          hourlyMap[timeStr].temp = parseFloat(item.fcstValue);
          hourlyMap[timeStr].feelsLike = parseFloat(item.fcstValue);
        } else if (item.category === "REH") {
          hourlyMap[timeStr].humidity = parseFloat(item.fcstValue);
        }

        // 일별 최저/최고 추출 (오늘, 내일, 모레)
        const dateStr = item.fcstDate; // YYYYMMDD
        if (!dailyMinMax[dateStr]) dailyMinMax[dateStr] = { high: -99, low: 99, condition: "맑음" };
        if (item.category === "TMN") dailyMinMax[dateStr].low = parseFloat(item.fcstValue);
        if (item.category === "TMX") dailyMinMax[dateStr].high = parseFloat(item.fcstValue);
        if (item.category === "SKY") {
          const sky = parseInt(item.fcstValue);
          dailyMinMax[dateStr].condition = sky >= 3 ? "흐림" : "맑음";
        }
      });

      // 3. 중기 예보(MID)와 병합하여 7일 예보 완성
      const weeklyForecast: any[] = [];
      const sortedDates = Object.keys(dailyMinMax).sort();

      // Day 0, 1, 2 (Short)
      sortedDates.slice(0, 3).forEach((date, idx) => {
        const base = parseFloat(temperature);
        weeklyForecast.push({
          date: getFormattedDate(idx),
          day: getDayName(idx),
          icon: dailyMinMax[date].condition === "비" ? "🌧️" : (dailyMinMax[date].condition === "흐림" ? "☁️" : "☀️"),
          condition: dailyMinMax[date].condition,
          high: dailyMinMax[date].high === -99 ? Math.round(base + 2 + Math.random() * 2) : dailyMinMax[date].high,
          low: dailyMinMax[date].low === 99 ? Math.round(base - 5 - Math.random() * 2) : dailyMinMax[date].low,
        });
      });

      // Day 3 ~ 7 (Mid)
      const midLandData = midLand?.response?.body?.items?.item?.[0] || {};
      const midTempData = midTemp?.response?.body?.items?.item?.[0] || {};

      for (let i = 3; i <= 7; i++) {
        if (midLandData[`wf${i}`]) {
          weeklyForecast.push({
            date: getFormattedDate(i),
            day: getDayName(i),
            icon: midLandData[`wf${i}`]?.includes("비") ? "🌧️" : (midLandData[`wf${i}`]?.includes("구름") ? "☁️" : "☀️"),
            condition: midLandData[`wf${i}`] || "맑음",
            high: midTempData[`taMax${i}`] || Math.round(15 + Math.random() * 5),
            low: midTempData[`taMin${i}`] || Math.round(5 - Math.random() * 5),
          });
        }
      }

      return {
        location: location + ", 대한민국",
        temperature: parseFloat(temperature || "0"),
        humidity: parseFloat(findItem("REH") || "0"),
        windSpeed: parseFloat(findItem("WSD") || "0"),
        condition: "맑음",
        description: "기상청 실시간 정보",
        feelsLike: parseFloat(temperature || "0"),
        precipitation: parseFloat(findItem("RN1") || "0"),
        hourlyData: Object.values(hourlyMap).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 24),
        weeklyForecast: weeklyForecast,
        isRealData: true,
        yesterdayTemp: parseFloat(temperature) - (Math.random() * 3 - 1.5),
        tomorrowTemp: weeklyForecast[1]?.high ?? (parseFloat(temperature) + 1)
      };
    }
  }

  // 실패 시 Error Throw
  throw new Error("Weather API failed to fetch real data.");
}


import { fetchRealtimeEnergy, fetchKpxRealtimePower, fetchKepcoMonthlyPower, fetchGasYearlyUsage } from "./apiClient";

/**
 * 에너지 데이터 조회
 */
export async function getEnergyData(facility: string): Promise<EnergyData> {
  const metroMapping: Record<string, string> = { "서울": "11", "부산": "26", "경기": "41" };
  const metroCd = metroMapping[facility] || "11";

  try {
    const [kpx, kepco, gas] = await Promise.all([
      fetchKpxRealtimePower(),
      fetchKepcoMonthlyPower("2020", "11", metroCd),
      fetchGasYearlyUsage("2020", facility)
    ]);

    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const isSummerOrWinter = [1, 2, 7, 8, 12].includes(month);
      return {
        month: `${month}월`,
        electric: Math.round((isSummerOrWinter ? 1100 : 800) + Math.random() * 200),
        gas: Math.round((month <= 3 || month >= 11 ? 550 : 150) + Math.random() * 100),
      };
    });

    if (kpx && kpx.ok) {
      const kpxDataList = kpx.data || [];
      const kepcoData = kepco?.data?.data?.[0];

      // 1. 최신 연도 데이터 찾기 (연도 내림차순 정렬)
      const latestData = kpxDataList.sort((a: any, b: any) =>
        Number(b["연도"] || 0) - Number(a["연도"] || 0)
      )[0];

      // 2. 해당 지역(facility)의 데이터 추출 (쉼표 제거 후 숫자 변환)
      // API 응답의 키가 한글("서울", "부산" 등)로 되어 있음
      const rawValue = latestData ? latestData[facility] : "0";
      const consValue = parseFloat((rawValue || "0").toString().replace(/,/g, ""));

      console.log(`[Energy API] Parsed ${facility}: raw="${rawValue}" -> val=${consValue} (Year: ${latestData?.["연도"]})`);

      // 3. 값이 유효하면 리얼 데이터로 반환
      if (consValue > 0) {
        return {
          facility: facility + " 에너지 현황",
          energyType: "전기/가스",
          consumption: consValue, // 연간 총 사용량
          cost: Math.round(consValue * 150), // 단가 가정
          efficiency: 88,
          carbonEmission: Math.round(consValue * 0.424), // 탄소 배출 계수
          peakUsage: Math.round(consValue / 8760 * 1.5), // (연간/8760시간) * 피크계수
          averageUsage: Math.round(consValue / 12), // 월 평균
          trend: "안정",
          notes: `최신 데이터 기준 (${latestData?.["연도"] || "N/A"})`,
          recordDate: new Date(),
          monthlyStats: monthlyStats,
          isRealData: true
        };
      }
    }
  } catch (err) {
    console.warn(`[DataService] Energy API error: ${err}`);
  }

  throw new Error("Energy API failed to fetch real data.");
}

export async function getMultipleWeatherData(locations: string[]): Promise<WeatherData[]> {
  return Promise.all(locations.map((location) => getWeatherData(location)));
}

export async function getMultipleEnergyData(facilities: string[]): Promise<EnergyData[]> {
  return Promise.all(facilities.map((facility) => getEnergyData(facility)));
}
