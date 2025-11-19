# CargoCoin - A Cryptocurrency for Safe Driving

## Visão Geral

CargoCoin é uma criptomoeda inovadora que recompensa motoristas de transporte de carga e pessoas comuns por dirigirem de forma segura e respeitarem as leis de trânsito. Ao invés do tradicional Proof-of-Work (PoW), CargoCoin utiliza **Proof-of-Safe-Driving (PoSD)** - um mecanismo de consenso único que valida comportamento de direção seguro.

## Como Funciona

### Mecanismo de Consenso: Proof-of-Safe-Driving (PoSD)

Ao invés de minerar através de cálculos computacionais intensivos, motoristas "mineram" CargoCoin simplesmente dirigindo de forma segura. O sistema coleta dados de telemetria veicular e GPS para validar o comportamento de direção.

### Dados de Direção Coletados

Para cada sessão de direção, o sistema coleta:

1. **Localização GPS**
   - Coordenadas de latitude e longitude
   - Hash da rota completa para verificação

2. **Métricas de Direção**
   - Distância percorrida (metros)
   - Duração da viagem (segundos)
   - Velocidade média
   - Velocidade máxima

3. **Métricas de Segurança**
   - Número de frenagens bruscas
   - Número de acelerações bruscas
   - Número de violações de limite de velocidade

4. **Identificação do Motorista**
   - Hash da chave pública do motorista
   - Assinatura digital dos dados

### Sistema de Pontuação

Cada sessão de direção recebe uma pontuação de 0 a 1000 baseada em:

#### Bônus (Aumentam a Pontuação)
- ✅ Manter velocidade ideal entre 60-70 km/h: +100 pontos
- ✅ Distância percorrida: +10 pontos por km (máx +200)
- ✅ Duração da viagem: +5 pontos por minuto (máx +100)

#### Penalidades (Reduzem a Pontuação)
- ❌ Velocidade acima de 80 km/h: -50 pontos por km/h excedido
- ❌ Frenagem brusca: -20 pontos por evento
- ❌ Aceleração brusca: -15 pontos por evento
- ❌ Violação de velocidade: -100 pontos por violação

### Requisitos Mínimos para Minerar

Para criar um bloco válido, o motorista deve:

- Dirigir pelo menos **1 km**
- Dirigir por pelo menos **2 minutos**
- Não exceder **80 km/h** (ajustável)
- Manter no máximo **5 frenagens bruscas**
- Manter no máximo **5 acelerações bruscas**
- **Zero violações** de velocidade (mainnet)

## Especificações Técnicas

### Parâmetros da Blockchain

| Parâmetro | Valor |
|-----------|-------|
| **Tempo de Bloco** | 5 minutos |
| **Dificuldade de Ajuste** | A cada 2016 blocos (~1 semana) |
| **Halving** | A cada 420.000 blocos (~4 anos) |
| **Recompensa Inicial** | 50 CARGO |
| **Porta P2P** | 9333 |
| **Prefixo de Endereço** | Começa com 'C' (Base58) |
| **Bech32 HRP** | cargo (cargo1...) |

### Estrutura do Bloco

O header do bloco CargoCoin estende o header tradicional do Bitcoin:

```cpp
class CBlockHeader {
    int32_t nVersion;
    uint256 hashPrevBlock;
    uint256 hashMerkleRoot;
    uint32_t nTime;
    uint32_t nBits;
    uint32_t nNonce;

    // CargoCoin: Campos adicionais
    uint256 hashDrivingData;  // Hash dos dados de direção
    uint32_t drivingScore;    // Pontuação de direção (0-1000)
};
```

### Dados de Direção

```cpp
class CDrivingData {
    int32_t latitude;          // Latitude * 10^7
    int32_t longitude;         // Longitude * 10^7
    uint32_t distance;         // Distância em metros
    uint32_t duration;         // Duração em segundos
    uint16_t avgSpeed;         // Velocidade média (km/h * 10)
    uint16_t maxSpeed;         // Velocidade máxima (km/h * 10)
    uint16_t hardBrakes;       // Contagem de frenagens bruscas
    uint16_t hardAccel;        // Contagem de acelerações bruscas
    uint8_t speedViolations;   // Contagem de violações de velocidade
    uint256 routeHash;         // Hash da rota GPS
    uint256 driverPubKeyHash;  // Hash da chave pública do motorista
    uint32_t sessionStart;     // Timestamp de início
    vector<byte> signature;    // Assinatura digital
};
```

## Implementação Técnica

### Arquivos Principais Modificados/Criados

1. **`src/primitives/drivingdata.h/cpp`** - Estruturas de dados de direção
2. **`src/primitives/block.h`** - Header de bloco estendido
3. **`src/posd.h/cpp`** - Lógica de Proof-of-Safe-Driving
4. **`src/consensus/params.h`** - Parâmetros de consenso
5. **`src/kernel/chainparams.cpp`** - Parâmetros da chain

### Funções de Validação

- `CheckProofOfSafeDriving()` - Valida dados de direção
- `ValidateDrivingDataSignature()` - Verifica assinatura
- `CheckDrivingDataHash()` - Verifica hash no header
- `VerifyDrivingScore()` - Valida cálculo de pontuação
- `GetNextRequiredDrivingScore()` - Ajuste de dificuldade

