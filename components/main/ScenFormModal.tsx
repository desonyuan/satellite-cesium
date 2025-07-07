"use client";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  DateRangePicker,
  Switch,
  Button,
  RadioGroup,
  Radio,
  Divider,
  CardFooter,
  Form,
  Modal,
  ModalContent,
  useDisclosure,
} from "@heroui/react";
import { CzmlDataSource } from "cesium";
import { FC, PropsWithChildren, useMemo, useRef, useState } from "react";
import { useBoolean, useRequest, useSetState, useUpdateEffect } from "ahooks";

import CustomScenForm from "./CustomScenForm";
import CustomForce from "./CustomForce";

import {
  addScene,
  genDefaultSceneConfig,
  ISceneConfig,
  setCurDataSource,
  setCurScene,
  SettingKey,
  toggleEditFormModal,
  useAppStore,
} from "@/src/store/app.store";
import { useCesium } from "@/src/context/cesium.context";
import { loadCzml, loadCzmlObject } from "@/src/tool/czml";
import { LoadSceneConfig } from "@/src/tool/scene";

const scaleType = [
  {
    text: "等比缩放",
    type: "aspectFit",
  },
  {
    text: "宽度缩放",
    type: "widthFix",
  },
  {
    text: "高度缩放",
    type: "heightFix",
  },
];

interface IProps {}

