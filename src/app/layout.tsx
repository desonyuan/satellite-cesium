import "../../styles/globals.css"
import "cesium/Build/Cesium/Widgets/widgets.css";
// import "@/styles/cesium.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import CesiumContext from "../context/cesium.context";
import { Providers } from "../context/providers";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="zh-CN">
      <head />
      <body className={clsx("bg-background")}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <CesiumContext>{children}</CesiumContext>
        </Providers>
      </body>
    </html>
  );
}
