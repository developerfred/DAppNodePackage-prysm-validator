import dargs from "dargs";
import { Supervisor } from "../utils/supervisor";
import {
  tlsCert,
  beaconRpcProvider,
  keymanagerFile,
  verbosity,
  logFile,
  graffiti,
  extraOpts
} from "../params";

export const validatorBinary = Supervisor(
  "validator",
  dargs({
    // "tls-cert": tlsCert,
    "witti-testnet": true,
    "beacon-rpc-provider": beaconRpcProvider,
    keymanager: "wallet",
    keymanageropts: keymanagerFile,
    verbosity: verbosity,
    "log-file": logFile,
    ...(graffiti ? { graffiti } : {}), // Ignore if empty
    _: [extraOpts]
  })
);
