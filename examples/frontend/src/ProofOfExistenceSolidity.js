import { React } from "react";
import { createConfig, configureChains, WagmiConfig } from 'wagmi';
import { localhost } from 'wagmi/chains';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

const RPC_ENDPOINT = "http://localhost:9944";

const cessLocal = {
  id: 11330,
  name: "CESS Dev Test",
  network: "cess-localhost",
  nativeCurrency: {
    decimal: 18,
    name: 'CESS Testnet Token',
    symbol: 'TCESS',
  },
  rpcUrls: {
    public: { http: [RPC_ENDPOINT] },
    default: { http: [RPC_ENDPOINT] },
  }
}

export default function PoESolidityWithWagmi(props) {
  const { publicClient, webSocketPublicClient } = configureChains(
    [cessLocal, localhost],
    [jsonRpcProvider({
      rpc: (chain) => ({
        http: RPC_ENDPOINT,
      })
    })],
  )

  const config = createConfig({
    publicClient,
    webSocketPublicClient,
  })

  console.log("chain: localhost", localhost);
  console.log("client: publicClient", publicClient);
  console.log("config", config);

  return <WagmiConfig config={config}>
    <h1>Proof of Existence (Solidity)</h1>
  </WagmiConfig>
}
