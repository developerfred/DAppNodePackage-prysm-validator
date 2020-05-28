import dargs from "dargs";
import { beaconRpcProvider } from "../params";

type CmdRunner = (cmd: string) => Promise<string>;

/**
 * ethdo global options
 */
const globalOptions = {
  /**
   * connection to Ethereum 2 node via GRPC (default "localhost:4000")
   */
  connection: beaconRpcProvider
};

export interface WalletAccountData {
  name: string;
  uuid: string;
  publicKey: string;
}

function hidePassphrase(s: string = ""): string {
  return s
    .replace(/--\S*passphrase\S*/g, "********")
    .replace(/--\S*key\S*/g, "********");
}

export class EthdoCmds {
  private cmdRunner: CmdRunner;
  constructor(cmdRunner: CmdRunner) {
    this.cmdRunner = cmdRunner;
  }

  private async run(
    subCmd: string,
    options: { [key: string]: any } = {}
  ): Promise<string> {
    const cmd = [
      "ethdo",
      subCmd,
      ...dargs({ ...globalOptions, ...options })
    ].join(" ");
    try {
      return await this.cmdRunner(cmd);
    } catch (e) {
      // Make sure no sensitive information is logged in an error message
      e.message = hidePassphrase(e.message);
      e.stack = hidePassphrase(e.stack);
      throw e;
    }
  }

  /**
   * ethdo wallet accounts lists the accounts within a wallet.
   * ```
   * $ ethdo wallet accounts --wallet="Personal wallet"
   * Auctions
   * Operations
   * Spending
   * ```
   */
  async walletAccounts(options: {
    /**
     * the name of the wallet to create (defaults to "primary")
     */
    wallet: string;
  }): Promise<string[]> {
    const res = await this.run("wallet accounts", options);
    return res.split("\n");
  }

  /**
   * ethdo wallet accounts lists the accounts within a wallet.
   * With the --verbose flag this will provide the public key of the accounts.
   * 2
   *	UUID:		32ec701a-880b-4cfa-a409-74d88854ec64
   *	Public key:	0x98552a5cfa4022f529eadafeb0d17c2ed748a42ecd799472dad244ffd21342a7b3e436a38abad1ece8afabfd13b42e60
   * 1
   * 	UUID:		7ec09618-c4df-46de-87bf-ecd6da8a580e
   * 	Public key:	0x8498e2c928c5c6718157720239b0cf9968fbbcdf7893a5f46b32c70bd66390c2f6546263aa596a3a09b4447aa8b676fc
   * 3
   *  UUID:		972483d5-19f7-419e-8f48-3858daea1ca0
   *	Public key:	0x98d2f1a38682dc4c3bd3ad1a28411d9507dd6423f8af6bcb9f3d827b7d309c8910825b6523359651a9b1ec16a754c2e4
   */
  async walletAccountsVerbose(options: {
    /**
     * the name of the wallet to create (defaults to "primary")
     */
    wallet: string;
  }): Promise<WalletAccountData[]> {
    const res = await this.run("wallet accounts", {
      ...options,
      verbose: true
    });
    return parseWalletAccountsVerbose(res);
  }

  /**
   * ethdo wallet info provides information about a given wallet. Options include:
   * ```
   * $ ethdo wallet info --wallet="Personal wallet"
   * Type: hierarchical deterministic
   * Accounts: 3
   * ```
   */
  async walletInfo(options: {
    /**
     * the name of the wallet to create (defaults to "primary")
     */
    wallet: string;
  }): Promise<string> {
    return await this.run("wallet info", options);
  }

  /**
   * ethdo wallet list lists all wallets in the store.
   * N.B. encrypted wallets will not show up in this list unless the correct passphrase for the store is supplied.
   * ```
   * 'Withdrawal\nvalidator'
   * ```
   */
  async walletList(): Promise<string[]> {
    const res = await this.run("wallet list");
    return res.split("\n");
  }

  /**
   * ```
   * ethdo wallet create --wallet="Personal wallet" --type="hd" --walletpassphrase="my wallet secret"
   * ```
   */
  async walletCreate(options: {
    /**
     * the name of the wallet to create (defaults to "primary")
     */
    wallet: string;
    /**
     * the type of wallet to create. This can be either "nd" for a
     * non-deterministic wallet, where private keys are generated
     * randomly, or "hd" for a hierarchical deterministic wallet,
     * where private keys are generated from a seed and path as per
     * [ERC-2333](https://github.com/CarlBeek/EIPs/blob/bls_path/EIPS/eip-2334.md) (defaults to "nd")
     */
    type?: "nd" | "hd";
    /**
     * the passphrase for of the wallet. This is required for hierarchical
     * deterministic wallets, to protect the seed
     */
    walletpassphrase?: string;
  }): Promise<string> {
    const res = await this.run("wallet create", options);
    return res;
  }

  /**
   * ethdo account create creates a new account with the given parameters.
   *
   * Note that for hierarchical deterministic wallets you will also need to supply --walletpassphrase to unlock the wallet seed.
   * ```
   * $ ethdo account create --account="Personal wallet/Operations" --walletpassphrase="my wallet secret" --passphrase="my account secret"
   * ```
   */
  async accountCreate(options: {
    /**
     *  the name of the account to create
     */
    account: string;
    /**
     * the passphrase for the account
     */
    passphrase: string;
    /**
     * the passphrase for of the wallet. This is required for hierarchical
     * deterministic wallets, to protect the seed
     */
    walletpassphrase?: string;
  }): Promise<string> {
    const res = await this.run("account create", options);
    return res;
  }

