import {HardhatRuntimeEnvironment} from "hardhat/types";

const CONTRACT = "TestTokenERC20";

export default async function deploy(hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy(CONTRACT, {
    from: deployer,
    args: ["0x8097c3C354652CB1EEed3E5B65fBa2576470678A"],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
}

deploy.tags = ["TestTokenERC20"];
