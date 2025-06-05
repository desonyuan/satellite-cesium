import { Button } from "@heroui/button";
import { cn } from "@heroui/react";
import { FC, PropsWithChildren } from "react";

import SceneSelect from "./SceneSelect";

import { setsituationMode, useAppStore } from "@/src/store/app.store";
interface IProps {}

const TitleBar: FC<PropsWithChildren<IProps>> = () => {
  // 场景列表数据
  const { situationMode, scenes, curScene } = useAppStore();

  return (
    <div className="flex items-center justify-between w-full absolute top-0 left-0 px-10 py-5">
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
            situationMode === "constellation" ? "from-blue-700 to-blue-700" : "from-blue-950 to-blue-700",
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
            situationMode === "starlink" ? "from-blue-700 to-blue-700" : "from-blue-950 to-blue-700",
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
        <SceneSelect />
        <div className="cesium-button-edit" style={{ width: "32px", height: "32px" }}>
          <div className="editButton" />
        </div>
      </div>
      <div />
    </div>
  );
};

export default TitleBar;
