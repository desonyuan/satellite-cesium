import {Dispatch, SetStateAction} from 'react';

export type SetState<T> = Dispatch<SetStateAction<T>>;
export type DataType = {
  key: React.Key;
};

export interface SatelliteListProps {
  satelliteList: any[][]; // 正确字段名
  setSatelliteList: (list: any[][]) => void;
}

export type BaseStation = {
  name: string;
  desc?: string;
  pos: number[];
  state?: string;
  weatherKey?: string;
  strong?: number;
};
export type Dashboard = {
  type: 'satellite' | 'baseStation' | undefined;
  id: string | undefined;
};

export type CesiumComponentType = {};

export type PolarEarthProps = {
  position: [];
};

export type CesiumSettingType = {
  mode?: number;
};
export type SettingType = {
  mode?: number;
  light?: {val: boolean; name: string};
  sun?: {val: boolean; name: string};
  star?: {val: boolean; name: string};
  time?: {val: boolean; name: string};
  rotate?: {val: boolean; name: string};
  label?: {val: boolean; name: string};
  icon?: {val: boolean; name: string};
  model?: {val: boolean; name: string};
  track?: {val: boolean; name: string};
  currEdit?: {val: boolean; name: string};
};

export type StatelliteCardType = {
  nowStatelliteName: any[];
  statelliteType: string;
  setNowSatellite: SetState<any[]>;
};

export type settingPanelProps = {
  setting: SettingType;
  setSetting: SetState<SettingType>;
  satelliteList: any;
  setSatelliteList: SetState<any>;
  setScanes: SetState<SceneType[]>;
  saveFile?: (files: FileList) => void;
};

export type situationType = {
  satellite: boolean;
  communicate: boolean;
  basestation: boolean;
  resource: boolean;
  business: boolean;
  current: string;
};

/////////////////////////场景数据类型///////////////////////////////
export type SceneType = {
  satelliteList: string[];
  setting: SettingType;
};
export type UseMapProps = {
  nowData: number;
  setUseRegionData: SetState<any[]>;
};
/////////////////////////场景数据类型///////////////////////////////
export type SceneDataType = {
  selectedSatelliteList: string[];
  curBaseStation: BaseStation;
  cesiumSetting: CesiumSettingType;
  isEdit: boolean;
  sceneName: string;
};