const ScenFormModal: FC<PropsWithChildren<IProps>> = () => {
  const { editFromModal } = useAppStore();
  const [fileList, setFileList] = useState<string[]>([]);
  const { viewer } = useCesium();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState({});
  const [formValues, setFormValues] = useSetState<ISceneConfig["setting"]>(genDefaultSceneConfig());
  const [sceneName, setSceneName] = useState("");
  const trackFiles = useRef<FileList | null>(null);
  const [satelliteList, setSatelliteList] = useState<string[]>([]);
  const [loading, setLoading] = useBoolean();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const setValue = (key: SettingKey, val: any, name: string) => {
    setFormValues({
      [key]: {
        name,
        val,
      },
    } as any);
  };
  const selectRadio = useMemo(() => {
    return satelliteList[0];
  }, [satelliteList]);

  const loadCustomSatellite = async (data: Record<string, any>) => {
    try {
      const ds = await loadCzmlObject(data);

      viewer.dataSources.removeAll(true);

      viewer.dataSources.add(ds);
      setCurDataSource(ds);
    } catch (error) {}
  };

  const loadSatellite = async () => {
    viewer.dataSources.removeAll(true);
    if (satelliteList.length) {
      try {
        for (let index = 0; index < satelliteList.length; index++) {
          const filename = satelliteList[index];
          const ds = await loadCzml(filename);

          viewer.dataSources.add(ds);
          setCurDataSource(ds);
        }
      } catch (error) {}
    }
    // 加载轨迹
    const files = trackFiles.current;

    if (files) {
      const tasks: Promise<any>[] = [];

      for (let index = 0; index < files.length; index++) {
        const task = new Promise((resolve, reject) => {
          const file = files[index];
          const reader = new FileReader();

          reader.onload = function (e) {
            const content = reader.result;

            if (content) {
              const blob = new Blob([content], { type: "application/json" });
              const url = URL.createObjectURL(blob);

              CzmlDataSource.load(url).then((ds) => {
                viewer.dataSources.add(ds);
                resolve(true);
              }, reject);
            }
          };
          reader.readAsText(file);
        });

        tasks.push(task);
      }
      await Promise.all(tasks);
    }
  };

  const onSubmit = async () => {
    if (!sceneName) {
      setErrors({ sceneName: "场景名称不能为空" });

      return;
    }
    setLoading.setTrue();

    if (selectRadio !== "自定义星座可视化" && selectRadio !== "摄动力") {
      try {
        await loadSatellite();
        const data = { sceneName, setting: formValues, satelliteList };

        addScene(data);
        setCurScene(sceneName);
        toggleEditFormModal();
        LoadSceneConfig(viewer, formValues);
      } catch (error) {
        console.error(error);
      }
    }
    setLoading.setFalse();
  };

  const { runAsync: getModels } = useRequest(
    async () => {
      const res = await fetch("/api/model/list");

      return res.json();
    },
    {
      manual: true,
      onSuccess(json) {
        setFileList([...json.files, "自定义星座可视化", "摄动力"]);
      },
    },
  );

  useUpdateEffect(() => {
    if (editFromModal) {
      getModels();
    } else {
      setFormValues(genDefaultSceneConfig());
      setErrors({});
    }
  }, [editFromModal]);

  if (editFromModal) {
    return (
      <div
        className="w-full h-full z-50 absolute left-0 top-0 flex flex-col justify-center items-center"
        style={{
          backgroundImage: "url('/assets/Scene/your-background-image.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <Card className="w-[950px] p-5">
          <CardHeader>
            <div className="grow text-center">
              <h1 className="font-bold text-3xl">场景编辑</h1>
            </div>
          </CardHeader>
          <CardBody>
            <Form ref={form} action="#" validationErrors={errors} onSubmit={onSubmit}>
              {/* 基础设置部分 */}
              <div className="flex">
                <div className="w-1/2 px-10">
                  <h4 className="my-5 font-bold text-primary text-2xl">基础设置</h4>
                  <div className="flex flex-col gap-y-7 px-5">
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28 text-xl">场景名称:</label>
                      <Input
                        required
                        name="sceneName"
                        placeholder="请输入场景名称"
                        onValueChange={(val) => {
                          setSceneName(val.trim());
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28 text-xl">{formValues.sun.name}:</label>
                      <Switch
                        isSelected={formValues.sun.val}
                        name="sun"
                        onValueChange={(selected) => {
                          setValue("sun", selected, "显示太阳");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28 text-xl">{formValues.star.name}:</label>
                      <Switch
                        isSelected={formValues.star.val}
                        name="star"
                        onValueChange={(selected) => {
                          setValue("star", selected, "显示星空");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28 text-xl">{formValues.time.name}:</label>
                      <Switch
                        isSelected={formValues.time.val}
                        name="time"
                        onValueChange={(selected) => {
                          setValue("time", selected, "显示时间轴");
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 任务场景设置部分 */}
                <div className="w-1/2 px-10">
                  <h4 className="my-5 font-bold text-primary text-2xl">任务场景设置</h4>
                  <div className="flex flex-col gap-y-7 px-5">
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28 text-xl">时间段:</label>
                      <DateRangePicker
                        visibleMonths={2}
                        onChange={(values) => {
                          const date: { start?: Date; end?: Date } = {};

                          if (values?.start) {
                            date.start = values.start.toDate("Asia/Shanghai");
                          }
                          if (values?.end) {
                            date.end = values.end.toDate("Asia/Shanghai");
                          }
                          setValue("timeRange", date, "时间段");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28 text-xl">大气模型:</label>
                      <div className="relative">
                        <Button color="default">选择文件</Button>
                        <input className="absolute w-full left-0 top-0 h-full opacity-0 z-10" type="file" />
                      </div>
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28 text-xl">终端载体轨迹:</label>
                      <div className="relative">
                        <Button color="default">选择文件</Button>
                        <input
                          className="absolute w-full left-0 top-0 h-full opacity-0 z-10"
                          type="file"
                          onChange={(e) => {
                            trackFiles.current = e.target.files;
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full px-10 mt-8">
                <h4 className="my-5 font-bold text-primary text-2xl">星座可视化</h4>
                <div className="flex flex-col gap-y-7 px-5">
                  <RadioGroup
                    classNames={{
                      wrapper: "grid grid-cols-3",
                    }}
                    orientation="horizontal"
                    value={satelliteList[0]}
                    onValueChange={(val) => {
                      if (val === "自定义星座可视化" || val === "摄动力") {
                        onOpen();
                      }
                      setSatelliteList([val]);
                    }}
                  >
                    {fileList.map((filename) => (
                      <Radio
                        key={filename}
                        classNames={{
                          base: "text-xl", // 控制整体文本样式
                          label: "text-xl", // 特别控制标签文本样式
                        }}
                        value={filename}
                      >
                        {filename.replace(".czml", "")} {/* 去掉.czml后缀 */}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </Form>
            <Divider className="my-4" />
          </CardBody>
          <CardFooter>
            <div className="flex items-center justify-center gap-x-10 w-full">
              <Button color="default" variant="light" onPress={toggleEditFormModal}>
                取消
              </Button>
              <Button color="primary" isLoading={loading} onPress={onSubmit}>
                确定
              </Button>
            </div>
          </CardFooter>
        </Card>
        <Modal isOpen={isOpen} size={selectRadio !== "自定义星座可视化" ? "4xl" : "xl"} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => {
              const close = () => {
                setSatelliteList([]);
                onClose();
              };

              if (selectRadio === "自定义星座可视化") {
                return (
                  <CustomScenForm
                    loadCustomSatellite={async (data: Record<string, any>) => {
                      await loadCustomSatellite(data);
                    }}
                    onClose={close}
                  />
                );
              } else {
                return (
                  <CustomForce
                    loadCustomSatellite={async (data: Record<string, any>) => {
                      await loadCustomSatellite(data);
                    }}
                    onClose={close}
                  />
                );
              }
            }}
          </ModalContent>
        </Modal>
      </div>
    );
  }

  return null;
};

export default ScenFormModal;
