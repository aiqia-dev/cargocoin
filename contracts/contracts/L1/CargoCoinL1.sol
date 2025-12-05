// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title CargoCoin L1 (CC)
 * @author CargoCoin Team
 * @notice Token ERC-20 na Polygon PoS (L1) para bridge com CargoCoin Chain (L3)
 * @dev Este token é deployado na Polygon PoS e serve como:
 *      - Token de origem para bridge para a CargoCoin Chain (L3)
 *      - Reserva de valor na L1
 *      - Liquidez em DEXs da Polygon
 *
 * Quando bridgeado para L3, este token se torna o GAS TOKEN nativo.
 *
 * Arquitetura:
 *   Polygon PoS (L1): CargoCoinL1 (ERC-20)
 *         ↓ bridge
 *   CargoCoin Chain (L3): CC nativo (gas token)
 *
 * Supply Máximo: 1.000.000.000 CC (1 bilhão)
 */
contract CargoCoinL1 is
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

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    /// @notice Supply máximo de tokens (1 bilhão com 18 decimais)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Endereço do contrato bridge para L3
    address public bridgeAddress;

    /// @notice Total de tokens bloqueados no bridge (enviados para L3)
    uint256 public totalBridgedToL3;

    // ============================================
    // EVENTS
    // ============================================

    event TokensMinted(address indexed to, uint256 amount);
    event BridgeAddressUpdated(address indexed oldBridge, address indexed newBridge);
    event BridgedToL3(address indexed from, address indexed l3Recipient, uint256 amount);
    event BridgedFromL3(address indexed to, uint256 amount);

    // ============================================
    // ERRORS
    // ============================================

    error ExceedsMaxSupply(uint256 requested, uint256 available);
    error InvalidAddress();
    error InvalidAmount();
    error BridgeNotSet();

    // ============================================
    // INITIALIZER
    // ============================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Inicializa o contrato CargoCoin L1
     * @param defaultAdmin Endereço do administrador padrão
     * @param initialSupplyRecipient Endereço que receberá o supply inicial
     * @param initialSupply Supply inicial a ser mintado (para liquidez, equipe, etc)
     */
    function initialize(
        address defaultAdmin,
        address initialSupplyRecipient,
        uint256 initialSupply
    ) public initializer {
        if (defaultAdmin == address(0) || initialSupplyRecipient == address(0)) {
            revert InvalidAddress();
        }
        if (initialSupply > MAX_SUPPLY) {
            revert ExceedsMaxSupply(initialSupply, MAX_SUPPLY);
        }

        __ERC20_init("CargoCoin", "CC");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(UPGRADER_ROLE, defaultAdmin);

        // Minta supply inicial
        if (initialSupply > 0) {
            _mint(initialSupplyRecipient, initialSupply);
            emit TokensMinted(initialSupplyRecipient, initialSupply);
        }
    }

    // ============================================
    // BRIDGE FUNCTIONS
    // ============================================

    /**
     * @notice Define o endereço do contrato bridge
     * @param _bridgeAddress Endereço do bridge contract
     */
    function setBridgeAddress(address _bridgeAddress) external onlyRole(ADMIN_ROLE) {
        if (_bridgeAddress == address(0)) revert InvalidAddress();

        address oldBridge = bridgeAddress;
        bridgeAddress = _bridgeAddress;

        // Concede role de bridge ao novo endereço
        if (oldBridge != address(0)) {
            _revokeRole(BRIDGE_ROLE, oldBridge);
        }
        _grantRole(BRIDGE_ROLE, _bridgeAddress);

        emit BridgeAddressUpdated(oldBridge, _bridgeAddress);
    }

    /**
     * @notice Bloqueia tokens para bridge para L3
     * @param amount Quantidade a enviar para L3
     * @param l3Recipient Endereço do destinatário na L3
     * @dev Usuário chama esta função para enviar tokens para L3
     *      O bridge escuta o evento e minta no L3
     */
    function bridgeToL3(uint256 amount, address l3Recipient) external whenNotPaused {
        if (bridgeAddress == address(0)) revert BridgeNotSet();
        if (amount == 0) revert InvalidAmount();
        if (l3Recipient == address(0)) revert InvalidAddress();

        // Transfere tokens para o bridge (bloqueia)
        _transfer(msg.sender, bridgeAddress, amount);
        totalBridgedToL3 += amount;

        emit BridgedToL3(msg.sender, l3Recipient, amount);
    }

    /**
     * @notice Libera tokens do bridge (retorno da L3)
     * @param to Endereço do destinatário na L1
     * @param amount Quantidade a liberar
     * @dev Apenas o bridge pode chamar esta função
     */
    function bridgeFromL3(address to, uint256 amount) external onlyRole(BRIDGE_ROLE) {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        totalBridgedToL3 -= amount;
        _transfer(bridgeAddress, to, amount);

        emit BridgedFromL3(to, amount);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Minta novos tokens
     * @param to Endereço que receberá os tokens
     * @param amount Quantidade de tokens a mintar
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

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function maxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function availableSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @notice Retorna o supply em circulação na L1 (excluindo bridgeados)
     */
    function circulatingSupplyL1() external view returns (uint256) {
        return totalSupply() - totalBridgedToL3;
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._update(from, to, value);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
