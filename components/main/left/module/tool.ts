type Intervals = { start: Date; stop: Date; duration: number };
export const parseSatelliteData = (text: string) => {
  const lines = text.split("\n").map((line) => line.trim());
  const result: {
    name: string;
    intervals: Intervals[];
  }[] = [];

  let currentSatellite: { name: string; intervals: Intervals[] } | null = null;
  let tempStart: string | null = null;

  for (const line of lines) {
    if (line.startsWith("Satellite")) {
      if (currentSatellite) {
        result.push(currentSatellite);
      }
      currentSatellite = {
        name: line,
        intervals: [],
      };
    } else if (line.startsWith("Start:")) {
      tempStart = line.replace("Start:", "").trim();
    } else if (line.startsWith("Stop:")) {
      const stop = line.replace("Stop:", "").trim();

      if (currentSatellite && tempStart) {
        const startDate = new Date(tempStart.replace(/\s+/g, "T") + "Z");
        const stopDate = new Date(stop.replace(/\s+/g, "T") + "Z");
        const durationHours = (stopDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

        currentSatellite.intervals.push({
          start: startDate,
          stop: stopDate,
          duration: Number(durationHours.toFixed(12)),
        });

        tempStart = null; // Reset for next interval
      }
    }
  }

  // 最后一颗卫星
  if (currentSatellite) {
    result.push(currentSatellite);
  }

  return result;
};

function naturalCompare(a: Record<string, any>, b: Record<string, any>) {
  const numA = parseInt(a.name.match(/\d+/)?.[0] || 0);
  const numB = parseInt(b.name.match(/\d+/)?.[0] || 0);

  return numA - numB;
}

function getColorByDuration(duration: number) {
  const colors = ["#00ffff", "#ffff00", "#ff66cc"];

  return colors[Math.floor(Math.random() * colors.length)];
}

function renderGanttBar(params: any, api: any) {
  const yValue = api.value(0);
  const start = api.coord([api.value(1), yValue]);
  const end = api.coord([api.value(2), yValue]);
  const height = api.size([0, 1])[1] * 0.4;

  return {
    type: "rect",
    shape: {
      x: start[0],
      y: start[1] - height / 2,
      width: end[0] - start[0],
      height: height,
    },
    style: api.style(),
  };
}

export const createGanttChart = (satelliteData: any[]) => {
  const seriesData: any[] = [];
  const yAxisData: any[] = [];

  satelliteData.sort(naturalCompare);

  satelliteData.forEach((sat: any) => {
    yAxisData.push(sat.name);
    sat.intervals.forEach((interval: any) => {
      seriesData.push({
        name: sat.name,
        value: [sat.name, interval.start, interval.stop, interval.duration.toFixed(2) + "h"],
        itemStyle: {
          color: getColorByDuration(interval.duration),
        },
      });
    });
  });

  const allTimes = satelliteData.flatMap((sat) => sat.intervals.flatMap((int: any) => [int.start, int.stop]));
  const minTime = new Date(Math.min(...allTimes.map((t) => t.getTime())));
  const maxTime = new Date(Math.max(...allTimes.map((t) => t.getTime())));

  return {
    tooltip: {
      backgroundColor: "rgba(0,0,0,0.8)",
      borderColor: "#666",
      textStyle: { color: "#fff" },
      formatter: function (params: Record<string, any>) {
        const data = params.value;

        return `
                            <strong>${params.seriesName}</strong><br/>
                            卫星: ${data[0]}<br/>
                            开始: ${new Date(data[1]).toLocaleString()}<br/>
                            结束: ${new Date(data[2]).toLocaleString()}<br/>
                            时长: ${data[3]}
                        `;
      },
    },
    grid: {
      left: "15%",
      right: "5%",
      bottom: "15%",
      top: "0%",
    },
    xAxis: {
      type: "time",
      min: minTime,
      max: maxTime,
      splitNumber: 10,
      axisLabel: {
        color: "#ddd",
        fontSize: 10,
        rotate: 30,
        formatter: function (value: string) {
          const date = new Date(value);

          return date.toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
      axisLine: { lineStyle: { color: "#888" } },
    },
    yAxis: {
      type: "category",
      data: yAxisData,
      axisLabel: {
        interval: 0,
        fontSize: 10,
        color: "#eee",
      },
      axisLine: { lineStyle: { color: "#888" } },
    },
    series: [
      {
        name: "访问时间",
        type: "custom",
        renderItem: renderGanttBar,
        itemStyle: { opacity: 0.85 },
        encode: { x: [1, 2], y: 0 },
        data: seriesData,
      },
    ],
    dataZoom: [
      {
        type: "slider",
        xAxisIndex: [0],
        start: 0,
        end: 30,
        right: 0,
        height: 10,
        backgroundColor: "rgba(0, 0, 50, 0.3)", // 滑动条背景
        dataBackground: {
          lineStyle: { color: "rgba(0, 120, 255, 0.6)" },
          areaStyle: { color: "rgba(0, 120, 255, 0.3)" },
        },
        fillerColor: "rgba(0, 200, 255, 0.3)", // 选中区域颜色
        borderColor: "rgba(0, 200, 255, 0.5)", // 边框
        handleStyle: {
          color: "rgba(0, 200, 255, 0.9)",
          borderColor: "#00f0ff",
        },
      },
      {
        type: "slider",
        yAxisIndex: [0],
        start: 0,
        end: 30,
        right: 0,
        width: 10,
        backgroundColor: "rgba(0, 0, 50, 0.3)", // 滑动条背景
        dataBackground: {
          lineStyle: { color: "rgba(0, 120, 255, 0.6)" },
          areaStyle: { color: "rgba(0, 120, 255, 0.3)" },
        },
        fillerColor: "rgba(0, 200, 255, 0.3)", // 选中区域颜色
        borderColor: "rgba(0, 200, 255, 0.5)", // 边框
        handleStyle: {
          color: "rgba(0, 200, 255, 0.9)",
          borderColor: "#00f0ff",
        },
      },
      {
        type: "inside",
        yAxisIndex: 0,
        start: 0,
        end: 30,
      },
      {
        type: "inside",
        xAxisIndex: 0,
        start: 0,
        end: 30,
      },
    ],
  };
};
