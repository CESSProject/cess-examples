# Sample Solidity Smart Contracts


This project demonstrates building solidity smart contract for CESS local node and testnet.

There are:

- [Flipper Solidity smart contract](./contracts/Flipper.sol)
- [Proof of Existence Solidity smart contract](./contracts/ProofOfExistence.sol)

## Instructions to Run

```bash
pnpm install / npm install / yarn install
cp .env.example .env
# update the .env with required env variable
```

## Helpful Commands

```bash
# Deploy contracts
pn hardhat deploy --reset --tags <your-tag> --network cess-testnet
```
