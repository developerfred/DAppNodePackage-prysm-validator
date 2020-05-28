import React from "react";
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  SvgIconTypeMap,
} from "@material-ui/core";
// import DashboardIcon from "@material-ui/icons/Dashboard";
import PeopleIcon from "@material-ui/icons/People";
import BarChartIcon from "@material-ui/icons/BarChart";
import LayersIcon from "@material-ui/icons/Layers";
import AssignmentIcon from "@material-ui/icons/Assignment";
import { newTabProps } from "utils";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";

const sideNavMainItems = [
  // { name: "Dashboard", Icon: DashboardIcon, href: "#" },
  {
    name: "Metrics",
    Icon: BarChartIcon,
    href:
      "http://dms.dappnode/d/DNPE2PWD/dappnode-eth-2-0-prysm-witti-dashboard",
  },
  {
    name: "Nodes",
    Icon: LayersIcon,
    href: "https://eth2stats.io/witti-testnet",
  },
];

const sideNameSecondaryItems = [
  {
    name: "Logs",
    Icon: AssignmentIcon,
    href:
      "http://my.dappnode/#/packages/prysm-validator.public.dappnode.eth/logs",
  },
  {
    name: "Support",
    Icon: PeopleIcon,
    href: "https://riot.im/app/#/room/#DAppNode:matrix.org",
  },
];

export const mainListItems = <div>{ListItems(sideNavMainItems)}</div>;

export const secondaryListItems = (
  <div>
    <ListSubheader inset>Help</ListSubheader>
    {ListItems(sideNameSecondaryItems)}
  </div>
);

function ListItems(
  items: {
    name: string;
    Icon: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
    href: string;
  }[]
) {
  return items.map(({ name, Icon, href }) => (
    <ListItem key={name} button component="a" href={href} {...newTabProps}>
      <ListItemIcon>
        <Icon />
      </ListItemIcon>
      <ListItemText primary={name} />
    </ListItem>
  ));
}
