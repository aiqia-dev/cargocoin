// Copyright (c) 2025 The CargoCoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bitcoin-build-config.h> // IWYU pragma: keep

#include <chainparams.h>
#include <consensus/params.h>
#include <node/context.h>
#include <primitives/block.h>
#include <primitives/drivingdata.h>
#include <posd.h>
#include <rpc/server.h>
#include <rpc/server_util.h>
#include <rpc/util.h>
#include <univalue.h>
#include <util/strencodings.h>
#include <validation.h>

#include <memory>

using node::NodeContext;

/**
 * Submit driving data for mining
 */
static RPCHelpMan submitdrivingdata()
{
    return RPCHelpMan{"submitdrivingdata",
        "\nSubmit driving data to create a new block.\n"
        "This is the CargoCoin equivalent of mining - drivers submit proof of safe driving.\n",
        {
            {"latitude", RPCArg::Type::NUM, RPCArg::Optional::NO, "Latitude multiplied by 10^7 (e.g., -23.5505199 becomes -235505199)"},
            {"longitude", RPCArg::Type::NUM, RPCArg::Optional::NO, "Longitude multiplied by 10^7 (e.g., -46.6333094 becomes -466333094)"},
            {"distance", RPCArg::Type::NUM, RPCArg::Optional::NO, "Distance traveled in meters"},
            {"duration", RPCArg::Type::NUM, RPCArg::Optional::NO, "Duration of trip in seconds"},
            {"avgSpeed", RPCArg::Type::NUM, RPCArg::Optional::NO, "Average speed in km/h multiplied by 10 (e.g., 65.5 km/h becomes 655)"},
            {"maxSpeed", RPCArg::Type::NUM, RPCArg::Optional::NO, "Maximum speed in km/h multiplied by 10"},
            {"hardBrakes", RPCArg::Type::NUM, RPCArg::Optional::NO, "Number of hard braking events"},
            {"hardAccel", RPCArg::Type::NUM, RPCArg::Optional::NO, "Number of hard acceleration events"},
            {"speedViolations", RPCArg::Type::NUM, RPCArg::Optional::NO, "Number of speed limit violations"},
            {"routeHash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO, "Hash of the GPS route points"},
            {"driverPubKeyHash", RPCArg::Type::STR_HEX, RPCArg::Optional::NO, "Hash of driver's public key"},
            {"sessionStart", RPCArg::Type::NUM, RPCArg::Optional::NO, "Unix timestamp of driving session start"},
            {"signature", RPCArg::Type::STR_HEX, RPCArg::Optional::NO, "Digital signature of the driving data"},
        },
        RPCResult{
            RPCResult::Type::OBJ, "", "",
            {
                {RPCResult::Type::BOOL, "valid", "Whether the driving data is valid"},
                {RPCResult::Type::NUM, "score", "Calculated driving score (0-1000)"},
                {RPCResult::Type::STR, "status", "Status message"},
                {RPCResult::Type::STR_HEX, "drivingDataHash", /*optional=*/true, "Hash of the driving data if valid"},
            }
        },
        RPCExamples{
            HelpExampleCli("submitdrivingdata", "-235505199 -466333094 5000 600 650 750 2 1 0 \"abc123...\" \"def456...\" 1732060800 \"sig789...\"")
            + HelpExampleRpc("submitdrivingdata", "-235505199, -466333094, 5000, 600, 650, 750, 2, 1, 0, \"abc123...\", \"def456...\", 1732060800, \"sig789...\"")
        },
        [&](const RPCHelpMan& self, const JSONRPCRequest& request) -> UniValue
        {
            // Create driving data from request
            CDrivingData drivingData;
            drivingData.latitude = request.params[0].getInt<int32_t>();
            drivingData.longitude = request.params[1].getInt<int32_t>();
            drivingData.distance = request.params[2].getInt<uint32_t>();
            drivingData.duration = request.params[3].getInt<uint32_t>();
            drivingData.avgSpeed = request.params[4].getInt<uint16_t>();
            drivingData.maxSpeed = request.params[5].getInt<uint16_t>();
            drivingData.hardBrakes = request.params[6].getInt<uint16_t>();
            drivingData.hardAccel = request.params[7].getInt<uint16_t>();
            drivingData.speedViolations = request.params[8].getInt<uint8_t>();

            drivingData.routeHash = ParseHashV(request.params[9], "routeHash");
            drivingData.driverPubKeyHash = ParseHashV(request.params[10], "driverPubKeyHash");
            drivingData.sessionStart = request.params[11].getInt<uint32_t>();

            std::string signatureHex = request.params[12].get_str();
            if (!IsHex(signatureHex)) {
                throw JSONRPCError(RPC_INVALID_PARAMETER, "signature must be hexadecimal string");
            }
            drivingData.signature = ParseHex(signatureHex);

            // Get consensus params
            const Consensus::Params& consensusParams = Params().GetConsensus();
            const SafeDrivingParams& safeDrivingParams = consensusParams.safeDrivingParams;

            UniValue result(UniValue::VOBJ);

            // Validate driving data
            if (!CheckProofOfSafeDriving(drivingData, safeDrivingParams)) {
                result.pushKV("valid", false);
                result.pushKV("score", 0);
                result.pushKV("status", "Invalid driving data - does not meet minimum requirements");
                return result;
            }

            // Validate signature
            if (!ValidateDrivingDataSignature(drivingData)) {
                result.pushKV("valid", false);
                result.pushKV("score", 0);
                result.pushKV("status", "Invalid signature");
                return result;
            }

            // Calculate score
            uint32_t score = drivingData.CalculateDrivingScore();

            // Get hash
            uint256 drivingDataHash = drivingData.GetHash();

            result.pushKV("valid", true);
            result.pushKV("score", (int)score);
            result.pushKV("status", "Driving data accepted - ready for block creation");
            result.pushKV("drivingDataHash", drivingDataHash.GetHex());

            // TODO: Actually create and submit block with this driving data
            // This would involve:
            // 1. Creating a block template
            // 2. Adding the driving data to the block
            // 3. Submitting the block to the network

            return result;
        }
    };
}

/**
 * Get information about safe driving parameters and requirements
 */
static RPCHelpMan getdrivinginfo()
{
    return RPCHelpMan{"getdrivinginfo",
        "\nReturns information about safe driving requirements and current network status.\n",
        {},
        RPCResult{
            RPCResult::Type::OBJ, "", "",
            {
                {RPCResult::Type::NUM, "maxSpeedLimit", "Maximum allowed speed (km/h * 10)"},
                {RPCResult::Type::NUM, "idealSpeedRange", "Ideal speed for maximum reward (km/h * 10)"},
                {RPCResult::Type::NUM, "minDistance", "Minimum distance required (meters)"},
                {RPCResult::Type::NUM, "minDuration", "Minimum duration required (seconds)"},
                {RPCResult::Type::NUM, "maxHardBrakes", "Maximum hard brakes allowed"},
                {RPCResult::Type::NUM, "maxHardAccel", "Maximum hard accelerations allowed"},
                {RPCResult::Type::NUM, "maxSpeedViolations", "Maximum speed violations allowed"},
                {RPCResult::Type::NUM, "targetBlockSpacing", "Target seconds between blocks"},
                {RPCResult::Type::NUM, "difficultyAdjustmentInterval", "Blocks between difficulty adjustments"},
                {RPCResult::Type::NUM, "currentRequiredScore", /*optional=*/true, "Current minimum required driving score"},
            }
        },
        RPCExamples{
            HelpExampleCli("getdrivinginfo", "")
            + HelpExampleRpc("getdrivinginfo", "")
        },
        [&](const RPCHelpMan& self, const JSONRPCRequest& request) -> UniValue
        {
            const Consensus::Params& consensusParams = Params().GetConsensus();
            const SafeDrivingParams& params = consensusParams.safeDrivingParams;

            UniValue result(UniValue::VOBJ);

            // Convert back from internal representation to user-friendly values
            result.pushKV("maxSpeedLimit", (double)params.maxSpeedLimit / 10.0); // Convert to km/h
            result.pushKV("idealSpeedRange", (double)params.idealSpeedRange / 10.0);
            result.pushKV("minDistance", (int)params.minDistance);
            result.pushKV("minDuration", (int)params.minDuration);
            result.pushKV("maxHardBrakes", (int)params.maxHardBrakes);
            result.pushKV("maxHardAccel", (int)params.maxHardAccel);
            result.pushKV("maxSpeedViolations", (int)params.maxSpeedViolations);
            result.pushKV("targetBlockSpacing", params.targetBlockSpacing);
            result.pushKV("difficultyAdjustmentInterval", params.difficultyAdjustmentInterval);

            // Get current required score if we have a chain
            ChainstateManager& chainman = EnsureChainman(request.context);
            LOCK(cs_main);
            const CBlockIndex* pindex = chainman.ActiveChain().Tip();
            if (pindex) {
                uint32_t requiredScore = GetNextRequiredDrivingScore(pindex, params);
                result.pushKV("currentRequiredScore", (int)requiredScore);
            }

            return result;
        }
    };
}

/**
 * Calculate driving score for given parameters
 */
static RPCHelpMan calculatedrivingscore()
{
    return RPCHelpMan{"calculatedrivingscore",
        "\nCalculate what score a driving session would receive.\n"
        "Useful for testing and previewing scores before submitting actual data.\n",
        {
            {"distance", RPCArg::Type::NUM, RPCArg::Optional::NO, "Distance traveled in meters"},
            {"duration", RPCArg::Type::NUM, RPCArg::Optional::NO, "Duration of trip in seconds"},
            {"avgSpeed", RPCArg::Type::NUM, RPCArg::Optional::NO, "Average speed in km/h multiplied by 10"},
            {"maxSpeed", RPCArg::Type::NUM, RPCArg::Optional::NO, "Maximum speed in km/h multiplied by 10"},
            {"hardBrakes", RPCArg::Type::NUM, RPCArg::Optional::NO, "Number of hard braking events"},
            {"hardAccel", RPCArg::Type::NUM, RPCArg::Optional::NO, "Number of hard acceleration events"},
            {"speedViolations", RPCArg::Type::NUM, RPCArg::Optional::NO, "Number of speed limit violations"},
        },
        RPCResult{
            RPCResult::Type::OBJ, "", "",
            {
                {RPCResult::Type::NUM, "score", "Calculated driving score (0-1000)"},
                {RPCResult::Type::STR, "rating", "Score rating (Excellent/Good/Fair/Poor)"},
                {RPCResult::Type::BOOL, "wouldBeAccepted", "Whether this score would be accepted for mining"},
            }
        },
        RPCExamples{
            HelpExampleCli("calculatedrivingscore", "5000 600 650 750 2 1 0")
            + HelpExampleRpc("calculatedrivingscore", "5000, 600, 650, 750, 2, 1, 0")
        },
        [&](const RPCHelpMan& self, const JSONRPCRequest& request) -> UniValue
        {
            // Create minimal driving data for score calculation
            CDrivingData drivingData;
            drivingData.distance = request.params[0].getInt<uint32_t>();
            drivingData.duration = request.params[1].getInt<uint32_t>();
            drivingData.avgSpeed = request.params[2].getInt<uint16_t>();
            drivingData.maxSpeed = request.params[3].getInt<uint16_t>();
            drivingData.hardBrakes = request.params[4].getInt<uint16_t>();
            drivingData.hardAccel = request.params[5].getInt<uint16_t>();
            drivingData.speedViolations = request.params[6].getInt<uint8_t>();

            // Set dummy values for fields not needed for score calculation
            drivingData.routeHash.SetNull();
            drivingData.driverPubKeyHash.SetNull();
            drivingData.sessionStart = 0;

            uint32_t score = drivingData.CalculateDrivingScore();

            UniValue result(UniValue::VOBJ);
            result.pushKV("score", (int)score);

            // Rating based on score
            std::string rating;
            if (score >= 900) rating = "Excellent";
            else if (score >= 700) rating = "Good";
            else if (score >= 500) rating = "Fair";
            else rating = "Poor";
            result.pushKV("rating", rating);

            // Check if would be accepted
            const Consensus::Params& consensusParams = Params().GetConsensus();
            const SafeDrivingParams& params = consensusParams.safeDrivingParams;

            bool accepted = (drivingData.distance >= params.minDistance &&
                           drivingData.duration >= params.minDuration &&
                           drivingData.maxSpeed <= params.maxSpeedLimit &&
                           drivingData.hardBrakes <= params.maxHardBrakes &&
                           drivingData.hardAccel <= params.maxHardAccel &&
                           drivingData.speedViolations <= params.maxSpeedViolations);

            result.pushKV("wouldBeAccepted", accepted);

            return result;
        }
    };
}

void RegisterDrivingRPCCommands(CRPCTable& t)
{
    static const CRPCCommand commands[]{
        {"driving", &submitdrivingdata},
        {"driving", &getdrivinginfo},
        {"driving", &calculatedrivingscore},
    };
    for (const auto& c : commands) {
        t.appendCommand(c.name, &c);
    }
}
