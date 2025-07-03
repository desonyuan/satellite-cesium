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
std::array<double, 6> orbitalElementsToRV(const OrbitalElements& elem) {
    double a = elem.a, e = elem.e;
    double i = elem.i * DEG2RAD;
    double Omega = elem.Omega * DEG2RAD;
    double omega = elem.omega * DEG2RAD;
    double M0 = elem.M0 * DEG2RAD;

    double nu = meanToTrueAnomaly(M0, e);
    double p = a * (1 - e * e);
    double r = p / (1 + e * std::cos(nu));

    // 在轨道平面坐标系下的坐标和速度
    double x_p = r * std::cos(nu);
    double y_p = r * std::sin(nu);
    double vx_p = -std::sqrt(mu / p) * std::sin(nu);
    double vy_p = std::sqrt(mu / p) * (e + std::cos(nu));

    // 旋转矩阵（三次绕 z-x-z）
    double cosO = std::cos(Omega), sinO = std::sin(Omega);
    double cosi = std::cos(i), sini = std::sin(i);
    double cosw = std::cos(omega), sinw = std::sin(omega);

    double R11 = cosO * cosw - sinO * sinw * cosi;
    double R12 = -cosO * sinw - sinO * cosw * cosi;
    double R21 = sinO * cosw + cosO * sinw * cosi;
    double R22 = -sinO * sinw + cosO * cosw * cosi;
    double R31 = sinw * sini;
    double R32 = cosw * sini;

    std::array<double, 6> rv;
    rv[0] = R11 * x_p + R12 * y_p;
    rv[1] = R21 * x_p + R22 * y_p;
    rv[2] = R31 * x_p + R32 * y_p;
    rv[3] = R11 * vx_p + R12 * vy_p;
    rv[4] = R21 * vx_p + R22 * vy_p;
    rv[5] = R31 * vx_p + R32 * vy_p;

    return rv;
}

// ==================== 星座生成主函数 ====================

std::vector<OrbitalElements> generateWalkerConstellation(const OrbitalElements& seed, int T, int S, int F) {
    std::vector<OrbitalElements> satellites;
    for (int t = 0; t < T; ++t) {
        double RAAN = std::fmod(seed.Omega + t * 360.0 / T, 360.0);
        for (int s = 0; s < S; ++s) {
            double M = std::fmod(seed.M0 + (360.0 / S) * s + (360.0 / (T * S)) * F * t, 360.0);
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
