//------------------------------------------------------------------------------
//
// APC_Sun.h
// 
// Purpose:
//
//    Computation of the Sun's position
//
// Notes:
//
//   This software is protected by national and international copyright. 
//   Any unauthorized use, reproduction or modificaton is unlawful and 
//   will be prosecuted. Commercial and non-private application of the 
//   software in any form is strictly prohibited unless otherwise granted
//   by the authors.
//   
// (c) 1999 Oliver Montenbruck, Thomas Pfleger
//
//------------------------------------------------------------------------------

#ifndef INC_APC_SUN_H
#define INC_APC_SUN_H

#include "SAT_VecMat.h"

//------------------------------------------------------------------------------
//
// SunPos: Computes the Sun's ecliptical position using analytical series
//
// Input:
//
//   T         Time in Julian centuries since J2000
//
// <return>:   Geocentric position of the Sun (in [AU]), referred to the
//             ecliptic and equinox of date
//
//------------------------------------------------------------------------------
Vector SunPos (double T);

#endif  // include blocker
