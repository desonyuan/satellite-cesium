"use client";
import * as Cesium from "cesium";
import { FC, PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const { Entity, Ion, Viewer } = Cesium;

import { useAppStore } from "../store/app.store";
import { LoadSceneConfig } from "../tool/scene";

import { CESIUM_TOKEN } from "@/config/cesium";

function getQuaternionFromTo(fromPosition, toPosition) {
  const direction = Cesium.Cartesian3.subtract(toPosition, fromPosition, new Cesium.Cartesian3());

  Cesium.Cartesian3.normalize(direction, direction);

  const up = Cesium.Cartesian3.normalize(fromPosition, new Cesium.Cartesian3()); // 当前位置法向量
  const right = Cesium.Cartesian3.cross(direction, up, new Cesium.Cartesian3());

  Cesium.Cartesian3.normalize(right, right);
  const correctedUp = Cesium.Cartesian3.cross(right, direction, new Cesium.Cartesian3());

  const rotationMatrix = new Cesium.Matrix3();

  Cesium.Matrix3.setColumn(rotationMatrix, 0, right, rotationMatrix); // X 轴
  Cesium.Matrix3.setColumn(rotationMatrix, 1, correctedUp, rotationMatrix); // Y 轴
  Cesium.Matrix3.setColumn(rotationMatrix, 2, direction, rotationMatrix); // Z 轴（锥体默认方向）

  return Cesium.Quaternion.fromRotationMatrix(rotationMatrix);
}

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
    // 添加锥体
    coneEntity = viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        const time = viewer.clock.currentTime;
        const satellitePosition = satelliteEntity.position.getValue(time);

        if (!satellitePosition) return satellitePosition;

        // 1. 方向向量：卫星 → 地心
        const toCenter = Cesium.Cartesian3.negate(satellitePosition, new Cesium.Cartesian3());

        Cesium.Cartesian3.normalize(toCenter, toCenter);

        // 2. 计算卫星高度
        const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(satellitePosition);
        const height = cartographic.height;

        // 3. cylinder length = height * 2，偏移量 = length / 2 = height
        const offset = Cesium.Cartesian3.multiplyByScalar(toCenter, height, new Cesium.Cartesian3());

        // 4. 计算中心点
        const coneCenter = Cesium.Cartesian3.add(satellitePosition, offset, new Cesium.Cartesian3());

        return coneCenter;
      }, false),
      cylinder: {
        length: new Cesium.CallbackProperty(() => {
          const time = viewer.clock.currentTime;
          const satellitePosition = satelliteEntity.position.getValue(time);

          if (!satellitePosition) return 1000000;

          const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(satellitePosition);

          return cartographic.height * 2;
        }, false),
        topRadius: new Cesium.CallbackProperty(() => {
          const time = viewer.clock.currentTime;
          const satellitePosition = satelliteEntity.position.getValue(time);

          if (!satellitePosition) return 200000;

          const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(satellitePosition);

          return cartographic.height * 0.2; // 顶部宽度占高度比例，可调
        }, false),
        bottomRadius: 0,
        material: Cesium.Color.WHITE.withAlpha(0.3),
      },
      orientation: new Cesium.CallbackProperty((time) => {
        const position = satelliteEntity.position?.getValue(time);

        if (!position) return Cesium.Quaternion.IDENTITY;

        // 1. 卫星指向地心方向
        const toCenter = Cesium.Cartesian3.negate(position, new Cesium.Cartesian3());

        Cesium.Cartesian3.normalize(toCenter, toCenter);

        // 2. cylinder 的默认方向：正 Z 轴
        const defaultDirection = new Cesium.Cartesian3(0, 0, 1);

        // 3. 计算旋转轴 & 角度
        const axis = Cesium.Cartesian3.cross(defaultDirection, toCenter, new Cesium.Cartesian3());
        const axisMagnitude = Cesium.Cartesian3.magnitude(axis);

        if (axisMagnitude === 0) {
          // 如果方向相同或相反，直接处理
          if (Cesium.Cartesian3.dot(defaultDirection, toCenter) < 0) {
            // 方向相反，旋转180度
            return Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_X, Math.PI);
          }

          return Cesium.Quaternion.IDENTITY;
        }
        Cesium.Cartesian3.normalize(axis, axis);
        const angle = Cesium.Cartesian3.angleBetween(defaultDirection, toCenter);

        // 4. 生成四元数
        return Cesium.Quaternion.fromAxisAngle(axis, angle);
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
    // handler.setInputAction(function (click: { position: any }) {
    //   var pick = viewer.scene.pick(click.position);

    //   if (pick && pick.id) {
    //     const entity = pick.id as Entity;

    //     //点击的是卫星
    //     if (entity.name?.startsWith("Satellite")) {
    //     } else if (entity.name) {
    //     }
    //     console.log(entity, "1111111111");
    //   }
    // }, ScreenSpaceEventType.LEFT_CLICK);

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
