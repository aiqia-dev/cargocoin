// Copyright (c) 2025 The CargoCoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <primitives/drivingdata.h>
#include <hash.h>
#include <streams.h>
#include <algorithm>
#include <cmath>

uint256 CDrivingData::GetHash() const
{
    HashWriter ss{};
    ss << *this;
    return ss.GetHash();
}

uint32_t CDrivingData::CalculateDrivingScore() const
{
    if (!IsValid()) return 0;

    uint32_t score = 1000; // Start with perfect score

    // Penalty for exceeding speed limits
    // Each km/h over 80 km/h reduces score by 50 points
    if (maxSpeed > 800) {
        uint32_t overspeed = (maxSpeed - 800) / 10; // Convert to km/h
        score = (overspeed * 50 > score) ? 0 : score - (overspeed * 50);
    }

    // Penalty for average speed too high
    if (avgSpeed > 800) {
        uint32_t overspeed = (avgSpeed - 800) / 10;
        score = (overspeed * 30 > score) ? 0 : score - (overspeed * 30);
    }

    // Bonus for maintaining ideal speed (60-70 km/h)
    if (avgSpeed >= 600 && avgSpeed <= 700) {
        score = std::min(score + 100, 1000u);
    }

    // Penalty for hard braking events (each event -20 points)
    uint32_t brakePenalty = hardBrakes * 20;
    score = (brakePenalty > score) ? 0 : score - brakePenalty;

    // Penalty for hard acceleration events (each event -15 points)
    uint32_t accelPenalty = hardAccel * 15;
    score = (accelPenalty > score) ? 0 : score - accelPenalty;

    // Severe penalty for speed violations (each violation -100 points)
    uint32_t violationPenalty = speedViolations * 100;
    score = (violationPenalty > score) ? 0 : score - violationPenalty;

    // Bonus for longer distance (extra 10 points per km, max +200)
    uint32_t distanceBonus = std::min((distance / 1000) * 10, 200u);
    score = std::min(score + distanceBonus, 1000u);

    // Bonus for longer duration (extra 5 points per minute, max +100)
    uint32_t durationBonus = std::min((duration / 60) * 5, 100u);
    score = std::min(score + durationBonus, 1000u);

    return score;
}

bool CDrivingData::IsValid() const
{
    // Check basic requirements
    if (IsNull()) return false;

    // Must have minimum distance
    if (distance < 1000) return false; // At least 1 km

    // Must have minimum duration
    if (duration < 120) return false; // At least 2 minutes

    // Maximum speed must not exceed 150 km/h (absolute limit for safety)
    if (maxSpeed > 1500) return false;

    // Check route hash is not null
    if (routeHash.IsNull()) return false;

    // Check driver public key hash is not null
    if (driverPubKeyHash.IsNull()) return false;

    // Check signature exists
    if (signature.empty()) return false;

    // Sanity check: average speed should not exceed max speed
    if (avgSpeed > maxSpeed) return false;

    // Sanity check: speed should be reasonable given distance and duration
    // Calculate approximate speed: (distance / duration) * 3.6 to get km/h
    if (duration > 0) {
        uint32_t calculatedSpeed = (distance * 36) / (duration * 10); // km/h * 10
        // Allow 20% margin for calculation differences
        if (calculatedSpeed > avgSpeed * 12 / 10 || calculatedSpeed < avgSpeed * 8 / 10) {
            return false; // Speed doesn't match distance/time ratio
        }
    }

    return true;
}
