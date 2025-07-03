import { Listbox, ListboxItem } from "@heroui/listbox";
import { FC, useMemo, useState } from "react";
import { ScrollShadow } from "@heroui/react";
import { useUpdateEffect } from "ahooks";

import Box from "../../Box";

import { useAppStore } from "@/src/store/app.store";
import { useCesium } from "@/src/context/cesium.context";

interface IProps {}

const DataSourceList: FC<IProps> = () => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const curDataSource = useAppStore((state) => state.curDataSource);
  const { viewer } = useCesium();
  const list = useMemo<string[]>(() => {
    if (curDataSource) {
      const ids = curDataSource.entities.values.map((entity) => {
        return entity.id;
      });

      setSelectedKeys(ids);

      return ids;
    }

    return [];
  }, [curDataSource]);

  const onSelectionChange = (slection: any) => {
    const keys = slection as Set<string>;

    const ids: string[] = [];

    keys.forEach((id: string) => {
      ids.push(id);
    });

    setSelectedKeys(ids);
  };

  useUpdateEffect(() => {
    if (viewer) {
      if (curDataSource) {
        curDataSource.entities.values.forEach((entity) => {
          entity.show = selectedKeys.includes(entity.id);
        });
      }
    }
  }, [selectedKeys, viewer]);

  return (
    <Box title="卫星列表">
      <ScrollShadow className="w-72 h-60">
        <Listbox
          disallowEmptySelection
          aria-label="Multiple selection example"
          selectedKeys={selectedKeys}
          selectionMode="multiple"
          variant="flat"
          onSelectionChange={onSelectionChange}
        >
          {list.map((id) => {
            return <ListboxItem key={id}>{id}</ListboxItem>;
          })}
        </Listbox>
      </ScrollShadow>
    </Box>
  );
};

export default DataSourceList;
