import { readFileSync } from "fs";
import { join } from "path";

import { NextRequest, NextResponse } from "next/server";

import { MODEL_DIRECTION_PATH } from "@/constants";

export const GET = (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const modeName = params.get("modeName") || "default";

  if (modeName) {
    const file = readFileSync(join(MODEL_DIRECTION_PATH, modeName + ".czml"));

    try {
      const jsonArray = JSON.parse(file.toString());
      const clock = jsonArray[0].clock;

      if (clock) {
        const interval = clock.interval;

        if (interval) {
          const [startTime, endTime] = interval.split("/");

          return NextResponse.json({ modeName, startTime, endTime });
        }
      }

      return NextResponse.json({ error: "Invalid clock data" }, { status: 400 });
    } catch (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  } else {
    return NextResponse.json({ modeName }, { status: 400 });
  }
};
