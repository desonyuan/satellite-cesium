"use client";

import { FC } from "react";

import RightBox from "@/components/main/right/RightBox";
import ScenFormModal from "@/components/main/ScenFormModal";
import TitleBar from "@/components/main/TitleBar";
import LeftBox from "@/components/main/left/LeftBox";

const Home: FC = () => {
  return (
    <>
      <TitleBar />
      <LeftBox />
      <RightBox />
      <ScenFormModal />
    </>
  );
};

export default Home;
