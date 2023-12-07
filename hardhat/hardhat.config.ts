import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "hardhat-deploy";
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    beneficiary: {
      default: 1,
    },
  },
  networks: {
    hardhat: {
      // issue: https://github.com/sc-forks/solidity-coverage/issues/652,
      // refer to : https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
      initialBaseFeePerGas: 0
    },
    localhost: {
      url: "http://localhost:8545",
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    },
    "cess-local": {
      url: "http://localhost:9944", // RPC endpoint of CESS testnet
      chainId: 11330,
      // private key of `//Alice` from Substrate
      accounts: ["0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a"],
    },
    "cess-testnet": {
      url: "https://testnet-rpc0.cess.cloud/ws/",
      chainId: 11330,
      accounts: [process.env.DEPLOYMENT_SK || ""],
    }
  }
};

export default config;
