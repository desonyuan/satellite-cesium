cmake_minimum_required(VERSION 3.10)  # CMake 最低版本
project(HPOP_Gauss_Jackson_4th_order_predictor) # 项目名称

set(CMAKE_CXX_STANDARD 14)            # 使用 C++14 标准
set(CMAKE_BUILD_TYPE Debug)  # 确保生成Debug版本
# set(CMAKE_BUILD_TYPE Release)  # 确保生成Release版本

# Eigen头文件路径
include_directories(${CMAKE_SOURCE_DIR})

# 添加可执行文件（将所有 .cpp 文件列出）
add_executable(hpop_executable
    HPOP.cpp
    APC_Moon.cpp
    APC_Sun.cpp         # 替换为你的其他 .cpp 文件名
    eopspw.cpp         # 替换为你的其他 .cpp 文件名
    nrlmsise-00_data.cpp
    nrlmsise-00.cpp
    SAT_DE.cpp
    SAT_Force.cpp
    SAT_RefSys.cpp
    SAT_Time.cpp
    SAT_VecMat.cpp
    MathUtils.cpp
    dop_module.cpp
    walker_constellation.cpp
)