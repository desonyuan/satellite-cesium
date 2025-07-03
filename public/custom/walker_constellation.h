#ifndef WALKER_CONSTELLATION_H
#define WALKER_CONSTELLATION_H

#include <vector>
#include <string>

struct OrbitalElements {
    double a;     // 半长轴 (km)
    double e;     // 偏心率
    double i;     // 轨道倾角 (deg)
    double Omega; // 升交点赤经 (deg)
    double omega; // 近地点幅角 (deg)
    double M0;    // 平近点角 (deg)
};

// 生成 Walker 星座所有卫星的轨道六要素
std::vector<OrbitalElements> generateWalkerConstellation(const OrbitalElements& seed, int T, int S, int F);

// 生成星座并将状态矢量写入文件（每颗卫星：一行名 + 多行分量）
void generateWalkerConstellationAndWriteRV(const OrbitalElements& seed, int T, int S, int F, const std::string& filename);

#endif // WALKER_CONSTELLATION_H
