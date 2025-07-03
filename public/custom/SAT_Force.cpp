//------------------------------------------------------------------------------
//
// SAT_Force.cpp
// 
// Purpose:
//
//    Force model for Earth orbiting satellites
//
// Last modified:
//
//   2000/03/04  OMO  Final version (1st edition)
//   2005/04/14  OMO  Final version (2nd reprint)
//
// (c) 1999-2024  O. Montenbruck, E. Gill, and Meysam Mahooti
//
//------------------------------------------------------------------------------

// #include <iostream.h>
#include <iostream> // 替换 <iostream.h>
#include <conio.h>
// #include <iomanip.h>
#include <iomanip>  // 替换 <iomanip.h>
#include <math.h>

#include "SAT_Const.h"
#include "SAT_Force.h"
#include "SAT_Time.h"
#include "SAT_RefSys.h"
#include "SAT_VecMat.h"
#include "nrlmsise-00.h"
#include "eopspw.h"

using namespace std;

extern spwdata spwarr[spwsize];
extern double jdspwstart,f107a,f107,f107bar,ap,avgap,kp,sumkp,aparr[8],kparr[8];

// Local funtions
namespace
{
  // Fractional part of a number (y=x-[x])
  double Frac (double x) { return x-floor(x); };
  // Modulo: calculates x mod y
  double Modulo (double x, double y){ return y*Frac(x/y); };

}

//--------------------------------------------------------------------------
// Inputs:
// n         maximum degree
// m         maximum order
// fi        angle [rad]
//
// Outputs:
// pnm       normalized Legendre polynomial values
//
//--------------------------------------------------------------------------
Matrix Legendre(int n,int m,double fi)
{
Matrix pnm(n+1,m+1);

pnm(0,0)=1.0;
if (n > 1 && m > 1) {
       pnm(1,1)=sqrt(3.0)*cos(fi);
}
// diagonal coefficients
double s,h;
for (int i=2; i<=n; i++)
{
     s = i;
     pnm(i,i)= sqrt((2*s+1)/(2*s))*cos(fi)*pnm(i-1,i-1);
}
// horizontal first step coefficients
for (int i=1; i<=n; i++)
{
     s = i;
     pnm(i,i-1)= sqrt(2*s+1)*sin(fi)*pnm(i-1,i-1);
}
// horizontal second step coefficients
int j=0, k=2;
do
{
   for (int i=k; i<=n; i++)
  {
      s = i;
      h = j;
      pnm(i,j)=sqrt((2*s+1)/((s-h)*(s+h)))*(sqrt(2*s-1)*sin(fi)*pnm(i-1,j)
              -sqrt(((s+h-1)*(s-h-1))/(2*s-3))*pnm(i-2,j));
  }
   j = j+1;
   k = k+1;
} while(j<=m);

return pnm;
}

//--------------------------------------------------------------------------
// Inputs:
// n         maximum degree
// m         maximum order
// fi        angle [rad]
//
// Output:
// dpnm      normalized Legendre polynomial first derivative values
//
//--------------------------------------------------------------------------
Matrix LegendreP(int n,int m,double fi)
{
Matrix pnm(n+1,m+1),dpnm(n+1,m+1);

pnm(0,0)=1.0;
dpnm(0,0)=0.0;
if (n > 1 && m > 1) {
       pnm(1,1)=sqrt(3.0)*cos(fi);
       dpnm(1,1)=-sqrt(3.0)*sin(fi);
}
// pnm(1,1)=sqrt(3.0)*cos(fi);
// dpnm(1,1)=-sqrt(3.0)*sin(fi);
// diagonal coefficients
double s,h;
for (int i=2; i<=n; i++)
{
  s = i;
  pnm(i,i)= sqrt((2*s+1)/(2*s))*cos(fi)*pnm(i-1,i-1);
  dpnm(i,i)= sqrt((2*s+1)/(2*s))*(cos(fi)*dpnm(i-1,i-1)-sin(fi)*pnm(i-1,i-1));
}
// horizontal first step coefficients
for (int i=1; i<=n; i++)
{
    s = i;
    pnm(i,i-1)= sqrt(2*s+1)*sin(fi)*pnm(i-1,i-1);
    dpnm(i,i-1)= sqrt(2*s+1)*((cos(fi)*pnm(i-1,i-1))+(sin(fi)*dpnm(i-1,i-1)));
}
// horizontal second step coefficients
int j=0, k=2;

do
{
    for (int i=k; i<=n; i++)
   {
        s = i;
        h = j;
        pnm(i,j)=sqrt((2*s+1)/((s-h)*(s+h)))*(sqrt(2*s-1)*sin(fi)*pnm(i-1,j)
                -sqrt(((s+h-1)*(s-h-1))/(2*s-3))*pnm(i-2,j));
        dpnm(i,j)=sqrt((2*s+1)/((s-h)*(s+h)))*((sqrt(2*s-1)*sin(fi)*dpnm(i-1,j))
                 +sqrt(2*s-1)*cos(fi)*pnm(i-1,j)-sqrt(((s+h-1)*(s-h-1))/(2*s-3))*dpnm(i-2,j));
   }
    j = j+1;
    k = k+1;
} while (j<=m);

return dpnm;
}

