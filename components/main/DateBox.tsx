import dayjs from "dayjs";
import { FC, useEffect, useState } from "react";

let timer: any;

const DateBox: FC = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    clearInterval(timer);
    timer = setInterval(() => {
      const date = dayjs();

      setTime(date.format("YYYY年MM月DD日 HH:mm:ss"));
    }, 1000);

    return clearInterval.bind(null, timer);
  }, []);

  return (
    <div className="text-white items-center flex grow h-[50px]">
      <div>
        <span className="font-bold text-xl text-blue-500">当前时间：</span>
        <span className="text-blue-300">{time}</span>
      </div>
    </div>
  );
};

export default DateBox;
