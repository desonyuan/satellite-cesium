"use client";
import { FC, PropsWithChildren } from "react";

import PolarEarth from "./module/PalarEarth";
import SatelliteWorkTime from "./module/SatelliteWorkTime";
import RsChart3 from "./module/RsChart3";

interface IProps {}

const RightBox: FC<PropsWithChildren<IProps>> = () => {
  return (
    <div className="absolute h-screen right-0 top-0 w-[450px] px-5 pt-32 flex flex-col gap-10">
      <PolarEarth position={[]} />
      <SatelliteWorkTime />
      <RsChart3 />
    </div>
  );
};

export default RightBox;
