#include "dop_module.h"
#include <iostream>
#include <vector>
#include <fstream>
#include <cmath>
#include <ctime> 
#include <Eigen/Dense>

using namespace std;
using namespace Eigen;

const double DEG2RAD = M_PI / 180.0;
const double RAD2DEG = 180.0 / M_PI;
const double EARTH_RADIUS = 6378.137; // km
const double MIN_ELEVATION = 0.0; // degrees

bool IsLeapYear(int year) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

int DaysInMonth(int year, int month) {
    static const std::vector<int> days_per_month = {
        31, 28, 31, 30, 31, 30,
        31, 31, 30, 31, 30, 31
    };
    if (month == 2 && IsLeapYear(year)) return 29;
    return days_per_month[month - 1];
}

std::tm AddSecondsToTime(int year, int month, int day,
                         int hour, int minute, int second,
                         int delta_seconds) {
    // 先加上秒数
    second += delta_seconds;

    // 分钟进位
    minute += second / 60;
    second = second % 60;

    // 小时进位
    hour += minute / 60;
    minute = minute % 60;

    // 天进位
    day += hour / 24;
    hour = hour % 24;

    // 月份进位，注意天数可能会跨月
    while (true) {
        int dim = DaysInMonth(year, month);
        if (day <= dim) break;
        day -= dim;
        ++month;
        if (month > 12) {
            month = 1;
            ++year;
        }
    }

    std::tm result = {};
    result.tm_year = year - 1900;
    result.tm_mon  = month - 1;  // 0-based
    result.tm_mday = day;
    result.tm_hour = hour;
    result.tm_min  = minute;
    result.tm_sec  = second;

    return result;
}


Vector3d LatLonAltToECEF(double lat_deg, double lon_deg, double alt_km) {
    double lat = lat_deg * DEG2RAD;
    double lon = lon_deg * DEG2RAD;
    double N = EARTH_RADIUS / sqrt(1 - 0.00669437999014 * sin(lat) * sin(lat));
    double x = (N + alt_km) * cos(lat) * cos(lon) * 1000;
    double y = (N + alt_km) * cos(lat) * sin(lon) * 1000;
    double z = (N * (1 - 0.00669437999014) + alt_km) * sin(lat) * 1000;
    return Vector3d(x, y, z);
}

double CalcElevation(const Vector3d& sat_pos, const Vector3d& gs_pos) {
    Vector3d los = sat_pos - gs_pos;
    double range = los.norm();
    Vector3d los_unit = los / range;
    Vector3d up = gs_pos.normalized();
    double cos_elev = los_unit.dot(up);
    return asin(cos_elev) * RAD2DEG;
}

vector<vector<Vector3d>> LoadAllSatellites(int num_sats, int num_steps, const string& folder) {
    vector<vector<Vector3d>> all_positions(num_sats);
    for (int i = 0; i < num_sats; ++i) {
        char filename[128];
        sprintf(filename, "%s%s_%d_ECEF.txt", folder.c_str(), "Satellite", i + 1);
        ifstream infile(filename);
        if (!infile.is_open()) {
            cerr << "Failed to open " << filename << endl;
            exit(1);
        }
        
        string date, time;
        double x, y, z, vx, vy, vz;
        for (int step = 0; step < num_steps; ++step) {
            infile >> date >> time >> x >> y >> z >> vx >> vy >> vz;
            all_positions[i].emplace_back(Vector3d(x, y, z));
        }
        infile.close();
    }
    return all_positions;
}

