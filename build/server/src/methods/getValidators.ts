import { ValidatorStats, DepositEvent, PendingValidator } from "../../common";
import * as db from "../db";
import { ethdo } from "../ethdo";
import { computeExpectedBalance } from "../utils/depositEvent";
import { ethers } from "ethers";
import { requestPastDepositEvents } from "../services/eth1";

/**
 * Show validator stats.
 * Only show validators that have a confirmed deposit
 */
export async function getValidators(): Promise<ValidatorStats[]> {
  const accounts = await ethdo.accountList("validator");
  // Keep fetching logs in the background only when UI is connected
  requestPastDepositEvents();

  return accounts
    .map(
      ({ name, publicKey }): ValidatorStats => {
        const depositEventsObj = db.deposits.depositEvents.get(publicKey);
        const depositEvents = Object.values(depositEventsObj?.events || {});
        const metrics = db.metrics.current.get(publicKey);
        const { balance, status } = metrics || {};

        return {
          index: parseInt(name) || 0,
          publicKey,
          depositEvents,
          status,
          balance: computeBalance({ balance, status }, depositEvents)
        };
      }
    )
    .filter(({ depositEvents, status }) => depositEvents.length > 0 || status);
}

function computeBalance(
  {
    balance,
    status
  }: {
    balance?: string;
    status?: string;
  },
  depositEvents: DepositEvent[]
): { eth: number | null; isExpected: boolean } {
  if (
    !balance &&
    (!status || status.includes("UNKNOWN") || status === "DEPOSITED") &&
    depositEvents.length > 0
  ) {
    const expectedBalance = computeExpectedBalance(depositEvents);
    if (expectedBalance)
      return {
        eth: expectedBalance,
        isExpected: true
      };
  }

  return {
    eth:
      typeof balance === "string" || typeof balance === "number"
        ? // API returns the balance in 9 decimals
          parseFloat(ethers.utils.formatUnits(balance, 9)) || null
        : null,
    isExpected: false
  };
}
