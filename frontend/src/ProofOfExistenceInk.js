import { React, useState, useEffect } from "react";
import { 
  Segment, 
  Input, 
  Dropdown,
  Header, 
  Label,
  Icon, 
  Button 
} from "semantic-ui-react";
import { blake2AsHex } from "@polkadot/util-crypto";

// NOTE: In `examples/poe-ink/contract` directory, compile your contract with
//   `cargo contract build`.
import metadata from "../../ink/poe/target/ink/poe_ink_contract.json";

import { 
  allSubstrateWallets,
  contractQuery,
  contractTx,
  decodeOutput,
  SubstrateExplorer,
  SubstrateWalletPlatform,
  UseInkathonProvider,
  useInkathon,
  isWalletInstalled,
  useBalance,
  useRegisteredContract,
  
} from "@scio-labs/use-inkathon";

export const cessTestnet = {
  network: 'cess-local',
  name: 'CESS Local',
  ss58Prefix: 11330,
  rpcUrls: [
    'http://127.0.0.1:9944',
  ],
  testnet: true,
  faucetUrls: ['https://cess.cloud/faucet.html'],
  explorerUrls: {
    [SubstrateExplorer.Other]: `https://substats.cess.cloud/`,
  },
}

// // NOTE: Update your deployed contract address below.
const CONTRACT_ADDR = "cXiaYcqvL9xv9z7LqHdFqfpydbUptfwfoPL594xNeLPfkFhMn";

const getDeployments = () => {
  let developments = [
    {
      contractId: 'poe-ink-contract',
      networkId: cessTestnet.network,
      abi: metadata,
      address: CONTRACT_ADDR,
    },
  ];
  return developments;
}

function sortDdOptions(a, b) {
  const aText = a.text.toUpperCase();
  const bText = b.text.toUpperCase();
  return aText > bText ? 1 : bText > aText ? -1 : 0;
}

function ConnectWallet(props) {
  const { connect } = useInkathon();

  // Sort installed wallets first
  const [browserWallets] = useState([
    ...allSubstrateWallets.filter(
      (w) => w.platforms.includes(SubstrateWalletPlatform.Browser) && isWalletInstalled(w),
    ),
    ...allSubstrateWallets.filter(
      (w) => w.platforms.includes(SubstrateWalletPlatform.Browser) && !isWalletInstalled(w),
    ),
  ])

  const walletMap = {};
  const walletTypeOptions = browserWallets.map((w) => {
    const key = w.id;
    walletMap[key] = w;
    return {
      key,
      text: w.name,
      value: key,
      image: { avatar: true, src: w.logoUrls[0]}
    }
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
        onChange={
          (_, dropdown) => {
            isWalletInstalled(walletMap[dropdown.value])
            ? connect?.(undefined, walletMap[dropdown.value])
            : window.open(walletMap[dropdown.value].installUrl);
          }
        }
        value=""
      />
    </>
  );
}

function WalletSwitcher({ account }) {
  const { accounts, setActiveAccount, disconnect } = useInkathon();
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
          dropdown.value.length > 0 ? setActiveAccount?.(acctMap[dropdown.value]) : disconnect()
        }
        value={account ? account.address : ""}
      />
    </>
  );
}

function TxButton({ api, contract: poeContract, text, action, fileHash, activeAccount }) {
  const submitTx = async () => {
    await contractTx(api, activeAccount.address, poeContract, action, {}, [fileHash], null, null);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <Button
        basic
        color="blue"
        type="submit"
        onClick={() => submitTx()}
        disabled={false}
      >
        {text}
      </Button>
    </div>
  );
}

const ProofOfExistenceInk = () => {
  const { api, activeAccount } = useInkathon();
  const { freeBalanceFormatted } = useBalance(activeAccount?.address);
  const developments = getDeployments();
  const { contract: poeContract } = useRegisteredContract(developments[0].contractId);
  const [fileHash, setFileHash] = useState(null);
  const [ownedFilesRes, setOwnedFilesRes] = useState([]);

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

  const fetchOwnedFiles = async () => {
    if (poeContract) {
      const result = await contractQuery(api, activeAccount?.address, poeContract, 'ownedFiles')
      const { output: ownedFilesRes } = decodeOutput(result, poeContract, 'ownedFiles')
      setOwnedFilesRes(ownedFilesRes);
    }
  }

  useEffect(() => {
    fetchOwnedFiles()
  }, [activeAccount, ownedFilesRes])
  return (
    <Segment style={{ overflowWrap: "break-word", overflowX: "auto" }}>
      <Header size="large">Proof of Existence (ink!)</Header>
      { !activeAccount ? (
        <ConnectWallet />
      ): (
        <>
          <WalletSwitcher account={activeAccount}/>
          <Label basic color="teal" style={{ marginLeft: 0, marginTop: ".5em" }}>
            <Icon name="hand point right outline" />
            The account connects to Ink! contracts can be different from the one connecting to the
            chain.
          </Label>
          <p>You are connected as: {`${activeAccount?.name}: ${activeAccount.address}`} </p>
          {freeBalanceFormatted !== undefined &&(
            <p>
              You have a balance of: <b> { freeBalanceFormatted? freeBalanceFormatted : "--"}</b>
            </p>
          )}
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
            id="poeFileInk"
            label="Any File"
            onChange={(e) => computeFileHash(e.target.files[0])}
          />
          <p>File Hash: {fileHash}</p>
          
          <TxButton
            api={api}
            contract={poeContract}
            text={ownedFilesRes && Array.isArray(ownedFilesRes) && ownedFilesRes.includes(fileHash) ? "Forfeit File" : "Claim File"}
            action={ownedFilesRes && Array.isArray(ownedFilesRes) && ownedFilesRes.includes(fileHash) ? "forfeit" : "claim"}
            fileHash={fileHash}
            activeAccount={activeAccount}
          />
        </>
      )}
    </Segment>
  );
}

export default function PoEWithInkProvider(props) {
  return (
    <UseInkathonProvider
      appName="Proof of Existence (Ink)"
      defaultChain={cessTestnet}
      deployments={getDeployments()}
    >
      <ProofOfExistenceInk/>
    </UseInkathonProvider>
  );
}