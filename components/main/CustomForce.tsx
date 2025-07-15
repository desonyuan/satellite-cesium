import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { ModalBody, ModalFooter, ModalHeader } from "@heroui/modal";
import { DatePicker } from "@heroui/react";
import { useRequest, useSetState } from "ahooks";
import { FC, PropsWithChildren, useMemo } from "react";
import { ZonedDateTime } from "@heroui/system/dist/types";

interface Options {
  category: string;
  fields: Field[];
}

interface Field {
  label: string;
  key: string;
  endContent?: string;
  startContent?: string;
}

const CustomSceneField: Options[] = [
  {
    category: "时间参数",
    fields: [
      {
        label: "时间",
        key: "date",
      },
    ],
  },
  // 种子卫星轨道参数
  {
    category: "轨道参数",
    fields: [
      {
        endContent: "km",
        startContent: "a",
        label: "半长轴",
        key: "m1",
      },
      {
        startContent: "e",
        label: "偏心率",
        key: "m2",
      },
      {
        endContent: "°",
        startContent: "i",
        label: "轨道倾角",
        key: "m3",
      },
      {
        endContent: "°",
        startContent: "Ω",
        label: "升交点赤经",
        key: "m4",
      },
      {
        endContent: "°",
        startContent: "ω",
        label: "近地点幅角",
        key: "m5",
      },
      {
        endContent: "°",
        startContent: "M₀",
        label: "平近点角",
        key: "m6",
      },
    ],
  },
  // 星座设置参数
  {
    category: "摄动力参数",
    fields: [
      {
        startContent: "n",
        label: "重力场模型阶数",
        key: "m7",
      },
      {
        startContent: "m",
        label: "重力场模型次数",
        key: "m8",
      },
      {
        startContent: "A_d",
        endContent: "m²",
        label: "大气阻力面积",
        key: "m9",
      },
      {
        startContent: "m",
        endContent: "kg",
        label: "卫星质量",
        key: "m10",
      },
      {
        startContent: "C_D",
        label: "大气阻力系数",
        key: "m11",
      },
      {
        startContent: "C_R",
        label: "太阳辐射压系数",
        key: "m12",
      },
      {
        startContent: "A_s",
        endContent: "m²",
        label: "太阳辐射压面积",
        key: "m13",
      },
    ],
  },
];

const keys = CustomSceneField.flatMap((category) => category.fields.map((field) => field.key));

interface IProps {
  onClose: () => void;
  loadCustomSatellite: (data: Record<string, any>) => Promise<void>;
}

const CustomForce: FC<PropsWithChildren<IProps>> = ({ onClose, loadCustomSatellite }) => {
  const [customFormValue, setCustomFormValue] = useSetState<Record<string, any>>({});

  const canSubmit = useMemo(() => {
    return keys.every((key) => {
      return customFormValue[key];
    });
  }, [customFormValue]);

  const { run, loading } = useRequest(
    async () => {
      let params: any[] = [];

      keys.forEach((key) => {
        if (key === "date") {
          const date = customFormValue[key] as ZonedDateTime;

          params.push(date.year.toString());
          params.push(date.month.toString());
          params.push(date.day.toString());
          params.push(date.hour.toString());
          params.push(date.minute.toString());
          params.push(date.second.toString());
        } else {
          params.push(customFormValue[key]);
        }
      });

      const res = await fetch("/api/model/custom", {
        method: "POST",
        body: JSON.stringify({
          type: "Perturbation_force",
          params,
        }),
      });

      if (res.ok) {
        return res.json();
      } else {
        return Promise.reject(res);
      }
    },
    {
      manual: true,
      onSuccess(data) {
        loadCustomSatellite(data.czmlData);
        onClose();
      },
    },
  );

  return (
    <>
      <ModalHeader className="flex flex-col gap-1">自定义设定</ModalHeader>
      <ModalBody>
        <div className="grid grid-cols-3 gap-6">
          {CustomSceneField.map((category) => (
            <div key={category.category} className="space-y-4">
              <h3 className="text-base font-semibold text-white">{category.category}</h3> {/* 修改这里 */}
              <div className="space-y-3">
                {category.fields.map((item) => {
                  const endContent = item.endContent ? (
                    <div className="pointer-events-none flex items-center">
                      <span className="text-default-400 text-small">{item.endContent}</span>
                    </div>
                  ) : null;

                  const startContent = item.startContent ? (
                    <div className="pointer-events-none flex items-center">
                      <span className="text-default-400 text-small">{item.startContent}</span>
                    </div>
                  ) : null;

                  if (item.key === "date") {
                    return (
                      <DatePicker
                        key={item.key}
                        hideTimeZone
                        showMonthAndYearPickers
                        // defaultValue={now(getLocalTimeZone())}
                        granularity="second"
                        label="Event Date"
                        variant="bordered"
                        onChange={(val) => {
                          setCustomFormValue({ [item.key]: val });
                        }}
                      />
                    );
                  }

                  return (
                    <Input
                      key={item.key}
                      isRequired
                      endContent={endContent}
                      label={item.label}
                      startContent={startContent}
                      value={customFormValue[item.key]}
                      onValueChange={(val) => {
                        let parts = val.match(/[0-9.]/g) || [];
                        let result = parts.join("");
                        const dotIndex = result.indexOf(".");

                        // 是否为小数
                        if (dotIndex !== -1) {
                          const beforeDot = result.slice(0, dotIndex + 1);
                          const afterDot = result.slice(dotIndex + 1).replace(/\./g, "");

                          result = beforeDot + afterDot;
                        }
                        setCustomFormValue({ [item.key]: result });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="danger" variant="light" onPress={onClose}>
          取消
        </Button>
        <Button color="primary" isDisabled={!canSubmit} isLoading={loading} onPress={run}>
          确定
        </Button>
      </ModalFooter>
    </>
  );
};

export default CustomForce;