void ComputeGridPDOP(const vector<vector<Vector3d>>& sat_positions,
    int num_steps, double time_step,
    double lat_start, double lat_end, double lat_step,
    double lon_start, double lon_end, double lon_step,
    int year, int month, int day, int hour, int min, double sec,
    string type, double alt_km) {
    
    int num_sats = sat_positions.size();
    vector<vector<int>> visible_times(num_sats); // 每颗卫星可见时间步记录
    
    // Create output files in executable directory
    ofstream fout(type + "_pdop_grid_all.csv");
    if (!fout.is_open()) {
        cerr << "Failed to open " << type + "_pdop_grid_all.csv for writing." << endl;
        return;
    }
    fout << "time_step,lat,lon,pdop\n";

    for (int t = 0; t < num_steps; ++t) {
        for (double lat = lat_start; lat <= lat_end; lat += lat_step) {
            for (double lon = lon_start; lon <= lon_end; lon += lon_step) {
                Vector3d obs = LatLonAltToECEF(lat, lon, alt_km);
                vector<Vector3d> visible_dirs;

                for (int s = 0; s < num_sats; ++s) {
                    Vector3d sat = sat_positions[s][t];
                    double elev = CalcElevation(sat, obs);
                    if (elev >= MIN_ELEVATION) {
                        visible_dirs.push_back((sat - obs).normalized());
                        if (lat == lat_start && lon == lon_start) {
                            visible_times[s].push_back(t);
                        }
                    }
                }

                if (visible_dirs.size() >= 4) {
                    MatrixXd A(visible_dirs.size(), 4);
                    for (size_t i = 0; i < visible_dirs.size(); ++i) {
                        A(i, 0) = visible_dirs[i][0];
                        A(i, 1) = visible_dirs[i][1];
                        A(i, 2) = visible_dirs[i][2];
                        A(i, 3) = 1.0;
                    }
                    Matrix4d Q = (A.transpose() * A).inverse();
                    double PDOP = sqrt(Q(0,0) + Q(1,1) + Q(2,2));
                    fout << t << "," << lat << "," << lon << "," << PDOP << "\n";
                } else {
                    fout << t << "," << lat << "," << lon << ",NaN\n";
                }
            }
        }
    }
    fout.close();

    // === 输出 STK-style 可见时间区间 ===
    ofstream stk_out(type + "_sat_visibility.txt");
    if (!stk_out.is_open()) {
    cerr << "Failed to open sat_access_report.txt for writing.\n";
    return;
    }

    // 起始时间：按照输入为准，步长：30秒
    // std::tm start_time = {};
    // start_time.tm_year = year - 1900;
    // start_time.tm_mon = month - 1;  // May
    // start_time.tm_mday = day;
    // start_time.tm_hour = hour;
    // start_time.tm_min = min;
    // start_time.tm_sec = sec;
    // time_t base_time = mktime(&start_time);
    const double step_seconds = time_step;

    for (int s = 0; s < num_sats; ++s) {
        stk_out << "Satellite " << s + 1 << "\n";
        const vector<int>& times = visible_times[s];

        if (times.empty()) {
            stk_out << "  No access intervals.\n\n";
            continue;
        }

        int start_idx = times[0];
        int prev_idx = times[0];

        for (size_t i = 1; i <= times.size(); ++i) {
            if (i == times.size() || times[i] != prev_idx + 1) {
                std::tm t_start = AddSecondsToTime(year, month, day, hour, min, static_cast<int>(sec), start_idx * step_seconds);
                std::tm t_stop = AddSecondsToTime(year, month, day, hour, min, static_cast<int>(sec), prev_idx * step_seconds);
                // time_t t_start = base_time + start_idx * step_seconds;
                // time_t t_stop  = base_time + (prev_idx + 1) * step_seconds;

                char buf_start[32], buf_stop[32];
                strftime(buf_start, sizeof(buf_start), "%Y-%m-%d %H:%M:%S", &t_start);
                strftime(buf_stop, sizeof(buf_stop), "%Y-%m-%d %H:%M:%S", &t_stop);

                stk_out << "Start: " << buf_start << "\n";
                stk_out << "Stop:  " << buf_stop  << "\n\n";

                if (i < times.size()) start_idx = times[i];
            }
            if (i < times.size()) prev_idx = times[i];
        }
    }

    stk_out.close();
    
    // // === 输出每颗卫星可见步编号区间 ===（STK-style，但记录 step 编号）
    // ofstream vis_out("sat_visibility.txt");
    // if (!vis_out.is_open()) {
    //     cerr << "Failed to open sat_visibility.txt for writing.\n";
    //     return;
    // }

    // for (int s = 0; s < num_sats; ++s) {
    //     vis_out << "Satellite " << s + 1 << "\n";
    //     const vector<int>& times = visible_times[s];

    //     if (times.empty()) {
    //         vis_out << "  No access intervals.\n\n";
    //         continue;
    //     }

    //     int start_idx = times[0];
    //     int prev_idx = times[0];

    //     for (size_t i = 1; i <= times.size(); ++i) {
    //         if (i == times.size() || times[i] != prev_idx + 1) {
    //             vis_out << "Start: " << start_idx << "\n";
    //             vis_out << "Stop:  " << prev_idx << "\n\n";

    //             if (i < times.size()) start_idx = times[i];
    //         }
    //         if (i < times.size()) prev_idx = times[i];
    //     }
    // }

    // vis_out.close();
    // // Output visibility data
    // ofstream vis_out(type + "_sat_visibility.txt");
    // if (!vis_out.is_open()) {
    //     cerr << "Failed to open " << type + "_sat_visibility.txt for writing.\n";
    //     return;
    // }

    // for (int s = 0; s < num_sats; ++s) {
    //     vis_out << "Satellite " << s + 1 << "\n";
    //     const vector<int>& times = visible_times[s];

    //     if (times.empty()) {
    //         vis_out << "  No access intervals.\n\n";
    //         continue;
    //     }

    //     int start_idx = times[0];
    //     int prev_idx = times[0];

    //     for (size_t i = 1; i <= times.size(); ++i) {
    //         if (i == times.size() || times[i] != prev_idx + 1) {
    //             vis_out << "Start: " << start_idx << "\n";
    //             vis_out << "Stop:  " << prev_idx << "\n\n";
    //             if (i < times.size()) start_idx = times[i];
    //         }
    //         if (i < times.size()) prev_idx = times[i];
    //     }
    // }
    // vis_out.close();
}