import { Select, SelectItem } from "@heroui/select";
import { FC, PropsWithChildren } from "react";

import { findSceneByName, setCurDataSource, setCurScene, useAppStore } from "@/src/store/app.store";
import { useCesium } from "@/src/context/cesium.context";
import { loadCzml } from "@/src/tool/czml";
import { LoadSceneConfig } from "@/src/tool/scene";

interface IProps {}

const SceneSelect: FC<PropsWithChildren<IProps>> = () => {
  const scenes = useAppStore((state) => state.scenes);
  const curScene = useAppStore((state) => state.curScene);
  const { viewer } = useCesium();
  const onSelectionChange = (sceneName: string) => {
    if (sceneName) {
      const scene = findSceneByName(sceneName);

      if (scene && viewer) {
        viewer.dataSources.removeAll();
        // 加载文件
        loadCzml(scene.satelliteList[0]).then((ds) => {
          viewer.dataSources.add(ds);
          setCurDataSource(ds);
          LoadSceneConfig(viewer, scene.setting);
          setCurScene(sceneName);
        });
      }
    }
  };

  return (
    <Select
      color="primary"
      placeholder="初始场景"
      selectedKeys={curScene ? new Set([curScene]) : []}
      style={{ width: 120, marginLeft: "18px", color: "#fff" }}
      variant="bordered"
      onSelectionChange={(selection) => {
        onSelectionChange(selection.anchorKey!);
      }}
    >
      {scenes.map((scene) => {
        return <SelectItem key={scene.sceneName}>{scene.sceneName}</SelectItem>;
      })}
    </Select>
  );
};

export default SceneSelect;