//------------------------------------------------------------------------------
//
// AccelHarmonic
//
// Purpose:
//
//   Computes the acceleration due to the harmonic gravity field of the 
//   central body
//
// Input/Output:
//
//   r           Satellite position vector in the inertial system
//   E           Transformation matrix to body-fixed system
//   GM          Gravitational coefficient
//   R_ref       Reference radius 
//   cnm,snm     Spherical harmonics coefficients (normalized)
//   n_max       Maximum degree 
//   m_max       Maximum order (m_max<=n_max; m_max=0 for zonals, only)
//   <return>    Acceleration (a=d^2r/dt^2)
//
//------------------------------------------------------------------------------
Vector AccelHarmonic (const Vector& r, const Matrix& E, double GM, double R_ref,
                      const Matrix& cnm, const Matrix& snm, int n_max, int m_max )
{
  // Local variables
  double  d, rho, Fac;                   // Auxiliary quantities
  double  ax,ay,az;                      // Acceleration vector
  Vector  r_bf(3);                       // Body-fixed position
  Vector  a_bf(3);                       // Body-fixed acceleration
  Matrix pnm(n_max+1,n_max+1),dpnm(n_max+1,n_max+1); // Legendre polynomials
  double latgc,lon;                      // Geocentric latitude and longitude
  double dUdr,dUdlatgc,dUdlon;
  double q1,q2,q3,b1,b2,b3,r2xy;
  double nd;

  // Body-fixed position
  r_bf = E * r;

  // Auxiliary quantities
  d = Norm(r_bf);          // distance
  latgc = asin(r_bf(2)/d);
  lon = atan2(r_bf(1),r_bf(0));
  pnm = Legendre(n_max,n_max,latgc);
  dpnm = LegendreP(n_max,n_max,latgc);

  dUdr = 0;
  dUdlatgc = 0;
  dUdlon = 0;
  q3 = 0; q2 = q3; q1 = q2;
  for (int n=0;n<=n_max; n++)
 {
  nd = n;
  b1 = (-GM/pow(d,2.0))*pow((R_ref/d),nd)*(n+1);
  b2 =  (GM/d)*pow((R_ref/d),nd);
  b3 =  (GM/d)*pow((R_ref/d),nd);
     for (int m=0;m<=m_max;m++)
    {
     q1 = q1 + pnm(n,m)*(cnm(n,m)*cos(m*lon)+snm(n,m)*sin(m*lon));
     q2 = q2 + dpnm(n,m)*(cnm(n,m)*cos(m*lon)+snm(n,m)*sin(m*lon));
     q3 = q3 + m*pnm(n,m)*(snm(n,m)*cos(m*lon)-cnm(n,m)*sin(m*lon));
    }
  dUdr     = dUdr     + q1*b1;
  dUdlatgc = dUdlatgc + q2*b2;
  dUdlon   = dUdlon   + q3*b3;
  q3 = 0; q2 = q3; q1 = q2;
  }

  // Body-fixed acceleration
  r2xy = pow(r_bf(0),2.0)+pow(r_bf(1),2.0);

  ax = (1.0/d*dUdr-r_bf(2)/(pow(d,2.0)*sqrt(r2xy))*dUdlatgc)*r_bf(0)-(1/r2xy*dUdlon)*r_bf(1);
  ay = (1.0/d*dUdr-r_bf(2)/(pow(d,2.0)*sqrt(r2xy))*dUdlatgc)*r_bf(1)+(1/r2xy*dUdlon)*r_bf(0);
  az =  1.0/d*dUdr*r_bf(2)+sqrt(r2xy)/pow(d,2.0)*dUdlatgc;

  a_bf(0) = ax;
  a_bf(1) = ay;
  a_bf(2) = az;
  
  // Inertial acceleration
  return  Transp(E)*a_bf;

}

