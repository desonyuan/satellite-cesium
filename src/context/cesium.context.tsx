"use client";
import * as Cesium from "cesium";
import { FC, PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const { Entity, Ion, Viewer } = Cesium;

import { useAppStore } from "../store/app.store";
import { LoadSceneConfig } from "../tool/scene";

import { CESIUM_TOKEN } from "@/config/cesium";

type ContentType = {
  viewer: Cesium.Viewer;
  containerSize: { width: number; height: number };
};

const Context = createContext<ContentType>(undefined as any as ContentType);
let coneEntity: Cesium.Entity | undefined;

const CesiumContext: FC<PropsWithChildren> = ({ children }) => {
  const [_viewer, setViewer] = useState<Cesium.Viewer>(undefined as any as Cesium.Viewer);
  const [currentSatelliteEntity, setCurrentSatelliteEntity] = useState<Cesium.Entity | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const { situationMode, scenes } = useAppStore();

  const [heatMapStyle, setHeatMapStyle] = useState({
    width: 0,
    height: 0,
  });

  const addConeEntity = useCallback((viewer: Cesium.Viewer, satelliteEntity: Cesium.Entity) => {
    const position = new Cesium.CallbackProperty((time) => {
      const satPos = satelliteEntity.position?.getValue(time)!;

      if (!satPos) return;

      // 获取单位方向向量：卫星 -> 地心
      const dir = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.negate(satPos, new Cesium.Cartesian3()),
        new Cesium.Cartesian3(),
      );

      // 获取卫星高度
      const carto = Cesium.Cartographic.fromCartesian(satPos);
      const height = carto.height || 0;

      // 移动 position 到锥体中心点 = 卫星位置 - dir * (height / 2)
      const offset = Cesium.Cartesian3.multiplyByScalar(dir, height / 2, new Cesium.Cartesian3());
      const coneCenter = Cesium.Cartesian3.add(satPos, offset, new Cesium.Cartesian3());

      return coneCenter;
    }, false);

    // 添加锥体
    coneEntity = viewer.entities.add({
      position: position as any as Cesium.Cartesian3,
      cylinder: {
        length: new Cesium.CallbackProperty((time) => {
          const satellitePosition = satelliteEntity.position?.getValue(time)!;

          const carto = Cesium.Cartographic.fromCartesian(satellitePosition);

          return carto.height;
        }, false),
        topRadius: new Cesium.CallbackProperty((time) => {
          const pos = satelliteEntity.position?.getValue(time);
          const scaleFactor = 0.5; // 调整锥体的张角大小，可根据视觉体验微调
          const EARTH_DIAMETER = 12742000 / 10; // 米（WGS84 最大直径）

          if (!pos) return 0;

          const carto = Cesium.Cartographic.fromCartesian(pos);
          const height = carto.height || 0;
          const num = height * scaleFactor;

          return Math.min(Math.max(num, 1000000), EARTH_DIAMETER);
        }, false),
        bottomRadius: 0,
        material: Cesium.Color.WHITE.withAlpha(0.1),
      },
      orientation: new Cesium.CallbackProperty(function (time) {
        const satPos = satelliteEntity.position?.getValue(time);

        if (!satPos) return Cesium.Quaternion.IDENTITY;

        // 向地心方向
        const dir = Cesium.Cartesian3.negate(
          Cesium.Cartesian3.normalize(satPos, new Cesium.Cartesian3()),
          new Cesium.Cartesian3(),
        );

        // 使用方向向量构造 orientation 四元数
        const up = Cesium.Cartesian3.UNIT_Z; // 临时上方向
        const right = Cesium.Cartesian3.cross(up, dir, new Cesium.Cartesian3());

        Cesium.Cartesian3.normalize(right, right);
        const newUp = Cesium.Cartesian3.cross(dir, right, new Cesium.Cartesian3());

        const mat3 = new Cesium.Matrix3();

        Cesium.Matrix3.setColumn(mat3, 0, right, mat3);
        Cesium.Matrix3.setColumn(mat3, 1, newUp, mat3);
        Cesium.Matrix3.setColumn(mat3, 2, dir, mat3);

        return Cesium.Quaternion.fromRotationMatrix(mat3);
      }, false),
      show: true,
    });
  }, []);

  useEffect(() => {
    window.CESIUM_BASE_URL = "/cesium";
    Ion.defaultAccessToken = CESIUM_TOKEN;
    const container = containerRef.current as HTMLDivElement;
    const viewer = new Viewer(container, {
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

    viewer.clock.multiplier = 60;
    viewer.clock.shouldAnimate = true;
    (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none"; /* 隐藏cesium logo */
    setViewer(viewer);
    LoadSceneConfig(viewer, scenes[0].setting);

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

    viewer.selectedEntityChanged.addEventListener((entity: Cesium.Entity) => {
      if (entity) {
        //点击的是卫星
        if (entity.id.startsWith("Satellite")) {
          setCurrentSatelliteEntity(entity);
        } else if (entity.name) {
        }
      } else {
        setCurrentSatelliteEntity(undefined);
      }
    });

    return () => {
      viewer.destroy();
    };
  }, []);

  useEffect(() => {
    if (_viewer) {
      if (coneEntity) {
        _viewer.entities.remove(coneEntity);
      }
      if (currentSatelliteEntity) {
        addConeEntity(_viewer, currentSatelliteEntity);
      }
    }
  }, [currentSatelliteEntity, _viewer]);

  return (
    <Context.Provider value={{ viewer: _viewer, containerSize: heatMapStyle }}>
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
