import {HardhatRuntimeEnvironment} from "hardhat/types";

const CONTRACT = "ProofOfExistence";

export default async function deploy(hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy(CONTRACT, {
    from: deployer,
    args: [],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
}

deploy.tags = ["PoE"];
