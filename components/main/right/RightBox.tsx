"use client";
import { FC, PropsWithChildren } from "react";

import VisableTimeChat from "./VisableTimeChat";

import { useAppStore } from "@/src/store/app.store";

interface IProps {}

const RightBox: FC<PropsWithChildren<IProps>> = () => {
  const { situationMode } = useAppStore();

  return (
    <div className="absolute h-screen right-0 top-0 w-[450px] px-5 pt-32 flex flex-col gap-10">
      {/* <PolarEarth position={[]} />
      <SatelliteWorkTime />
      <RsChart3 /> */}
      {situationMode === "simulation" ? <VisableTimeChat /> : null}
    </div>
  );
};

export default RightBox;
