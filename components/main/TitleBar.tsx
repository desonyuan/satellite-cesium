import { Button } from "@heroui/button";
import { cn } from "@heroui/react";
import { FC, PropsWithChildren, useEffect, useRef } from "react";
import { CzmlDataSource } from "cesium";

import SceneSelect from "./SceneSelect";
import DateBox from "./DateBox";

import { setsituationMode, toggleEditFormModal, useAppStore } from "@/src/store/app.store";
import { useCesium } from "@/src/context/cesium.context";
import { loadCzml } from "@/src/tool/czml";
interface IProps {}

const TitleBar: FC<PropsWithChildren<IProps>> = () => {
  const { viewer } = useCesium();
  const ds = useRef<CzmlDataSource>();
  const timeData = useRef<Record<string, any>>({});
  // 场景列表数据
  const { situationMode } = useAppStore();

  useEffect(() => {
    if (viewer) {
      if (ds.current) {
        viewer.dataSources.remove(ds.current, true);
      }
      if (situationMode === "starlink") {
        // 保存当前时间信息
        const clock = viewer.clock;

        for (const key in clock) {
          const val = (clock as any)[key];

          timeData.current[key] = val;
        }

        loadCzml(undefined, "/datasource/simple.czml").then((data) => {
          ds.current = data;
          viewer.dataSources.add(data);
        });
      } else {
        // 恢复时间信息
        for (const key in timeData.current) {
          const value = timeData.current[key];

          (viewer.clock as any)[key] = value;
        }
      }
    }
  }, [situationMode, viewer]);

  return (
    <div className="header-container w-full absolute flex justify-between top-0 left-0 px-10 z-10">
      <DateBox />
      <div className="absolute left-1/2 -translate-x-1/2 py-3 font-bold text-4xl">
        <div className="app-name">编队飞行演示系统</div>
      </div>
      <div className="flex items-center justify-end gap-x-4 mt-[50px] grow">
        <div className="flex items-center gap-x-2">
          <SceneSelect />
          <Button color="primary" variant="bordered" onPress={toggleEditFormModal}>
            添加场景
          </Button>
        </div>
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

        <div />
      </div>
    </div>
  );
};

export default TitleBar;
