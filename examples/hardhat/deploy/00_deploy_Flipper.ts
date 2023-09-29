import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const CONTRACT = "";

export default async function deploy(hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, beneficiary} = await getNamedAccounts();

  await deploy("Flipper", {
    from: deployer,
    args: [false],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
}

deploy.tags = ["Flipper"];
