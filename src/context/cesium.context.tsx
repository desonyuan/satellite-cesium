"use client";
import { Ion, Viewer } from "cesium";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from "react";

import { useAppStore } from "../store/app.store";
import { LoadSceneConfig } from "../tool/scene";

import { CESIUM_TOKEN } from "@/config/cesium";

type ContentType = {
  viewer: Viewer;
};

const Context = createContext<ContentType>(undefined as any as ContentType);

const CesiumContext: FC<PropsWithChildren> = ({ children }) => {
  const [viewer, setViewer] = useState<Viewer>(undefined as any as Viewer);
  const scenes = useAppStore((state) => state.scenes);

  useEffect(() => {
    window.CESIUM_BASE_URL = "/cesium";
    Ion.defaultAccessToken = CESIUM_TOKEN;
    const v = new Viewer("container", {
      geocoder: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      timeline: true,
      orderIndependentTranslucency: true,
      infoBox: false,
      // imageryProvider:false,
      fullscreenButton: false,
      contextOptions: {
        webgl: { alpha: true },
      },
    });

    v.clock.multiplier = 600;
    v.clock.shouldAnimate = true;
    (v.cesiumWidget.creditContainer as HTMLElement).style.display = "none"; /* 隐藏cesium logo */
    setViewer(v);
    LoadSceneConfig(v, scenes[0].setting);

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
