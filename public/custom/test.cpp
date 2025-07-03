#include <iostream>
#include <iomanip>
#include <cmath>
#include <fstream>
#include <ctime>
#include <string>
#include <vector>
#include <thread>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <functional>

#include "GNU_iomanip.h"

#include "SAT_Const.h"
#include "SAT_DE.h"
#include "SAT_Force.h"
#include "SAT_RefSys.h"
#include "SAT_Time.h"
#include "SAT_VecMat.h"
#include "APC_Moon.h"
#include "APC_Sun.h"
#include "eopspw.h"

using namespace std;

// 全局类型和数据
Matrix cnm(361, 361), snm(361, 361);
const double R_ref = 6378.1363e3;   // Earth's radius [m]; GGM03C
const double GM_ref = 398600.4415e9; // [m^3/s^2]; GGM03C
eopdata eoparr[eopsize];
spwdata spwarr[spwsize];
int dat;
double jdeopstart, dut1, lod, xp, yp, ddpsi, ddeps, dx, dy, x, y, s, deltapsi, deltaeps;
double jdspwstart, f107a, f107, f107bar, ap, avgap, kp, sumkp, aparr[8], kparr[8];

// Record for passing global data between Deriv and the calling program
struct AuxParam {
    double  Mjd_UTC;
    double  Area_drag, Area_solar, mass, CR, CD;
    int     n, m;
    bool    Sun, Moon, SRad, Drag, SolidEarthTides, OceanTides, Relativity;
};

// Accel 函数定义
Vector Accel(double Mjd_UTC, const Vector& r, const Vector& v, double Area_drag,
    double Area_solar, double mass, double CR, double CD, int n, int m,
    bool FlagSun, bool FlagMoon, bool FlagSRad, bool FlagDrag, bool
    FlagSolidEarthTides, bool FlagOceanTides, bool FlagRelativity)
{
    double Mjd_UT1, Mjd_TT, jd, mfme;
    double T1;     // Julian cent. since J2000
    Vector a(3), r_Sun(3), r_Moon(3);
    Matrix P(3, 3), N(3, 3), T(3, 3), E(3, 3);
    char interp = 'l';

    jd = Mjd_UTC + 2400000.5;
    mfme = 1440.0 * (Mjd_UTC - floor(Mjd_UTC));
    findeopparam(jd, mfme, interp, eoparr, jdeopstart, dut1, dat, lod, xp, yp,
        ddpsi, ddeps, dx, dy, x, y, s, deltapsi, deltaeps);
    IERS::Set(dut1, -dat, xp, yp);
    Mjd_UT1 = Mjd_UTC + IERS::UT1_UTC(Mjd_UTC) / 86400.0;
    Mjd_TT = Mjd_UTC + IERS::TT_UTC(Mjd_UTC) / 86400.0;

    P = PrecMatrix(MJD_J2000, Mjd_TT);
    N = NutMatrix(Mjd_TT);
    T = N * P;
    E = PoleMatrix(Mjd_UTC) * GHAMatrix(Mjd_UT1, Mjd_TT) * T;

    T1 = (Mjd_TT - MJD_J2000) / 36525.0;
    r_Sun = AU * Transp(EclMatrix(Mjd_TT) * P) * SunPos(T1);
    r_Moon = Transp(EclMatrix(Mjd_TT) * P) * MoonPos(T1);

    // Acceleration due to harmonic gravity field
    if (FlagSolidEarthTides || FlagOceanTides) {
        a = AccelHarmonic_AnelasticEarth(Mjd_UTC, r, r_Sun, r_Moon, E, GM_ref, R_ref, cnm, snm,
            n, m, xp, yp, FlagSolidEarthTides, FlagOceanTides);
    }
    else { a = AccelHarmonic(r, E, GM_ref, R_ref, cnm, snm, n, m); }

    // Luni-solar perturbations
    if (FlagSun)  a += AccelPointMass(r, r_Sun, GM_Sun);
    if (FlagMoon) a += AccelPointMass(r, r_Moon, GM_Moon);

    // Solar radiation pressure
    if (FlagSRad) a += AccelSolrad(r, r_Sun, Area_solar, mass, CR, P_Sol, AU);

    // Atmospheric drag
    if (FlagDrag) a += AccelDrag(Mjd_UTC, r, v, T, E, Area_drag, mass, CD);

    // Relativistic Effects
    if (FlagRelativity) a += Relativity(r, v);

    // Acceleration
    return a;
}

