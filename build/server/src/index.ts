import { logs } from "./logs";
import app from "./app";
import { listenToDepositEvents } from "./services/eth1";
import { readkeymanagerMap } from "./services/keymanager";
import { migrateLegacyValidator } from "./services/migratePrysmKeys";
import { collectValidatorMetrics } from "./services/metrics";
import { printGitData } from "./services/printGitData";
import { validatorBinary } from "./services/validatorBinary";

// Connect to a Eth1.x node
listenToDepositEvents();
// Collect latest metrics for available validators
collectValidatorMetrics();
// Migrate keys previously controlled by the validator binary to ethdo
migrateLegacyValidator();
// For debugging only: print DNP version, git branch and commit
printGitData();

// Start validator binary if ready
if (readkeymanagerMap().size > 0) validatorBinary.restart();

/**
 * Start Express server.
 */
const port = app.get("port");
const env = app.get("env");
const server = app.listen(app.get("port"), () => {
  logs.info(`App is running at http://localhost:${port} in ${env} mode`);
});

export default server;