//------------------------------------------------------------------------------
//
// AccelHarmonic_AnelasticEarth
//
// Purpose:
//
//   Computes the acceleration due to the harmonic gravity field of the
//   central body
//
// Input/Output:
//
//   r           Satellite position vector in the inertial system
//   r_Sun       Geocentric equatorial position (in [m]) referred to the
//               mean equator and equinox of J2000 (EME2000, ICRF)
//   r_Moon      Geocentric equatorial position (in [m]) referred to the
//               mean equator and equinox of J2000 (EME2000, ICRF)
//   E           Transformation matrix to body-fixed system
//   GM          Gravitational coefficient
//   R_ref       Reference radius
//   cnm,snm     Spherical harmonics coefficients (normalized)
//   n_max       Maximum degree
//   m_max       Maximum order (m_max<=n_max; m_max=0 for zonals, only)
//   xp          x_pole [arc seconds]
//   yp          y_pole [arc seconds]
//   <return>    Acceleration (a=d^2r/dt^2)
//
//------------------------------------------------------------------------------
Vector AccelHarmonic_AnelasticEarth(double Mjd_UTC, const Vector& r, const Vector& r_Sun,
                     const Vector& r_Moon, const Matrix& E, double GM, double R_ref,
                     const Matrix& cnm, const Matrix& snm, int n_max, int m_max,
                     double xp, double yp, bool SolidEarthTides, bool OceanTides)
{
  // Local variables
  double  ax,ay,az;             // Acceleration vector
  Vector  r_bf(3);              // Body-fixed position
  Vector  a_bf(3);              // Body-fixed acceleration
  Matrix pnm(n_max+1,n_max+1),dpnm(n_max+1,n_max+1); // Legendre polynomials
  Matrix C(361,361),S(361,361);	// Spherical harmonics coefficients (normalized)
  double lM,phiM,rM,lS,phiS,rS,Mjd_UT1,Mjd_TT,T,T2,T3,T4;
  double dCnm20,dCnm21,dSnm21,dCnm22,dSnm22,dCnm30,dCnm31,dSnm31,dCnm32,dSnm32,
  dCnm33,dSnm33,dCnm40,dCnm41,dSnm41,dCnm42,dSnm42,dCnm43,dSnm43,dCnm44,dSnm44,
  dCnm50,dCnm51,dSnm51,dCnm52,dSnm52,dCnm53,dSnm53,dCnm54,dSnm54,dCnm55,dSnm55,
  dCnm60,dCnm61,dSnm61,dCnm62,dSnm62,dCnm63,dSnm63,dCnm64,dSnm64,dCnm65,dSnm65,
  dCnm66,dSnm66;
  double l,lp,F,D,Om;           // Mean arguments of luni-solar motion
  double theta_f,theta_g,dC21,dS21,dC22,dS22,dC20;
  double latgc,lon;             // Geocentric latitude and longitude
  double dUdr,dUdlatgc,dUdlon;
  double d,nd,q1,q2,q3,b1,b2,b3,r2xy;

  C = cnm;
  S = snm;
  
  CalcPolarAngles(lM, phiM, rM, r_Moon);
  CalcPolarAngles(lS, phiS, rS, r_Sun);

  Mjd_UT1 = Mjd_UTC + IERS::UT1_UTC(Mjd_UTC)/86400.0;
  Mjd_TT = Mjd_UTC + IERS::TT_UTC(Mjd_UTC)/86400.0;
  
  T  = (Mjd_TT-MJD_J2000)/36525.0;
  T2 = T*T;
  T3 = T2*T;
  T4 = T3*T;
	
  if (SolidEarthTides)
 {
    Matrix lgM(3,3),lgS(3,3);
    // Effect of Solid Earth Tides (elastic Earth)
    // For dC21 and dS21
    // The coefficients we choose are in-phase(ip) amplitudes and out-of-phase
    // amplitudes of the corrections for frequency dependence, and multipliers
    // of the Delaunay variables Refer to Table 6.5a in IERS2010
    const double coeff0[48][7] =
    {
    //  l   l'  F   D   Om  Amp(R) Amp(I)
      { 2,  0,  2,  0,  2,  -0.1,    0},
      { 0,  0,  2,  2,  2,  -0.1,    0},
      { 1,  0,  2,  0,  1,  -0.1,    0},
      { 1,  0,  2,  0,  2,  -0.7,    0.1},
      {-1,  0,  2,  2,  2,  -0.1,    0},
      { 0,  0,  2,  0,  1,  -1.3,    0.1},
      { 0,  0,  2,  0,  2,  -6.8,    0.6},
      { 0,  0,  0,  2,  0,   0.1,    0},
      { 1,  0,  2, -2,  2,   0.1,    0},
      {-1,  0,  2,  0,  1,   0.1,    0},
      {-1,  0,  2,  0,  2,   0.4,    0},
      { 1,  0,  0,  0,  0,   1.3,   -0.1},
      { 1,  0,  0,  0,  1,   0.3,    0},
      {-1,  0,  0,  2,  0,   0.3,    0},
      {-1,  0,  0,  2,  1,   0.1,    0},
      { 0,  1,  2, -2,  2,  -1.9,    0.1},
      { 0,  0,  2, -2,  1,   0.5,    0},
      { 0,  0,  2, -2,  2,  -43.4,   2.9},
      { 0, -1,  2, -2,  2,   0.6,    0},
      { 0,  1,  0,  0,  0,   1.6,   -0.1},
      {-2,  0,  2,  0,  1,   0.1,    0},
      { 0,  0,  0,  0, -2,   0.1,    0},
      { 0,  0,  0,  0, -1,  -8.8,    0.5},
      { 0,  0,  0,  0,  0,   470.9, -30.2},
      { 0,  0,  0,  0,  1,   68.1,  -4.6},
      { 0,  0,  0,  0,  2,  -1.6,    0.1},
      {-1,  0,  0,  1,  0,   0.1,    0},
      { 0, -1,  0,  0, -1,  -0.1,    0},
      { 0, -1,  0,  0,  0,  -20.6,  -0.3},
      { 0,  1, -2,  2, -2,   0.3,    0},
      { 0, -1,  0,  0,  1,  -0.3,    0},
      {-2,  0,  0,  2,  0,  -0.2,    0},
      {-2,  0,  0,  2,  1,  -0.1,    0},
      { 0,  0, -2,  2, -2,  -5.0,    0.3},
      { 0,  0, -2,  2, -1,   0.2,    0},
      { 0, -1, -2,  2, -2,  -0.2,    0},
      { 1,  0,  0, -2,  0,  -0.5,    0},
      { 1,  0,  0, -2,  1,  -0.1,    0},
      {-1,  0,  0,  0, -1,   0.1,    0},
      {-1,  0,  0,  0,  0,  -2.1,    0.1},
      {-1,  0,  0,  0,  1,  -0.4,    0},
      { 0,  0,  0, -2,  0,  -0.2,    0},
      {-2,  0,  0,  0,  0,  -0.1,    0},
      { 0,  0, -2,  0, -2,  -0.6,    0},
      { 0,  0, -2,  0, -1,  -0.4,    0},
      { 0,  0, -2,  0,  0,  -0.1,    0},
      {-1,  0, -2,  0, -2,  -0.1,    0},
      {-1,  0, -2,  0, -1,  -0.1,    0}
    };
    // For dC20
    // The nominal value k20 for the zonal tides is taken as 0.30190
	// Refer to Table 6.5b in IERS2010
    const double coeff1 [21][7] =
	{
	// l   l'  F   D   Om  Amp(R)  Amp(I)
	 { 0,  0,  0,  0,  1,  16.6,   -6.7},
     { 0,  0,  0,  0,  2,  -0.1,    0.1},
     { 0, -1,  0,  0,  0,  -1.2,    0.8},
     { 0,  0, -2,  2, -2,  -5.5,    4.3},
     { 0,  0, -2,  2, -1,   0.1,   -0.1},
     { 0, -1, -2,  2, -2,  -0.3,    0.2},
     { 1,  0,  0, -2,  0,  -0.3,    0.7},
     {-1,  0,  0,  0, -1,   0.1,   -0.2},
     {-1,  0,  0,  0,  0,  -1.2,    3.7},
     {-1,  0,  0,  0,  1,   0.1,   -0.2},
     { 1,  0, -2,  0, -2,   0.1,   -0.2},
     { 0,  0,  0, -2,  0,   0.0,    0.6},
     {-2,  0,  0,  0,  0,   0.0,    0.3},
     { 0,  0, -2,  0, -2,   0.6,    6.3},
     { 0,  0, -2,  0, -1,   0.2,    2.6},
     { 0,  0, -2,  0,  0,   0.0,    0.2},
     { 1,  0, -2, -2, -2,   0.1,    0.2},
     {-1,  0, -2,  0, -2,   0.4,    1.1},
     {-1,  0, -2,  0, -1,   0.2,    0.5},
     { 0,  0, -2, -2, -2,   0.1,    0.2},
     {-2,  0, -2,  0, -2,   0.1,    0.1}
	};
    // For dC22 and dS22
    // Refer to Table 6.5c in IERS2010
    const double coeff2[2][6] =
   {
    // l  l' F  D  Om   Amp
     { 1, 0, 2, 0, 2,  -0.3},
     { 0, 0, 2, 0, 2,  -1.2}
   };
    // Mean arguments of luni-solar motion
    //
    //   l   mean anomaly of the Moon
    //   l'  mean anomaly of the Sun
    //   F   mean argument of latitude
    //   D   mean longitude elongation of the Moon from the Sun
    //   Om  mean longitude of the ascending node of the Moon
    l  = Modulo((485868.249036+1717915923.2178*T+31.8792*T2+0.051635*T3-0.00024470*T4),TURNAS)*DAS2R;
    lp = Modulo((1287104.79305+129596581.0481*T-0.5532*T2+0.000136*T3-0.00001149*T4),TURNAS)*DAS2R;
    F  = Modulo((335779.526232+1739527262.8478*T-12.7512*T2-0.001037*T3+0.00000417*T4),TURNAS)*DAS2R;
    D  = Modulo((1072260.70369+1602961601.2090*T-6.3706*T2+0.006593*T3-0.00003169*T4),TURNAS)*DAS2R;
    Om = Modulo((450160.398036-6962890.5431*T+7.4722*T2+0.007702*T3-0.00005939*T4),TURNAS)*DAS2R;
    
    // STEP1 CORRECTIONS
    lgM = Legendre(2,2,phiM);
    lgS = Legendre(2,2,phiS);
    dCnm20 = 0.30190/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,0)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,0) );
    dCnm21 = 0.29830/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,1)*cos(lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,1)*cos(lS) )
	   -0.00144/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,1)*sin(lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,1)*sin(lS) );
    dSnm21 = 0.00144/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,1)*cos(lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,1)*(cos(lS)) )
	   + 0.29830/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,1)*sin(lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,1)*sin(lS) );
    dCnm22 = 0.30102/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,2)*cos(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,2)*cos(2.0*lS) )
	   -0.00130/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,2)*(sin(2.0*lM))
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,2)*sin(2.0*lS) );
    dSnm22 = 0.00130/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,2)*(cos(2.0*lM))
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,2)*(cos(2.0*lS)) )
	   + 0.30102/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,2)*sin(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,2)*sin(2.0*lS) );
    dCnm40 = -0.00089/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,0)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,0) );
    dCnm41 = -0.00080/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,1)*cos(lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,1)*cos(lS) );
    dSnm41 = -0.00080/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,1)*sin(lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,1)*sin(lS) );
    dCnm42 = -0.00057/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,2)*cos(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,2)*cos(2.0*lS) );
    dSnm42 = -0.00057/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,2)*sin(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,2)*sin(2.0*lS) );

    // STEP2 CORRECTIONS
    dC20 = 0.0;
    for (int i=0;i<=20;i++)
	{
	 theta_f = -(coeff1[i][0]*l+coeff1[i][1]*lp+coeff1[i][2]*F+coeff1[i][3]*D+coeff1[i][4]*Om);
     dC20 += 1e-12*(coeff1[i][5]*cos(theta_f)-coeff1[i][6]*sin(theta_f));
	}
    dCnm20 += dC20;

    theta_g = GMST(Mjd_UT1);
    dC21 = 0.0;
    dS21 = 0.0;
    for (int i=0;i<=47;i++)
   {
     theta_f = (theta_g+pi)-(coeff0[i][0]*l+coeff0[i][1]*lp+coeff0[i][2]*F+coeff0[i][3]*D+coeff0[i][4]*Om);
     dC21 += 1e-12*(coeff0[i][5]*sin(theta_f)+coeff0[i][6]*cos(theta_f));
     dS21 += 1e-12*(coeff0[i][5]*cos(theta_f)-coeff0[i][6]*sin(theta_f));
   }
    dCnm21 += dC21;
    dSnm21 += dS21;

    dC22 = 0;
    dS22 = 0;
    for (int i=0;i<=1;i++)
   {
    theta_f = 2.0*(theta_g+pi)-(coeff2[i][0]*l+coeff2[i][1]*lp+coeff2[i][2]*F+coeff2[i][3]*D+coeff2[i][4]*Om);
    dC22 += 1e-12*coeff2[i][5]*cos(theta_f);
    dS22 -= 1e-12*coeff2[i][5]*sin(theta_f);
   }
    dCnm22 += dC22;
    dSnm22 += dS22;

  	// Treatment of the Permanent Tide (anelastic Earth)
    dC20 = 4.4228e-8*(-0.31460)*0.30190;
    // Here 4.173e-9 is added to C20 to convert it to a tide-free system; 
    // then, the permanent tide contribution is subtracted.
    dCnm20 += 4.173e-9 - dC20;

    // Effect of Solid Earth Pole Tide (anelastic Earth)
    dC21 = -1.348e-9*(xp+0.0112*yp);
    dS21 = 1.348e-9*(yp-0.0112*xp);
    dCnm21 += dC21;
    dSnm21 += dS21;

    C(2,0) += dCnm20;
    C(2,1) += dCnm21;
    C(2,2) += dCnm22;
    S(2,1) += dSnm21;
    S(2,2) += dSnm22;

    C(4,0) += dCnm40;
    C(4,1) += dCnm41;
    C(4,2) += dCnm42;
    S(4,1) += dSnm41;
    S(4,2) += dSnm42;    
 }
 if (OceanTides)
 {
    Matrix lgM(7,7),lgS(7,7);
    // Ocean Tides
    lgM = Legendre(6,6,phiM);
    lgS = Legendre(6,6,phiS);
    dCnm20 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.3075)/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,0)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,0) );
    dCnm21 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.3075)/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,1)*cos(lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,1)*cos(lS) );
    dSnm21 = -0.3075/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,1)*sin(lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,1)*sin(lS) );
    dCnm22 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.3075)/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,2)*cos(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,2)*cos(2.0*lS) );
    dSnm22 = -0.3075/5.0*( GM_Moon/GM*pow(R_ref/rM,3.0)*lgM(2,2)*sin(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,3.0)*lgS(2,2)*sin(2.0*lS) );
    dCnm30 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.195)/7.0*( GM_Moon/GM*pow(R_ref/rM,4.0)*lgM(3,0)
           + GM_Sun/GM*pow(R_ref/rS,4.0)*lgS(3,0) );
    dCnm31 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.195)/7.0*( GM_Moon/GM*pow(R_ref/rM,4.0)*lgM(3,1)*cos(lM)
           + GM_Sun/GM*pow(R_ref/rS,4.0)*lgS(3,1)*cos(lS) );
    dSnm31 = -0.195/7.0*( GM_Moon/GM*pow(R_ref/rM,4.0)*lgM(3,1)*sin(lM)
           + GM_Sun/GM*pow(R_ref/rS,4.0)*lgS(3,1)*sin(lS) );
    dCnm32 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.195)/7.0*( GM_Moon/GM*pow(R_ref/rM,4.0)*lgM(3,2)*cos(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,4.0)*lgS(3,2)*cos(2.0*lS) );
    dSnm32 = -0.195/7.0*( GM_Moon/GM*pow(R_ref/rM,4.0)*lgM(3,2)*sin(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,4.0)*lgS(3,2)*sin(2.0*lS) );
    dCnm33 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.195)/7.0*( GM_Moon/GM*pow(R_ref/rM,4.0)*lgM(3,3)*cos(3.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,4.0)*lgS(3,3)*cos(3.0*lS) );
    dSnm33 = -0.195/7.0*( GM_Moon/GM*pow(R_ref/rM,4.0)*lgM(3,3)*sin(3.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,4.0)*lgS(3,3)*sin(3.0*lS) );
    dCnm40 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.132)/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,0)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,0) );
    dCnm41 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.132)/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,1)*cos(lM)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,1)*cos(lS) );
    dSnm41 = -0.132/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,1)*sin(lM)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,1)*sin(lS) );
    dCnm42 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.132)/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,2)*cos(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,2)*cos(2.0*lS) );
    dSnm42 = -0.132/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,2)*sin(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,2)*sin(2.0*lS) );
    dCnm43 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.132)/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,3)*cos(3.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,3)*cos(3.0*lS) );
    dSnm43 = -0.132/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,3)*sin(3.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,3)*sin(3.0*lS) );
    dCnm44 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.132)/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,4)*cos(4.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,4)*cos(4.0*lS) );
    dSnm44 = -0.132/9.0*( GM_Moon/GM*pow(R_ref/rM,5.0)*lgM(4,4)*sin(4.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,5.0)*lgS(4,4)*sin(4.0*lS) );
    dCnm50 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.1032)/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,0)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,0) );
    dCnm51 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.1032)/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,1)*cos(lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,1)*cos(lS) );
    dSnm51 = -0.1032/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,1)*sin(lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,1)*sin(lS) );
    dCnm52 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.1032)/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,2)*cos(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,2)*cos(2.0*lS) );
    dSnm52 = -0.1032/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,2)*sin(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,2)*sin(2.0*lS) );
    dCnm53 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.1032)/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,3)*cos(3.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,3)*cos(3.0*lS) );
    dSnm53 = -0.1032/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,3)*sin(3.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,3)*sin(3.0*lS) );
    dCnm54 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.1032)/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,4)*cos(4.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,4)*cos(4.0*lS) );
    dSnm54 = -0.1032/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,4)*sin(4.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,4)*sin(4.0*lS) );
    dCnm55 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.1032)/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,5)*cos(5.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,5)*cos(5.0*lS) );
    dSnm55 = -0.1032/11.0*( GM_Moon/GM*pow(R_ref/rM,6.0)*lgM(5,5)*sin(5.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,6.0)*lgS(5,5)*sin(5.0*lS) );
    dCnm60 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.0892)/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,0)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,0) );
    dCnm61 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.0892)/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,1)*cos(lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,1)*cos(lS) );
    dSnm61 = -0.0892/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,1)*sin(lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,1)*sin(lS) );
    dCnm62 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.0892)/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,2)*cos(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,2)*cos(2.0*lS) );
    dSnm62 = -0.0892/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,2)*sin(2.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,2)*sin(2.0*lS) );
    dCnm63 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.0892)/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,3)*cos(3.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,3)*cos(3.0*lS) );
    dSnm63 = -0.0892/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,3)*sin(3.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,3)*sin(3.0*lS) );
    dCnm64 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.0892)/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,4)*cos(4.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,4)*cos(4.0*lS) );
    dSnm64 = -0.0892/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,4)*sin(4.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,4)*sin(4.0*lS) );
    dCnm65 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.0892)/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,5)*cos(5.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,5)*cos(5.0*lS) );
    dSnm65 = -0.0892/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,5)*sin(5.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,5)*sin(5.0*lS) );
    dCnm66 = 4.0*pi*pow(R_ref,2.0)*1025.0/(5.9722e24)*(1.0-0.0892)/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,6)*cos(6.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,6)*cos(6.0*lS) );
    dSnm66 = -0.0892/13.0*( GM_Moon/GM*pow(R_ref/rM,7.0)*lgM(6,6)*sin(6.0*lM)
           + GM_Sun/GM*pow(R_ref/rS,7.0)*lgS(6,6)*sin(6.0*lS) );

    C(2,0) += dCnm20;
    C(2,1) += dCnm21;
    C(2,2) += dCnm22;
    S(2,1) += dSnm21;
    S(2,2) += dSnm22;
    
    C(3,0) += dCnm30;
    C(3,1) += dCnm31;
    C(3,2) += dCnm32;
    C(3,3) += dCnm33;
    S(3,1) += dSnm31;
    S(3,2) += dSnm32;
    S(3,3) += dSnm33;
    
    C(4,0) += dCnm40;
    C(4,1) += dCnm41;
    C(4,2) += dCnm42;
    C(4,3) += dCnm43;
    C(4,4) += dCnm44;
    S(4,1) += dSnm41;
    S(4,2) += dSnm42;
    S(4,3) += dSnm43;
    S(4,4) += dSnm44;
    
    C(5,0) += dCnm50;
    C(5,1) += dCnm51;
    C(5,2) += dCnm52;
    C(5,3) += dCnm53;
    C(5,4) += dCnm54;
    C(5,5) += dCnm55;
    S(5,1) += dSnm51;
    S(5,2) += dSnm52;
    S(5,3) += dSnm53;
    S(5,4) += dSnm54;
    S(5,5) += dSnm55;
    
    C(6,0) += dCnm60;
    C(6,1) += dCnm61;
    C(6,2) += dCnm62;
    C(6,3) += dCnm63;
    C(6,4) += dCnm64;
    C(6,5) += dCnm65;
    C(6,6) += dCnm66;
    S(6,1) += dSnm61;
    S(6,2) += dSnm62;
    S(6,3) += dSnm63;
    S(6,4) += dSnm64;
    S(6,5) += dSnm65;
    S(6,6) += dSnm66;    
 }
  // Body-fixed position
  r_bf = E * r;

  // Auxiliary quantities
  d = Norm(r_bf);          // distance
  latgc = asin(r_bf(2)/d);
  lon = atan2(r_bf(1),r_bf(0));
  pnm = Legendre(n_max,n_max,latgc);
  dpnm = LegendreP(n_max,n_max,latgc);

  dUdr = 0;
  dUdlatgc = 0;
  dUdlon = 0;
  q3 = 0; q2 = q3; q1 = q2;
  for (int n=0;n<=n_max; n++)
 {
  nd = n;
  b1 = (-GM/pow(d,2.0))*pow((R_ref/d),nd)*(nd+1);
  b2 =  (GM/d)*pow((R_ref/d),nd);
  b3 =  (GM/d)*pow((R_ref/d),nd);
     for (int m=0;m<=m_max;m++)
    {
     q1 = q1 + pnm(n,m)*(C(n,m)*cos(m*lon)+S(n,m)*sin(m*lon));
     q2 = q2 + dpnm(n,m)*(C(n,m)*cos(m*lon)+S(n,m)*sin(m*lon));
     q3 = q3 + m*pnm(n,m)*(S(n,m)*cos(m*lon)-C(n,m)*sin(m*lon));
    }
  dUdr     = dUdr     + q1*b1;
  dUdlatgc = dUdlatgc + q2*b2;
  dUdlon   = dUdlon   + q3*b3;
  q3 = 0; q2 = q3; q1 = q2;
  }
  
  // Body-fixed acceleration
  r2xy = pow(r_bf(0),2.0)+pow(r_bf(1),2.0);

  ax = (1.0/d*dUdr-r_bf(2)/(pow(d,2.0)*sqrt(r2xy))*dUdlatgc)*r_bf(0)-(1/r2xy*dUdlon)*r_bf(1);
  ay = (1.0/d*dUdr-r_bf(2)/(pow(d,2.0)*sqrt(r2xy))*dUdlatgc)*r_bf(1)+(1/r2xy*dUdlon)*r_bf(0);
  az =  1.0/d*dUdr*r_bf(2)+sqrt(r2xy)/pow(d,2.0)*dUdlatgc;

  a_bf(0) = ax;
  a_bf(1) = ay;
  a_bf(2) = az;
  
  // Inertial acceleration
  return  Transp(E)*a_bf;

}

