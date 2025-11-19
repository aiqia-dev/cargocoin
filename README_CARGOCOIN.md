# CargoCoin 🚛💰

**Drive Safe, Earn Crypto**

Uma criptomoeda revolucionária que recompensa motoristas por dirigirem de forma segura e respeitarem as leis de trânsito.

## 🎯 O Que É CargoCoin?

CargoCoin é a primeira criptomoeda do mundo baseada em **Proof-of-Safe-Driving (PoSD)** - um mecanismo de consenso inovador que valida e recompensa comportamento seguro ao volante. Ao invés de gastar energia computacional minerando com GPUs, você "minera" CargoCoin simplesmente dirigindo com segurança!

### Conceito Principal

- 🚗 **Dirija com Segurança**: Respeite limites de velocidade, evite frenagens bruscas
- 📊 **Colete Dados**: Seu smartphone/dispositivo registra telemetria de direção
- 🔐 **Submeta Prova**: Assine digitalmente seus dados de direção
- 💰 **Receba Recompensas**: Ganhe CargoCoin por cada sessão de direção segura!

## ✨ Características Principais

### Para Motoristas
- ✅ Ganhe criptomoeda dirigindo para o trabalho
- ✅ Recompensas baseadas em comportamento real
- ✅ Incentivo financeiro para dirigir com segurança
- ✅ Competição amigável por melhores pontuações

### Para Empresas de Transporte
- ✅ Incentive motoristas automaticamente
- ✅ Reduza acidentes e custos operacionais
- ✅ Dados verificáveis e imutáveis
- ✅ Sistema de recompensas integrado

### Para a Sociedade
- ✅ Menos acidentes de trânsito
- ✅ Menor emissão de CO2
- ✅ Tráfego mais fluido
- ✅ Economia de combustível

## 🔧 Especificações Técnicas

| Especificação | Valor |
|---------------|-------|
| **Consenso** | Proof-of-Safe-Driving (PoSD) |
| **Tempo de Bloco** | 5 minutos |
| **Recompensa Inicial** | 50 CARGO |
| **Halving** | A cada 420.000 blocos (~4 anos) |
| **Porta P2P** | 9333 |
| **Prefixo de Endereço** | C (Base58) |
| **Bech32** | cargo1... |
| **Velocidade Máxima** | 80 km/h (padrão) |

## 📋 Requisitos para Minerar

Para criar um bloco válido e receber recompensas, você precisa:

### Requisitos Mínimos
- ⏱️ Dirigir por pelo menos **2 minutos**
- 📏 Percorrer pelo menos **1 km**
- 🚦 Não exceder **80 km/h**
- 🎯 Máximo de **5 frenagens bruscas**
- 🎯 Máximo de **5 acelerações bruscas**
- ⚠️ **Zero violações** de velocidade

### Sistema de Pontuação (0-1000)

#### Bônus
- +100 pts: Velocidade ideal (60-70 km/h)
- +10 pts/km: Distância percorrida (máx +200)
- +5 pts/min: Duração da viagem (máx +100)

#### Penalidades
- -50 pts/km/h: Velocidade acima de 80 km/h
- -20 pts: Cada frenagem brusca
- -15 pts: Cada aceleração brusca
- -100 pts: Cada violação de velocidade

## 🚀 Início Rápido

### Pré-requisitos

```bash
# Linux/Ubuntu
sudo apt-get install build-essential cmake git

# macOS
brew install cmake
```

### Compilar

```bash
git clone https://github.com/yourusername/cargocoin.git
cd cargocoin
cmake -B build
cmake --build build
```

### Executar Node

```bash
# Iniciar daemon
./build/src/cargocoind -daemon

# Verificar status
./build/src/cargocoin-cli getblockchaininfo

# Ver informações de direção
./build/src/cargocoin-cli getdrivinginfo
```

## 💻 Comandos RPC

### submitdrivingdata
Submeter dados de direção para minerar:

```bash
cargocoin-cli submitdrivingdata \
  -235505199 \      # latitude * 10^7
  -466333094 \      # longitude * 10^7
  5000 \            # distância (metros)
  600 \             # duração (segundos)
  650 \             # velocidade média (km/h * 10)
  750 \             # velocidade máxima (km/h * 10)
  2 \               # frenagens bruscas
  1 \               # acelerações bruscas
  0 \               # violações de velocidade
  "abc123..." \     # hash da rota
  "def456..." \     # hash da chave pública
  1732060800 \      # timestamp
  "sig789..."       # assinatura
```

### getdrivinginfo
Ver parâmetros e requisitos atuais:

```bash
cargocoin-cli getdrivinginfo
```

### calculatedrivingscore
Calcular pontuação antes de submeter:

```bash
cargocoin-cli calculatedrivingscore 5000 600 650 750 2 1 0
```

## 📱 App Móvel (Em Desenvolvimento)

Planejamos desenvolver apps para:
- 📱 Android
- 📱 iOS

Recursos:
- Coleta automática de dados via GPS e sensores
- Integração com OBD-II para telemetria veicular
- Dashboard em tempo real
- Histórico de viagens e ganhos
- Competições e rankings

## 🏗️ Arquitetura

### Estrutura de Arquivos Principais

