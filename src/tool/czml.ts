import { CzmlDataSource } from "cesium";

export const loadCzml = async (filename: string, url?: string) => {
  return CzmlDataSource.load(url ? url : "/model/" + filename + ".czml");
};
