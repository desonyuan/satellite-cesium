import dayjs from "dayjs";

export const GenCzmlHandler = async (obj: Record<string, any>) => {
  // === 读取 JSON 数据 ===
  const data: Record<
    string,
    {
      epoch: string;
      cartesian: [number, number, number, number][];
    }
  > = obj;

  // === 获取全局最早和最晚时间戳 ===
  let minEpoch: Date | null = null;
  let maxOffset = 0;

  // 遍历所有卫星
  for (const [satName, satData] of Object.entries(data)) {
    const epoch = new Date(satData.epoch);

    // 更新最小epoch时间
    if (!minEpoch || epoch < minEpoch) {
      minEpoch = epoch;
    }

    // 更新最大时间偏移量
    const lastOffset = satData.cartesian[satData.cartesian.length - 1][0];

    if (lastOffset > maxOffset) {
      maxOffset = lastOffset;
    }
  }

  if (!minEpoch) {
    throw new Error("无有效 epoch 数据");
  }

  const startTimeStr = dayjs(minEpoch).toISOString();
  const endTimeStr = dayjs(minEpoch).add(maxOffset, "second").toISOString();

  // === CZML 文档头 ===
  const czml: any[] = [
    {
      id: "document",
      name: "BEIDOU Constellation",
      version: "1.0",
      clock: {
        interval: `${startTimeStr}/${endTimeStr}`,
        currentTime: startTimeStr,
        multiplier: 60,
        range: "LOOP_STOP",
        step: "SYSTEM_CLOCK_MULTIPLIER",
      },
    },
  ];

  // === 构造每颗卫星的数据 ===
  for (const [satName, satData] of Object.entries(data)) {
    // 标准化时间格式
    const epoch = dayjs(satData.epoch).toISOString();
    const cartesian: number[] = [];

    // 转换坐标数据
    for (const point of satData.cartesian) {
      const [t, x, y, z] = point;

      cartesian.push(t, x, y, z);
    }

    czml.push({
      id: `Satellite/${satName}`,
      name: satName,
      // 使用全局时间范围
      availability: `${startTimeStr}/${endTimeStr}`,
      position: {
        interpolationAlgorithm: "LAGRANGE",
        interpolationDegree: 5,
        referenceFrame: "FIXED", // 使用固定坐标系
        epoch: epoch,
        cartesian: cartesian,
      },
      billboard: {
        show: true,
        image: "data:image/png;base64,...", // 保持原base64
        scale: 1,
        pixelOffset: { cartesian2: [0, 0] },
        eyeOffset: { cartesian: [0, 0, 0] },
        horizontalOrigin: "CENTER",
        verticalOrigin: "CENTER",
        color: { rgba: [0, 255, 0, 255] },
      },
      label: {
        show: true,
        text: satName,
        font: "11pt Lucida Console", // 调整字体大小
        style: "FILL_AND_OUTLINE",
        scale: 0.5,
        pixelOffset: { cartesian2: [5, -4] },
        horizontalOrigin: "LEFT",
        verticalOrigin: "CENTER",
        fillColor: { rgba: [0, 255, 0, 255] },
        outlineColor: { rgba: [0, 0, 0, 255] },
        outlineWidth: 2,
      },
      path: {
        show: true, // 确保路径可见
        material: {
          polylineOutline: {
            color: { rgba: [0, 255, 255, 255] },
            outlineColor: { rgba: [0, 0, 0, 255] },
            outlineWidth: 2,
          },
        },
        width: 2,
        leadTime: 1e8, // 显示完整未来轨道
        trailTime: 1e8, // 显示完整历史轨道
        resolution: 60,
      },
    });
  }

  return czml;
};
