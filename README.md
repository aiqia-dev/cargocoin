CargoCoin Core - Árvore de Integração/Staging
=============================================

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

O que é CargoCoin?
------------------

CargoCoin é uma criptomoeda desenvolvida especificamente para a indústria de cargas e logística, permitindo transações seguras, rápidas e transparentes em cadeias de suprimentos globais. Construído sobre tecnologia blockchain comprovada, o CargoCoin conecta-se à sua rede peer-to-peer para baixar e validar completamente blocos e transações.

O projeto também inclui uma carteira digital e uma interface gráfica de usuário (GUI), que podem ser compiladas opcionalmente.

### Principais Características

- **Transações Rápidas**: Confirmações otimizadas para atender às demandas do setor logístico
- **Taxas Reduzidas**: Custos de transação minimizados para viabilizar micropagamentos
- **Rastreabilidade**: Histórico completo e imutável de todas as transações na blockchain
- **Descentralização**: Rede distribuída sem ponto único de falha
- **Código Aberto**: Totalmente auditável e transparente

Informações adicionais sobre o CargoCoin estão disponíveis na [pasta doc](/doc).

Tecnologia
----------

### Arquitetura Blockchain

O CargoCoin utiliza uma arquitetura blockchain robusta baseada em tecnologia comprovada:

- **Algoritmo de Consenso**: Proof-of-Work (PoW) com função hash SHA-256d, garantindo segurança e descentralização da rede
- **Estrutura de Blocos**: Cada bloco contém um cabeçalho com hash do bloco anterior, raiz Merkle das transações, timestamp e nonce
- **Árvore Merkle**: Estrutura de dados eficiente para verificação de integridade das transações
- **Rede P2P**: Protocolo de comunicação descentralizado para propagação de blocos e transações

### Componentes Principais

| Componente | Descrição |
|------------|-----------|
| **cargocoin-qt** | Interface gráfica completa com carteira integrada |
| **cargocoind** | Daemon para operação em servidores e automação |
| **cargocoin-cli** | Interface de linha de comando para interação com o daemon |
| **cargocoin-tx** | Utilitário para criação e manipulação de transações |
| **cargocoin-wallet** | Ferramenta para gerenciamento de carteiras |

### Especificações Técnicas

- **Linguagem**: C++17 com padrões modernos de programação
- **Banco de Dados**: LevelDB para armazenamento de blockchain e índices
- **Criptografia**: Curva elíptica secp256k1 para assinaturas digitais
- **Serialização**: Formato binário compacto para eficiência de rede
- **APIs**: JSON-RPC para integração com aplicações externas

Segurança
---------

A segurança é uma prioridade fundamental no desenvolvimento do CargoCoin. O projeto implementa múltiplas camadas de proteção:

### Criptografia

- **Assinaturas Digitais ECDSA**: Utiliza a curva elíptica secp256k1, a mesma empregada pelo Bitcoin, para garantir a autenticidade das transações
- **Hash SHA-256**: Função hash criptográfica para integridade de dados e mineração
- **RIPEMD-160**: Usado em conjunto com SHA-256 para geração de endereços
- **Derivação de Chaves HD (BIP32/BIP39/BIP44)**: Suporte a carteiras hierárquicas determinísticas para backup seguro

### Proteção de Rede

- **Verificação de Blocos**: Validação completa de todos os blocos recebidos antes da aceitação
- **Proteção contra Double-Spending**: Mecanismo de consenso que impede gastos duplos
- **Checkpoints**: Pontos de verificação para proteção contra ataques de reorganização profunda
- **Ban Score**: Sistema de pontuação para identificar e banir nós maliciosos

### Segurança da Carteira

- **Criptografia AES-256-CBC**: Proteção de chaves privadas com senha definida pelo usuário
- **Backup de Carteira**: Funcionalidade integrada para backup seguro de fundos
- **Bloqueio Automático**: Carteira bloqueia automaticamente após período de inatividade
- **Verificação de Endereços**: Checksum integrado para prevenir erros de digitação

### Práticas de Desenvolvimento Seguro

- **Revisão de Código**: Todo código passa por revisão rigorosa antes da integração
- **Testes Automatizados**: Suíte completa de testes unitários e de integração
- **Análise Estática**: Ferramentas de análise para identificação de vulnerabilidades
- **Programa de Bug Bounty**: Incentivo à comunidade para reportar vulnerabilidades

