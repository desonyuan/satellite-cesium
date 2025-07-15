import { execFile } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

import { NextRequest, NextResponse } from "next/server";

import { HPOPEXEC_PATH, BUILD_DIR } from "@/constants";
import { GenCzmlHandler } from "@/utils/genCzml";

export const POST = async (request: NextRequest) => {
  const json = await request.json();
  const args = json.params as string[];

  const params = [json.type, ...args];

  if (json.type === "Walker") {
    params.unshift("scene_edit");
  }

  console.log(params, "1111111111");

  await new Promise((resolve, reject) => {
    execFile(HPOPEXEC_PATH, params, (e: any, stdout: any) => {
      if (e) {
        reject(e);
      } else {
        resolve(stdout);
      }
    });
  });
  const fileBuf = readFileSync(join(BUILD_DIR, `${json.type}All_J2000_Ephemeris.json`));
  const obj = JSON.parse(fileBuf.toString());
  const czmlData = await GenCzmlHandler(obj);
  // 生成随机文件名
  // const filename = `custom_${Date.now()}.czml`;

  // writeFileSync(join(MODEL_DIRECTION_PATH, filename), JSON.stringify(czmlData));

  return NextResponse.json({ czmlData });
};
