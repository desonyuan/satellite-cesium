#include "walker_constellation.h"
#include <cmath>
#include <fstream>
#include <array>

const double DEG2RAD = M_PI / 180.0;
const double mu = 398600.4418; // 地球引力常数 km^3/s^2（WGS-84）

// ==================== 工具函数 ====================

// 解开普勒方程：平均近点角 → 真近点角（弧度）
double meanToTrueAnomaly(double M, double e) {
    double E = M;
    for (int i = 0; i < 100; ++i) {
        double f = E - e * std::sin(E) - M;
        double fp = 1 - e * std::cos(E);
        double dE = -f / fp;
        E += dE;
        if (std::abs(dE) < 1e-8) break;
    }
    return 2 * std::atan2(std::sqrt(1 + e) * std::sin(E / 2),
                          std::sqrt(1 - e) * std::cos(E / 2));
}

// 将轨道六要素转换为状态矢量（位置 + 速度，单位：km 和 km/s）
// 主函数：直接由真近点角计算 r/v
std::array<double, 6> orbitalElementsToRV(const OrbitalElements& elem) {
    // 1. 提取轨道参数并转弧度
    double a = elem.a;
    double e = elem.e;
    double i = elem.i * DEG2RAD;
    double Omega = elem.Omega * DEG2RAD;
    double omega = elem.omega * DEG2RAD;
    double nu = elem.nu * DEG2RAD;

    // 2. 轨道几何参数
    double p = a * (1 - e * e); // 半通径
    double r = p / (1 + e * std::cos(nu)); // 当前轨道半径

    // 3. PQW 坐标系下的位置和速度
    double x_p = r * std::cos(nu);
    double y_p = r * std::sin(nu);
    double vx_p = -std::sqrt(mu / p) * std::sin(nu);
    double vy_p =  std::sqrt(mu / p) * (e + std::cos(nu));
    double z_p = 0.0, vz_p = 0.0;

    // 4. 构造 PQW → ECI 旋转矩阵
    double cosO = std::cos(Omega), sinO = std::sin(Omega);
    double cosi = std::cos(i), sini = std::sin(i);
    double cosw = std::cos(omega), sinw = std::sin(omega);

    double R[3][3];
    R[0][0] = cosO * cosw - sinO * sinw * cosi;
    R[0][1] = -cosO * sinw - sinO * cosw * cosi;
    R[0][2] = sinO * sini;
    R[1][0] = sinO * cosw + cosO * sinw * cosi;
    R[1][1] = -sinO * sinw + cosO * cosw * cosi;
    R[1][2] = -cosO * sini;
    R[2][0] = sinw * sini;
    R[2][1] = cosw * sini;
    R[2][2] = cosi;

    // 5. 应用旋转矩阵得到 ECI 坐标系下的 r 和 v
    std::array<double, 6> rv;
    rv[0] = R[0][0] * x_p + R[0][1] * y_p + R[0][2] * z_p;
    rv[1] = R[1][0] * x_p + R[1][1] * y_p + R[1][2] * z_p;
    rv[2] = R[2][0] * x_p + R[2][1] * y_p + R[2][2] * z_p;
    rv[3] = R[0][0] * vx_p + R[0][1] * vy_p + R[0][2] * vz_p;
    rv[4] = R[1][0] * vx_p + R[1][1] * vy_p + R[1][2] * vz_p;
    rv[5] = R[2][0] * vx_p + R[2][1] * vy_p + R[2][2] * vz_p;

    return rv; // 单位：位置 [km]，速度 [km/s]
}
// ==================== 星座生成主函数 ====================

std::vector<OrbitalElements> generateWalkerConstellation(const OrbitalElements& seed, int T, int S, int F) {
    std::vector<OrbitalElements> satellites;
    for (int t = 0; t < T; ++t) {
        double RAAN = std::fmod(seed.Omega + t * 360.0 / T, 360.0);
        for (int s = 0; s < S; ++s) {
            double M = std::fmod(seed.nu + (360.0 / S) * s + (360.0 / (T * S)) * F * t, 360.0);
            satellites.push_back({seed.a, seed.e, seed.i, RAAN, seed.omega, M});
        }
    }
    return satellites;
}

void generateWalkerConstellationAndWriteRV(const OrbitalElements& seed, int T, int S, int F, const std::string& filename) {
    auto satellites = generateWalkerConstellation(seed, T, S, F);

    std::ofstream fout(filename);
    if (!fout.is_open()) {
        throw std::runtime_error("Failed to open output file.");
    }

    fout  << "2024/01/02-04:00:00.000\n";
    for (size_t i = 0; i < satellites.size(); ++i) {
        auto rv = orbitalElementsToRV(satellites[i]);
        fout << "Satellite_" << (i + 1) << "\n";
        fout << rv[0] << "\n";                     // x
        fout << rv[1] << "\n";
        fout << rv[2] << "\n";     // y z
        fout << rv[3] << "\n";                     // vx
        fout << rv[4] << "\n";                     // vy
        fout << rv[5] << "\n";                     // vz
    }

    // for (size_t i = 0; i < satellites.size(); ++i) {
    //     const auto& elem = satellites[i];
    //     fout << "Satellite_" << (i + 1) << "\n";
    //     fout << "Semi - major axis (a): " << elem.a << " km\n";
    //     fout << "Eccentricity (e): " << elem.e << "\n";
    //     fout << "Inclination (i): " << elem.i << " degrees\n";
    //     fout << "Right Ascension of Ascending Node (Omega): " << elem.Omega << " degrees\n";
    //     fout << "Argument of Perigee (omega): " << elem.omega << " degrees\n";
    //     fout << "Mean Anomaly (M0): " << elem.M0 << " degrees\n";
    // }

    fout.close();
}
