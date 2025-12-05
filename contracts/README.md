# CargoCoin Smart Contracts

Smart contracts para o ecossistema CargoCoin (CC) - um sistema de recompensas baseado em Proof of Safe Driving (PoSD).

## Nova Arquitetura: CargoCoin Chain (L3)

O CargoCoin agora opera em sua **própria blockchain (L3)** usando Polygon CDK, onde **CC é o token nativo de gas**. Isso elimina a necessidade de pagar taxas em MATIC ou qualquer outro token externo.

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA L1/L3                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Polygon PoS (L1)              CargoCoin Chain (L3)         │
│  ┌───────────────┐             ┌───────────────┐           │
│  │ CargoCoinL1   │◄──bridge───►│ CC (nativo)   │           │
│  │ (ERC-20)      │             │ (gas token)   │           │
│  └───────────────┘             ├───────────────┤           │
│                                │WrappedCC (WCC)│           │
│                                │ (ERC-20)      │           │
│                                ├───────────────┤           │
│                                │CargoCoinReward│           │
│                                │ (PoSD)        │           │
│                                └───────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Benefícios da L3 Própria

| Aspecto | Antes (Polygon PoS) | Agora (CargoCoin Chain) |
|---------|---------------------|-------------------------|
| Gas Token | MATIC (custo externo) | CC (seu token) |
| Taxas | Paga em MATIC | Paga em CC |
| Controle | Limitado | Total |
| Throughput | Compartilhado | Dedicado |
| Custo operacional | Alto | Baixo |

## Estrutura de Contratos

```
contracts/
├── contracts/
│   ├── L1/
│   │   └── CargoCoinL1.sol      # Token ERC-20 na Polygon PoS
│   └── L3/
│       ├── WrappedCargoCoin.sol # Versão ERC-20 do CC nativo
│       └── CargoCoinRewards.sol # Contrato de recompensas PoSD
├── cdk-config/
│   ├── genesis.json             # Configuração genesis da L3
│   ├── node-config.toml         # Configuração do node CDK
│   └── docker-compose.yml       # Infraestrutura Docker
├── scripts/
│   ├── deploy-l1.ts             # Deploy na Polygon PoS
│   └── deploy-l3.ts             # Deploy na CargoCoin Chain
└── test/
    └── CargoCoin.test.ts        # Testes unitários
```

## Contratos

### L1: CargoCoinL1.sol

Token ERC-20 na Polygon PoS que serve como:
- Reserva de valor na L1
- Token de origem para bridge para L3
- Liquidez em DEXs da Polygon

**Funcionalidades:**
- ERC-20 padrão com 18 decimais
- Supply máximo: 1 bilhão CC
- Upgradeable (UUPS)
- Funções de bridge integradas

### L3: CC Nativo (Gas Token)

Na CargoCoin Chain, CC é o token **nativo** (como ETH no Ethereum):
- Usado para pagar gas de transações
- Criado na genesis
- Bridgeado da L1

### L3: WrappedCargoCoin.sol (WCC)

Versão ERC-20 do CC nativo (como WETH):
- `deposit()`: CC nativo → WCC (ERC-20)
- `withdraw()`: WCC → CC nativo
- Necessário para DEXs e DeFi na L3

### L3: CargoCoinRewards.sol

Contrato de recompensas Proof of Safe Driving:

**Fórmula:**
```
Tokens = Horas × (SafetyScore/100) × Multiplicador × FatorRede
```

**Regras:**
- Máximo 8h normais + 4h extras por dia
- Horas extras = 1.5x multiplicador
- Safety Score: 0-100
- Multiplicador: 1.0x a 2.5x

## Instalação

```bash
cd contracts
npm install
```

## Configuração

```bash
cp .env.example .env
# Edite .env com suas chaves
```

## Comandos

### Compilar

```bash
npm run compile
```

### Testes

```bash
npm run test
npm run test:coverage
```

### Deploy

```bash
# L1 (Polygon PoS)
npm run deploy:l1:amoy      # Testnet
npm run deploy:l1:polygon   # Mainnet

# L3 (CargoCoin Chain)
npm run deploy:l3:testnet   # Testnet
npm run deploy:l3:mainnet   # Mainnet

# Deploy completo
npm run deploy:all:testnet
npm run deploy:all:mainnet
```

## Configurando a CargoCoin Chain (L3)

### 1. Pré-requisitos

- Docker e Docker Compose
- Node.js 18+
- Polygon CDK CLI

### 2. Iniciar Infraestrutura

```bash
cd cdk-config
docker-compose up -d
```

Isso inicia:
- Node CDK (sequencer)
- PostgreSQL
- Blockscout (explorer)
- Prometheus + Grafana (monitoring)

### 3. Configurar Genesis

Edite `cdk-config/genesis.json`:
- Substitua `CARGOCOIN_L1_ADDRESS_PLACEHOLDER` pelo endereço do CargoCoinL1
- Substitua `ADMIN_ADDRESS_PLACEHOLDER` pelo endereço admin
- Substitua `REWARDS_POOL_ADDRESS_PLACEHOLDER` pelo endereço do pool

### 4. Deploy dos Contratos

```bash
# 1. Deploy L1 (Polygon PoS)
npm run deploy:l1:polygon

# 2. Configurar bridge no CargoCoinL1
# (após bridge CDK estar deployado)

# 3. Deploy L3 (CargoCoin Chain)
npm run deploy:l3:mainnet
```

## Fluxo de Uso

### Para Motoristas

1. Motorista dirige com app CargoCoin
2. Backend calcula Safety Score
3. Backend chama `claimRewards()` no contrato
4. Motorista recebe CC nativo na carteira
5. CC pode ser usado para gas ou bridgeado para L1

### Para Bridge L1 ↔ L3

**L1 → L3:**
```solidity
// Na Polygon PoS
cargoCoinL1.bridgeToL3(amount, l3RecipientAddress);
// CC aparece na CargoCoin Chain
```

**L3 → L1:**
```solidity
// Na CargoCoin Chain
// Usar bridge nativo do CDK
// CC aparece na Polygon PoS como CargoCoinL1
```

## Tokenomics

| Alocação | % | Tokens | Localização |
|----------|---|--------|-------------|
| Recompensas PoSD | 40% | 400M | L3 (pool) |
| Equipe/Fundadores | 20% | 200M | L1 (vesting) |
| Investidores | 15% | 150M | L1 (vesting) |
| Ecossistema | 10% | 100M | L1 |
| Reserva | 10% | 100M | L1 |
| Liquidez | 5% | 50M | L1 (DEX) |

## Redes

| Rede | Chain ID | Tipo | Gas Token |
|------|----------|------|-----------|
| Polygon PoS | 137 | L1 | MATIC |
| Polygon Amoy | 80002 | L1 Testnet | MATIC |
| CargoCoin Chain | 776655 | L3 | CC |
| CargoCoin Testnet | 776656 | L3 Testnet | CC |

## Segurança

- Auditar contratos antes do mainnet
- Usar multi-sig para roles admin
- Monitorar eventos de bridge
- Backup das chaves do sequencer

## Licença

MIT
