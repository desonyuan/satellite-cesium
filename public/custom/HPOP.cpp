//------------------------------------------------------------------------------
//
// High Precision Orbit Propagator
//
//
// Last modified:
//
//   2000/03/04  OMO  Final version (1st edition)
//   2005/04/14  OMO  Final version (2nd reprint)
//
// (c) 1999-2024  O. Montenbruck, E. Gill, Meysam Mahooti, and David A. Vallado
//
//------------------------------------------------------------------------------

#include <iostream>
#include <iomanip>
#include <cmath>
#include <fstream>
#include <ctime>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <functional>
#include <chrono>

#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#include <sys/stat.h>
#endif

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
#include "dop_module.h"
#include "walker_constellation.h"

using namespace std;

//------------------------------------------------------------------------------
//
// Global types and data
//
//------------------------------------------------------------------------------
Matrix cnm(361,361),snm(361,361);
const double R_ref = 6378.1363e3;   // Earth's radius [m]; GGM03C
const double GM_ref =398600.4415e9; // [m^3/s^2]; GGM03C
eopdata eoparr[eopsize];
spwdata spwarr[spwsize];
int dat;
double jdeopstart,dut1,lod,xp,yp,ddpsi,ddeps,dx,dy,x,y,s,deltapsi,deltaeps;
double jdspwstart,f107a,f107,f107bar,ap,avgap,kp,sumkp,aparr[8],kparr[8];

// Record for passing global data between Deriv and the calling program
struct AuxParam {
  double  Mjd_UTC;
  double  Area_drag,Area_solar,mass,CR,CD;
  int     n,m;
  bool    Sun,Moon,SRad,Drag,SolidEarthTides,OceanTides,Relativity;
};

//------------------------------------------------------------------------------
//
// Accel
//
// Purpose:
//
//   Computes the acceleration of an Earth orbiting satellite due to
//    - the Earth's harmonic gravity field,
//    - the gravitational perturbations of the Sun and Moon
//    - the solar radiation pressure and
//    - the atmospheric drag
//
// Input/Output:
//
//   Mjd_UTC     Modified Julian Date (UTC)
//   r           Satellite position vector in the ICRF/EME2000 system
//   v           Satellite velocity vector in the ICRF/EME2000 system
//   Area_drag   Cross-section
//   Area_solar  Cross-section
//   mass        Spacecraft mass
//   CR          Radiation pressure coefficient
//   CD          Drag coefficient
//   n           Maximum degree
//   m           Maximum order (m_max<=n_max; m_max=0 for zonals, only)
//   <return>    Acceleration (a=d^2r/dt^2) in the ICRF/EME2000 system
//
//------------------------------------------------------------------------------
Vector Accel(double Mjd_UTC, const Vector& r, const Vector& v, double Area_drag,
             double Area_solar,double mass, double CR, double CD, int n, int m,
             bool FlagSun, bool FlagMoon, bool FlagSRad, bool FlagDrag, bool
             FlagSolidEarthTides, bool FlagOceanTides, bool FlagRelativity)
{
  double Mjd_UT1, Mjd_TT, jd, mfme;
  double T1;     // Julian cent. since J2000
  Vector a(3), r_Sun(3), r_Moon(3);
  Matrix P(3,3),N(3,3), T(3,3), E(3,3);
  char interp = 'l';

  jd = Mjd_UTC + 2400000.5;
  mfme = 1440.0*(Mjd_UTC - floor(Mjd_UTC));
  findeopparam(jd, mfme, interp, eoparr, jdeopstart, dut1, dat, lod, xp, yp,
               ddpsi, ddeps, dx, dy, x, y, s, deltapsi, deltaeps);
  IERS::Set(dut1, -dat, xp, yp);
  Mjd_UT1 = Mjd_UTC + IERS::UT1_UTC(Mjd_UTC)/86400.0;
  Mjd_TT = Mjd_UTC + IERS::TT_UTC(Mjd_UTC)/86400.0;

  P = PrecMatrix(MJD_J2000,Mjd_TT);
  N = NutMatrix(Mjd_TT);
  T = N*P;
  E = PoleMatrix(Mjd_UTC) * GHAMatrix(Mjd_UT1,Mjd_TT) * T;

  T1   = (Mjd_TT-MJD_J2000)/36525.0;
  r_Sun  = AU*Transp(EclMatrix(Mjd_TT)*P)*SunPos(T1);
  r_Moon = Transp(EclMatrix(Mjd_TT)*P)*MoonPos(T1);

  // Acceleration due to harmonic gravity field
  if (FlagSolidEarthTides || FlagOceanTides){
  a = AccelHarmonic_AnelasticEarth(Mjd_UTC, r, r_Sun, r_Moon, E, GM_ref, R_ref, cnm, snm,
                                   n, m, xp, yp, FlagSolidEarthTides, FlagOceanTides);
  }else{ a = AccelHarmonic(r, E, GM_ref, R_ref, cnm, snm, n, m); }

  // Luni-solar perturbations
  if (FlagSun)  a += AccelPointMass(r, r_Sun,  GM_Sun );
  if (FlagMoon) a += AccelPointMass(r, r_Moon, GM_Moon);

  // Solar radiation pressure
  if (FlagSRad) a += AccelSolrad(r, r_Sun, Area_solar, mass, CR, P_Sol, AU);

  // Atmospheric drag
  if (FlagDrag) a += AccelDrag(Mjd_UTC, r, v, T, E, Area_drag, mass, CD);

  // Relativistic Effects
  if (FlagRelativity) a += Relativity(r,v);

  // Acceleration
  return a;
}

