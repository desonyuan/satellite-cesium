import { FC, PropsWithChildren } from "react";

interface IProps {
  title: string;
}

const Box: FC<PropsWithChildren<IProps>> = ({ children, title }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="rounded-tr-md shrink-0 bg-origin-border h-10 tracking-widest bg-size-[100%_40px] font-bold bg-no-repeat bg-left-top pl-16 text-xl bg-[url('/assets/resources/title.png')] flex items-center">
        {title}
      </div>
      <div style={{ height: "calc(100% - 2.5rem)", width: "100%" }}>{children}</div>
    </div>
  );
};

export default Box;
