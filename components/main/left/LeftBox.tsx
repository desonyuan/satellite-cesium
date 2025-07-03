import { FC } from "react";

import DataSourceList from "./module/DataSourceList";
import VisableChat from "./module/VisableChat";

import { useAppStore } from "@/src/store/app.store";

interface IProps {}

const LeftBox: FC<IProps> = () => {
  const { situationMode } = useAppStore();

  return (
    <div className="absolute h-screen left-0-0 top-0 w-96 px-5 pt-32 flex flex-col gap-10">
      {situationMode === "simulation" ? <VisableChat /> : <DataSourceList />}
    </div>
  );
};

export default LeftBox;
