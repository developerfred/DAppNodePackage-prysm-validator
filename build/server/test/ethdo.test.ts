import "mocha";
import assert from "assert";
import { Ethdo } from "../src/ethdo";
import shell from "../src/utils/shell";
import { logs } from "../src/logs";

const ethdoTestImage = "ethdo_test_image";
const installCmd = "GO111MODULE=on go get github.com/wealdtech/ethdo@latest";

interface EthdoAccount {
  name: string;
  pass: string;
}

interface EthdoWallets {
  name: string;
  pass: string;
  accounts: EthdoAccount[];
}

describe("ethdo module", () => {
  let id: string;
  let ethdo: Ethdo;

  beforeEach("Create docker container to run commands", async function() {
    this.timeout(120 * 1000);
    await createTestImage();
    id = await shell(`docker run -d ${ethdoTestImage} sleep 10m`);
    ethdo = new Ethdo(cmd => execIn(id, cmd));
    const version = await execIn(id, "ethdo version");
    if (!version) throw Error(`ethdo not installed`);
  });

  it("Get deposit data", async function() {
    this.timeout(60 * 1000);

    // Test data

    const walletValidator: EthdoWallets = {
      name: "validator",
      pass: "validator-secret",
      accounts: [
        { name: "1", pass: "validator/1-secret" },
        { name: "2", pass: "validator/2-secret" }
      ]
    };
    const walletWithdrawl: EthdoWallets = {
      name: "withdrawal",
      pass: "withdrawal-secret",
      accounts: [{ name: "primary", pass: "withdrawal/primary-secret" }]
    };
    const wallets = [walletValidator, walletWithdrawl];

    // Create wallets
    for (const { name, pass } of wallets)
      await ethdo.walletCreate({
        wallet: name,
        type: "hd",
        walletpassphrase: pass
      });

    // Create accounts
    for (const wallet of wallets)
      for (const { name, pass } of wallet.accounts)
        await ethdo.accountCreate({
          account: wallet.name + "/" + name,
          passphrase: pass,
          walletpassphrase: wallet.pass
        });

    // Test listing accounts
    const list = await ethdo.listAll();
    assert.deepEqual(
      list,
      wallets.map(({ name, accounts }) => ({
        name,
        accounts: accounts.map(({ name }) => name)
      })),
      "Wrong listed wallets and accounts"
    );

    // Test getting deposit data
    const depositData = await ethdo.validatorDepositdata({
      validatoraccount:
        walletValidator.name + "/" + walletValidator.accounts[0].name,
      withdrawalaccount:
        walletWithdrawl.name + "/" + walletWithdrawl.accounts[0].name,
      depositvalue: "32Ether",
      passphrase: walletValidator.accounts[0].pass,
      raw: true
    });

    logs.info("deposit data");
    logs.info(splitTxByWords(depositData).join("\n"));
    assertDepositData(depositData);
    assert.equal(typeof depositData, "string", "deposit data must be a string");
    assert.equal(
      depositData.length,
      2 + 8 + 13 * 64,
      "wrong deposit data length"
    );
  });

  it("Do UI flow", async () => {
    const account = "Primary";
    const passphrase = "secret-passphrase" + Math.random();
    await ethdo.createAccount({ account, passphrase }, "withdrawl");
    const validator = await ethdo.createAccount({ account: "1" }, "validator");
    const depositData = await ethdo.getDepositData(validator, account);
    logs.info({ validator, depositData });
    assert.equal(validator.account, "validator/1", "unexpected validator name");
    assert.equal(validator.passphrase.length, 64, "wrong rand passhr length");
    assertDepositData(depositData);
  });

  it("List wallet accounts with a private key", async () => {
    const wallet = "withdrawl";
    await ethdo.walletCreate({ wallet });
    const accounts = ["primary", "secondary"].map(name => ({
      account: `${wallet}/${name}`,
      passphrase: "secret-passphrase" + Math.random()
    }));
    for (const account of accounts)
      await ethdo.createAccount(account, "withdrawl");

    const accountList = await ethdo.accountList(wallet);
    assert.deepEqual(
      accounts.map(({ account }) => account).sort(),
      accountList.map(({ id }) => id).sort()
    );
    for (const account of accountList) {
      assert.ok(account.publicKey, "Account should have publicKey");
    }
  });

  afterEach("Remove test container", async () => {
    if (id) await shell(`docker rm -f --volumes ${id}`);
  });
});

/**
 * Util to assert dynamically generated deposit data
 * @param depositData
 */
function assertDepositData(depositData: string): void {
  assert.equal(typeof depositData, "string", "deposit data must be a string");
  assert.equal(
    depositData.length,
    2 + 8 + 13 * 64,
    "wrong deposit data length"
  );
}

/**
 * Util: split raw transaction data by words for better diffing
 * @param data "0xaaaa...00...00...11..."
 * @returns [
 *   0xaaaa...
 *   00...
 *   00...
 *   11...
 * ]
 */
function splitTxByWords(data: string): string[] {
  const selector = data.slice(0, 10);
  const words = data.slice(10).match(/.{1,64}/g);
  return [selector, ...(words || [])];
}

/**
 * Use this format to have visibility of the body in case it fails
 * @param res
 * @param code
 * @param body
 */
async function execIn(id: string, cmd: string) {
  if (!id) throw Error(`No test containerId set`);
  try {
    return await shell(`docker exec ${id} /bin/bash -c "${cmd}"`);
  } catch (e) {
    // Return detailed info
    throw Error(`${e.message}
  code: ${e.code} ${e.signal || ""}
  stdout: ${e.stdout}
  stderr: ${e.stderr}`);
  }
}

/**
 * Create and commit a docker image with ethdo installed to reuse in all tests
 */
async function createTestImage() {
  const exists = await shell(`docker images -q ${ethdoTestImage}`);
  if (exists) return;
  logs.info(`Creating test image ${ethdoTestImage}, may take a while...`);

  const id = await shell(`docker run -d golang sleep 10m`);
  await execIn(id, installCmd);

  const version = await execIn(id, "ethdo version");
  if (!version) throw Error(`ethdo not installed`);

  await shell(`docker commit ${id} ${ethdoTestImage}`);
  await shell(`docker rm -f --volumes ${id}`);
  logs.info(`Created test image ${ethdoTestImage} from container ${id}`);
}
