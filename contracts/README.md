# CargoCoin Smart Contracts

Smart contracts para o token CargoCoin (CC) - um sistema de recompensas baseado em Proof of Safe Driving (PoSD) na rede Polygon.

## Visão Geral

O CargoCoin é um token ERC-20 projetado para recompensar motoristas profissionais brasileiros por práticas de direção segura. O token opera na rede Polygon (Ethereum L2) e implementa:

- **Padrão ERC-20** com funcionalidades estendidas
- **Supply máximo**: 1.000.000.000 CC (1 bilhão)
- **Burn automático**: 2% por transação
- **Pausável**: Para emergências
- **Upgradeable**: Padrão UUPS Proxy

## Arquitetura

```
contracts/
├── contracts/
│   └── CargoCoin.sol      # Token principal ERC-20
├── scripts/
│   ├── deploy.ts          # Script de deploy
│   └── upgrade.ts         # Script de upgrade
├── test/
│   └── CargoCoin.test.ts  # Testes unitários
├── hardhat.config.ts      # Configuração Hardhat
└── package.json           # Dependências
```

## Requisitos

- Node.js v18+
- npm ou yarn

## Instalação

```bash
cd contracts
npm install
```

## Configuração

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Configure as variáveis de ambiente:
```env
PRIVATE_KEY=sua_chave_privada
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGONSCAN_API_KEY=sua_api_key
```

## Comandos

### Compilar Contratos

```bash
npm run compile
```

### Executar Testes

```bash
npm run test
```

### Cobertura de Testes

```bash
npm run test:coverage
```

### Deploy

```bash
# Localhost (Hardhat Network)
npm run node                    # Terminal 1: iniciar nó local
npm run deploy:localhost        # Terminal 2: deploy

# Mumbai Testnet
npm run deploy:mumbai

# Polygon Mainnet
npm run deploy:polygon
```

### Verificar Contrato

```bash
npx hardhat verify --network mumbai <IMPLEMENTATION_ADDRESS>
```

## Roles (Controle de Acesso)

| Role | Descrição |
|------|-----------|
| `DEFAULT_ADMIN_ROLE` | Administrador padrão, pode gerenciar todas as roles |
| `ADMIN_ROLE` | Pode configurar burn exemptions e auto-burn |
| `MINTER_ROLE` | Pode mintar novos tokens (contrato de recompensas) |
| `PAUSER_ROLE` | Pode pausar/despausar o contrato |
| `UPGRADER_ROLE` | Pode autorizar upgrades do contrato |

## Funcionalidades Principais

### Mint Controlado
Apenas endereços com `MINTER_ROLE` podem mintar novos tokens. Isso garante que apenas o contrato de recompensas autorizado possa criar novos tokens.

```solidity
function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE)
```

### Burn Automático (2%)
Cada transferência queima automaticamente 2% do valor. Endereços podem ser isentados desta taxa.

```solidity
// Verificar valor de burn
function calculateBurnAmount(uint256 amount) public pure returns (uint256)

// Isentar endereço
function setBurnExemption(address account, bool exempt) external onlyRole(ADMIN_ROLE)
```

### Pausável
Em caso de emergência, o contrato pode ser pausado para interromper todas as transferências.

```solidity
function pause() external onlyRole(PAUSER_ROLE)
function unpause() external onlyRole(PAUSER_ROLE)
```

### Upgradeable (UUPS)
O contrato pode ser atualizado mantendo o estado e o endereço do proxy.

```bash
# Definir endereço do proxy
export CARGOCOIN_PROXY_ADDRESS=0x...

# Executar upgrade
npx hardhat run scripts/upgrade.ts --network <network>
```

## Tokenomics

| Alocação | Porcentagem | Tokens |
|----------|-------------|--------|
| Recompensas de mineração | 40% | 400.000.000 |
| Equipe e fundadores | 20% | 200.000.000 |
| Investidores | 15% | 150.000.000 |
| Ecossistema/Parcerias | 10% | 100.000.000 |
| Reserva/Tesouraria | 10% | 100.000.000 |
| Liquidez inicial | 5% | 50.000.000 |

## Redes Suportadas

| Rede | Chain ID | Status |
|------|----------|--------|
| Hardhat Local | 31337 | Desenvolvimento |
| Polygon Amoy | 80002 | Testnet |
| Polygon Mumbai | 80001 | Testnet (deprecated) |
| Polygon Mainnet | 137 | Produção |

## Segurança

- Auditoria de código recomendada antes do deploy em mainnet
- Utilize multi-sig para roles administrativas em produção
- Monitore eventos de `AutoBurn`, `TokensMinted` e `Paused`

## Licença

MIT
