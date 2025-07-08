import { TimeInterval, TimeIntervalCollection, Viewer } from "cesium";

// 绘制卫星锥体
const radarScanner = (
  viewer: Viewer,
  position: any,
  height: number,
  radarId: string,
  bottomRadius: number,
  color: any,
) => {
  viewer.entities.add({
    id: radarId,
    show: false,
    availability: new TimeIntervalCollection([
      new TimeInterval({
        start: start,
        stop: stop,
      }),
    ]),
    position: position,
    cylinder: {
      length: height,
      topRadius: 0,
      bottomRadius: bottomRadius,
      // material: Cesium.Color.RED.withAlpha(.4),
      // outline: !0,
      numberOfVerticalLines: 0,
      // outlineColor: Cesium.Color.RED.withAlpha(.8),
      material: color.withAlpha(0.4),
    },
  });
};