### Recomendações de Segurança para Usuários

1. **Mantenha o software atualizado** com as últimas versões de segurança
2. **Faça backup regular** do arquivo wallet.dat em local seguro
3. **Use senhas fortes** para criptografar sua carteira
4. **Verifique checksums** ao baixar o software
5. **Execute em ambiente seguro** com firewall adequadamente configurado

Licença
-------

CargoCoin é distribuído sob os termos da licença MIT. Consulte [COPYING](COPYING) para mais informações ou acesse https://opensource.org/license/MIT.

Processo de Desenvolvimento
---------------------------

O branch `master` é compilado regularmente (veja `doc/build-*.md` para instruções) e testado, mas não há garantia de estabilidade completa. Tags são criadas regularmente a partir de branches de release para indicar novas versões oficiais e estáveis do CargoCoin.

O fluxo de contribuição está descrito em [CONTRIBUTING.md](CONTRIBUTING.md) e dicas úteis para desenvolvedores podem ser encontradas em [doc/developer-notes.md](doc/developer-notes.md).

Compilação e Instalação
-----------------------

### Pré-requisitos

Consulte a documentação específica para seu sistema operacional:

- [Compilação no Linux](doc/build-unix.md)
- [Compilação no macOS](doc/build-osx.md)
- [Compilação no Windows](doc/build-windows.md)
- [Compilação no FreeBSD](doc/build-freebsd.md)
- [Compilação no NetBSD](doc/build-netbsd.md)
- [Compilação no OpenBSD](doc/build-openbsd.md)

### Compilação Rápida (Linux)

```bash
# Instalar dependências (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install build-essential libtool autotools-dev automake pkg-config bsdmainutils python3

# Clonar repositório
git clone https://github.com/aiqia-dev/cargocoin.git
cd cargocoin

# Compilar
cmake -B build
cmake --build build

# Executar testes
ctest --test-dir build
```

Testes
------

Testes e revisão de código são o gargalo para o desenvolvimento; recebemos mais pull requests do que conseguimos revisar e testar rapidamente. Por favor, seja paciente e ajude testando pull requests de outras pessoas. Lembre-se que este é um projeto crítico de segurança onde qualquer erro pode custar dinheiro às pessoas.

### Testes Automatizados

Desenvolvedores são fortemente encorajados a escrever [testes unitários](src/test/README.md) para código novo e a submeter novos testes unitários para código existente. Os testes unitários podem ser compilados e executados (assumindo que não foram desabilitados durante a geração do sistema de build) com: `ctest`. Mais detalhes sobre execução e extensão de testes unitários podem ser encontrados em [/src/test/README.md](/src/test/README.md).

Também existem [testes de regressão e integração](/test), escritos em Python. Estes testes podem ser executados (se as [dependências de teste](/test) estiverem instaladas) com: `build/test/functional/test_runner.py` (assumindo que `build` é seu diretório de compilação).

Os sistemas de CI (Integração Contínua) garantem que cada pull request seja testado no Windows, Linux e macOS. O CI deve passar em todos os commits antes do merge para evitar falhas de CI não relacionadas em novos pull requests.

### Testes Manuais de Garantia de Qualidade (QA)

Alterações devem ser testadas por alguém diferente do desenvolvedor que escreveu o código. Isso é especialmente importante para alterações grandes ou de alto risco. É útil adicionar um plano de teste à descrição do pull request se testar as alterações não for simples.

Contribuindo
------------

Contribuições são bem-vindas! Por favor, leia nosso [guia de contribuição](CONTRIBUTING.md) antes de submeter pull requests.

### Como Contribuir

1. Faça um fork do repositório
2. Crie um branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas alterações (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para o branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

Traduções
---------

Alterações em traduções, assim como novas traduções, são bem-vindas. As traduções são periodicamente integradas ao repositório git. Veja o [processo de tradução](doc/translation_process.md) para detalhes sobre como isso funciona.

Suporte
-------

- **Documentação**: Consulte a [pasta doc](/doc) para documentação detalhada
- **Issues**: Reporte bugs e solicite features através do sistema de issues do GitHub

---

**CargoCoin** - Revolucionando pagamentos na indústria de logística global.