//------------------------------------------------------------------------------
//
// AccelPointMass
//
// Purpose:
//
//   Computes the perturbational acceleration due to a point mass
//
// Input/Output:
//
//   r           Satellite position vector 
//   s           Point mass position vector
//   GM          Gravitational coefficient of point mass
//   <return>    Acceleration (a=d^2r/dt^2)
//
//------------------------------------------------------------------------------
Vector AccelPointMass (const Vector& r, const Vector& s, double GM)
{    
   Vector d(3);
  
   //  Relative position vector of satellite w.r.t. point mass 
   d = r - s;
  
   // Acceleration 
   return  (-GM) * ( d/pow(Norm(d),3) + s/pow(Norm(s),3) );
}

//------------------------------------------------------------------------------
// 
// Illumination
//
// Purpose:
//
//   Computes the fractional illumination of a spacecraft in the 
//   vicinity of the Earth assuming a cylindrical shadow model
// 
// Input/output:
// 
//   r               Spacecraft position vector [m]
//   r_Sun           Sun position vector [m]
//   <return>        Illumination factor:
//                     nu=0   Spacecraft in Earth shadow 
//                     nu=1   Spacecraft fully illuminated by the Sun
//
//------------------------------------------------------------------------------
double Illumination ( const Vector& r, const Vector& r_Sun )
{                      

  Vector e_Sun = r_Sun / Norm(r_Sun);   // Sun direction unit vector
  double s     = Dot ( r, e_Sun );      // Projection of s/c position 

  return ( ( s>0 || Norm(r-s*e_Sun)>R_Earth ) ?  1.0 : 0.0 );
}

