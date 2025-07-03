//------------------------------------------------------------------------------
//
// SAT_Force.h
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

#include "SAT_VecMat.h"

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
Matrix Legendre(int n,int m,double fi);

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
Matrix LegendreP(int n,int m,double fi);

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
                      const Matrix& cnm, const Matrix& snm, int n_max, int m_max );

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
                     double xp, double yp, bool SolidEarthTides, bool OceanTides);

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
//   r           Satellite position vector (r)
//   s           Point mass position vector (s)
//   GM          Gravitational coefficient of point mass
//   <return>    Acceleration (a=d^2r/dt^2)
//
//------------------------------------------------------------------------------
Vector AccelPointMass (const Vector& r, const Vector& s, double GM);

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
double Illumination ( const Vector& r, const Vector& r_Sun );

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
Vector AccelSolrad (const Vector& r, const Vector& r_Sun,
                    double Area, double mass, double CR,
                    double P0, double AU );

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
//   Mjd_TT      Terrestrial Time (Modified Julian Date)
//   r           Satellite position vector in the inertial system [m]
//   v           Satellite velocity vector in the inertial system [m/s]
//   T           Transformation matrix to true-of-date inertial system
//   Area        Cross-section [m^2]
//   mass        Spacecraft mass [kg]
//   CD          Drag coefficient
//   <return>    Acceleration (a=d^2r/dt^2) [m/s^2]
//
//------------------------------------------------------------------------------
Vector AccelDrag ( double Mjd_TT, const Vector& r, const Vector& v, const Matrix& T,
                   const Matrix& E, double Area, double mass, double CD );

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
//   Mjd_TT      Terrestrial Time (Modified Julian Date)
//   r_ecef      Satellite position vector in the Earth-fixed system [m]
//   <return>    Density [kg/m^3]
//
//---------------------------------------------------------------------------
double Density_NRL( double Mjd_TT, const Vector& r_ecef );

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
Vector Relativity( const Vector& r, const Vector& v );