//------------------------------------------------------------------------------
//
// Deriv
//
// Purpose:
//
//   Computes the derivative of the state vector
//
// Note:
//
//   pAux is expected to point to a variable of type AuxDataRecord, which is
//   used to communicate with the other program sections and to hold data
//   between subsequent calls of this function
//
//------------------------------------------------------------------------------
void Deriv(double t, const Vector& y, Vector& yp, void* pAux)
{
  // Pointer to auxiliary data record
  AuxParam* p = static_cast<AuxParam*>(pAux);

  // Time
  double  Mjd_UTC = (*p).Mjd_UTC + t/86400.0;

  // State vector components
  Vector r = y.slice(0,2);
  Vector v = y.slice(3,5);

  // Acceleration
  Vector a(3);

  a = Accel(Mjd_UTC, r, v, (*p).Area_drag, (*p).Area_solar, (*p).mass, (*p).CR, (*p).CD,
            (*p).n, (*p).m, (*p).Sun, (*p).Moon, (*p).SRad, (*p).Drag, (*p).SolidEarthTides,
            (*p).OceanTides, (*p).Relativity);

  // State vector derivative
  yp = Stack(v, a);
};

void Ephemeris(const Vector& Y0, int N_Step, double Step, AuxParam p, Vector Eph[])
{
    int       i;
    double    t = 0.0;
    RK4       Orbit(Deriv,6,&p);
    Vector    Y(6);

    Y = Y0;
    for (i = 0; i <= N_Step; i++) {
        Eph[i] = Y;
        Orbit.Step(t, Y, Step);
    }
}

