import { CzmlDataSource } from "cesium";

export const loadCzml = async (filename = "", url?: string) => {
  return CzmlDataSource.load(url ? url : "/model/" + filename + ".czml");
};
