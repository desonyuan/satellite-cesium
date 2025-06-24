import { execFile } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

import { NextRequest, NextResponse } from "next/server";

import { HPOPEXEC_PATH } from "@/constants";

export const POST = async (request: NextRequest) => {
  const json = await request.json();
  const params = json.params as string[];

  console.log(existsSync(join(HPOPEXEC_PATH)), "2222222222");

  await new Promise((resolve, reject) => {
    execFile(HPOPEXEC_PATH, ["Walker", ...params], (e) => {
      console.log(e, "111111111");

      if (e) {
        NextResponse.json({ message: "执行失败", error: e });

        return reject();
      } else {
        NextResponse.json({ message: "执行成功" });
        resolve(null);
      }
    });
  });
};
