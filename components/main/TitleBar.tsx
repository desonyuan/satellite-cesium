import { Button } from "@heroui/button";
import { Checkbox, cn } from "@heroui/react";
import { FC, PropsWithChildren, useEffect, useRef } from "react";
import { CzmlDataSource, Entity, ImageMaterialProperty, Rectangle } from "cesium";
import Papa from "papaparse";
import h337 from "heatmap.js";
import { useBoolean } from "ahooks";

import SceneSelect from "./SceneSelect";
import DateBox from "./DateBox";

import { setsituationMode, toggleEditFormModal, useAppStore } from "@/src/store/app.store";
import { useCesium } from "@/src/context/cesium.context";
import { loadCzml } from "@/src/tool/czml";
interface IProps {}
type HotType = {
  x: number;
  y: number;
  value: number;
  time_step: string;
};

let hotEntity: Entity | undefined;

const TitleBar: FC<PropsWithChildren<IProps>> = () => {
  const { viewer, containerSize } = useCesium();
  const ds = useRef<CzmlDataSource>();
  const timeData = useRef<Record<string, any>>({});
  // 场景列表数据
  const { situationMode } = useAppStore();
  const [showHeatmap, setShowHeatmap] = useBoolean();

  useEffect(() => {
    if (viewer) {
      if (ds.current) {
        viewer.dataSources.remove(ds.current, true);
      }

      if (hotEntity) {
        viewer.entities.remove(hotEntity);
      }

      if (situationMode === "starlink") {
        // 保存当前时间信息
        const clock = viewer.clock;

        for (const key in clock) {
          const val = (clock as any)[key];

          timeData.current[key] = val;
        }

        loadCzml(undefined, "/datasource/isl/Scenario1.czml").then((data) => {
          ds.current = data;
          viewer.dataSources.add(data);
        });
      } else {
        if (situationMode === "simulation") {
          // 仿真态势
          if (hotEntity) {
            viewer.entities.add(hotEntity);
            setShowHeatmap.setTrue();
          } else {
            fetch("/files/BEIDOU_pdop_grid_all.csv").then((res) => {
              res.text().then((text) => {
                Papa.parse(text, {
                  header: true,
                  skipEmptyLines: true,
                  complete: (results) => {
                    // 热力图的边界
                    const latMin = -90,
                      latMax = 90,
                      lonMin = -180,
                      lonMax = 180;
                    const { width, height } = containerSize;
                    let max = 0 + 20;
                    const points: HotType[] = (results.data as any[]).map((row) => {
                      const point = {
                        x: Math.floor(((row.lon - lonMin) / (lonMax - lonMin)) * width),
                        y: Math.floor(((latMax - row.lat) / (latMax - latMin)) * height),
                        value: row.value,
                        time_step: row.time_step,
                      };

                      max = Math.max(max, row.value);

                      return point;
                    });
                    // 删除旧的热力图实例（如果有的话）
                    const heatmapContainer = document.querySelector("#heatmap");

                    if (heatmapContainer) {
                      heatmapContainer.innerHTML = ""; // 清空热力图容器内容
                    }
                    const heatmapInstance = h337.create({
                      container: document.querySelector("#heatmap")!, // 热力图 div 容器
                      // radius: 25,
                      // maxOpacity: 0.6, // 设置热力图的最大不透明度
                      // minOpacity: 0.1, // 设置热力图的最小不透明度
                      // blur: 1, // 模糊程度，值越大，模糊越强
                    });

                    // 设置热力图数据
                    heatmapInstance.setData({
                      max: max,
                      min: 0,
                      data: points,
                    });
                    // 获取生成的热力图 canvas
                    let canvas = document.querySelector(".heatmap-canvas") as HTMLCanvasElement;

                    // 将热力图叠加到 Cesium 地图上
                    hotEntity = viewer.entities.add({
                      id: "heatmap-layer", // 给热力图实体指定唯一 id
                      // name: 'heatmap-layer',
                      rectangle: {
                        coordinates: Rectangle.fromDegrees(lonMin, latMin, lonMax, latMax),
                        material: new ImageMaterialProperty({
                          image: canvas,
                          transparent: true,
                        }),
                      },
                    });
                    setShowHeatmap.setTrue();
                    // 将地图聚焦到热力图区域
                    // viewer.zoomTo(viewer.entities);

                    // resolve(parsed);
                  },
                });
              });
            });
          }
        }
        // 恢复时间信息
        for (const key in timeData.current) {
          const value = timeData.current[key];

          (viewer.clock as any)[key] = value;
        }
      }
    }
  }, [situationMode, viewer, containerSize]);

  return (
    <div className="header-container w-full absolute top-0 left-0 px-10 z-10">
      <div className="flex justify-between">
        <DateBox />
        <div className="absolute left-1/2 -translate-x-1/2 py-3 font-bold text-4xl">
          <div className="app-name">卫星服务模拟分系统</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1 w-full">
        <div className="flex w-1/2 shrink-0 items-center gap-x-2 justify-end pr-[20%]">
          <div>
            <SceneSelect />
          </div>
          <Button color="primary" variant="bordered" onPress={toggleEditFormModal}>
            添加场景
          </Button>
        </div>
        <div className="w-1/2 shrink-0 flex gap-x-4 items-center pl-[20%] relative">
          <div className="relative">
            <Button
              className={cn(
                "bg-gradient-to-tr text-white shadow-lg",
                situationMode === "constellation" ? "from-blue-600 to-blue-600" : "from-blue-950 to-blue-900",
              )}
              color="primary"
              size="md"
              onPress={() => {
                setsituationMode("constellation");
              }}
            >
              星座运行态势
            </Button>
            {situationMode === "simulation" ? (
              <div className="absolute left-[20%] top-20">
                <Checkbox
                  classNames={{ label: "text-white text-sm text-nowrap" }}
                  isSelected={showHeatmap}
                  onValueChange={(checked) => {
                    if (hotEntity) {
                      checked ? viewer.entities.add(hotEntity) : viewer.entities.remove(hotEntity);
                      setShowHeatmap.set(checked);
                    }
                  }}
                >
                  显示热力图
                </Checkbox>
              </div>
            ) : null}
          </div>

          <Button
            color="primary"
            size="md"
            onPress={() => {
              setsituationMode("starlink");
            }}
            className={cn(
              "bg-gradient-to-tr text-white shadow-lg",
              situationMode === "starlink" ? "from-blue-600 to-blue-600" : "from-blue-950 to-blue-900",
            )}
            // onClick={() => {
            //   setSituation({
            //     satellite: false,
            //     communicate: false,
            //     basestation: true,
            //     resource: false,
            //     business: false,
            //   });
            // }}
          >
            星间链路态势
          </Button>
          <Button
            className={cn(
              "bg-gradient-to-tr text-white shadow-lg",
              situationMode === "simulation" ? "from-blue-600 to-blue-600" : "from-blue-950 to-blue-900",
            )}
            color="primary"
            size="md"
            onPress={() => {
              setsituationMode("simulation");
            }}
          >
            态势仿真
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
