import { execFile } from "child_process";
import { readFileSync } from "fs";

import { NextRequest, NextResponse } from "next/server";

import { HPOPEXEC_PATH, WalkerAll_J2000_Ephemeris } from "@/constants";
import { GenCzmlHandler } from "@/utils/genCzml";

export const POST = async (request: NextRequest) => {
  const json = await request.json();
  const params = json.params as string[];

  await new Promise((resolve, reject) => {
    execFile(HPOPEXEC_PATH, [json.type, ...params], (e: any, stdout: any) => {
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
