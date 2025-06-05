import { Select, SelectItem } from "@heroui/select";
import { FC, PropsWithChildren } from "react";

import { findSceneByName, setCurDataSource, useAppStore } from "@/src/store/app.store";
import { useCesium } from "@/src/context/cesium.context";
import { loadCzml } from "@/src/tool/czml";

interface IProps {}

const SceneSelect: FC<PropsWithChildren<IProps>> = () => {
  const scenes = useAppStore((state) => state.scenes);
  const curScene = useAppStore((state) => state.curScene);
  const { viewer } = useCesium();
  const onSelectionChange = (slection: any) => {
    const keys = slection as Set<string>;

    let sceneName = "";

    keys.forEach((name: string) => {
      sceneName = name;
    });

    if (sceneName) {
      const scene = findSceneByName(sceneName);

      if (scene && viewer) {
        viewer.dataSources.removeAll();
        // 加载文件
        loadCzml(scene.satelliteList[0]).then((ds) => {
          viewer.dataSources.add(ds);
          setCurDataSource(ds);
        });
      }
    }
  };

  return (
    <Select
      placeholder="初始场景"
      selectedKeys={curScene ? [curScene] : []}
      style={{ width: 120, marginLeft: "18px", color: "#fff" }}
      onSelectionChange={onSelectionChange}
    >
      {scenes.map((scene) => {
        return <SelectItem key={scene.sceneName}>{scene.sceneName}</SelectItem>;
      })}
    </Select>
  );
};

export default SceneSelect;