//------------------------------------------------------------------------------
//
// AccelSolrad
//
// Purpose:
//
//   Computes the acceleration due to solar radiation pressure assuming 
//   the spacecraft surface normal to the Sun direction
//
// Input/Output:
//
//   r           Spacecraft position vector 
//   r_Sun       Sun position vector 
//   Area        Cross-section 
//   mass        Spacecraft mass
//   CR          Solar radiation pressure coefficient
//   P0          Solar radiation pressure at 1 AU 
//   AU          Length of one Astronomical Unit 
//   <return>    Acceleration (a=d^2r/dt^2)
//
// Notes:
//
//   r, r_sun, Area, mass, P0 and AU must be given in consistent units,
//   e.g. m, m^2, kg and N/m^2. 
//
//------------------------------------------------------------------------------
Vector AccelSolrad (const Vector& r, const Vector& r_Sun, double Area, 
					double mass, double CR, double P0, double AU )
{
  Vector d(3);
  double nu;
  
  // Relative position vector of spacecraft w.r.t. Sun
  d = r - r_Sun;

  nu = Illumination(r,r_Sun);
  
  // Acceleration 
  return  nu*CR*(Area/mass)*P0*(AU*AU) * d / pow(Norm(d),3.0); 
}

//------------------------------------------------------------------------------
//
// AccelDrag
//
// Purpose:
//
//   Computes the acceleration due to the atmospheric drag.
//
// Input/Output:
//
//   Mjd_UTC     Modified Julian Date (UTC)
//   r           Satellite position vector in the inertial system [m]
//   v           Satellite velocity vector in the inertial system [m/s]
//   T           Transformation matrix to true-of-date inertial system
//   Area        Cross-section [m^2]
//   mass        Spacecraft mass [kg]
//   CD          Drag coefficient
//   <return>    Acceleration (a=d^2r/dt^2) [m/s^2]
//
//------------------------------------------------------------------------------
Vector AccelDrag(double Mjd_UTC, const Vector& r, const Vector& v, const Matrix& T,
                 const Matrix& E, double Area, double mass, double CD)
{
  // Constants

  // Earth angular velocity vector [rad/s]
  const double Data_omega[3]= { 0.0, 0.0, omega_Earth };
  const Vector omega ( &Data_omega[0], 3);


  // Variables
  double v_abs, dens;
  Vector r_tod(3), v_tod(3);
  Vector v_rel(3), a_tod(3);
  Matrix T_trp(3,3);

  // Transformation matrix to ICRF/EME2000 system
  T_trp = Transp(T);

  // Position and velocity in true-of-date system
  r_tod = T * r;
  v_tod = T * v;

  // Velocity relative to the Earth's atmosphere
  v_rel = v_tod - Cross(omega,r_tod);
  v_abs = Norm(v_rel);

  // Atmospheric density due to modified Harris-Priester model
  // dens = Density_HP(Mjd_UTC,r_tod);
  dens = Density_NRL(Mjd_UTC,E*r);
  
  // Acceleration
  a_tod = -0.5*CD*(Area/mass)*dens*v_abs*v_rel;

  return T_trp * a_tod;
}