// Deriv 函数定义
void Deriv(double t, const Vector& y, Vector& yp, void* pAux)
{
    // Pointer to auxiliary data record
    AuxParam* p = static_cast<AuxParam*>(pAux);

    // Time
    double  Mjd_UTC = (*p).Mjd_UTC + t / 86400.0;

    // State vector components
    Vector r = y.slice(0, 2);
    Vector v = y.slice(3, 5);

    // Acceleration
    Vector a(3);

    a = Accel(Mjd_UTC, r, v, (*p).Area_drag, (*p).Area_solar, (*p).mass, (*p).CR, (*p).CD,
        (*p).n, (*p).m, (*p).Sun, (*p).Moon, (*p).SRad, (*p).Drag, (*p).SolidEarthTides,
        (*p).OceanTides, (*p).Relativity);

    // State vector derivative
    yp = Stack(v, a);
};

// Ephemeris 函数定义
void Ephemeris(const Vector& Y0, int N_Step, double Step, AuxParam p, vector<Vector>& Eph)
{
    double t = 0.0;  // 初始时间
    RK4       Orbit(Deriv, 6, &p);      // 创建 RK4 对象
    Vector    Y = Y0;

    Eph.resize(N_Step + 1);
    // 进行轨道外推
    for (int i = 0; i <= N_Step; i++) {
        // 将当前状态保存到 Eph 数组中
        Eph[i] = Y;

        // 执行 RK4 积分步骤
        Orbit.Step(t, Y, Step);
    }
}

// 处理单个卫星数据的线程函数
void processSatellite(const string& satelliteId, const Vector& Y0, double Mjd_UTC, double Step, int N_Step, AuxParam Aux) {
    vector<Vector> Eph(N_Step + 1);
    Aux.Mjd_UTC = Mjd_UTC; // 为每个卫星设置独立的初始时间
    Ephemeris(Y0, N_Step, Step, Aux, Eph);

    FILE* f2;
    string f2_filePath = "D:\\HPOP_code\\HPOP_RK4\\beidou_output\\" + satelliteId + "_J2000.txt";

    if ((f2 = fopen(f2_filePath.c_str(), "w+")) == NULL) {
        fprintf(stdin, "Can't open \"words\" file.\n");
        return;
    }

    int Year, Month, Day, Hour, Min;
    double Sec;
    for (int i = 0; i <= N_Step; i += 1) {
        Vector Y = Eph[i];
        CalDat((Mjd_UTC + (Step * i) / 86400.0), Year, Month, Day, Hour, Min, Sec);

        fprintf(f2, "%4d/%02d/%02d-", Year, Month, Day);
        fprintf(f2, "%02d:%02d:%06.3f\t", Hour, Min, Sec);

        for (int j = 0; j < 3; j++) {
            fprintf(f2, "%20.6f\t", Y(j));
        }
        for (int j = 3; j < 6; j++) {
            fprintf(f2, "%20.6f\t", Y(j));
        }
        fprintf(f2, "\n");
    }
    fclose(f2);
}

// 线程池类
class ThreadPool {
private:
    std::vector<std::thread> workers;       // 工作线程
    std::queue<std::function<void()>> tasks; // 任务队列
    std::mutex mtx;                         // 互斥锁
    std::condition_variable cv;              // 条件变量
    bool stop = false;                      // 停止标志

    // 工作线程函数：从队列中取任务并执行
    void workerThread() {
        while (true) {
            std::function<void()> task;
            {
                std::unique_lock<std::mutex> lock(mtx);
                cv.wait(lock, [this]() { return stop || !tasks.empty(); }); // 等待任务或停止信号
                if (stop && tasks.empty()) return; // 退出条件
                task = std::move(tasks.front());   // 取出任务
                tasks.pop();
            }
            task(); // 执行任务
        }
    }

public:
    // 构造函数：创建指定数量的工作线程（默认使用 CPU 核数）
    explicit ThreadPool(size_t numThreads = std::thread::hardware_concurrency()) {
        for (size_t i = 0; i < numThreads; ++i) {
            workers.emplace_back(&ThreadPool::workerThread, this);
        }
    }

