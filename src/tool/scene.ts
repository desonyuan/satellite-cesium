import { Cartesian3, Clock, JulianDate, Viewer } from "cesium";

import { ISceneConfig, SettingKey, SettingValue } from "../store/app.store";

let nowPicksatellite: any;
let rain: any, snow: any, fog: any;
let stages: any;
let previousTime: any;
let netCollection: any[] = [];
let timeID: any;
let timeID1: any;
let polarTimeId: any;
let clicked = false;
let timerOpen, timerClose;
let hexagon: any[] = [];
let isLoad: boolean = false;
let isRotate: boolean = true;

class ConfigHandler {
  viewer: Viewer;
  constructor(viewer: Viewer) {
    this.viewer = viewer;
  }

  private earthRotate(clock: Clock) {
    // 旋转倍速（每秒的角度，单位：弧度/秒）
    let rotationSpeed = 0.1;

    // 用于保存上一帧时间
    let lastTime = this.viewer.clock.currentTime.clone();

    // 旋转地球：通过旋转相机的 heading 实现
    if (this.viewer.clock.shouldAnimate) {
      // 计算与上一帧的时间差
      const now = clock.currentTime;
      const deltaSeconds = JulianDate.secondsDifference(now, lastTime);

      lastTime = now.clone(); // 更新lastTime

      const angle = rotationSpeed * deltaSeconds;

      this.viewer.scene.camera.rotate(Cartesian3.UNIT_Z, -angle);
    }
  }
  label(option: SettingValue) {}
  icon(option: SettingValue) {}
  track(option: SettingValue) {}
  light(option: SettingValue) {
    this.viewer.scene.globe.enableLighting = option.val;
  }
  sun(option: SettingValue) {
    this.viewer.scene.sun.show = option.val;
  }
  star(option: SettingValue) {}
  time(option: SettingValue) {
    const container = this.viewer.timeline.container as HTMLDivElement;

    container.style.display = option.val ? "block" : "none";
  }
  rotate(option: SettingValue) {
    if (option.val) {
      this.viewer.clock.onTick.addEventListener(this.earthRotate, this);
    } else {
      this.viewer.clock.onTick.removeEventListener(this.earthRotate, this);
    }
  }
  opacity(option: SettingValue) {}
  scale(option: SettingValue) {}
  timeRange(option: SettingValue) {
    const { start, end } = option.val;

    if (start) {
      this.viewer.clock.startTime = JulianDate.fromDate(start as Date);
    } else {
      this.viewer.clock.startTime = JulianDate.fromDate(new Date());
    }
    if (end) {
      this.viewer.clock.stopTime = JulianDate.fromDate(end as Date);
    }
    this.viewer.clock.multiplier = 600;
    this.viewer.clock.shouldAnimate = true;
  }
}

export const LoadSceneConfig = (viewer: Viewer, config: ISceneConfig["setting"]) => {
  const handler = new ConfigHandler(viewer);

  console.log(config, "1111111111111111");

  for (const key in config) {
    const _key = key as SettingKey;
    const option = config[_key];

    handler[_key]?.(option);
  }
};
