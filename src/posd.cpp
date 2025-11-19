// Copyright (c) 2025 The CargoCoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <posd.h>

#include <chain.h>
#include <primitives/block.h>
#include <primitives/drivingdata.h>
#include <key.h>
#include <pubkey.h>
#include <hash.h>
#include <logging.h>
#include <util/check.h>

#include <algorithm>

bool CheckProofOfSafeDriving(const CDrivingData& drivingData, const SafeDrivingParams& params)
{
    // First check basic validity
    if (!drivingData.IsValid()) {
        LogPrint(BCLog::VALIDATION, "CheckProofOfSafeDriving: Invalid driving data\n");
        return false;
    }

    // Check minimum distance requirement
    if (drivingData.distance < params.minDistance) {
        LogPrint(BCLog::VALIDATION, "CheckProofOfSafeDriving: Distance %u below minimum %u\n",
                 drivingData.distance, params.minDistance);
        return false;
    }

    // Check minimum duration requirement
    if (drivingData.duration < params.minDuration) {
        LogPrint(BCLog::VALIDATION, "CheckProofOfSafeDriving: Duration %u below minimum %u\n",
                 drivingData.duration, params.minDuration);
        return false;
    }

    // Check maximum speed limit
    if (drivingData.maxSpeed > params.maxSpeedLimit) {
        LogPrint(BCLog::VALIDATION, "CheckProofOfSafeDriving: Max speed %u exceeds limit %u\n",
                 drivingData.maxSpeed, params.maxSpeedLimit);
        return false;
    }

    // Check hard braking events
    if (drivingData.hardBrakes > params.maxHardBrakes) {
        LogPrint(BCLog::VALIDATION, "CheckProofOfSafeDriving: Too many hard brakes %u (max %u)\n",
                 drivingData.hardBrakes, params.maxHardBrakes);
        return false;
    }

    // Check hard acceleration events
    if (drivingData.hardAccel > params.maxHardAccel) {
        LogPrint(BCLog::VALIDATION, "CheckProofOfSafeDriving: Too many hard accelerations %u (max %u)\n",
                 drivingData.hardAccel, params.maxHardAccel);
        return false;
    }

    // Check speed violations (must be zero for mainnet, might allow some on testnet)
    if (drivingData.speedViolations > params.maxSpeedViolations) {
        LogPrint(BCLog::VALIDATION, "CheckProofOfSafeDriving: Too many speed violations %u (max %u)\n",
                 drivingData.speedViolations, params.maxSpeedViolations);
        return false;
    }

    return true;
}

bool ValidateDrivingDataSignature(const CDrivingData& drivingData)
{
    // TODO: Implement signature validation
    // This requires verifying that the driving data was signed by the private key
    // corresponding to driverPubKeyHash

    // For now, just check that signature exists
    if (drivingData.signature.empty()) {
        LogPrint(BCLog::VALIDATION, "ValidateDrivingDataSignature: Empty signature\n");
        return false;
    }

    // Basic length check (typical ECDSA signature is 70-72 bytes)
    if (drivingData.signature.size() < 64 || drivingData.signature.size() > 80) {
        LogPrint(BCLog::VALIDATION, "ValidateDrivingDataSignature: Invalid signature length %zu\n",
                 drivingData.signature.size());
        return false;
    }

    // TODO: Implement full cryptographic signature verification
    // This would involve:
    // 1. Reconstructing the message hash from driving data fields
    // 2. Extracting the public key from driverPubKeyHash
    // 3. Verifying the signature using ECDSA

    return true;
}

bool CheckDrivingDataHash(const CBlock& block)
{
    // Calculate hash of driving data
    uint256 calculatedHash = block.drivingData.GetHash();

    // Compare with hash in block header
    if (calculatedHash != block.hashDrivingData) {
        LogPrint(BCLog::VALIDATION, "CheckDrivingDataHash: Hash mismatch. Expected %s, got %s\n",
                 block.hashDrivingData.ToString(), calculatedHash.ToString());
        return false;
    }

    return true;
}

bool VerifyDrivingScore(const CBlock& block)
{
    // Calculate score from driving data
    uint32_t calculatedScore = block.drivingData.CalculateDrivingScore();

    // Compare with score in block header
    if (calculatedScore != block.drivingScore) {
        LogPrint(BCLog::VALIDATION, "VerifyDrivingScore: Score mismatch. Expected %u, got %u\n",
                 block.drivingScore, calculatedScore);
        return false;
    }

    return true;
}

uint32_t GetNextRequiredDrivingScore(const CBlockIndex* pindexLast, const SafeDrivingParams& params)
{
    assert(pindexLast != nullptr);

    // Minimum required score starts at 500 (50% of perfect score)
    uint32_t baseRequiredScore = 500;

    // Only adjust once per difficulty adjustment interval
    if ((pindexLast->nHeight + 1) % params.difficultyAdjustmentInterval != 0)
    {
        // Return the last required score
        // TODO: Store this in block index, for now return base
        return baseRequiredScore;
    }

    // Go back by what we want to be the adjustment interval worth of blocks
    int nHeightFirst = pindexLast->nHeight - (params.difficultyAdjustmentInterval - 1);
    if (nHeightFirst < 0) return baseRequiredScore;

    const CBlockIndex* pindexFirst = pindexLast->GetAncestor(nHeightFirst);
    if (!pindexFirst) return baseRequiredScore;

    return CalculateNextRequiredDrivingScore(pindexLast, pindexFirst->GetBlockTime(), params);
}

uint32_t CalculateNextRequiredDrivingScore(const CBlockIndex* pindexLast, int64_t nFirstBlockTime, const SafeDrivingParams& params)
{
    // Calculate actual time taken for the adjustment interval
    int64_t nActualTimespan = pindexLast->GetBlockTime() - nFirstBlockTime;

    // Calculate expected timespan
    int64_t nTargetTimespan = params.targetBlockSpacing * params.difficultyAdjustmentInterval;

    uint32_t baseRequiredScore = 500;

    // If blocks are coming faster than target, increase required score
    // If blocks are coming slower than target, decrease required score
    // Use similar logic to difficulty adjustment but inverted

    // Limit adjustment to 4x in either direction
    if (nActualTimespan < nTargetTimespan / 4)
        nActualTimespan = nTargetTimespan / 4;
    if (nActualTimespan > nTargetTimespan * 4)
        nActualTimespan = nTargetTimespan * 4;

    // Calculate new required score
    // If actual time < target time, blocks coming too fast, increase score requirement
    // If actual time > target time, blocks coming too slow, decrease score requirement
    uint32_t newRequiredScore = baseRequiredScore;

    if (nActualTimespan < nTargetTimespan) {
        // Blocks coming too fast, increase requirement
        // Ratio: targetTimespan / actualTimespan (> 1)
        uint32_t adjustment = (nTargetTimespan * 100) / nActualTimespan;
        newRequiredScore = (baseRequiredScore * adjustment) / 100;
    } else {
        // Blocks coming too slow, decrease requirement
        // Ratio: actualTimespan / targetTimespan (> 1)
        uint32_t adjustment = (nActualTimespan * 100) / nTargetTimespan;
        newRequiredScore = (baseRequiredScore * 100) / adjustment;
    }

    // Ensure score stays within reasonable bounds (200-900)
    if (newRequiredScore < 200) newRequiredScore = 200;
    if (newRequiredScore > 900) newRequiredScore = 900;

    LogPrint(BCLog::VALIDATION, "CalculateNextRequiredDrivingScore: actual=%ld target=%ld score=%u\n",
             nActualTimespan, nTargetTimespan, newRequiredScore);

    return newRequiredScore;
}