    // 析构函数：等待所有任务完成并销毁线程
    ~ThreadPool() {
        {
            std::unique_lock<std::mutex> lock(mtx);
            stop = true; // 标记停止
        }
        cv.notify_all(); // 唤醒所有线程
        for (std::thread& worker : workers) {
            if (worker.joinable()) worker.join(); // 等待线程结束
        }
    }

    // 提交任务到队列
    template <typename F>
    void enqueue(F&& func) {
        {
            std::unique_lock<std::mutex> lock(mtx);
            tasks.emplace(std::forward<F>(func)); // 包装任务
        }
        cv.notify_one(); // 唤醒一个等待线程
    }
};

int main() {

    cout << "\n      High Precision Orbit Propagator     \n" << endl;
    cout << "      Developed by Meysam Mahooti (2024-12-05)     \n" << endl;

    clock_t start, end;
    start = clock();

    // Variables
    double    Mjd_UTC;
    Vector    Kep(6);
    AuxParam  Aux;     // Auxiliary parameters

    // 读取引力系数
    ifstream inp;
    inp.open("D:\\HPOP_code\\HPOP_RK4\\GGM03C.txt");
    int z = 0, n = 360;
    double temp;
    int Year, Month, Day, Hour, Min;
    double Sec;

    do {
        for (int x = 0; x <= z; x++) {
            inp >> temp;
            inp >> temp;
            inp >> temp;
            cnm(z, x) = temp;
            inp >> temp;
            snm(z, x) = temp;
            inp >> temp;
            inp >> temp;
        }
        z++;
    } while (z <= n);
    inp.close();

    // 初始化 eop 和 spw 数据
    initeop(eoparr, jdeopstart);
    initspw(spwarr, jdspwstart);

    // 打开卫星初始状态文件
    FILE* f1;
    f1 = fopen("D:\\sat_init_txt\\BEIDOU_J2000_InitState.txt", "r");

    double Step = 30.0; // [s]
    const int N_Step = 2 * 60 * 24 * 7;

    char satelliteIdBuffer[100];  // 临时字符数组用于接收 fscanf 的输入
    string satelliteId;

    // 设置辅助参数（循环外）
    Aux.Area_drag = 55.64;  // [m^2]
    Aux.Area_solar = 88.4;   // [m^2]
    Aux.mass = 8000.0; // [kg]
    Aux.CR = 1.0;
    Aux.CD = 2.7;
    Aux.n = 0;
    Aux.m = 0;
    Aux.Sun = false;
    Aux.Moon = false;
    Aux.SRad = false;
    Aux.Drag = false;
    Aux.SolidEarthTides = false;
    Aux.OceanTides = false;
    Aux.Relativity = false;

    // 创建线程池
    ThreadPool pool;

    // 循环读取每个卫星的信息
    while (fscanf(f1, "%99s", satelliteIdBuffer) == 1) {
        satelliteId = satelliteIdBuffer;  // 将字符数组转换为 std::string

        // 读取卫星的初始位置和速度
        Vector    Y0(6);
        for (int j = 0; j < 6; j++) {
            fscanf(f1, "%lf\n", &Y0(j));
        }

        Y0 = Y0 * 1000;

        // 读取初始时间
        fscanf(f1, "%d/%d/%d-%d:%d:%lf\n", &Year, &Month, &Day, &Hour, &Min, &Sec);
        Mjd_UTC = Mjd(Year, Month, Day, Hour, Min, Sec);

        // 提交任务到线程池
        pool.enqueue([satelliteId, Y0, Mjd_UTC, Step, N_Step, Aux]() {
            processSatellite(satelliteId, Y0, Mjd_UTC, Step, N_Step, Aux);
            });
    }
    fclose(f1);

    // 线程池析构时会自动等待所有任务完成
    end = clock();
    printf("\n     elapsed time: %f seconds\n", (end - start) / CLK_TCK);
    printf("\n     press any key \n");

    return 0;
}