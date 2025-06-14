"use client";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  SelectItem,
  Slider,
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
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { CzmlDataSource } from "cesium";
import { FC, PropsWithChildren, useRef, useState } from "react";
import { useBoolean, useSetState, useUpdateEffect } from "ahooks";

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
import { loadCzml } from "@/src/tool/czml";
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
  // 加载文件
  const loadSatellite = async () => {
    viewer.dataSources.removeAll(true);
    // 先加载卫星文件
    if (satelliteList.length) {
      try {
        for (let index = 0; index < satelliteList.length; index++) {
          const filename = satelliteList[index];
          const ds = await loadCzml(filename);

          viewer.dataSources.add(ds);
          setCurDataSource(ds);
        }
      } catch (error) {
        // console.log(error, "czml加载失败");
      }
    }
    // 加载选择的轨迹上传文件
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
              // 创建一个 Blob 对象，类型为 application/json
              const blob = new Blob([content], { type: "application/json" });
              // 创建一个临时的 URL 来指向这个 Blob
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
    if (!sceneName) {
      setErrors({ sceneName: "场景名称不能为空" });

      return;
    }
    setLoading.setTrue();
    const selectSatellite = satelliteList[0];

    if (selectSatellite !== "自定义") {
      try {
        await loadSatellite(); //加载卫星文件
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

  useUpdateEffect(() => {
    if (editFromModal) {
      fetch("/api/model/list").then((res) => {
        res.json().then((json) => {
          setFileList([...json.files, "自定义"]);
        });
      });
    } else {
      setFormValues(genDefaultSceneConfig());
      setErrors({});
    }
  }, [editFromModal]);

  if (editFromModal) {
    return (
      <div className="w-full h-full z-50 absolute left-0 top-0 flex flex-col justify-center items-center">
        <Card className="w-[950px] p-5">
          <CardHeader>
            <div className="grow text-center">
              <h1 className="font-bold text-3xl">场景编辑</h1>
            </div>
          </CardHeader>
          <CardBody>
            <Form ref={form} action="#" validationErrors={errors} onSubmit={onSubmit}>
              <div className="flex">
                <div className="w-1/2 px-10">
                  <h4 className="my-5 font-bold text-primary">系统设置</h4>
                  <div className="flex flex-col gap-y-7 px-5">
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">场景名称:</label>
                      <Input
                        required
                        name="sceneName"
                        placeholder="请输入场景名称"
                        // value={sceneName}
                        onValueChange={(val) => {
                          setSceneName(val.trim());
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">地球自转:</label>
                      <Switch
                        isSelected={formValues.rotate.val}
                        name="rotate"
                        onValueChange={(selected) => {
                          setValue("rotate", selected, "地球旋转");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">自转速度:</label>
                      <Slider defaultValue={0.6} label=" " maxValue={100} minValue={0} step={1} />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">{formValues.light.name}:</label>
                      <Switch
                        isSelected={formValues.light.val}
                        name="light"
                        onValueChange={(selected) => {
                          setValue("light", selected, "显示光照");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">光照强度:</label>
                      <Slider defaultValue={0.4} label=" " maxValue={100} minValue={0} step={1} />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">{formValues.sun.name}:</label>
                      <Switch
                        isSelected={formValues.sun.val}
                        name="sun"
                        onValueChange={(selected) => {
                          setValue("sun", selected, "显示太阳");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">{formValues.star.name}:</label>
                      <Switch
                        isSelected={formValues.star.val}
                        name="star"
                        onValueChange={(selected) => {
                          setValue("star", selected, "显示星空");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">{formValues.time.name}:</label>
                      <Switch
                        isSelected={formValues.time.val}
                        name="time"
                        onValueChange={(selected) => {
                          setValue("time", selected, "显示时间轴");
                        }}
                      />
                    </div>
                  </div>
                  <h4 className="my-5 font-bold text-primary">卫星加载</h4>
                  <div className="flex flex-col gap-y-7 px-5">
                    <RadioGroup
                      orientation="horizontal"
                      value={satelliteList[0]}
                      onValueChange={(val) => {
                        if (val === "自定义") {
                          onOpen();
                        }
                        setSatelliteList([val]);
                      }}
                    >
                      {fileList.map((filename) => {
                        return (
                          <Radio key={filename} value={filename}>
                            {filename}
                          </Radio>
                        );
                      })}
                    </RadioGroup>
                  </div>
                </div>
                <div className="w-1/2 px-10">
                  <h4 className="my-5 font-bold text-primary">画布配置</h4>
                  <div className="flex flex-col gap-y-7 px-5">
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">画布大小:</label>
                      <Input placeholder="宽" />
                      <Input placeholder="高" />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">画布位置:</label>
                      <Input placeholder="x" />
                      <Input placeholder="y" />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">页面缩放:</label>
                      <Select
                        aria-label="缩放配置"
                        name="scale"
                        selectedKeys={[formValues.scale.val]}
                        size="md"
                        onChange={(e) => {
                          setValue("scale", e.target.value, "缩放配置");
                        }}
                      >
                        {scaleType.map((item) => (
                          <SelectItem key={item.type}>{item.text}</SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">背景颜色:</label>
                      <Input placeholder="请输入颜色" />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">透明度:</label>
                      <Slider
                        label=" "
                        maxValue={1}
                        minValue={0}
                        name="scale"
                        step={0.1}
                        value={formValues.opacity.val}
                        onChange={(value) => {
                          setValue("opacity", value, "透明度");
                        }}
                      />
                    </div>
                  </div>
                  <h4 className="my-5 font-bold text-primary">仿真配置</h4>
                  <div className="flex flex-col gap-y-7 px-5">
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">时间段:</label>
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
                      <label className="shrink-0 w-28">显示卫星图标:</label>
                      <Switch
                        isSelected={formValues.icon.val}
                        name="icon"
                        onValueChange={(selected) => {
                          setValue("icon", selected, "卫星图标");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">大气模型:</label>
                      <div className="relative">
                        <Button color="default">选择文件</Button>
                        <input className="absolute w-full left-0 top-0 h-full opacity-0 z-10" type="file" />
                      </div>
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">显示卫星轨迹:</label>
                      <Switch
                        isSelected={formValues.track.val}
                        name="track"
                        onValueChange={(selected) => {
                          setValue("track", selected, "卫星轨迹");
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">终端载体轨迹:</label>
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
                    <div className="flex items-center gap-x-5">
                      <label className="shrink-0 w-28">显示卫星名称:</label>
                      <Switch
                        isSelected={formValues.label.val}
                        name="label"
                        onValueChange={(selected) => {
                          setValue("label", selected, "卫星标注");
                        }}
                      />
                    </div>
                  </div>
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
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">自定义设定</ModalHeader>
                <ModalBody>
                  <Input
                    endContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">km</span>
                      </div>
                    }
                    label="半长轴"
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">a</span>
                      </div>
                    }
                  />
                  <Input
                    label="偏心率 "
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">e</span>
                      </div>
                    }
                  />
                  <Input
                    endContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">(°)</span>
                      </div>
                    }
                    label="倾角"
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">i</span>
                      </div>
                    }
                  />
                  <Input
                    endContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">(°)</span>
                      </div>
                    }
                    label="升交点赤经"
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">Ω</span>
                      </div>
                    }
                  />
                  <Input
                    endContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">(°)</span>
                      </div>
                    }
                    label="近地点幅角"
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">ω</span>
                      </div>
                    }
                  />
                  <Input
                    endContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">(°)</span>
                      </div>
                    }
                    label="平近点角"
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">M₀</span>
                      </div>
                    }
                  />
                  <Input
                    label="轨道面数"
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">T</span>
                      </div>
                    }
                  />
                  <Input
                    label="每面卫星数"
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">S</span>
                      </div>
                    }
                  />
                  <Input
                    label="相位因子"
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">F</span>
                      </div>
                    }
                  />
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    取消
                  </Button>
                  <Button color="primary" onPress={onClose}>
                    确定
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    );
  }

  return null;
};

export default ScenFormModal;
