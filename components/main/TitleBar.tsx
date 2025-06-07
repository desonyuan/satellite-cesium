import { Button } from "@heroui/button";
import { cn } from "@heroui/react";
import { FC, PropsWithChildren, useEffect, useRef } from "react";
import { CzmlDataSource } from "cesium";

import SceneSelect from "./SceneSelect";

import { setsituationMode, toggleEditFormModal, useAppStore } from "@/src/store/app.store";
import { useCesium } from "@/src/context/cesium.context";
import { loadCzml } from "@/src/tool/czml";
interface IProps {}

const TitleBar: FC<PropsWithChildren<IProps>> = () => {
  const { viewer } = useCesium();
  const ds = useRef<CzmlDataSource>();
  // 场景列表数据
  const { situationMode } = useAppStore();

  useEffect(() => {
    if (viewer) {
      if (ds.current) {
        viewer.dataSources.remove(ds.current, true);
      }
      if (situationMode === "starlink") {
        loadCzml(undefined, "/datasource/simple.czml").then((data) => {
          ds.current = data;
          viewer.dataSources.add(data);
        });
      }
    }
  }, [situationMode, viewer]);

  return (
    <div className="flex items-center justify-between w-full absolute top-0 left-0 px-10 py-5 z-10">
      <div className="text-white font-bold text-4xl">
        <span>卫星演示</span>
        <span className="text-blue-600">系统</span>
      </div>
      <div className="flex items-center gap-x-4">
        <Button
          color="primary"
          size="md"
          onPress={() => {
            setsituationMode("constellation");
          }}
          className={cn(
            "bg-gradient-to-tr text-white shadow-lg w-60",
            situationMode === "constellation" ? "from-blue-600 to-blue-600" : "from-blue-950 to-blue-900",
          )}
          // onClick={() => {
          //   setSituation({
          //     satellite: true,
          //     communicate: false,
          //     basestation: false,
          //     resource: false,
          //     business: false,
          //   });
          // }}
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
            "bg-gradient-to-tr text-white shadow-lg w-60",
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
        <div className="flex items-center gap-x-2">
          <SceneSelect />
          <Button color="primary" variant="bordered" onPress={toggleEditFormModal}>
            添加场景
          </Button>
        </div>
        <div />
        <div className="cesium-button-edit" style={{ width: "32px", height: "32px" }}>
          <div className="editButton" />
        </div>
      </div>
      <div />
    </div>
  );
};

export default TitleBar;
