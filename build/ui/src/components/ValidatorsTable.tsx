import React, { useState } from "react";
import { orderBy } from "lodash";
import { makeStyles } from "@material-ui/core/styles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TableContainer,
  Typography,
  Box,
  TableSortLabel,
} from "@material-ui/core";
import { Title } from "./Title";
import { ValidatorStats } from "../common/types";
import { HelpText } from "components/HelpText";
import { prysmStatusDescription } from "text";
import { PublicKeyView } from "./PublicKeyView";
import { DepositEventsView } from "./Eth1TransactionView";

const maxItems = 10;
type SortOption = "index" | "blockNumber" | "status" | "balance";
type SortOrder = "asc" | "desc";

const useStyles = makeStyles((theme) => ({
  seeMore: {
    marginTop: theme.spacing(3),
  },
  header: {
    marginBottom: theme.spacing(1),
  },
  centerLink: {
    display: "flex",
    alignItems: "center",
  },
  linkIcon: {
    marginLeft: theme.spacing(0.5),
    display: "flex",
    fontSize: "1.2rem",
  },
}));

export function ValidatorsTable({
  validators,
}: {
  validators: ValidatorStats[];
}) {
  const [showAll, setShowAll] = useState(false);
  const [sortProperty, setSortProperty] = useState<SortOption>("index");
  const [sortAsc, setSortAsc] = useState(false);
  const direction = sortAsc ? "asc" : "desc";
  const validatorsSorted = orderBy(
    validators,
    compareValidatorsBy(sortProperty),
    direction
  );
  const validatorsToShow = showAll
    ? validatorsSorted
    : validatorsSorted.slice(0, 10);

  function onHeaderClick(option?: SortOption) {
    if (!option) return;
    if (option === sortProperty) setSortAsc((x) => !x);
    else setSortProperty(option);
  }

  const classes = useStyles();

  const headers: {
    text: string;
    option?: SortOption;
    align?: "right";
    helpTable?: {
      name: string;
      text: string;
    }[];
  }[] = [
    { text: "#", option: "index" },
    { text: "PubKey" },
    { text: "Deposit", option: "blockNumber" },
    { text: "Status", option: "status" },
    { text: "Balance", option: "balance", align: "right" },
  ];

  return (
    <React.Fragment>
      <Title>
        <span className={classes.centerLink}>
          Validator accounts <HelpText table={prysmStatusDescription} />
        </span>
      </Title>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {headers.map(({ text, option, align, helpTable }) => (
                <TableCell key={text} align={align}>
                  {option ? (
                    <TableSortLabel
                      active={sortProperty === option}
                      direction={direction}
                      // style={alignRight ? { justifyContent: "flex-end" } : {}}
                      onClick={() => onHeaderClick(option)}
                    >
                      {text}
                    </TableSortLabel>
                  ) : (
                    text
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {validatorsToShow.map((validator, i) => (
              <TableRow key={validator.index || i}>
                <TableCell>{validator.index}</TableCell>
                <TableCell>
                  <PublicKeyView publicKey={validator.publicKey} />
                </TableCell>
                <TableCell>
                  <DepositEventsView depositEvents={validator.depositEvents} />
                </TableCell>
                <TableCell>{validator.status}</TableCell>
                <TableCell align="right">
                  {validator.balance.isEstimated ? (
                    <i>{validator.balance.eth} (estimated)</i>
                  ) : (
                    validator.balance.eth
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {validatorsToShow.length === 0 && (
        <Box m={6} textAlign="center">
          <Typography variant="caption" color="textSecondary">
            No validators
          </Typography>
        </Box>
      )}

      {validators.length > maxItems && (
        <div className={classes.seeMore}>
          <Button color="primary" onClick={() => setShowAll(true)}>
            See all {validators.length} validators
          </Button>
        </div>
      )}
    </React.Fragment>
  );
}

function compareValidatorsBy(
  sortOption: SortOption
): keyof ValidatorStats | ((validator: ValidatorStats) => any) {
  switch (sortOption) {
    case "index":
      return "index";
    case "blockNumber":
      return (v) => (Object.values(v.depositEvents)[0] || {}).blockNumber || 0;
    case "status":
      return "status";
    case "balance":
      return (v) => v.balance.eth || 0;
  }
}
