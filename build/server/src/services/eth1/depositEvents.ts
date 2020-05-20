import { ethers } from "ethers";
import retry from "async-retry";
import * as db from "../../db";
import {
  depositContractAddress,
  depositContractCreationBlock
} from "../../params";
import {
  DepositEventArgs,
  depositEventAbi,
  DepositEvents
} from "../../../common";
import { getGoerliProvider } from "./provider";
import { logs } from "../../logs";

export function listenToDepositEvents() {
  retry(getDeposits).catch(e => {
    logs.error(`Error getting past deposit events`, e);
  });
  subscribeToEvents();
}

/**
 * Fetch past deposit events
 */
async function getDeposits() {
  const depositInt = new ethers.utils.Interface([depositEventAbi]);
  const provider = getGoerliProvider();
  const depositLogs = await provider.getLogs({
    address: depositContractAddress, // or contractEnsName,
    fromBlock: getHighestSeenBlock() || depositContractCreationBlock,
    toBlock: "latest",
    topics: [depositInt.events[depositEventAbi.name].topic]
  });

  if (depositLogs.length)
    logs.info(`Fetched ${depositLogs.length} new deposit logs`);

  saveDepositEvents(
    depositLogs.map(log => {
      const parsedLog = depositInt.parseLog(log);
      const args: DepositEventArgs = parsedLog.values;
      return { ...log, args };
    })
  );
}

/**
 * Subcribe to deposit events, will not fetch past events
 */
function subscribeToEvents() {
  const provider = getGoerliProvider();
  const depositContract = new ethers.Contract(
    depositContractAddress,
    [depositEventAbi],
    provider
  );
  depositContract.on(depositEventAbi.name, (...args: any[]) => {
    try {
      const log: ethers.providers.Log & { args: DepositEventArgs } =
        args[args.length - 1];
      saveDepositEvents([log]);
    } catch (e) {
      logs.error("Error on new deposit event", e);
    }
  });
}

/**
 * Index and store deposit events in the localDb
 */
function saveDepositEvents(
  depositLogs: (ethers.providers.Log & { args: DepositEventArgs })[]
) {
  const depositEvents: { [pubkey: string]: DepositEvents } = {};

  for (const log of depositLogs) {
    const publicKey = log.args.pubkey;
    const transactionHashLogIndex = `${
      log.transactionHash
    }/${log.transactionLogIndex || 0}`;
    if (!depositEvents[publicKey])
      depositEvents[publicKey] = {
        publicKey,
        events: {}
      };
    depositEvents[publicKey].events[transactionHashLogIndex] = {
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      // Pick values to prevent storing unnecessary data in the logs.args object
      pubkey: log.args.pubkey,
      withdrawal_credentials: log.args.withdrawal_credentials,
      amount: log.args.amount,
      signature: log.args.signature,
      index: log.args.index
    };
  }

  db.deposits.depositEvents.mergeAll(depositEvents);
}

/**
 * Compute the highest blockNumber from the logs stored in the DB
 * To prevent fetching unnecessary data from Eth1 on startup
 */
function getHighestSeenBlock(): number {
  try {
    const depositEvents = db.deposits.depositEvents.getAll();
    let blockNumber: number = 0;
    for (const { events } of depositEvents)
      for (const event of Object.values(events))
        if (event.blockNumber && event.blockNumber > blockNumber)
          blockNumber = event.blockNumber + 1; // Start fetching from the next block

    return blockNumber;
  } catch (e) {
    logs.error(`Error getting highest deposit event blockNumber`, e);
    return 0;
  }
}