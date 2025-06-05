import { FC } from "react";

import DataSourceList from "./module/DataSourceList";

interface IProps {}

const LeftBox: FC<IProps> = () => {
  return (
    <div className="absolute h-screen left-0-0 top-0 w-1/4 px-5 pt-20 flex flex-col gap-10">
      <DataSourceList />
    </div>
  );
};

export default LeftBox;
