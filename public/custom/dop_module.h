#pragma once

#include <vector>
#include <string>
#include <Eigen/Dense>

using Eigen::Vector3d;

// 将地面站经纬度高度转换为 ECEF 坐标
Vector3d LatLonAltToECEF(double lat_deg, double lon_deg, double alt_km);

// 加载轨道数据，返回所有卫星的位置数据 [卫星编号][时间步]
std::vector<std::vector<Vector3d>> LoadAllSatellites(int num_sats, int num_steps, const std::string& folder);

// 计算 PDOP 网格热力图（每个时间步输出一个文件）
void ComputeGridPDOP(const std::vector<std::vector<Vector3d>>& sat_positions,
    int num_steps, double time_step,
    double lat_start, double lat_end, double lat_step,
    double lon_start, double lon_end, double lon_step,
    int year, int month, int day, int hour, int min, double sec,
    std::string type, double alt_km = 0.0);
