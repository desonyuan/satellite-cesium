import { join } from "path";

export const PUBLIC_DIR = join(process.cwd(), "public");
export const CustomDir = join(PUBLIC_DIR, "custom");
export const BUILD_DIR = join(CustomDir, "build");
export const HPOPEXEC_PATH = join(BUILD_DIR, "hpop_executable.exe");
// export const WalkerAll_J2000_Ephemeris = join(CustomDir, "build", "WalkerAll_J2000_Ephemeris.json");
export const MODEL_DIRECTION_PATH = join(PUBLIC_DIR, "model");
