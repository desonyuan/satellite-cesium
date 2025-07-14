import { readdirSync } from "fs";
import { join } from "path";

import { NextResponse } from "next/server";

import { MODEL_DIRECTION_PATH } from "@/constants";

export async function GET(request: Request) {
  const dirs = readdirSync(join(MODEL_DIRECTION_PATH));

  return NextResponse.json({
    files: dirs.map((filename) => {
      const nameArr = filename.split(".");

      nameArr.pop();

      return nameArr.join("");
    }),
  });
}
