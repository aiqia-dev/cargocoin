// Copyright (c) 2025 The CargoCoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef CARGOCOIN_POSD_H
#define CARGOCOIN_POSD_H

#include <consensus/params.h>
#include <primitives/drivingdata.h>

#include <cstdint>

class CBlockHeader;
class CBlock;
class CBlockIndex;
class uint256;

/**
 * Check whether driving data satisfies the Proof-of-Safe-Driving requirements
 * @param drivingData The driving data to validate
 * @param params Consensus parameters including safe driving thresholds
 * @return true if driving data is valid for mining reward
 */
bool CheckProofOfSafeDriving(const CDrivingData& drivingData, const SafeDrivingParams& params);

/**
 * Validate the driving data signature
 * @param drivingData The driving data with signature to validate
 * @return true if signature is valid
 */
bool ValidateDrivingDataSignature(const CDrivingData& drivingData);

/**
 * Check that the hashDrivingData in block header matches the actual driving data
 * @param block The block to validate
 * @return true if hash matches
 */
bool CheckDrivingDataHash(const CBlock& block);

/**
 * Calculate the required driving score for the next block based on network conditions
 * Similar to difficulty adjustment but for driving quality
 * @param pindexLast Previous block index
 * @param params Safe driving parameters
 * @return Required minimum driving score (0-1000)
 */
uint32_t GetNextRequiredDrivingScore(const CBlockIndex* pindexLast, const SafeDrivingParams& params);

/**
 * Calculate next required driving score based on recent block times
 * If blocks are coming too fast, increase required score
 * If blocks are coming too slow, decrease required score
 */
uint32_t CalculateNextRequiredDrivingScore(const CBlockIndex* pindexLast, int64_t nFirstBlockTime, const SafeDrivingParams& params);

/**
 * Verify that the driving score in the block header matches the calculated score
 * from the driving data
 */
bool VerifyDrivingScore(const CBlock& block);

#endif // CARGOCOIN_POSD_H
