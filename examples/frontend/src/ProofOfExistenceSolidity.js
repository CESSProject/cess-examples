import { React } from "react";
import { Grid, Header } from "semantic-ui-react";

import { createConfig, configureChains, WagmiConfig, useConnect, useAccount } from 'wagmi';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

const RPC_ENDPOINT = "http://localhost:9944";

// ref: https://wagmi.sh/react/chains#build-your-own
const cessLocal = {
  id: 11330,
  name: "CESS Local",
  network: "cess-local",
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

const { publicClient, webSocketPublicClient } = configureChains(
  [cessLocal],
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

export default function PoESolidityWithWagmiProvider(props) {
  return <WagmiConfig config={config}>
    <PoESolidity/>
  </WagmiConfig>
}

function PoESolidity(props) {
  const { connector: activeConnector, isConnected } = useAccount();
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect();

  return <Grid.Column width={8}>
    <Header size="large">Proof of Existence (Solidity)</Header>

    <>
      {isConnected && <div>Connected to {activeConnector.name}</div>}

      {connectors.map((connector) => {

        console.log("connector:", connector);

        return <button
          disabled={!connector.ready}
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          {connector.name}
          {isLoading &&
            pendingConnector?.id === connector.id &&
            ' (connecting)'}
        </button>
      } )}

      {error && <div>{error.message}</div>}
    </>


  </Grid.Column>

}
