import {
  Bucket,
  Common,
  File,
  InitAPI,
  Space,
  testnetConfig
} from "cess-js-sdk";

/**
 * In this tutorial we will demonstrate how to use `cess-js-sdk` to interact with CESS.
 * We will connect to the CESS testnet (https://testnet.cess.cloud/) and perform the following:
 *
 * 1. Check the amount of my rented space and its expiration time (read op.)
 * 2. Rent space on CESS testnet (write op.)
 * 3. Create a bucket, a concept similar to a directory in your hard drive (write op.)
 * 4. Query my existing files in CESS cloud (read op.)
 * 5. Upload a file to the bucket (write op.)
 * 6. Download the file back.
 *
 * Before running this tutorial, ensure you get test tokens from the faucet (https://cess.cloud/faucet.html).
 */

// The well-known account of Substrate:
//   https://github.com/substrate-developer-hub/substrate-developer-hub.github.io/issues/613
const mnemonic = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const acctId = "cXgaee2N8E77JJv9gdsGAckv1Qsf3hqWYf7NL4q6ZuQzuAUtB";

const RENT_SPACE = 1; // unit in GB.
const BUCKET_NAME = "test2"; // bucket name

async function main() {
  const { api, keyring } = await InitAPI(testnetConfig);
  const space = new Space(api, keyring);
  const common = new Common(api, keyring);
  const bucket = new Bucket(api, keyring);
  const file = new File(api, keyring, testnetConfig.gatewayURL);

  console.log("API initialized.");

  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);
  console.log(`Connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

  const balanceEncoded = await api.query.system.account(acctId);
  const { data } = balanceEncoded.toJSON() as { data: { free: string } };
  console.log(`User: ${acctId}, balance:`, BigInt(data.free));

  await checkNRentSpace(space, common);
  await checkNCreateBucket(bucket);
  await uploadNDownloadFile(file);
}

async function checkNRentSpace(space: Space, common: Common) {
  const initSpace = await space.userOwnedSpace(acctId);
  console.log("query userOwnedSpace:", initSpace.data);

  const blockHeight = await common.queryBlockHeight();
  console.log("current block height:", blockHeight);

  let spaceData = common.formatSpaceInfo(initSpace.data, blockHeight);
  console.log("initial user space:", spaceData);

  if (!spaceData.totalSpace) {
    const rsResult = await space.buySpace(mnemonic, RENT_SPACE);
    console.log(rsResult);
  }
}

async function checkNCreateBucket(bucket: Bucket) {
  let res = await bucket.queryBucketList(acctId);
  console.log("queryBucketList", res.data);

  res = await bucket.queryBucketInfo(acctId, BUCKET_NAME);
  console.log("queryBucketInfo", res);

  if (res.data) {
    console.log("deleting bucket...");
    // The bucket exists already, so let's delete it first
    await bucket.deleteBucket(mnemonic, acctId, BUCKET_NAME);
  }

  res = await bucket.createBucket(mnemonic, acctId, BUCKET_NAME);
  console.log("createBucket", res);

  res = await bucket.queryBucketList(acctId);
  console.log("queryBucketList", res.data);
}

async function uploadNDownloadFile(fileService: File) {
  let res = await fileService.queryFileListFull(acctId);
  console.log("queryFileListFull", res.data);
  const { fileHash } = res.data[0];

  const uploadFile = `${process.cwd()}/package.json`;
  console.log("uploadFile path:", uploadFile);
  res = await fileService.uploadFile(mnemonic, acctId, uploadFile, BUCKET_NAME);
  console.log("uploadFile", res);

  const downloadPath = `${process.cwd()}/download`;
  res = await fileService.downloadFile(fileHash, downloadPath);
  console.log("downloadFile", res);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
