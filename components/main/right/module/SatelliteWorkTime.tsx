"use client";
import React, { useEffect, useState } from "react";
import * as echarts from "echarts";
import Box from "../../Box";

const SatelliteWorkTime: React.FC<{}> = () => {
  const [init, setInit] = useState<boolean>(false);
  const chartRef = React.useRef<HTMLDivElement | null>(null);
  const lists = [
    {
      name: "北斗",
      value: 241,
    },
    {
      name: "GPS",
      value: 387,
    },

    {
      name: "QZSS",
      value: 120,
    },
    {
      name: "IRNSS",
      value: 80,
    },
  ];

  useEffect(() => {
    setInit(true);
  }, []);

  useEffect(() => {
    if (init) {
      chartInit();
    }
  }, [init]);

  const chartInit = () => {
    let yName1 = lists.map((item) => item.name);
    let xData1 = lists.map((item) => item.value);
    let maxData1 = 1;
    let option = {
      backgroundColor: "#0000",
      grid: {
        top: "5%",
        left: "0%",
        right: "3%",
        bottom: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLine: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: [
        {
          type: "category",
          inverse: true,
          data: ["北斗", "GPS", "QZSS", "IRNSS"],
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            show: true,
            textStyle: {
              color: "#fff",
              fontSize: 14,
            },
          },
        },
      ],
      series: [
        {
          type: "pictorialBar",
          emphasis: {
            focus: "none",
            itemStyle: {
              color: "rgba(13, 126, 222, 1)",
            },
            disabled: true,
          },
          legendHoverLink: false,
          itemStyle: {
            normal: {
              color: "rgba(13, 126, 222, 1)",
            },
          },
          symbol: "rect",
          symbolRepeat: "fixed",
          // symbolBoundingData: 1,
          symbolMargin: 5,
          symbolClip: true,
          symbolSize: [14, 18],
          symbolPosition: "start",
          symbolOffset: [0, 0],
          data: xData1,
          label: {
            show: false,
          },
          z: 2,
        },
        {
          type: "pictorialBar",
          emphasis: {
            focus: "none",
            itemStyle: {
              color: "rgba(255,255,255,0.2)",
            },
          },
          legendHoverLink: false,
          itemStyle: {
            normal: {
              color: "rgba(255,255,255,0.2)",
            },
          },
          label: {
            normal: {
              show: false,
            },
          },
          animationDuration: 0,
          symbolRepeat: "true",
          symbolMargin: 5,
          symbol: "rect",
          symbolSize: [14, 18],
          symbolPosition: "start",
          symbolOffset: [0, 0],
          data: new Array(xData1.length).fill(Math.max(...xData1)),
          z: 1,
        },
      ],
    };
    let myChart = echarts.getInstanceByDom(chartRef.current as unknown as HTMLDivElement);
    if (myChart == null) {
      myChart = echarts.init(chartRef.current as unknown as HTMLDivElement);
    }
    myChart?.setOption(option);
  };
  return (
    <div className="h-[22%]">
      <Box title="卫星载荷时长图">
        <div className="h-full" ref={chartRef}></div>
      </Box>
    </div>
  );
};

export default SatelliteWorkTime;
