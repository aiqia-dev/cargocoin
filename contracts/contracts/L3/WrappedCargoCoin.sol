// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title Wrapped CargoCoin (WCC)
 * @author CargoCoin Team
 * @notice Versão ERC-20 do token nativo CargoCoin na CargoCoin Chain (L3)
 * @dev Similar ao WETH no Ethereum. Permite usar CC nativo como ERC-20.
 *
 * Na CargoCoin Chain (L3):
 *   - CC é o token NATIVO (usado para gas)
 *   - WCC é a versão wrapped ERC-20 (para DEXs, DeFi, etc)
 *
 * Uso:
 *   - deposit(): Envia CC nativo, recebe WCC (ERC-20)
 *   - withdraw(): Queima WCC, recebe CC nativo
 */
contract WrappedCargoCoin is ERC20, ERC20Permit {
    // ============================================
    // EVENTS
    // ============================================

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    // ============================================
    // ERRORS
    // ============================================

    error InsufficientBalance();
    error TransferFailed();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor() ERC20("Wrapped CargoCoin", "WCC") ERC20Permit("Wrapped CargoCoin") {}

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Deposita CC nativo e recebe WCC (ERC-20)
     * @dev Envia CC nativo com a transação, recebe WCC equivalente
     */
    function deposit() external payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Saca CC nativo queimando WCC
     * @param amount Quantidade de WCC a queimar
     */
    function withdraw(uint256 amount) external {
        if (balanceOf(msg.sender) < amount) {
            revert InsufficientBalance();
        }

        _burn(msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }

        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @notice Permite depósito direto enviando CC para o contrato
     */
    receive() external payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Retorna o total de CC nativo bloqueado neste contrato
     */
    function totalDeposited() external view returns (uint256) {
        return address(this).balance;
    }
}
