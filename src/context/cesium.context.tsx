"use client";
import { Ion, Viewer } from "cesium";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from "react";

import { genDefaultSceneConfig, toggleEditFormModal } from "../store/app.store";
import { LoadSceneConfig } from "../tool/scene";

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

      timeline: true,
      orderIndependentTranslucency: true,
      // vrButton: false,
      // homeButton: false,
      // infoBox: false,
      // imageryProvider:false,
      // terrainProvider:await CesiumTerrainProvider.fromUrl('/data/map')
      contextOptions: {
        webgl: { alpha: true },
      },
    });

    (v.cesiumWidget.creditContainer as HTMLElement).style.display = "none"; /* 隐藏cesium logo */
    setViewer(v);
    // 添加按钮编辑按钮
    const toolBar = document.querySelector(".cesium-viewer-toolbar") as HTMLDivElement;

    if (toolBar) {
      const button = document.createElement("button");
      const img = document.createElement("img");

      img.src = "/assets/resources/edit.png";
      img.style.width = img.style.height = "28px";
      img.style.display = "block";
      img.style.margin = "0 auto";
      button.style.width = button.style.height = "32px";
      button.style.lineHeight = "32px";
      button.className = "cesium-button cesium-toolbar-button";
      button.onclick = toggleEditFormModal;
      button.appendChild(img);
      toolBar.appendChild(button);
    }

    LoadSceneConfig(v, genDefaultSceneConfig());

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