  /**
   * ethdo account import creates a new account by importing its private key. Options for creating the account include:
   * ```
   * ethdo account import --account=Validators/123 --key=6dd12d588d1c05ba40e80880ac7e894aa20babdbf16da52eae26b3f267d68032 --passphrase="my account secret"
   * ```
   */
  async accountImport(options: {
    /**
     *  the name of the account to create
     */
    account: string;
    /**
     * the passphrase for the account
     */
    passphrase: string;
    /**
     * the private key to import
     */
    key: string;
  }): Promise<string> {
    return await this.run("account import", options);
  }

  /**
   * ethdo account info provides information about the given account. Options include:
   * $ ethdo account info --account="Personal wallet/Operations"
   * Public key: 0x8e2f9e8cc29658ff37ecc30e95a0807579b224586c185d128cb7a7490784c1ad9b0ab93dbe604ab075b40079931e6670
   */
  async accountInfo(options: {
    /**
     *  the name of the account to create
     */
    account: string;
  }): Promise<string> {
    return await this.run("account info", options);
  }

  /**
   * ethdo account info provides information about the given account. Options include:
   * $ ethdo account info --account="Personal wallet/Operations"
   * Public key: 0x8e2f9e8cc29658ff37ecc30e95a0807579b224586c185d128cb7a7490784c1ad9b0ab93dbe604ab075b40079931e6670
   */
  async accountInfoVerbose(options: {
    /**
     *  the name of the account to create
     */
    account: string;
  }): Promise<WalletAccountData> {
    const res = await this.run("account info", { ...options, verbose: true });
    return parseWalletAccountVerbose(res);
  }

  async validatorDepositdata(options: {
    /**
     * Account of the account carrying out the validation
     */
    validatoraccount: string;
    /**
     * Account of the account to which the validator funds will be withdrawn
     */
    withdrawalaccount: string;
    /**
     * Value of the amount to be deposited
     * ```js
     * "32Ether"
     * ```
     */
    depositvalue: string;
    passphrase: string;
    /**
     * Print raw deposit data transaction data
     */
    raw: boolean;
  }): Promise<string> {
    return await this.run("validator depositdata", options);
  }
}

/**
 * ethdo wallet accounts lists the accounts within a wallet.
 * With the --verbose flag this will provide the public key of the accounts.
 * 2
 *	UUID:		32ec701a-880b-4cfa-a409-74d88854ec64
 *	Public key:	0x98552a5cfa4022f529eadafeb0d17c2ed748a42ecd799472dad244ffd21342a7b3e436a38abad1ece8afabfd13b42e60
 * 1
 * 	UUID:		7ec09618-c4df-46de-87bf-ecd6da8a580e
 * 	Public key:	0x8498e2c928c5c6718157720239b0cf9968fbbcdf7893a5f46b32c70bd66390c2f6546263aa596a3a09b4447aa8b676fc
 * 3
 *  UUID:		972483d5-19f7-419e-8f48-3858daea1ca0
 *	Public key:	0x98d2f1a38682dc4c3bd3ad1a28411d9507dd6423f8af6bcb9f3d827b7d309c8910825b6523359651a9b1ec16a754c2e4
 */
export function parseWalletAccountsVerbose(res: string): WalletAccountData[] {
  const accounts: WalletAccountData[] = [];

  // Exit early if there's no data
  res = res.trim();
  if (!res) return [];

  const chunk = 3;
  const parts = res.split("\n");
  for (let i = 0; i < parts.length; i += chunk) {
    const [name, uuid, publicKey] = parts.slice(i, i + chunk);
    if (!name) throw Error(`Unknown row format, no name: ${res}`);
    if (!uuid) throw Error(`Unknown row format, no uuid: ${res}`);
    if (!publicKey) throw Error(`Unknown row format, no publicKey: ${res}`);
    accounts.push({
      name: name.trim(),
      uuid: dataAfterColon(uuid, /uuid/i),
      publicKey: dataAfterColon(publicKey, /public.key/i)
    });
  }
  return accounts;
}

/**
 * ethdo wallet account
 * With the --verbose flag this will provide the public key of the accounts.
 *	UUID:		32ec701a-880b-4cfa-a409-74d88854ec64
 *	Public key:	0x98552a5cfa4022f529eadafeb0d17c2ed748a42ecd799472dad244ffd21342a7b3e436a38abad1ece8afabfd13b42e60
 */
export function parseWalletAccountVerbose(res: string): WalletAccountData {
  const [uuid, publicKey] = res.split("\n");
  if (!uuid) throw Error(`Unknown row format, no uuid: ${res}`);
  if (!publicKey) throw Error(`Unknown row format, no publicKey: ${res}`);
  return {
    name: "",
    uuid: dataAfterColon(uuid, /uuid/i),
    publicKey: dataAfterColon(publicKey, /public.key/i)
  };
}

/**
 * Parses data after a colon separated key value
 * @param row "UUID:		32ec701a-880b-4cfa-a409-74d88854ec64"
 * @param tag /uuid/i
 */
function dataAfterColon(row: string, tagRegex: RegExp): string {
  if (!row) throw Error(`Unknown row format, empty row: ${row}`);
  const [tag, value] = row
    .trim()
    .split(":")
    .map(v => (v || "").trim());
  if (!tag) throw Error(`Unknown row format, empty tag: ${row}`);
  if (!tagRegex.test(tag))
    throw Error(`Unknown row format, it should include ${tagRegex}: ${row}`);
  if (!value) throw Error(`Unknown row format, empty value: ${row}`);
  return value;
}