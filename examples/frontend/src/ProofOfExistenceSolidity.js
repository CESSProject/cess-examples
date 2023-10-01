import { React } from "react";
import { Grid, Header, Button, Dropdown } from "semantic-ui-react";
import {
  createConfig,
  configureChains,
  WagmiConfig,
  useConnect,
  useDisconnect,
  useAccount,
  useBalance,
} from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

const RPC_ENDPOINT = "http://localhost:9944";

// ref: https://wagmi.sh/react/chains#build-your-own
const cessLocal = {
  id: 11330,
  name: "CESS Local",
  network: "cess-local",
  nativeCurrency: {
    decimal: 18,
    name: "CESS Testnet Token",
    symbol: "TCESS",
  },
  rpcUrls: {
    public: { http: [RPC_ENDPOINT] },
    default: { http: [RPC_ENDPOINT] },
  },
};

const { publicClient, webSocketPublicClient } = configureChains(
  [cessLocal],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: RPC_ENDPOINT,
      }),
    }),
  ],
);

const config = createConfig({
  publicClient,
  webSocketPublicClient,
});

function PoESolidity(props) {
  const { address, status } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { disconnect } = useDisconnect();

  return (
    <Grid.Column width={8}>
      <Header size="large">Proof of Existence (Solidity)</Header>

      {status !== "connected" ? (
        <ConnectWallet />
      ) : (
        <>
          Connected addr: {address}
          <br />
          Balance: {`${balanceData?.formatted} ${balanceData?.symbol}`}
          <br />
          <Button onClick={() => disconnect()} content="Disconnect" />
        </>
      )}
    </Grid.Column>
  );
}

function ConnectWallet(props) {
  const { connect, connectors, error } = useConnect();

  const connectorMap = {};
  const connectorOptions = connectors.map((connector) => {
    connectorMap[connector.id] = connector;
    return {
      key: connector.id,
      text: connector.name,
      value: connector.id,
    };
  });

  return (
    <>
      <Header size="medium">Connect Wallet</Header>
      <Dropdown
        placeholder="Select Wallet Type"
        selection
        options={connectorOptions}
        onChange={(_, dropdown) => connect({ connector: connectorMap[dropdown.value] })}
        value=""
      />
      {error && <div>{error.message}</div>}
    </>
  );
}

export default function PoESolidityWithWagmiProvider(props) {
  return (
    <WagmiConfig config={config}>
      <PoESolidity />
    </WagmiConfig>
  );
}
