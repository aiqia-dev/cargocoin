// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title CargoCoin Rewards Contract
 * @author CargoCoin Team
 * @notice Contrato de recompensas para o sistema Proof of Safe Driving (PoSD)
 * @dev Na CargoCoin Chain (L3), este contrato distribui CC nativo como recompensa.
 *      O contrato deve ser pré-fundado com CC nativo pelo admin.
 *
 * Fórmula de mineração:
 *   Tokens = Horas × (SafetyScore/100) × Multiplicador × FatorRede
 *
 * Regras:
 *   - Máximo 8h normais + 4h extras por dia (lei brasileira)
 *   - Horas extras = 1.5x multiplicador
 *   - Safety Score: 0-100 (calculado pelo backend)
 *   - Multiplicador: 1.0x a 2.5x (baseado em histórico)
 *   - Fator Rede: ajuste dinâmico baseado em participantes
 */
contract CargoCoinRewards is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ============================================
    // CONSTANTS
    // ============================================

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Base tokens por hora (1 CC por hora base)
    uint256 public constant BASE_TOKENS_PER_HOUR = 1 ether;

    /// @notice Máximo de horas normais por dia
    uint256 public constant MAX_NORMAL_HOURS = 8;

    /// @notice Máximo de horas extras por dia
    uint256 public constant MAX_EXTRA_HOURS = 4;

    /// @notice Multiplicador de horas extras (1.5x = 150%)
    uint256 public constant EXTRA_HOURS_MULTIPLIER = 150;

    /// @notice Denominador para porcentagens
    uint256 public constant PERCENTAGE_BASE = 100;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Fator de rede atual (100 = 1.0x, 150 = 1.5x)
    uint256 public networkFactor;

    /// @notice Multiplicador por motorista (100 = 1.0x, 250 = 2.5x max)
    mapping(address => uint256) public driverMultiplier;

    /// @notice Última data de claim por motorista (timestamp do dia)
    mapping(address => uint256) public lastClaimDay;

    /// @notice Horas normais claimed hoje por motorista
    mapping(address => uint256) public normalHoursToday;

    /// @notice Horas extras claimed hoje por motorista
    mapping(address => uint256) public extraHoursToday;

    /// @notice Total de recompensas distribuídas
    uint256 public totalRewardsDistributed;

    /// @notice Total de recompensas disponíveis no contrato
    uint256 public rewardsPool;

    // ============================================
    // EVENTS
    // ============================================

    event RewardsClaimed(
        address indexed driver,
        uint256 normalHours,
        uint256 extraHours,
        uint256 safetyScore,
        uint256 totalReward
    );
    event MultiplierUpdated(address indexed driver, uint256 oldMultiplier, uint256 newMultiplier);
    event NetworkFactorUpdated(uint256 oldFactor, uint256 newFactor);
    event RewardsPoolFunded(address indexed funder, uint256 amount);
    event RewardsPoolWithdrawn(address indexed to, uint256 amount);

    // ============================================
    // ERRORS
    // ============================================

    error InvalidAddress();
    error InvalidAmount();
    error InvalidScore();
    error InvalidHours();
    error ExceedsMaxNormalHours();
    error ExceedsMaxExtraHours();
    error InsufficientRewardsPool();
    error TransferFailed();

    // ============================================
    // INITIALIZER
    // ============================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Inicializa o contrato de recompensas
     * @param defaultAdmin Endereço do administrador
     * @param oracle Endereço do oracle/backend autorizado
     */
    function initialize(address defaultAdmin, address oracle) public initializer {
        if (defaultAdmin == address(0) || oracle == address(0)) {
            revert InvalidAddress();
        }

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _grantRole(ORACLE_ROLE, oracle);
        _grantRole(UPGRADER_ROLE, defaultAdmin);

        // Fator de rede inicial = 1.0x
        networkFactor = 100;
    }

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Funda o pool de recompensas com CC nativo
     * @dev Qualquer um pode fundar, mas geralmente o admin
     */
    function fundRewardsPool() external payable {
        if (msg.value == 0) revert InvalidAmount();

        rewardsPool += msg.value;
        emit RewardsPoolFunded(msg.sender, msg.value);
    }

    /**
     * @notice Claim de recompensas por horas dirigidas
     * @param driver Endereço do motorista
     * @param normalHours Horas normais dirigidas (max 8)
     * @param extraHours Horas extras dirigidas (max 4)
     * @param safetyScore Safety Score do período (0-100)
     * @dev Apenas ORACLE_ROLE pode chamar (backend autorizado)
     */
    function claimRewards(
        address driver,
        uint256 normalHours,
        uint256 extraHours,
        uint256 safetyScore
    ) external onlyRole(ORACLE_ROLE) whenNotPaused nonReentrant {
        if (driver == address(0)) revert InvalidAddress();
        if (safetyScore > 100) revert InvalidScore();
        if (normalHours > MAX_NORMAL_HOURS) revert InvalidHours();
        if (extraHours > MAX_EXTRA_HOURS) revert InvalidHours();

        // Reset diário
        uint256 today = block.timestamp / 1 days;
        if (lastClaimDay[driver] != today) {
            lastClaimDay[driver] = today;
            normalHoursToday[driver] = 0;
            extraHoursToday[driver] = 0;
        }

        // Verifica limites diários
        if (normalHoursToday[driver] + normalHours > MAX_NORMAL_HOURS) {
            revert ExceedsMaxNormalHours();
        }
        if (extraHoursToday[driver] + extraHours > MAX_EXTRA_HOURS) {
            revert ExceedsMaxExtraHours();
        }

        // Calcula recompensa
        uint256 reward = calculateReward(driver, normalHours, extraHours, safetyScore);

        if (reward > rewardsPool) revert InsufficientRewardsPool();

        // Atualiza estado
        normalHoursToday[driver] += normalHours;
        extraHoursToday[driver] += extraHours;
        rewardsPool -= reward;
        totalRewardsDistributed += reward;

        // Transfere CC nativo
        (bool success, ) = driver.call{value: reward}("");
        if (!success) revert TransferFailed();

        emit RewardsClaimed(driver, normalHours, extraHours, safetyScore, reward);
    }

    /**
     * @notice Define o multiplicador de um motorista
     * @param driver Endereço do motorista
     * @param multiplier Novo multiplicador (100 = 1.0x, max 250 = 2.5x)
     */
    function setMultiplier(address driver, uint256 multiplier) external onlyRole(ORACLE_ROLE) {
        if (driver == address(0)) revert InvalidAddress();
        if (multiplier < 100 || multiplier > 250) revert InvalidAmount();

        uint256 oldMultiplier = driverMultiplier[driver];
        driverMultiplier[driver] = multiplier;

        emit MultiplierUpdated(driver, oldMultiplier, multiplier);
    }

    /**
     * @notice Atualiza o fator de rede
     * @param factor Novo fator (100 = 1.0x)
     */
    function updateNetworkFactor(uint256 factor) external onlyRole(ADMIN_ROLE) {
        if (factor < 50 || factor > 200) revert InvalidAmount();

        uint256 oldFactor = networkFactor;
        networkFactor = factor;

        emit NetworkFactorUpdated(oldFactor, factor);
    }

    /**
     * @notice Retira fundos do pool (emergência)
     * @param to Endereço de destino
     * @param amount Quantidade a retirar
     */
    function withdrawFromPool(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (to == address(0)) revert InvalidAddress();
        if (amount > rewardsPool) revert InsufficientRewardsPool();

        rewardsPool -= amount;

        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit RewardsPoolWithdrawn(to, amount);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Calcula a recompensa para um claim
     * @dev Fórmula: Tokens = Horas × (SafetyScore/100) × Multiplicador × FatorRede
     */
    function calculateReward(
        address driver,
        uint256 normalHours,
        uint256 extraHours,
        uint256 safetyScore
    ) public view returns (uint256) {
        uint256 multiplier = driverMultiplier[driver];
        if (multiplier == 0) multiplier = 100; // Default 1.0x

        // Recompensa horas normais
        uint256 normalReward = normalHours * BASE_TOKENS_PER_HOUR;

        // Recompensa horas extras (1.5x)
        uint256 extraReward = (extraHours * BASE_TOKENS_PER_HOUR * EXTRA_HOURS_MULTIPLIER) / PERCENTAGE_BASE;

        // Total base
        uint256 baseReward = normalReward + extraReward;

        // Aplica Safety Score (0-100%)
        uint256 withScore = (baseReward * safetyScore) / PERCENTAGE_BASE;

        // Aplica multiplicador do motorista
        uint256 withMultiplier = (withScore * multiplier) / PERCENTAGE_BASE;

        // Aplica fator de rede
        uint256 finalReward = (withMultiplier * networkFactor) / PERCENTAGE_BASE;

        return finalReward;
    }

    /**
     * @notice Retorna informações do motorista
     */
    function getDriverInfo(address driver) external view returns (
        uint256 multiplier,
        uint256 normalHoursClaimed,
        uint256 extraHoursClaimed,
        uint256 remainingNormalHours,
        uint256 remainingExtraHours
    ) {
        uint256 today = block.timestamp / 1 days;

        multiplier = driverMultiplier[driver];
        if (multiplier == 0) multiplier = 100;

        if (lastClaimDay[driver] == today) {
            normalHoursClaimed = normalHoursToday[driver];
            extraHoursClaimed = extraHoursToday[driver];
        }

        remainingNormalHours = MAX_NORMAL_HOURS - normalHoursClaimed;
        remainingExtraHours = MAX_EXTRA_HOURS - extraHoursClaimed;
    }

    /**
     * @notice Recebe CC nativo para o pool
     */
    receive() external payable {
        rewardsPool += msg.value;
        emit RewardsPoolFunded(msg.sender, msg.value);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
