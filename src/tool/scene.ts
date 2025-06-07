import { Viewer } from "cesium";

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

import { ISceneConfig, SettingKey, SettingValue } from "../store/app.store";
const handler: Record<SettingKey, (viewer: Viewer, option: SettingValue) => void> = {
  label(viewer, option) {},
  icon(viewer, option) {},
  track(viewer, option) {},
  light(viewer, option) {},
  sun(viewer, option) {},
  star(viewer, option) {},
  time(viewer, option) {},
  rotate(viewer, option) {},
  opacity(viewer, option) {},
  scale(viewer, option) {},
};

export const LoadSceneConfig = (viewer: Viewer, config: ISceneConfig) => {
  const { satelliteList, setting } = config;

  for (const key in setting) {
    const option = setting[key as SettingKey];
  }
};