```
cargocoin/
├── src/
│   ├── primitives/
│   │   ├── drivingdata.h/cpp    # Estruturas de dados de direção
│   │   └── block.h              # Block header estendido
│   ├── posd.h/cpp               # Proof-of-Safe-Driving
│   ├── rpc/
│   │   └── driving.h/cpp        # RPCs de direção
│   └── consensus/
│       └── params.h             # Parâmetros de consenso
├── doc/
│   └── CARGOCOIN.md            # Documentação detalhada
└── README_CARGOCOIN.md         # Este arquivo
```

### Fluxo de Dados

```
Motorista dirige
    ↓
Smartphone coleta GPS + telemetria
    ↓
App calcula métricas de segurança
    ↓
Motorista assina dados digitalmente
    ↓
Dados enviados via RPC submitdrivingdata
    ↓
Node valida dados e pontuação
    ↓
Se válido: Bloco criado e propagado
    ↓
Motorista recebe recompensa em CARGO
```

## 🔐 Segurança e Anti-Fraude

### Validações Implementadas

1. **Assinatura Digital**: Todos os dados são assinados criptograficamente
2. **Hash de Rota**: Rota GPS completa é hasheada
3. **Verificação de Consistência**: Velocidade vs distância/tempo
4. **Limites Físicos**: Velocidade máxima absoluta de 150 km/h
5. **Timestamps**: Devem ser recentes e realistas

### Proteções Anti-Simulação

- ✅ Padrões de GPS devem mostrar movimento real
- ✅ Aceleração deve seguir padrões veiculares realistas
- ✅ Múltiplas submissões do mesmo motorista são monitoradas
- ✅ Rede valida dados de forma descentralizada

## 🗺️ Roadmap

### ✅ Fase 1: Implementação Base (Concluído)
- [x] Estrutura de dados de direção
- [x] Proof-of-Safe-Driving
- [x] Sistema de pontuação
- [x] Validações de segurança
- [x] RPCs básicos

### 🔄 Fase 2: Infraestrutura (Em Progresso)
- [ ] Minerar genesis block
- [ ] Configurar seed nodes
- [ ] Testnet pública
- [ ] Documentação de API

### 📅 Fase 3: Aplicações (Planejado)
- [ ] App Android
- [ ] App iOS
- [ ] Integração OBD-II
- [ ] Dashboard web

### 🚀 Fase 4: Mainnet (Q2 2026)
- [ ] Auditoria de segurança
- [ ] Launch da mainnet
- [ ] Listagem em exchanges
- [ ] Parcerias com frotas

### 🌟 Fase 5: Expansão
- [ ] Contratos inteligentes
- [ ] Sistema de reputação
- [ ] Marketplace de dados
- [ ] Integração com seguradoras

## 🤝 Casos de Uso

### Motoristas Individuais
Ganhe CARGO no trajeto diário para o trabalho

### Empresas de Transporte
Sistema automático de incentivos para motoristas

### Seguradoras
Dados verificáveis para precificação justa de seguros

### Governos
Programa nacional de incentivo à direção segura

### Pesquisadores
Dados anônimos de comportamento de direção em larga escala

## 📚 Documentação

- 📖 [Documentação Completa](doc/CARGOCOIN.md)
- 🔧 [Guia de Desenvolvimento](doc/developer-notes.md)
- 🌐 [API Reference](doc/api-reference.md) (em breve)
- ❓ [FAQ](doc/faq.md) (em breve)

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Áreas que Precisam de Ajuda

- 📱 Desenvolvimento de apps móveis
- 🔐 Auditoria de segurança
- 📝 Documentação e tradução
- 🧪 Testes e QA
- 🎨 Design e UX
- 🌐 Infraestrutura de rede

## 📄 Licença

CargoCoin é distribuído sob a licença MIT, assim como o Bitcoin Core. Veja [LICENSE](COPYING) para mais detalhes.

## 🌍 Comunidade

- **Website**: https://cargocoin.network (em breve)
- **Discord**: https://discord.gg/cargocoin (em breve)
- **Twitter**: [@CargoCoin](https://twitter.com/cargocoin) (em breve)
- **Telegram**: https://t.me/cargocoin (em breve)
- **GitHub**: https://github.com/cargocoin

## 💡 Por Que CargoCoin?

### Problema
- 1.35 milhões de mortes por ano em acidentes de trânsito (OMS)
- US$ 518 bilhões em custos globais de acidentes
- Falta de incentivos diretos para direção segura

### Solução
- Incentivo financeiro imediato para comportamento seguro
- Dados verificáveis e imutáveis na blockchain
- Sistema descentralizado e transparente
- Gamificação positiva da segurança viária

### Impacto Esperado
- 🎯 Redução de 30-40% em acidentes entre usuários
- 💰 Economia de milhões em custos de acidentes
- 🌱 Redução de 15-20% em emissões de CO2
- 👥 Beneficia todos: motoristas, empresas, sociedade

## ⚠️ Aviso Legal

CargoCoin é software experimental. Use por sua conta e risco. Sempre dirija com segurança independentemente de recompensas. Não use o celular enquanto dirige - configure o app antes de começar a dirigir.

---

## 🎉 Comece Agora!

```bash
# Clone o repositório
git clone https://github.com/yourusername/cargocoin.git

# Compile
cd cargocoin
cmake -B build && cmake --build build

# Execute
./build/src/cargocoind -daemon

# Verifique informações
./build/src/cargocoin-cli getdrivinginfo
```

**Drive Safe, Earn Crypto!** 🚛💰

---

<p align="center">
  Desenvolvido com ❤️ para um trânsito mais seguro
</p>
