import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  defaultNetwork: "dev",
  networks: {
    hardhat: {},
    dev: {
      url: "http://localhost:9944", // RPC endpoint of CESS testnet
      chainId: 11330,
      // private key of `//Alice` from Substrate
      accounts: ["0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a"]
    }
  }
};

export default config;
