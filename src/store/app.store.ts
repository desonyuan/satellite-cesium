import { CzmlDataSource } from "cesium";
import { create } from "zustand";
// import simple from './data/simple';
//生成默认的场景数据
export const genDefaultSceneConfig = (): ISceneConfig["setting"] => {
  return {
    label: {
      val: true,
      name: "卫星标注",
    },
    icon: {
      val: false,
      name: "卫星图标",
    },
    track: {
      val: false,
      name: "卫星轨迹",
    },
    light: {
      val: false,
      name: "显示光照",
    },
    sun: {
      val: true,
      name: "显示太阳",
    },
    star: {
      val: true,
      name: "显示星空",
    },
    time: {
      val: true,
      name: "显示时间轴",
    },
    timeRange: {
      val: {},
      name: "时间段",
    },
    rotate: {
      val: true,
      name: "地球旋转",
    },
    scale: {
      val: "aspectFit",
      name: "缩放配置",
    },
    opacity: {
      val: 1,
      name: "透明度",
    },
  };
};

export type SettingKey =
  | "label"
  | "icon"
  | "track"
  | "light"
  | "sun"
  | "star"
  | "time"
  | "rotate"
  | "opacity"
  | "scale"
  | "timeRange";
export interface SettingValue {
  val: any;
  name: string;
}

export interface ISceneConfig {
  satelliteList: string[];
  setting: Record<SettingKey, SettingValue>;
  sceneName: string;
}

type AppStoreType = {
  situationMode: "constellation" | "starlink";
  editFromModal: boolean;
  scenes: ISceneConfig[]; //保存的场景配置
  curScene?: string; //当前选中的场景配置名称
  curDataSource?: CzmlDataSource;
};

const initalState = (): AppStoreType => {
  return {
    scenes: [
      {
        setting: genDefaultSceneConfig(),
        sceneName: "默认场景",
        satelliteList: [],
      },
    ],
    curScene: "默认场景",
    situationMode: "constellation",
    editFromModal: false,
  };
};

export const useAppStore = create<AppStoreType>()(initalState);
const setState = useAppStore.setState;
const getState = useAppStore.getState;

export const setsituationMode = (mode: AppStoreType["situationMode"]) => {
  setState({ situationMode: mode });
};
export const setEditFormModal = (show: boolean) => {
  setState({ editFromModal: show });
};
export const toggleEditFormModal = () => {
  const state = getState();

  setState({ editFromModal: !state.editFromModal });
};

export const setCurScene = (sceneName: string) => {
  setState({ curScene: sceneName });
};

export const addScene = (config: ISceneConfig) => {
  const state = getState();

  setState({ scenes: [...state.scenes, config] });
};

export const delScene = (sceneName: string) => {
  const state = getState();

  setState({ scenes: state.scenes.filter((s) => s.sceneName !== sceneName) });
};

export const setCurDataSource = (datasource?: CzmlDataSource) => {
  setState({ curDataSource: datasource });
};

export const findSceneByName = (name: string) => {
  const state = getState();

  return state.scenes.find((scene) => scene.sceneName === name);
};
