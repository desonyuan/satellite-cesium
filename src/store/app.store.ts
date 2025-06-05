import { CzmlDataSource } from "cesium";
import { create } from "zustand";
// import simple from './data/simple';

type SatelliteType = "BEIDOU" | "GPS" | "STARLINK";

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
  | "scale";

interface SettingValue {
  val: any;
  name: string;
}

export interface ISceneConfig {
  satelliteList: string[];
  setting: Record<SettingKey, SettingValue>;
  sceneName: string;
}

type AppStoreType = {
  selectedSatellite: SatelliteType[];
  situationMode: "constellation" | "starlink";
  editFromModal: boolean;
  scenes: ISceneConfig[]; //保存的场景配置
  curScene?: string; //当前选中的场景配置名称
  curDataSource?: CzmlDataSource;
};

const initalState = (): AppStoreType => {
  return {
    selectedSatellite: [],
    scenes: [],
    situationMode: "constellation",
    editFromModal: false,
  };
};

export const useAppStore = create<AppStoreType>()(initalState);
const setState = useAppStore.setState;
const getState = useAppStore.getState;

export const setSelectedSatellite = (satellite: SatelliteType[]) => {
  setState({ selectedSatellite: satellite });
};

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

export const setCurDataSource = (datasource: CzmlDataSource) => {
  setState({ curDataSource: datasource });
};

export const findSceneByName = (name: string) => {
  const state = getState();

  return state.scenes.find((scene) => scene.sceneName === name);
};
