// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title CargoCoin (CC)
 * @author CargoCoin Team
 * @notice Token ERC-20 para o sistema Proof of Safe Driving (PoSD)
 * @dev Implementa um token ERC-20 upgradeable com:
 *      - Mint controlado (apenas contrato de recompensas)
 *      - Burn de 2% por transação
 *      - Pausável para emergências
 *      - Padrão UUPS Upgradeable
 *
 * Rede: Polygon (Mumbai testnet / Mainnet)
 * Supply Máximo: 1.000.000.000 CC (1 bilhão)
 */
contract CargoCoin is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ============================================
    // CONSTANTS
    // ============================================

    /// @notice Role para administração do contrato
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Role para mint de tokens (contrato de recompensas)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role para pausar/despausar o contrato
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role para atualizar o contrato (UUPS)
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Supply máximo de tokens (1 bilhão com 18 decimais)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;

    /// @notice Taxa de burn por transação (2% = 200 basis points)
    uint256 public constant BURN_RATE = 200;

    /// @notice Denominador para cálculo de porcentagem (100% = 10000 basis points)
    uint256 public constant PERCENTAGE_DENOMINATOR = 10000;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Total de tokens queimados desde o início
    uint256 public totalBurned;

    /// @notice Endereços isentos da taxa de burn
    mapping(address => bool) public burnExempt;

    /// @notice Flag para habilitar/desabilitar burn automático
    bool public autoBurnEnabled;

    // ============================================
    // EVENTS
    // ============================================

    /// @notice Emitido quando tokens são mintados
    event TokensMinted(address indexed to, uint256 amount);

    /// @notice Emitido quando tokens são queimados automaticamente
    event AutoBurn(address indexed from, address indexed to, uint256 burnAmount);

    /// @notice Emitido quando um endereço é adicionado/removido da isenção de burn
    event BurnExemptionUpdated(address indexed account, bool exempt);

    /// @notice Emitido quando o auto burn é habilitado/desabilitado
    event AutoBurnStatusUpdated(bool enabled);

    // ============================================
    // ERRORS
    // ============================================

    /// @notice Erro quando o mint excede o supply máximo
    error ExceedsMaxSupply(uint256 requested, uint256 available);

    /// @notice Erro quando o endereço é inválido (zero address)
    error InvalidAddress();

    /// @notice Erro quando o valor é inválido (zero)
    error InvalidAmount();

    // ============================================
    // INITIALIZER
    // ============================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Inicializa o contrato CargoCoin
     * @param defaultAdmin Endereço do administrador padrão
     * @param minter Endereço inicial com permissão de mint (contrato de recompensas)
     * @dev Configura roles e habilita auto burn por padrão
     */
    function initialize(address defaultAdmin, address minter) public initializer {
        if (defaultAdmin == address(0) || minter == address(0)) {
            revert InvalidAddress();
        }

        __ERC20_init("CargoCoin", "CC");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // Configura roles
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(UPGRADER_ROLE, defaultAdmin);

        // Habilita auto burn por padrão
        autoBurnEnabled = true;

        // Isenta o endereço zero e o próprio contrato de burn
        burnExempt[address(0)] = true;
        burnExempt[address(this)] = true;
    }

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Minta novos tokens
     * @param to Endereço que receberá os tokens
     * @param amount Quantidade de tokens a mintar
     * @dev Apenas endereços com MINTER_ROLE podem chamar
     * @dev Não pode exceder MAX_SUPPLY
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 newTotalSupply = totalSupply() + amount;
        if (newTotalSupply > MAX_SUPPLY) {
            revert ExceedsMaxSupply(amount, MAX_SUPPLY - totalSupply());
        }

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Pausa todas as transferências de tokens
     * @dev Apenas endereços com PAUSER_ROLE podem chamar
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Despausa as transferências de tokens
     * @dev Apenas endereços com PAUSER_ROLE podem chamar
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Define se um endereço está isento da taxa de burn
     * @param account Endereço a ser configurado
     * @param exempt True para isentar, false para remover isenção
     * @dev Apenas ADMIN_ROLE pode chamar
     */
    function setBurnExemption(address account, bool exempt) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert InvalidAddress();
        burnExempt[account] = exempt;
        emit BurnExemptionUpdated(account, exempt);
    }

    /**
     * @notice Habilita ou desabilita o auto burn em transferências
     * @param enabled True para habilitar, false para desabilitar
     * @dev Apenas ADMIN_ROLE pode chamar
     */
    function setAutoBurnEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        autoBurnEnabled = enabled;
        emit AutoBurnStatusUpdated(enabled);
    }

    /**
     * @notice Adiciona um novo minter (contrato de recompensas)
     * @param minter Endereço do novo minter
     * @dev Apenas DEFAULT_ADMIN_ROLE pode chamar
     */
    function addMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (minter == address(0)) revert InvalidAddress();
        _grantRole(MINTER_ROLE, minter);
    }

    /**
     * @notice Remove permissão de minter
     * @param minter Endereço a remover
     * @dev Apenas DEFAULT_ADMIN_ROLE pode chamar
     */
    function removeMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Retorna o supply máximo de tokens
     * @return Supply máximo (1 bilhão * 10^18)
     */
    function maxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    /**
     * @notice Retorna o supply disponível para mint
     * @return Quantidade de tokens que ainda podem ser mintados
     */
    function availableSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @notice Retorna o supply em circulação (excluindo queimados)
     * @return Supply total menos tokens queimados
     */
    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }

    /**
     * @notice Calcula a taxa de burn para um valor
     * @param amount Valor da transferência
     * @return burnAmount Valor a ser queimado (2%)
     */
    function calculateBurnAmount(uint256 amount) public pure returns (uint256 burnAmount) {
        burnAmount = (amount * BURN_RATE) / PERCENTAGE_DENOMINATOR;
    }

    /**
     * @notice Verifica se um endereço é minter
     * @param account Endereço a verificar
     * @return True se for minter
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Override do _update para implementar burn automático
     * @param from Endereço de origem
     * @param to Endereço de destino
     * @param value Valor da transferência
     * @dev Implementa burn de 2% em transferências (exceto mint/burn)
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        // Se é mint (from == 0), burn (to == 0), ou auto burn desabilitado
        // ou se algum dos endereços é isento, não aplica burn automático
        if (
            from == address(0) ||
            to == address(0) ||
            !autoBurnEnabled ||
            burnExempt[from] ||
            burnExempt[to]
        ) {
            super._update(from, to, value);
            return;
        }

        // Calcula o burn de 2%
        uint256 burnAmount = calculateBurnAmount(value);
        uint256 transferAmount = value - burnAmount;

        // Realiza a transferência do valor líquido
        super._update(from, to, transferAmount);

        // Queima os tokens
        if (burnAmount > 0) {
            super._update(from, address(0), burnAmount);
            totalBurned += burnAmount;
            emit AutoBurn(from, to, burnAmount);
        }
    }

    /**
     * @notice Autorização para upgrade do contrato (UUPS)
     * @param newImplementation Endereço da nova implementação
     * @dev Apenas UPGRADER_ROLE pode autorizar upgrades
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
