import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { ModalBody, ModalFooter, ModalHeader } from "@heroui/modal";
import { useRequest, useSetState } from "ahooks";
import { FC, PropsWithChildren, useMemo } from "react";

const CustomSceneField = [
  // 种子卫星轨道参数
  {
    category: "种子卫星轨道参数",
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
        endContent: "(°)",
        startContent: "i",
        label: "倾角",
        key: "m3",
      },
      {
        endContent: "(°)",
        startContent: "Ω",
        label: "升交点赤经",
        key: "m4",
      },
      {
        endContent: "(°)",
        startContent: "ω",
        label: "近地点幅角",
        key: "m5",
      },
      {
        endContent: "(°)",
        startContent: "M₀",
        label: "平近点角",
        key: "m6",
      },
    ],
  },
  // 星座设置参数
  {
    category: "星座设置参数",
    fields: [
      {
        startContent: "T",
        label: "轨道面数",
        key: "m7",
      },
      {
        startContent: "S",
        label: "每面卫星数",
        key: "m8",
      },
      {
        startContent: "F",
        label: "相位因子",
        key: "m9",
      },
    ],
  },
];

const keys = CustomSceneField.flatMap((category) => category.fields.map((field) => field.key));

interface IProps {
  onClose: () => void;
  loadCustomSatellite: (data: Record<string, any>) => Promise<void>;
}

const CustomScenForm: FC<PropsWithChildren<IProps>> = ({ onClose, loadCustomSatellite }) => {
  const [customFormValue, setCustomFormValue] = useSetState<Record<string, string>>({});

  const canSubmit = useMemo(() => {
    return keys.every((key) => {
      return customFormValue[key];
    });
  }, [customFormValue]);

  const { run, loading } = useRequest(
    async () => {
      const res = await fetch("/api/model/custom", {
        method: "POST",
        body: JSON.stringify({
          params: keys.map((key) => {
            return customFormValue[key];
          }),
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

  const onSubmit = () => {};

  return (
    <>
      <ModalHeader className="flex flex-col gap-1">自定义设定</ModalHeader>
      <ModalBody>
        <div className="grid grid-cols-2 gap-6">
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

export default CustomScenForm;
