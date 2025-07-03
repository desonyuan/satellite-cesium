import { FC } from "react";

import DataSourceList from "./module/DataSourceList";
import VisableChat from "./module/VisableChat";

interface IProps {}

const LeftBox: FC<IProps> = () => {
  return (
    <div className="absolute h-screen left-0-0 top-0 w-96 px-5 pt-32 flex flex-col gap-10">
      <DataSourceList />
      <VisableChat />
    </div>
  );
};

export default LeftBox;
