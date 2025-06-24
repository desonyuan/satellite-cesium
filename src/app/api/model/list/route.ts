import { readdirSync } from "fs";
import { join } from "path";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const dirs = readdirSync(join(process.cwd(), "public", "model"));

  return NextResponse.json({
    files: dirs.map((filename) => {
      const nameArr = filename.split(".");

      nameArr.pop();

      return nameArr.join("");
    }),
  });
}
