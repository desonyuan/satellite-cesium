"use client";
import { Ion, Viewer } from "cesium";
import {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { CESIUM_TOKEN } from "@/config/cesium";

type ContentType = {
  viewer: Viewer;
};

const Context = createContext<ContentType>(undefined as any as ContentType);

const CesiumContext: FC<PropsWithChildren> = ({ children }) => {
  const [viewer, setViewer] = useState<Viewer>(undefined as any as Viewer);

  useEffect(() => {
    window.CESIUM_BASE_URL = "/cesium";
    Ion.defaultAccessToken = CESIUM_TOKEN;
    const v = new Viewer("container", {
      // terrain: Terrain.fromWorldTerrain(),
      geocoder: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      animation: false,
      timeline: false,
      // vrButton: false,
      // homeButton: false,
      // infoBox: false,
      // imageryProvider:false,
      // terrainProvider:await CesiumTerrainProvider.fromUrl('/data/map')
    });

    (v.cesiumWidget.creditContainer as HTMLElement).style.display = "none";
    setViewer(v);

    return () => {
      v.destroy();
    };
  }, []);

  return (
    <Context.Provider value={{ viewer }}>
      <section className="h-screen" id="container" />
      {children}
    </Context.Provider>
  );
};

export default CesiumContext;

export const useCesium = () => {
  return useContext(Context);
};