//------------------------------------------------------------------------------
//
// Main program
//
//------------------------------------------------------------------------------
int main(int argc, char* argv[]) {
    // Get executable directory
    string exeDir;
#ifdef _WIN32
    char path[MAX_PATH];
    GetModuleFileNameA(NULL, path, MAX_PATH);
    exeDir = string(path);
    exeDir = exeDir.substr(0, exeDir.find_last_of("\\/"));
#else
    char path[PATH_MAX];
    ssize_t count = readlink("/proc/self/exe", path, PATH_MAX);
    exeDir = string(path, (count > 0) ? count : 0);
    exeDir = exeDir.substr(0, exeDir.find_last_of("\\/"));
#endif

    if (argc < 3) {
        std::cerr << "Usage: " << argv[0] << " <function> (e.g., orbit_cal or dop_cal)" << std::endl;
        return 1;
    }

    cout<<"\n      High Precision Orbit Propagator     \n"<<endl;
    cout<<"      Developed by Meysam Mahooti (2024-12-05)     \n"<<endl;

    double    Mjd_UTC;
    Vector    Kep(6);
    AuxParam  Aux;

    // Input files - relative to executable
    string ggmPath = exeDir + "/../GGM03C.txt";
    ifstream inp(ggmPath.c_str());
    if (!inp.is_open()) {
        cerr << "Error: Could not open GGM03C.txt at " << ggmPath << endl;
        return 1;
    }

    int z=0, n=360;
    double temp;
    int Year, Month, Day, Hour, Min;
    double Sec;

    do {
        for(int x=0;x<=z;x++) {
            inp >> temp;
            inp >> temp;
            inp >> temp;
            cnm(z,x) = temp;
            inp >> temp;
            snm(z,x) = temp;
            inp >> temp;
            inp >> temp;
        }
        z++;
    } while(z<=n);
    inp.close();

    initeop(eoparr,jdeopstart);
    initspw(spwarr,jdspwstart);

    string moduel_name = argv[1];
    if (moduel_name == "scene_edit"){
        string type = argv[2];

        // clock_t start, end;
        // start = clock();

        // Variables
        Aux.Mjd_UTC = Mjd_UTC;
        Aux.Area_drag  = 55.64;
        Aux.Area_solar = 88.4;
        Aux.mass       = 8000.0;
        Aux.CR         = 1.0;
        Aux.CD         = 2.7;
        Aux.n          = 0;
        Aux.m          = 0;
        Aux.Sun        = false;
        Aux.Moon       = false;
        Aux.SRad       = false;
        Aux.Drag       = false;
        Aux.SolidEarthTides = false;
        Aux.OceanTides = false;
        Aux.Relativity = false;

        double Step = 30.0;
        // const int N_Step = 2*60*24;
        const int N_Step = 2*30;

        // Input file paths - relative to executable
        string initDir = exeDir + "/../sat_init_txt/";
        string f1_path;
        if (type == "BEIDOU"){
            f1_path = initDir + "BEIDOU_J2000_InitState.txt";
        }
        else if(type == "GPS"){
            f1_path = initDir + "GPS_J2000_InitState.txt";
        }
        else if(type == "GLONASS"){
            f1_path = initDir + "GLONASS_J2000_InitState.txt";
        }
        else if(type == "GALILEO"){
            f1_path = initDir + "Galileo_J2000_InitState.txt";
        }
        else if(type == "Walker"){
            if (argc < 11) {
                std::cerr << "Error: Walker parameters are not enough\n";
                return 1;
            }
            OrbitalElements seed;
            seed.a = atof(argv[3]);
            seed.e = atof(argv[4]);
            seed.i = atof(argv[4]);
            seed.Omega = atof(argv[6]);
            seed.omega = atof(argv[7]);
            seed.nu = atof(argv[8]);//真近点角

            int T = atoi(argv[9]);
            int S = atoi(argv[10]);
            int F = atoi(argv[11]);

            string walkerPath = initDir + "Walker_J2000_InitState.txt";
            generateWalkerConstellationAndWriteRV(seed, T, S, F, walkerPath);
            f1_path = walkerPath;
        }

        // Read initial state
        FILE *f1 = fopen(f1_path.c_str(), "r");
        if (!f1) {
            cerr << "Error: Could not open initial state file at " << f1_path << endl;
            return 1;
        }

        fscanf(f1,"%d/%d/%d-%d:%d:%lf\n", &Year, &Month, &Day, &Hour, &Min, &Sec);
        // fscanf(f1,"%d %d %d %d:%d:%lf\n", &Day, &Month, &Year, &Hour, &Min, &Sec);
        Mjd_UTC = Mjd(Year, Month, Day, Hour, Min, Sec);
        ostringstream epoch_block;
        epoch_block << " \"epoch\": \"" << Year << "-" << setfill('0') << setw(2) << Month
                    << "-" << setw(2) << Day << " " << setw(2) << Hour << ":"
                    << setw(2) << Min << ":" << fixed << setprecision(0) << Sec << "Z\",\n";

        char satelliteIdBuffer[100];
        string satelliteId;
        Vector Eph [N_Step+1];

        // Output JSON file
        string jsonPath = exeDir + "/" + type + "All_J2000_Ephemeris.json";
        ofstream jsonOut(jsonPath.c_str());
        if (!jsonOut.is_open()) {
            cerr << "Error: Could not create JSON output file at " << jsonPath << endl;
            return 1;
        }

        jsonOut << "{\n";
        bool firstSat = true;

        int num_sats = 0;
        while (fscanf(f1, "%99s", satelliteIdBuffer) == 1) {
            num_sats = num_sats + 1;
            satelliteId = satelliteIdBuffer;

            Vector Y0(6),Y(6);
            for(int j=0;j<6;j++) {
                fscanf(f1,"%lf\n", &Y0(j));
            }

            Y0 = Y0 * 1000;
            Ephemeris(Y0, N_Step, Step, Aux, Eph);

            if (!firstSat) jsonOut << ",\n";
            firstSat = false;

            jsonOut << "  \"" << satelliteId << "\": {\n";
            jsonOut << epoch_block.str();
            jsonOut << "    \"cartesian\": [\n";

            for (int i = 0; i <= N_Step; i += 1) {
                Vector Y = Eph[i];
                int t_sec = i * Step;
                jsonOut << "      [" << t_sec << ", " << fixed << setprecision(8)
                        << Y(0) << ", " << Y(1) << ", " << Y(2) << ", " << Y(3) << ", " << Y(4) << ", " << Y(5) << "]";
                if (i != N_Step) jsonOut << ",";
                jsonOut << "\n";
            }
            jsonOut << "    ]\n  }";

            // Create output subdirectory
            string ecefDir = exeDir + "/" + type + "_ecef";
    #ifdef _WIN32
            CreateDirectoryA(ecefDir.c_str(), NULL);
    #else
            mkdir(ecefDir.c_str(), 0777);
    #endif

            // Output ECEF file
            string ecefFilePath = ecefDir + "/" + satelliteId + "_ECEF.txt";
            FILE *f3 = fopen(ecefFilePath.c_str(), "w+");
            if (!f3) {
                cerr << "Error: Could not create ECEF output file at " << ecefFilePath << endl;
                continue;
            }

            for (int i = 0; i <= N_Step; i += 1) {
                Vector Y = Eph[i];
                CalDat((Mjd_UTC + (Step * i) / 86400.0), Year, Month, Day, Hour, Min, Sec);

                fprintf(f3,"%4d-%02d-%02d ",Year,Month,Day);
                fprintf(f3,"%02d:%02d:%06.3f\t",Hour,Min,Sec);

                Y = ECI2ECEF((Mjd_UTC+(Step*i)/86400.0), Y);
                for(int j = 0; j < 3; j++) {
                    fprintf(f3,"%20.6f\t",Y(j));
                }
                for(int j = 3; j < 6; j++) {
                    fprintf(f3,"%20.6f\t",Y(j));
                }
                fprintf(f3,"\n");
            }
            fclose(f3);
        }
        fclose(f1);
        jsonOut << "\n}\n";
        jsonOut.close();

        printf("\n  All J2000 ephemerides saved as JSON.\n");
        // end = clock();
        // printf("\n     elapsed time: %f seconds\n", (end - start) / CLK_TCK);

        // DOP calculation
        string ecefDir = exeDir + "/" + type + "_ecef";
        auto sat_positions = LoadAllSatellites(num_sats, N_Step, ecefDir + "/");

        double lat_start = -90.0, lat_end = 90.0, lat_step = 10.0;
        double lon_start = -180.0, lon_end = 180.0, lon_step = 10.0;
        double alt_km = 0.0;

        const int NUM_Step = 2;

        ComputeGridPDOP(sat_positions, NUM_Step,
            lat_start, lat_end, lat_step,
            lon_start, lon_end, lon_step,
            type, alt_km);
    }

    else if (moduel_name == "Perturbation_force") {
        if (argc < 16) {
            cerr << "Usage: " << argv[0]
                << " Perturbation_force YYYY MM DD HH mm SS a e i Omega omega nu n m Area_drag mass CD CR Area_solar"
                << endl;
            return 1;
        }

        // ===== 1. 读取时间参数 =====
        int Year = atoi(argv[2]);
        int Month = atoi(argv[3]);
        int Day = atoi(argv[4]);
        int Hour = atoi(argv[5]);
        int Min = atoi(argv[6]);
        double Sec = atof(argv[7]);
        Mjd_UTC = Mjd(Year, Month, Day, Hour, Min, Sec);
        Aux.Mjd_UTC = Mjd_UTC;

        // ===== 2. 读取轨道六要素 =====
        OrbitalElements orbit;
        orbit.a = atof(argv[8]);     // km
        orbit.e = atof(argv[9]);
        orbit.i = atof(argv[10]);    // deg
        orbit.Omega = atof(argv[11]); // deg
        orbit.omega = atof(argv[12]); // deg
        orbit.nu = atof(argv[13]);    // deg 真近点角

        std::array<double, 6> rv = orbitalElementsToRV(orbit);

        Vector Y0(6),Y(6);
        for (int j = 0; j < 6; ++j) {
            Y0(j) = rv[j] * 1000.0;  // km → m, km/s → m/s
        }

        // ===== 3. 读取摄动力相关参数 =====
        Aux.n = atoi(argv[14]);
        Aux.m = atoi(argv[15]);
        Aux.Area_drag = atof(argv[16]);    // 单位 m²
        Aux.mass = atof(argv[17]);         // 单位 kg
        Aux.CD = atof(argv[18]);
        Aux.CR = atof(argv[19]);
        Aux.Area_solar = atof(argv[20]);

        // ===== 4. 设置摄动力开关 =====
        Aux.Sun        = false;
        Aux.Moon       = false;
        Aux.SRad       = true;
        Aux.Drag       = true;
        Aux.SolidEarthTides = false;
        Aux.OceanTides = false;
        Aux.Relativity = false;

        // ===== 5. 可进行摄动力判断/轨道外推后续逻辑 =====
        double Step = 30.0;
        const int N_Step = 2;
        // const int N_Step = 2*60*24;
        ostringstream epoch_block;
        epoch_block << " \"epoch\": \"" << Year << "-" << setfill('0') << setw(2) << Month
                    << "-" << setw(2) << Day << " " << setw(2) << Hour << ":"
                    << setw(2) << Min << ":" << fixed << setprecision(0) << Sec << "Z\",\n";
        Vector Eph [N_Step+1];

        // Output JSON file
        string jsonPath = exeDir + "/" + "Perturbation_force" + "All_J2000_Ephemeris.json";
        ofstream jsonOut(jsonPath.c_str());
        if (!jsonOut.is_open()) {
            cerr << "Error: Could not create JSON output file at " << jsonPath << endl;
            return 1;
        }

        jsonOut << "{\n";
        bool firstSat = true;

        Ephemeris(Y0, N_Step, Step, Aux, Eph);

        if (!firstSat) jsonOut << ",\n";
        firstSat = false;

        jsonOut << epoch_block.str();
        jsonOut << "    \"cartesian\": [\n";

        for (int i = 0; i <= N_Step; i += 1) {
            Vector Y = Eph[i];
            int t_sec = i * Step;
            jsonOut << "      [" << t_sec << ", " << fixed << setprecision(8)
                    << Y(0) << ", " << Y(1) << ", " << Y(2) << "]";
            if (i != N_Step) jsonOut << ",";
            jsonOut << "\n";
        }
        jsonOut << "    ]\n  }";
        jsonOut << "\n}\n";
        jsonOut.close();

        printf("\n  All J2000 ephemerides saved as JSON.\n");
    }
    printf("\n     press any key \n");
    return 0;
}