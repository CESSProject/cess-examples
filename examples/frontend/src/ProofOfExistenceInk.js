import { React, useState } from "react";
import { Grid, Input, Dropdown, Header, Label, Icon, Button } from "semantic-ui-react";
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

import config from "./config";

// NOTE: In `examples/poe-ink/contract` directory, compile your contract with
//   `cargo contract build`.
import metadata from "../../contract/target/ink/poe_ink_contract.json";

// NOTE: Update your deployed contract address below.
const CONTRACT_ADDR = "cXjN2RG7YEpxx1bCa4zJKy3igsh3DuEo8bHnfKp1KsH5LaUub";

// Simple sort function
function sortDdOptions(a, b) {
  const aText = a.text.toUpperCase();
  const bText = b.text.toUpperCase();
  return aText > bText ? 1 : bText > aText ? -1 : 0;
}

function ProofOfExistenceInk(props) {
  const { account } = useWallet();

  const balance = useBalance(account);

  // Getting the contract API
  const poeContract = useContract(CONTRACT_ADDR, metadata, "custom");
  const ownedFiles = useCallSubscription(poeContract, "ownedFiles");
  const ownedFilesRes = pickDecoded(ownedFiles.result);

  const [fileHash, setFileHash] = useState(null);

  const computeFileHash = (file) => {
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
      <Header size="large">Proof of Existence (ink!)</Header>
      {!account ? (
        <ConnectWallet />
      ) : (
        <>
          <WalletSwitcher account={account} />
          <Label basic color="teal" style={{ marginLeft: 0, marginTop: ".5em" }}>
            <Icon name="hand point right outline" />
            The account connects to Ink! contracts can be different from the one connecting to the
            chain.
          </Label>
          <p>You are connected as: {`${account?.name}: ${account.address}`}</p>
          <p>
            You have a balance of: <b>{balance ? balance.freeBalance.toString() : "--"}</b>
          </p>
          <hr />
          <Header size="medium">Owned Files</Header>
          {ownedFilesRes && ownedFilesRes.length > 0 ? (
            <ul>
              {ownedFilesRes.map((single, idx) => (
                <li key={`${idx}-${single}`}>{single}</li>
              ))}
            </ul>
          ) : (
            <p>No file owned</p>
          )}

          <Input
            type="file"
            id="poeFile"
            label="Any File"
            onChange={(e) => computeFileHash(e.target.files[0])}
          />
          <p>File Hash: {fileHash}</p>

          <TxButton
            contract={poeContract}
            text={ownedFilesRes && ownedFilesRes.includes(fileHash) ? "Forfeit File" : "Claim File"}
            action={ownedFilesRes && ownedFilesRes.includes(fileHash) ? "forfeit" : "claim"}
            fileHash={fileHash}
          />
        </>
      )}
    </Grid.Column>
  );
}

function TxButton({ contract, text, action, fileHash }) {
  const tx = useTx(contract, action);
  return (
    <Button
      basic
      color="blue"
      type="submit"
      onClick={() => tx.signAndSend([fileHash])}
      disable={shouldDisable(tx) ? "true" : "false"}
    >
      {shouldDisable(tx) ? "Processing..." : text}
    </Button>
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
  acctOptions.sort(sortDdOptions);

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
  // sort by the object `text` value
  walletTypeOptions.sort(sortDdOptions);

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
        chains: [{ id: "custom", name: "CESS localhost", rpcs: [config.PROVIDER_SOCKET] }],
      }}
    >
      <ProofOfExistenceInk />
    </UseInkProvider>
  );
}
