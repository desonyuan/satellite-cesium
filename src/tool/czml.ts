import { CzmlDataSource } from "cesium";

interface TimeRes {
  modeName: string;
  startTime: string;
  endTime: string;
}

export const loadCzml = async (filename = "", url?: string) => {
  return CzmlDataSource.load(url ? url : "/model/" + filename + ".czml");
};

export const loadCzmlObject = async (data: Record<string, any>) => {
  return CzmlDataSource.load(data);
};

export const getCzmlTime = async (filename: string) => {
  const time = await fetch("/api/model/time?modeName=" + filename);

  return (await time.json()) as TimeRes;
};
