"use client";
import { Ion, Viewer } from "cesium";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from "react";

import { useAppStore } from "../store/app.store";
import { LoadSceneConfig } from "../tool/scene";

import { CESIUM_TOKEN } from "@/config/cesium";

type ContentType = {
  viewer: Viewer;
  containerSize: { width: number; height: number };
};

const Context = createContext<ContentType>(undefined as any as ContentType);

const CesiumContext: FC<PropsWithChildren> = ({ children }) => {
  const [viewer, setViewer] = useState<Viewer>(undefined as any as Viewer);
  const containerRef = useRef<HTMLDivElement>(null);
  const { situationMode, scenes } = useAppStore();

  const [heatMapStyle, setHeatMapStyle] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    window.CESIUM_BASE_URL = "/cesium";
    Ion.defaultAccessToken = CESIUM_TOKEN;
    const container = containerRef.current as HTMLDivElement;
    const v = new Viewer(container, {
      geocoder: false,
      navigationHelpButton: false,
      baseLayerPicker: true,
      timeline: true,
      orderIndependentTranslucency: true,
      infoBox: false,
      // imageryProvider:false,
      fullscreenButton: false,
      contextOptions: {
        webgl: { alpha: true },
      },
    });

    v.clock.multiplier = 60;
    v.clock.shouldAnimate = true;
    (v.cesiumWidget.creditContainer as HTMLElement).style.display = "none"; /* 隐藏cesium logo */
    setViewer(v);
    LoadSceneConfig(v, scenes[0].setting);

    setHeatMapStyle({ width: container.offsetWidth, height: container.offsetHeight });

    // 创建 ResizeObserver 监听宽高变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;

        setHeatMapStyle({ width, height });
      }
    });

    resizeObserver.observe(container);

    return () => {
      v.destroy();
    };
  }, []);

  return (
    <Context.Provider value={{ viewer, containerSize: heatMapStyle }}>
      <section ref={containerRef} className="h-screen" id="container" />
      {situationMode === "simulation" && (
        <div className="absolute! -z-10! opacity-0! top-0 left-0" id="heatmap" style={heatMapStyle} />
      )}
      {children}
    </Context.Provider>
  );
};

export default CesiumContext;

export const useCesium = () => {
  return useContext(Context);
};
