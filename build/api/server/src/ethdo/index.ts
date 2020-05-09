import crypto from "crypto";
import { EthdoCmds } from "./cmds";
import { EthdoWallets, WithdrawlAccount } from "../../common";

const withdrawalWallet = "withdrawl";
const validatorWallet = "validator";

interface EthdoValidator {
  account: string;
  passphrase: string;
}

interface AccountCredentials {
  account: string;
  passphrase: string;
}

export class Ethdo extends EthdoCmds {
  /**
   * List all wallets and their accounts
   */
  async listAll(): Promise<EthdoWallets[]> {
    const walletNames = await this.walletList();
    const wallets: EthdoWallets[] = [];
    for (const name of walletNames.sort()) {
      const accounts = await this.walletAccounts({ wallet: name });
      wallets.push({ name, accounts: accounts.sort() });
    }
    return wallets;
  }

  async newRandomValidatorAccount(): Promise<EthdoValidator> {
    await this.assertWalletExists(validatorWallet);
    const accounts = await this.walletAccounts({ wallet: validatorWallet });
    const accountIndex = findFirstAvailableNum(accounts);

    const validatorAccount = `${validatorWallet}/${accountIndex}`;
    const validatorPassword = crypto.randomBytes(32).toString("hex");
    const validator = {
      account: validatorAccount,
      passphrase: validatorPassword
    };
    await this.accountCreate(validator);
    return validator;
  }

  async assertWalletExists(wallet: string) {
    try {
      await this.walletInfo({ wallet });
    } catch (e) {
      await this.walletCreate({ wallet });
    }
  }

  async createWithdrawlAccount({ account, passphrase }: AccountCredentials) {
    await this.assertWalletExists(withdrawalWallet);
    await this.accountCreate({
      account: `${withdrawalWallet}/${account}`,
      passphrase
    });
  }

  async accountWithdrawlList(): Promise<WithdrawlAccount[]> {
    const accounts = await this.walletAccounts({
      wallet: withdrawalWallet
    }).catch(e => {
      if (e.message.includes("wallet not found")) return [] as string[];
      else throw e;
    });
    return accounts.map(name => ({
      name,
      id: `${withdrawalWallet}/${name}`
    }));
  }

  /**
   * Create a new validator account and generate deposit data
   */
  async getDepositData(validator: EthdoValidator, withdrawalAccount: string) {
    return await this.validatorDepositdata({
      validatoraccount: validator.account,
      passphrase: validator.passphrase,
      withdrawalaccount: withdrawalAccount,
      depositvalue: "32Ether",
      raw: true
    });
  }
}

/**
 * Util: Given ["1", "3"] return the first available number: "2"
 * @param arr
 */
function findFirstAvailableNum(arr: string[]): string {
  for (let i = 0; i <= arr.length; i++) {
    const name = String(i + 1);
    if (!arr.includes(name)) return name;
  }
  return String(Math.random()).slice(2); // It's just a label ID
}
