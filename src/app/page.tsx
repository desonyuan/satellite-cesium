"use client";

import { FC } from "react";

import { useCesium } from "../context/cesium.context";
const Home: FC = () => {
  const { viewer } = useCesium();

  return null;
};

export default Home;
