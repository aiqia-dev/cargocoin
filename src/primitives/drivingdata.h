// Copyright (c) 2025 The CargoCoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef CARGOCOIN_PRIMITIVES_DRIVINGDATA_H
#define CARGOCOIN_PRIMITIVES_DRIVINGDATA_H

#include <serialize.h>
#include <uint256.h>
#include <cstdint>
#include <vector>

/**
 * Driving behavior data structure for Proof-of-Safe-Driving (PoSD)
 * This structure contains telemetry data from vehicle sensors
 * used to validate safe driving behavior for mining rewards.
 */
class CDrivingData
{
public:
    // GPS coordinates (scaled by 1e7 for precision without floating point)
    int32_t latitude;       // Latitude * 10^7 (e.g., -23.5505199 → -235505199)
    int32_t longitude;      // Longitude * 10^7 (e.g., -46.6333094 → -466333094)

    // Driving metrics
    uint32_t distance;      // Distance traveled in meters
    uint32_t duration;      // Duration of trip in seconds
    uint16_t avgSpeed;      // Average speed in km/h * 10 (e.g., 65.5 km/h → 655)
    uint16_t maxSpeed;      // Maximum speed in km/h * 10

    // Safety metrics
    uint16_t hardBrakes;    // Number of hard braking events
    uint16_t hardAccel;     // Number of hard acceleration events
    uint8_t speedViolations; // Number of speed limit violations

    // Route verification
    uint256 routeHash;      // Hash of the GPS route points for verification

    // Driver identity (public key hash)
    uint256 driverPubKeyHash;

    // Timestamp of driving session start
    uint32_t sessionStart;

    // Digital signature of driving data (signed by driver's private key)
    std::vector<unsigned char> signature;

    CDrivingData()
    {
        SetNull();
    }

    SERIALIZE_METHODS(CDrivingData, obj)
    {
        READWRITE(obj.latitude, obj.longitude, obj.distance, obj.duration,
                  obj.avgSpeed, obj.maxSpeed, obj.hardBrakes, obj.hardAccel,
                  obj.speedViolations, obj.routeHash, obj.driverPubKeyHash,
                  obj.sessionStart, obj.signature);
    }

    void SetNull()
    {
        latitude = 0;
        longitude = 0;
        distance = 0;
        duration = 0;
        avgSpeed = 0;
        maxSpeed = 0;
        hardBrakes = 0;
        hardAccel = 0;
        speedViolations = 0;
        routeHash.SetNull();
        driverPubKeyHash.SetNull();
        sessionStart = 0;
        signature.clear();
    }

    bool IsNull() const
    {
        return (distance == 0 && duration == 0);
    }

    /**
     * Calculate driving score based on safe driving metrics
     * Higher score = safer driving = more mining reward
     * Score ranges from 0-1000
     */
    uint32_t CalculateDrivingScore() const;

    /**
     * Validate that driving data meets minimum requirements for mining
     */
    bool IsValid() const;

    /**
     * Get the hash of this driving data for block header
     */
    uint256 GetHash() const;
};

/**
 * Consensus parameters for Proof-of-Safe-Driving
 */
struct SafeDrivingParams
{
    // Speed limits
    uint16_t maxSpeedLimit;        // Maximum allowed speed (km/h * 10) - default 800 (80 km/h)
    uint16_t idealSpeedRange;      // Ideal speed for maximum reward (km/h * 10) - default 600-700

    // Minimum requirements for valid block
    uint32_t minDistance;          // Minimum distance in meters - default 1000 (1 km)
    uint32_t minDuration;          // Minimum duration in seconds - default 120 (2 minutes)

    // Safety thresholds (violations reduce score)
    uint8_t maxHardBrakes;         // Maximum hard brakes allowed - default 5
    uint8_t maxHardAccel;          // Maximum hard accelerations - default 5
    uint8_t maxSpeedViolations;    // Maximum speed violations - default 0

    // Block time (seconds between blocks)
    int64_t targetBlockSpacing;    // Target: 300 seconds (5 minutes)

    // Difficulty adjustment
    int64_t difficultyAdjustmentInterval; // Blocks: 2016 (about 1 week)

    SafeDrivingParams()
    {
        maxSpeedLimit = 800;          // 80 km/h
        idealSpeedRange = 650;        // 65 km/h ideal
        minDistance = 1000;           // 1 km
        minDuration = 120;            // 2 minutes
        maxHardBrakes = 5;
        maxHardAccel = 5;
        maxSpeedViolations = 0;
        targetBlockSpacing = 300;     // 5 minutes
        difficultyAdjustmentInterval = 2016;
    }
};

#endif // CARGOCOIN_PRIMITIVES_DRIVINGDATA_H
