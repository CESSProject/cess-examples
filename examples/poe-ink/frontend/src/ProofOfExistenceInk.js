import { React, useState } from "react";
import { Grid, Input, Dropdown, Header } from "semantic-ui-react";
import {
  useWallet,
  useAllWallets,
  useCallSubscription,
  useContract,
  useBalance,
  UseInkProvider,
  useTx,
} from "useink";
import { pickDecoded, shouldDisable } from "useink/utils";
import { blake2AsHex } from "@polkadot/util-crypto";
// import { useSubstrate } from './substrate-lib'

import metadata from "../../contract/target/ink/poe_ink_contract.json";

const CHAIN_RPC = "ws://localhost:9944";
const CONTRACT_ADDR = "cXggWW96TwTUVfhbRSFGZvdLaYB4higPXSE8EHCzPMQgD95zf";

function ProofOfExistenceInk(props) {
  const { account } = useWallet();
  // console.log('my curr acct:', account)

  const balance = useBalance(account);

  // Getting the contract API
  const poeContract = useContract(CONTRACT_ADDR, metadata, "custom");
  const claimTx = useTx(poeContract, "claim");
  const ownedFiles = useCallSubscription(poeContract, "ownedFiles");
  const ownedFilesRes = pickDecoded(ownedFiles.result);

  const [fileHash, setFileHash] = useState(null);

  const computeFileHash = (file) => {
    const fileReader = new FileReader();
    fileReader.onloadend = (e) => setFileHash(blake2AsHex(fileReader.result));
    fileReader.readAsArrayBuffer(file);
  };

  return (
    <Grid.Column width={8}>
      <Header size="large">Proof of Existence (ink!)</Header>
      {!account ? (
        <ConnectWallet />
      ) : (
        <>
          <WalletSwitcher account={account} />
          <p>You are connected as: {`${account?.name}: ${account.address}`}</p>
          <p>You have a balance of: {balance ? balance.freeBalance.toString() : "--"}</p>
          <hr />
          <p>My owned files: {ownedFilesRes !== undefined ? ownedFilesRes.join(", ") : "--"}</p>
          <Input
            type="file"
            id="poeFile"
            label="Any File"
            onChange={(e) => computeFileHash(e.target.files[0])}
          />
          <p>File Hash: {fileHash}</p>
          <button
            onClick={() => claimTx.signAndSend([fileHash])}
            disable={shouldDisable(claimTx) ? "true" : "false"}
          >
            {shouldDisable(claimTx) ? "Processing..." : "Claim"}
          </button>
        </>
      )}
    </Grid.Column>
  );
}

function WalletSwitcher({ account }) {
  const { accounts, setAccount, disconnect } = useWallet();

  const acctMap = {};
  const acctOptions = accounts.map((a, idx) => {
    const key = a.address;
    acctMap[key] = a;
    return {
      key,
      text: a.name ? a.name : a.address,
      value: key,
    };
  });
  // Sort by the `text` value
  acctOptions.sort((a, b) => {
    const aText = a.text.toUpperCase();
    const bText = b.text.toUpperCase();
    return aText > bText ? 1 : bText > aText ? -1 : 0;
  });

  return (
    <>
      <Header size="medium">Switch Ink Wallet Account</Header>
      <Dropdown
        selection
        clearable
        options={acctOptions}
        onChange={(_, dropdown) =>
          dropdown.value.length > 0 ? setAccount(acctMap[dropdown.value]) : disconnect()
        }
        value={account ? account.address : ""}
      />
    </>
  );
}

function ConnectWallet(props) {
  const { connect } = useWallet();
  const wallets = useAllWallets();

  const walletMap = {};
  const walletTypeOptions = wallets.map((w) => {
    const key = w.title;
    walletMap[key] = w;
    return {
      key,
      text: w.title,
      value: key,
      image: { avatar: true, src: w.logo.src },
    };
  });

  return (
    <>
      <Header size="medium">Connect Wallet</Header>
      <Dropdown
        placeholder="Select Wallet Type"
        selection
        options={walletTypeOptions}
        onChange={(_, dropdown) =>
          walletMap[dropdown.value].installed
            ? connect(walletMap[dropdown.value].extensionName)
            : window.open(walletMap[dropdown.value].installUrl)
        }
        value=""
      />
    </>
  );
}

export default function PoEWithInkProvider(props) {
  return (
    <UseInkProvider
      config={{
        dappName: "Proof of Existence (Ink)",
        chains: [{ id: "custom", name: "CESS localhost", rpcs: [CHAIN_RPC] }],
      }}
    >
      <ProofOfExistenceInk />
    </UseInkProvider>
  );
}
