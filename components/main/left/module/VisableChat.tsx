"use client";
import * as echarts from "echarts";
import { FC, PropsWithChildren, useEffect, useRef } from "react";

import Box from "../../Box";

import { createGanttChart, parseSatelliteData } from "./tool";

interface IProps {}

const VisableChat: FC<PropsWithChildren<IProps>> = () => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chartRef.current!;

    if (container) {
      const chart = echarts.init(container);

      fetch("/files/sat_access_report.txt")
        .then((res) => res.text())
        .then((text) => {
          const satelliteData = parseSatelliteData(text);

          chart.setOption(createGanttChart(satelliteData));
          window.addEventListener("resize", () => chart.resize());
        });
    }
  }, []);

  return (
    <Box title="卫星可见时段">
      <div ref={chartRef} className="h-[550px]" />
    </Box>
  );
};

export default VisableChat;