//------------------------------------------------------------------------------
//
// Density_NRL
//
// Purpose:
//
//   Computes the atmospheric density for the modified nrlmsise-00 model.
//
// Input/Output:
//
//   Mjd_UTC     Modified Julian Date (UTC)
//   r_ecef      Satellite position vector in the Earth-fixed system [m]
//   <return>    Density [kg/m^3]
//
//---------------------------------------------------------------------------
 double Density_NRL(double Mjd_UTC, const Vector& r_ecef)
{

 // Structs
 nrlmsise_input input;
 nrlmsise_output output;
 nrlmsise_flags flags;
 ap_array aph;

 // Variables
 char interp, fluxtype, f81type, inputtype;
 int Year, Month, Day, Hour, Min;
 int doy;
 double sum, Sec, lst, days, Mjd_UT1, Mjd_TT, jd, mfme;

 jd = Mjd_UTC + 2400000.5;
 mfme = 1440.0*(Mjd_UTC - floor(Mjd_UTC));
 interp = 'n';
 fluxtype = 'o';
 f81type = 'c';
 inputtype = 'a';
 findatmosparam(jd, mfme, interp, fluxtype, f81type, inputtype, spwarr,
                jdspwstart, f107, f107bar, ap, avgap, aparr, kp, sumkp, kparr);
 input.f107A = f107bar; // Centered 81-day arithmetic average of F10.7 (observed).
 input.ap = avgap;      // Arithmetic average of the 8 AP indices for the day
 aph.a[0] = avgap;      // Arithmetic average of the 8 AP indices for the day
 aph.a[1] = aparr[0];   // 3 hr Ap index for current time
 
 findatmosparam(jd-1.0, mfme, interp, fluxtype, f81type, inputtype, spwarr,
                jdspwstart, f107, f107bar, ap, avgap, aparr, kp, sumkp, kparr);
 input.f107 = f107;   // Daily F10.7 flux for previous day (observed).
 aph.a[2] = aparr[7]; // 3 hr AP index for 3 hrs before current time
 aph.a[3] = aparr[6]; // 3 hr AP index for 6 hrs before current time
 aph.a[4] = aparr[5]; // 3 hr AP index for 9 hrs before current time
 sum = aparr[4]+aparr[3]+aparr[2]+aparr[1]+aparr[0];
 
 findatmosparam(jd-2.0, mfme, interp, fluxtype, f81type, inputtype, spwarr,
                jdspwstart, f107, f107bar, ap, avgap, aparr, kp, sumkp, kparr);
 sum = sum+aparr[7]+aparr[6]+aparr[5];
 aph.a[5] = sum/8.0; // Average of eight 3 hr AP indicies from 12 to 33 hrs
                     // prior to current time
 sum = aparr[4]+aparr[3]+aparr[2]+aparr[1]+aparr[0];
 
 findatmosparam(jd-3.0, mfme, interp, fluxtype, f81type, inputtype, spwarr,
                jdspwstart, f107, f107bar, ap, avgap, aparr, kp, sumkp, kparr);
 sum = sum+aparr[7]+aparr[6]+aparr[5];
 aph.a[6] = sum/8.0; // Average of eight 3 hr AP indicies from 36 to 57 hrs
                     // prior to current time
 input.ap_a = &aph;

 Mjd_UT1 = Mjd_UTC + IERS::UT1_UTC(Mjd_UTC)/86400.0;
 Mjd_TT  = Mjd_UTC + IERS::TT_UTC(Mjd_UTC)/86400.0;

 CalDat(Mjd_UTC, Year, Month, Day, Hour, Min, Sec);

 finddays(Year, Month, Day, Hour, Min, Sec, days);

 doy = floor(days);

 Geodetic SAT(r_ecef);

 SAT.lat*=Deg;
 SAT.lon*=Deg;

 lst = Rad*SAT.lon + GAST (Mjd_UT1,Mjd_TT);
 lst = fmod(lst,pi2);
 lst = (lst*24)/(pi2); // hours

 for (int i=0;i<24;i++)
     flags.switches[i] = 1;

 flags.switches[9]=-1;

 input.doy = doy;
 input.year = 0;       		   /* without effect */
 input.sec = Hour*3600+Min*60+Sec; /* seconds in day (UT) */
 input.alt = SAT.h/1000.0;
 input.g_lat = SAT.lat;
 input.g_long = SAT.lon;
 input.lst = lst; /* local apparent solar time (hours), see note below */

 gtd7d(&input, &flags, &output);

 return (output.d[5]);  // [kg/m^3]
}

//--------------------------------------------------------------------------
//
// Relativisty: Computes the perturbational acceleration due to relativistic
//              effects
//
// Inputs:
//   r           Satellite position vector
//   v           Satellite velocity vector
// 
// Output:
//   a    		Acceleration (a=d^2r/dt^2)
//
//--------------------------------------------------------------------------
Vector Relativity( const Vector& r, const Vector& v )
{

Vector a(3);
double r_Sat, v_Sat;

// Relative position vector of satellite w.r.t. point mass
r_Sat = Norm(r);
v_Sat = Norm(v);

// Acceleration
a = GM_Earth/(pow(c_light,2.0)*pow(r_Sat,3.0))*((4.0*GM_Earth/r_Sat-pow(v_Sat,2.0))*r+4.0*Dot(r,v)*v);

return a;
}
