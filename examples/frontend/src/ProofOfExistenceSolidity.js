import { React, useState } from "react";
import { Grid, Header, Button, Input, Dropdown } from "semantic-ui-react";
import {
  configureChains,
  createConfig,
  useAccount,
  useBalance,
  useConnect,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
  useDisconnect,
  WagmiConfig,
} from "wagmi";
import { useDebounce } from "usehooks-ts";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { blake2AsHex } from "@polkadot/util-crypto";

import metadata from "../../hardhat/deployments/cess-local/ProofOfExistence.json";

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

const poeContract = {
  address: metadata.address,
  abi: metadata.abi,
};

function PoESolidity(props) {
  const [fileHash, setFileHash] = useState(null);
  const debouncedFileHash = useDebounce(fileHash, 500);
  const [ownedFilesRes, setOwnedFilesRes] = useState([]);
  const { address, status: acctStatus } = useAccount();
  const { data: balanceData } = useBalance({ address, watch: true });
  const { disconnect } = useDisconnect();
  const [statusMsg, setStatusMsg] = useState("");

  useContractRead({
    ...poeContract,
    functionName: "ownedFiles",
    account: address,
    args: [],
    watch: true,
    onSuccess(data) {
      setOwnedFilesRes(data);
    },
    onError(error) {
      console.error("error fetching data", error);
    },
  });

  const computeFileHash = (file) => {
    if (!file || file.size === 0) {
      setFileHash("");
      return;
    }

    const fileReader = new FileReader();
    fileReader.onloadend = (e) => {
      // We extract only the first 64kB  of the file content
      const typedArr = new Uint8Array(fileReader.result.slice(0, 65536));
      setFileHash(blake2AsHex(typedArr));
    };
    fileReader.readAsArrayBuffer(file);
  };

  return (
    <Grid.Column width={8}>
      <Header size="large">Proof of Existence (Solidity)</Header>

      {acctStatus !== "connected" ? (
        <ConnectWallet />
      ) : (
        <>
          Connected addr: {address}
          <br />
          Balance: {`${balanceData?.formatted} ${balanceData?.symbol}`}
          <br />
          <Button onClick={() => disconnect()} content="Disconnect" />
          <hr />
          <Header size="medium">Owned Files</Header>
          OwnedFile len: {ownedFilesRes.length} <br />
          Owned Files: {ownedFilesRes.join(", ")} <br />
          <Input
            type="file"
            id="poeFileSolidity"
            label="Any File"
            onChange={(e) => computeFileHash(e.target.files[0])}
          />
          <p>File Hash: {debouncedFileHash}</p>
          <TxButton
            type={ownedFilesRes.includes(debouncedFileHash) ? "forfeit" : "claim"}
            fileHash={debouncedFileHash}
            setStatusMsg={setStatusMsg}
          />
          {statusMsg.length > 0 && <div>{statusMsg}</div>}
        </>
      )}
    </Grid.Column>
  );
}

function TxButton({ type, fileHash, setStatusMsg }) {
  const { config: claimConfig } = usePrepareContractWrite({
    ...poeContract,
    functionName: type,
    args: [fileHash],
    enabled: Boolean(fileHash),
  });
  const { data, write } = useContractWrite(claimConfig);
  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
    onSettled(data, error) {
      data ? setStatusMsg(`TxHash: ${data.transactionHash}`) : setStatusMsg(`Error: ${error}`);
    },
  });

  return (
    <Button
      basic
      color="blue"
      type="submit"
      content={`${type[0].toUpperCase() + type.slice(1)} File`}
      loading={isLoading}
      disabled={isLoading}
      onClick={() => write?.()}
    />
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
