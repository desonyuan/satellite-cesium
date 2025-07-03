import { execFile } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { NextRequest, NextResponse } from "next/server";

import { WalkerAll_J2000_Ephemeris, HPOPEXEC_PATH, MODEL_DIRECTION_PATH } from "@/constants";
import { GenCzmlHandler } from "@/utils/genCzml";

export const POST = async (request: NextRequest) => {
  const json = await request.json();
  const params = json.params as string[];

  await new Promise((resolve, reject) => {
    execFile(HPOPEXEC_PATH, ["Walker", ...params], (e, stdout) => {
      if (e) {
        reject(e);
      } else {
        resolve(stdout);
      }
    });
  });
  const fileBuf = readFileSync(WalkerAll_J2000_Ephemeris);
  const obj = JSON.parse(fileBuf.toString());
  const czmlData = await GenCzmlHandler(obj);
  // 生成随机文件名
  // const filename = `custom_${Date.now()}.czml`;

  // writeFileSync(join(MODEL_DIRECTION_PATH, filename), JSON.stringify(czmlData));

  return NextResponse.json({ czmlData });
};