## Como Usar

### Para Motoristas

1. **Instalar App Móvel/Dispositivo**
   - Conectar ao veículo via OBD-II ou usar sensores do smartphone
   - Criar carteira CargoCoin

2. **Dirigir de Forma Segura**
   - Respeitar limites de velocidade (máx 80 km/h)
   - Evitar frenagens e acelerações bruscas
   - Manter velocidade constante entre 60-70 km/h

3. **Submeter Dados de Direção**
   - Após completar uma viagem, os dados são automaticamente coletados
   - App assina digitalmente os dados com sua chave privada
   - Dados são enviados para a rede CargoCoin

4. **Receber Recompensas**
   - Se seus dados forem válidos e você criar um bloco, receberá CARGO
   - Quanto melhor sua pontuação, maior a chance de sucesso

### Para Desenvolvedores

#### Compilar CargoCoin

```bash
cd cargocoin
cmake -B build
cmake --build build
```

#### Executar Node

```bash
./build/src/cargocoind -daemon
```

#### RPC para Submeter Dados de Direção

```bash
# Submeter dados de direção (a ser implementado)
cargocoin-cli submitdrivingdata '{
  "latitude": -235505199,
  "longitude": -466333094,
  "distance": 5000,
  "duration": 600,
  "avgSpeed": 650,
  "maxSpeed": 750,
  "hardBrakes": 2,
  "hardAccel": 1,
  "speedViolations": 0,
  "routeHash": "...",
  "signature": "..."
}'
```

## Ajuste de Dificuldade

Similar ao Bitcoin, mas ao invés de ajustar a dificuldade de hash, CargoCoin ajusta a **pontuação mínima requerida**:

- **Blocos muito rápidos** → Aumenta pontuação requerida (precisa dirigir melhor)
- **Blocos muito lentos** → Diminui pontuação requerida (aceita pontuação menor)

Isso mantém o tempo de bloco estável em ~5 minutos.

## Segurança e Anti-Fraude

### Validações Implementadas

1. **Assinatura Digital** - Todos os dados devem ser assinados pela chave privada do motorista
2. **Hash de Rota** - A rota GPS completa é hasheada para prevenir fabricação
3. **Verificação de Consistência** - Velocidade calculada vs velocidade reportada
4. **Limites Físicos** - Velocidade máxima absoluta de 150 km/h
5. **Tempo Real** - Timestamps devem ser recentes

### Medidas Anti-Simulação

- Dados GPS devem mostrar movimento real
- Timestamps devem ser consistentes
- Padrões de aceleração devem ser realistas
- Múltiplas submissões do mesmo motorista são monitoradas

## Roadmap

### Fase 1: Implementação Base ✅
- [x] Estrutura de dados de direção
- [x] Modificação do header de bloco
- [x] Sistema de pontuação
- [x] Validação básica
- [x] Parâmetros de consenso

### Fase 2: Mineração e RPC (Em Progresso)
- [ ] Implementar minerador de dados de direção
- [ ] RPCs para submissão de dados
- [ ] Interface para apps móveis
- [ ] Validação de assinatura completa

### Fase 3: App Móvel
- [ ] App Android
- [ ] App iOS
- [ ] Integração com OBD-II
- [ ] Dashboard do motorista

### Fase 4: Rede e Deployment
- [ ] Minerar genesis block
- [ ] Configurar seed nodes
- [ ] Testnet pública
- [ ] Mainnet launch

### Fase 5: Recursos Avançados
- [ ] Contratos inteligentes para frotas
- [ ] Sistema de reputação de motoristas
- [ ] Marketplace de dados de direção
- [ ] Integração com seguradoras
- [ ] Programa de recompensas para empresas de transporte

## Casos de Uso

### Para Motoristas Individuais
- Ganhar criptomoeda dirigindo para o trabalho
- Competir por melhores pontuações de direção
- Monetizar comportamento seguro

### Para Empresas de Transporte
- Incentivar motoristas a dirigir com segurança
- Reduzir custos com acidentes e manutenção
- Dados verificáveis de comportamento de direção
- Sistema de recompensas integrado

### Para Seguradoras
- Dados verificáveis de comportamento de direção
- Programas de seguro baseados em uso
- Preços mais justos baseados em dados reais

### Para Governos
- Incentivar direção segura em escala nacional
- Reduzir acidentes de trânsito
- Dados para planejamento de infraestrutura

## Benefícios

### Ambientais
- Incentiva direção suave e eficiente
- Reduz consumo de combustível
- Menor emissão de CO2

### Sociais
- Reduz acidentes de trânsito
- Salva vidas
- Tráfego mais fluido

### Econômicos
- Nova fonte de renda para motoristas
- Reduz custos operacionais de frotas
- Menor custo com seguros

## Contribuindo

CargoCoin é open-source! Contribuições são bem-vindas:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

CargoCoin é distribuído sob a licença MIT, assim como o Bitcoin Core.

## Contato

- Website: https://cargocoin.network (TBD)
- GitHub: https://github.com/cargocoin/cargocoin (TBD)
- Discord: https://discord.gg/cargocoin (TBD)
- Twitter: @CargoCoin (TBD)

---

**CargoCoin: Drive Safe, Earn Crypto** 🚛💰
