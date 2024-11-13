import {
  TextField,
  IndexTable,
  useIndexResourceState,
  Button,
  Badge,
  Card,
} from "@shopify/polaris";
import { useState, useCallback, useMemo } from "react";
import { calculateTimeEstimation, formatDateTime } from "../lib/utils";

export default function SalesTable({ data, salesHandler, updateSalesHandler }) {
  const deselectedSalesData = useMemo(() => {
    return data.map((sale) => ({
      id: sale.id,
      title: sale.salesTitle,
      sDate: formatDateTime(sale.sDate, sale.stime),
      eDate: formatDateTime(sale.eDate, sale.etime),
      length: sale.products.length,
      variants: sale.products.reduce((total, product) => {
        return total + product.variants.length;
      }, 0),
      timeEstimation: calculateTimeEstimation(sale.products),
      status: sale.status,
    }));
  }, [JSON.stringify(data)]);

  const [queryValue, setQueryValue] = useState("");
  const handleFiltersQueryChange = useCallback(
    (value) => setQueryValue(value),
    [],
  );
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);

  const filteredOrders = deselectedSalesData.filter(
    (order) =>
      order.title.toLowerCase().includes(queryValue.toLowerCase()) ||
      order.title.toLowerCase().includes(queryValue.toLowerCase()),
  );

  const resourceName = {
    singular: "sale",
    plural: "sales",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredOrders);

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Calculate the total pages based on the filtered results
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Slice the filtered orders for the current page
  const paginatedOrders = filteredOrders.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  );

  const rowMarkup = paginatedOrders.map(
    (
      {
        id,
        title,
        sDate,
        eDate,
        variants,
        status,
        length,
        timeEstimation,
        id: productId,
      },
      index,
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <button
            className="bg-none outline-none border-0 cursor-pointer lg:py-4"
            onClick={(e) => {
              e.stopPropagation();
              updateSalesHandler(id);
            }}
          >
            <p>
              <span className="text-xs lg:text-sm">{title}</span>
            </p>
          </button>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <p className="text-xs lg:text-sm">
            {length} products with {variants} variants
          </p>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <p className="text-xs lg:text-sm">{timeEstimation}</p>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <p className="text-xs lg:text-sm">{sDate}</p>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <p className="text-xs lg:text-sm">{eDate}</p>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {status === "Active" ? (
            <Badge progress="complete" tone="success">
              Active
            </Badge>
          ) : status === "Disabled" ? (
            <Badge progress="partiallyComplete" tone="critical">
              Disable
            </Badge>
          ) : (
            status === "Schedule" && (
              <Badge progress="partiallyComplete" tone="warning">
                Schedule
              </Badge>
            )
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {status === "Active" ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                variant="tertiary"
                tone="critical"
                onClick={() => salesHandler(productId)}
              >
                Disable
              </Button>
            </div>
          ) : status === "Disabled" ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                variant="primary"
                tone="success"
                onClick={(e) => {
                  e.stopPropagation();
                  updateSalesHandler(id);
                }}
              >
                Active
              </Button>
            </div>
          ) : (
            status === "Schedule" && (
              // <Text tone="magic-subdued">Soon to be Started</Text>
              <div onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="tertiary"
                  tone="critical"
                  onClick={() => salesHandler(productId)}
                >
                  Disable
                </Button>
              </div>
            )
          )}
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Card>
      <div style={{ padding: "20px 0px" }}>
        <TextField
          value={queryValue}
          onChange={handleFiltersQueryChange}
          placeholder="Search Sales"
          clearButton
          onClearButtonClick={handleQueryValueRemove}
        />
      </div>
      <div style={filteredOrders.length === 0 ? { width: 700 } : null}>
        <IndexTable
          // condensed={useBreakpoints().smDown}
          resourceName={resourceName}
          itemCount={filteredOrders.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Sales Title" },
            { title: "Product/Collections Count" },
            { title: "Time Estimation" },
            { title: "Start Date" },
            { title: "End Date" },
            { title: "Status" },
            { title: "Actions" },
          ]}
          selectable={false}
          pagination={{
            hasNext: currentPage < totalPages - 1,
            hasPrevious: currentPage > 0,
            onNext: handleNextPage,
            onPrevious: handlePreviousPage,
          }}
        >
          {rowMarkup}
        </IndexTable>
      </div>
    </Card>
  );
}
