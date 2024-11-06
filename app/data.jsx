import { Badge } from "@shopify/polaris";

export const orders = [
  {
    id: "1020",
    title: "Sales20%",
    date: "Jul 20 at 4:34pm",
    collection: 49,
    total: "$969.44",
    status: "Active",
    statusIcon: (
      <Badge progress="complete" tone="success">
        Active
      </Badge>
    ),
  },
  {
    id: "1019",
    title: "Sales10%",
    date: "Jul 20 at 3:46pm",
    collection: 18,
    total: "$701.19",
    status: "Disable",
    statusIcon: (
      <Badge progress="partiallyComplete" tone="critical">
        Disable
      </Badge>
    ),
  },
  {
    id: "1018",
    title: "Sales50%",
    date: "Jul 20 at 3:44pm",
    collection: 10,
    total: "$798.24",
    status: "Active",

    statusIcon: (
      <Badge progress="complete" tone="success">
        Active
      </Badge>
    ),
  },
  {
    id: "1017",
    title: "Sales15%",
    date: "Jul 19 at 2:34pm",
    collection: 20,
    total: "$428.60",
    status: "Active",

    statusIcon: (
      <Badge progress="complete" tone="success">
        Active
      </Badge>
    ),
    fulfillmentStatus: <Badge progress="complete">Fulfilled</Badge>,
  },
  {
    id: "1016",
    title: "Sales100%",
    date: "Jul 19 at 2:10pm",
    collection: 31,
    total: "$624.33",
    status: "Active",

    statusIcon: (
      <Badge progress="complete" tone="success">
        Active
      </Badge>
    ),
    fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge>,
  },
  {
    id: "1015",
    title: "Sales10%",
    date: "Jul 18 at 11:23am",
    collection: 16,
    total: "$312.78",
    status: "Disable",
    statusIcon: (
      <Badge progress="partiallyComplete" tone="critical">
        Disable
      </Badge>
    ),
  },
  {
    id: "1014",
    title: "Sales25%",
    date: "Jul 18 at 10:02am",
    collection: 100,
    total: "$249.50",
    status: "Disable",

    statusIcon: (
      <Badge progress="partiallyComplete" tone="critical">
        Disable
      </Badge>
    ),
  },
  {
    id: "1013",
    title: "Sales30%",
    date: "Jul 17 at 5:17pm",
    collection: 4,
    total: "$920.00",
    status: "Active",

    statusIcon: (
      <Badge progress="complete" tone="success">
        Active
      </Badge>
    ),
  },
  // Add more items as needed
];
