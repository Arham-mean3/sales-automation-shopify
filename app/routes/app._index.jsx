import { useCallback, useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import cron from "node-cron";
import {
  Page,
  Layout,
  Text,
  Card,
  DataTable,
  Modal,
  Button,
  Form,
  TextField,
  FormLayout,
  Select,
  Banner,
  Toast,
  Frame,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import SelectProductComp from "../components/MultiCombobox";
import DateAndTimePicker from "../components/DateAndTimePicker";
import {
  getAllProductsQuery,
  getProductsQuery,
  updateProductVariantsPrice,
} from "../lib/queries";
import { addProduct, updateProductVariants } from "../lib/action";
import { dateToCron, parseDate } from "../lib/utils";
import {
  calculateEstimatedTime,
  options,
  SalesTypeOption,
} from "../lib/options";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    ${getProductsQuery}`,
  );

  const newResponse = await admin.graphql(
    `#graphql
    ${getAllProductsQuery}`,
  );

  const data = await response.json();
  const productsData = await newResponse.json();

  return json({
    products: data.data.products.edges,
    allProducts: productsData.data.products.edges,
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const values = await request.formData();
  const formData = Object.fromEntries(values);

  const { actionKey: key } = formData;

  switch (key) {
    case "CREATE_PRODUCT":
      try {
        // Add the product first
        const product = await addProduct(admin, formData);
        const variantId = product.variants.edges[0].node.id;

        // Update the product variants
        const updatedVariants = await updateProductVariants(
          admin,
          product.id,
          variantId,
          formData,
        );

        return json({
          product: product,
          variant: updatedVariants,
        });
      } catch (error) {
        // Return a clear error message if the JSON parsing fails
        const errorMessage = error.message || "Something went wrong";
        return json({ errors: errorMessage }, { status: 400 });
      }
    case "CREATE_SALES":
      try {
        const results = []; // Collect results here
        // const salesJobs = {}; // Store job references by sale ID
        const startTime = performance.now(); // Start time measurement

        const { products, salesType, salesValue, sDate, eDate, etime, stime } =
          formData;
        const productsData = JSON.parse(products);

        const startDate = parseDate(sDate); // Combines sDate and stime
        const endDate = parseDate(eDate); // Combines eDate and etime

        const cronExpressions = dateToCron(startDate, stime);
        const cronExpressione = dateToCron(endDate, etime);

        console.log(cronExpressions, cronExpressione);

        // Define the start and end functions
        const startSale = async () => {
          console.log("Starting sale at:", startDate);
          for (const product of productsData) {
            const { id: productId, variants } = product;
            for (const variantId of variants) {
              try {
                let originalPrice;
                let newPrice;
                if (salesType === "PERCENTAGE") {
                  const variantPriceQuery = await admin.graphql(
                    `#graphql
                  query getVariantPrice($id: ID!) {
                    productVariant(id: $id) {
                      price
                    }
                  }
                `,
                    { variables: { id: variantId } },
                  );
                  const variantPriceResponse = await variantPriceQuery.json();
                  originalPrice = parseFloat(
                    variantPriceResponse?.data?.productVariant?.price,
                  );

                  console.log("Original Price", originalPrice);
                  const discountPercentage = parseFloat(salesValue) / 100;
                  newPrice = originalPrice * (1 - discountPercentage);

                  console.log("New Price", newPrice);
                }
                const productSaleUpdate = await admin.graphql(
                  `#graphql
                ${updateProductVariantsPrice}
              `,
                  {
                    variables: {
                      productId: productId,
                      variants: [
                        {
                          id: variantId,
                          price: parseFloat(newPrice).toFixed(2),
                          compareAtPrice: parseFloat(originalPrice).toFixed(2),
                        },
                      ],
                    },
                  },
                );
                const salesUpdate = await productSaleUpdate.json();
                console.log("SALE UPDATED: ", salesUpdate);
                results.push({
                  productId,
                  variantId,
                  success: true,
                  salesUpdate,
                });
              } catch (error) {
                console.log("Error processing variant ID:", variantId, error);
                results.push({ productId, variantId, success: false, error });
              }
            }
          }
        };

        const endSale = async () => {
          console.log("Ending sale at:", endDate);
          for (const product of productsData) {
            const { id: productId, variants } = product;
            for (const variantId of variants) {
              try {
                // Fetch the current compareAtPrice to use as the original price
                const variantPriceQuery = await admin.graphql(
                  `#graphql
                    query getVariantCompareAtPrice($id: ID!) {
                      productVariant(id: $id) {
                        compareAtPrice
                      }
                    }
                  `,
                  { variables: { id: variantId } },
                );

                const variantPriceResponse = await variantPriceQuery.json();
                const originalPrice = parseFloat(
                  variantPriceResponse?.data?.productVariant?.compareAtPrice,
                );

                // Update the price to original and reset compareAtPrice to 0
                const productRevertUpdate = await admin.graphql(
                  `#graphql
                    ${updateProductVariantsPrice}
                  `,
                  {
                    variables: {
                      productId: productId,
                      variants: [
                        {
                          id: variantId,
                          price: parseFloat(originalPrice).toFixed(2), // Set price to original
                          compareAtPrice: null, // Set compareAtPrice to null (or 0)
                        },
                      ],
                    },
                  },
                );

                const revertUpdateResponse = await productRevertUpdate.json();
                results.push({
                  productId,
                  variantId,
                  success: true,
                  revertUpdateResponse,
                });
              } catch (error) {
                console.log("Error reverting variant ID:", variantId, error);
                results.push({ productId, variantId, success: false, error });
              }
            }
          }
        };

        // Schedule start and end cron jobs
        const startJob = cron.schedule(cronExpressions, startSale, {
          scheduled: true,
        });
        const endJob = cron.schedule(cronExpressione, endSale, {
          scheduled: true,
        });

        console.log(startJob, endJob);

        const endTime = performance.now(); // End time measurement
        const totalProcessingTime = (endTime - startTime) / 1000; // Calculate total processing time

        return json({
          salesCreated: true,
          timeTaken: ` ${totalProcessingTime.toFixed(2)} s`,
          results,
          // salesJobs: sanitizedSalesJobs,
        });
      } catch (error) {
        console.log("NEW Error", error);
        return json({ errors: error, salesCreated: false }, { status: 400 });
      }
    default:
      break;
  }
};

//   const formData = Object.fromEntries(form);

//   try {
//     const response = await admin.graphql(
//       `#graphql
//       mutation populateProduct($input: ProductInput!) {
//         productCreate(input: $input) {
//           product {
//             id
//             title
//             handle
//             status
//             variants(first: 10) {
//               edges {
//                 node {
//                   id
//                   price
//                   barcode
//                   createdAt
//                 }
//               }
//             }
//           }
//         }
//       }`,
//       {
//         variables: {
//           input: {
//             id: Math.floor(Math.random() * 1000).toString(),
//             title: formData.title,
//             handle: formData.handle,
//             status: formData.status, // Corrected to use 'status' instead of duplicating 'handle'
//             price: formData.price,
//             barcode: formData.barcode,
//             createdAt: new Date().toISOString()
//           },
//         },
//       },
//     );

//     const responseJson = await response.json();
//     return json(responseJson.data.productCreate.product); // Return the created product data
//   } catch (error) {
//     console.error("Error creating product:", error);
//     throw new Response("Failed to create product", { status: 500 });
//   }
// };

export default function Index() {
  const [active, setActive] = useState(false);
  const handleChange = useCallback(() => setActive(!active), [active]);

  const { products, allProducts } = useLoaderData();
  const fetcher = useFetcher();

  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [salesInfo, setSalesInfo] = useState([]);
  const [salesType, setSalesType] = useState("PERCENTAGE");
  const [salesValue, setSalesValue] = useState("");
  const [selected, setSelected] = useState("ACTIVE");
  const [showBanner, setShowBanner] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [salesProductsIds, setSalesProductsIds] = useState([]);
  // Getting Data from the separate Components

  //----- Time ---- Data
  const [stime, setStime] = useState("12:00");
  const [etime, setEtime] = useState("12:00");

  //----- Date ---- Date
  const [sDate, setSdate] = useState(new Date());
  const [eDate, setEdate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 2)),
  );

  //----- Date ---- Date

  const handleSelectChange = useCallback((value) => setSelected(value), []);

  // Handle Sales Types Function
  const handleSelectSalesTypeChanges = useCallback(
    (value) => setSalesType(value),
    [],
  );

  const rows = products.map(({ node }) => {
    const variant = node.variants.edges[0]?.node; // Get the first variant
    return [
      node.title, // Product title
      node.handle, // Product handle
      node.status, // Product status
      `$ ${variant.price}` || "$0.00", // Variant price (defaulting to "$0.00" if not available)
      variant.barcode || "N/A", // Barcode (defaulting to "N/A" if not available)
      variant.createdAt, // Variant created at date
    ];
  });

  const activator = <Button onClick={handleChange}>Create a Product</Button>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = {
      title: title,
      handle: handle,
      status: selected,
      barcode: barcode,
      price: price,
      actionKey: "CREATE_PRODUCT",
    };

    try {
      // Submit the form data using the existing fetcher
      await fetcher.submit(formData, { method: "POST" });

      setTitle("");
      setBarcode("");
      setHandle("");
      setPrice("");
    } catch (error) {
      console.log(error);
    }
  };

  const totalVariantsCount = salesProductsIds.reduce((total, product) => {
    return total + product.variants.length;
  }, 0);

  const createSale = async () => {
    console.log("Create Sales func Called!");

    // Check for required fields
    if (!salesValue || salesProductsIds.length === 0 || !stime || !etime) {
      setShowBanner(true); // Show the banner
      return; // Exit the function
    }
    
    const formData = {
      actionKey: "CREATE_SALES",
      salesType,
      salesValue,
      products: JSON.stringify(salesProductsIds),
      eDate,
      sDate,
      etime,
      stime,
    };
    try {
      // Submit the form data using the existing fetcher
      await fetcher.submit(formData, { method: "POST" });

      setSalesProductsIds([]);
      setSalesType("PERCENTAGE");
      setSalesValue("");
      setSdate(new Date());
      setEdate(new Date(new Date().setDate(new Date().getDate() + 2)));
      setStime("12:00");
      setEtime("12:00");
      setShowBanner(false);
    } catch (error) {
      console.log("There is an error encountered", error);
    }
  };

  const time = fetcher.data?.timeTaken;

  const sales = fetcher.data?.salesJobs;

  console.log("Sales Data", sales);

  useEffect(() => {
    if (fetcher.data?.salesCreated) {
      setShowToast(true);
      setSalesInfo([]);
    }
  }, [fetcher.data?.salesCreated]);   

  return (
    <Frame>
      <Page>
        <TitleBar title="Remix app template"></TitleBar>
        <Layout>
          {/* Heading */}
          <Layout.Section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Text as="h2">
                All Products
                {/* {JSON.stringify(product)} */}
              </Text>
              {activator}
            </div>
          </Layout.Section>
          {/* Table */}
          <Layout.Section>
            <Card>
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                ]}
                headings={[
                  "Title",
                  "Handle",
                  "Status",
                  "price",
                  "barcode",
                  "createdAt",
                ]}
                rows={rows}
              />
            </Card>

            <Modal
              // activator={activator}
              open={active}
              onClose={handleChange}
              title="Create a Products!"
              primaryAction={{
                content: "Confirm",
                onAction: handleSubmit,
              }}
              secondaryActions={[
                {
                  content: "Cancel",
                  onAction: handleChange,
                },
              ]}
            >
              <Modal.Section>
                <Form onSubmit={handleSubmit}>
                  <FormLayout>
                    <TextField
                      type="text"
                      label="Product Title"
                      value={title}
                      onChange={setTitle}
                    />
                    <TextField
                      type="text"
                      label="Product Handle"
                      value={handle}
                      onChange={setHandle}
                    />
                    <Select
                      label="Status"
                      options={options}
                      onChange={handleSelectChange}
                      value={selected}
                    />
                    <TextField
                      type="text"
                      label="Product Price"
                      value={price}
                      onChange={setPrice}
                    />
                    <TextField
                      type="text"
                      label="Product Barcode"
                      value={barcode}
                      onChange={setBarcode}
                    />
                  </FormLayout>
                </Form>
              </Modal.Section>
            </Modal>
          </Layout.Section>
          {/* Toast Container */}
          <Layout.Section>
            {showToast ? (
              <Toast
                content={
                  fetcher.data?.salesCreated
                    ? `Sales Created Successfully! in ${time}`
                    : "There is an error!"
                }
                onDismiss={() => setShowToast(false)}
              />
            ) : null}
          </Layout.Section>

          {/* Sales Provider */}
          <Layout.Section>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  marginTop: 20,
                  marginBottom: 20,
                  width: "300px",
                  position: "absolute",
                  right: -200,
                  bottom: 0,
                  zIndex: 999,
                }}
              >
                {showBanner && (
                  <Banner
                    title="Fill the following fields"
                    onDismiss={() => setShowBanner(false)}
                    tone={
                      !salesValue ||
                      salesProductsIds.length === 0 ||
                      !stime ||
                      !etime
                        ? "warning"
                        : "success"
                    }
                  >
                    <p>
                      {!salesValue && salesProductsIds.length === 0
                        ? "There is no Sale Value added and no products are selected!"
                        : !salesValue
                          ? "There is no Sale Value added!"
                          : salesProductsIds.length === 0
                            ? "No products are selected for applying sales!"
                            : "Create Sales"}
                    </p>
                  </Banner>
                )}
              </div>
              <div
                style={{
                  width: "300px",
                  margin: "auto",
                  position: "absolute",
                  right: -200,
                  zIndex: 999,
                }}
              >
                <Banner title="Time Estimation">
                  <p>
                    {`${salesInfo.length} products with a total of ${totalVariantsCount} variants will require approximately ${calculateEstimatedTime(salesInfo)} to process.`}
                  </p>
                </Banner>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#fff",
                    padding: 20,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Text variant="heading3xl" as="h2">
                      Apply Sales
                    </Text>
                    <Button onClick={createSale} variant={"primary"}>
                      Create a Sale!
                    </Button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    <Select
                      label="Sales Type"
                      options={SalesTypeOption}
                      onChange={handleSelectSalesTypeChanges}
                      value={salesType}
                    />

                    <TextField
                      type={
                        salesType === "FIXED-AMOUNT"
                          ? "number"
                          : salesType === "PERCENTAGE" && "integer"
                      }
                      label={`Sales values`}
                      value={salesValue}
                      onChange={(value) => {
                        const intValue = parseInt(value, 10);

                        if (
                          value === "" ||
                          (Number.isInteger(intValue) && intValue >= 1)
                        ) {
                          setSalesValue(value);
                        }
                      }}
                      prefix={
                        salesType === "FIXED-AMOUNT"
                          ? "$"
                          : salesType === "PERCENTAGE" && "%"
                      }
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 20,
                      marginBottom: 20,
                    }}
                  >
                    <DateAndTimePicker
                      eDate={eDate}
                      sDate={sDate}
                      stime={stime}
                      etime={etime}
                      setStime={setStime}
                      setEtime={setEtime}
                      setSdate={setSdate}
                      setEdate={setEdate}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 20,
                      marginBottom: 20,
                    }}
                  >
                    <SelectProductComp
                      products={allProducts}
                      setSalesProductsIds={setSalesProductsIds}
                      salesProductsIds={salesProductsIds}
                      setSalesInfo={setSalesInfo}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}

// const response = await admin.graphql(
//   `#graphql
//     ${addProductsQuery}`,
//   {
//     variables: {
//       input: {
//         title: formData.title,
//         handle: formData.handle,
//         status: formData.status,
//       },
//     },
//   },
// );

// const responseJson = await response.json();

// // Check for user errors
// const userErrors = responseJson.data.productCreate.userErrors;
// if (userErrors.length > 0) {
//   return json({ errors: userErrors }, { status: 400 });
// }

// const product = responseJson.data.productCreate.product;
// const variantId = product.variants.edges[0].node.id;

// if (product.id) {
// }

// const variantResponse = await admin.graphql(
//   `#graphql
//     ${addProductVariantsQuery}`,
//   {
//     variables: {
//       productId: product.id,
//       variants: [
//         {
//           id: variantId,
//           price: formData.price,
//           barcode: formData.barcode,
//         },
//       ],
//     },
//   },
// );

// const variantResponseJson = await variantResponse.json();

// // Check for user errors in variant update
// const variantUserErrors =
//   variantResponseJson.data.productVariantsBulkUpdate.userErrors;
// if (variantUserErrors.length > 0) {
//   return json({ errors: variantUserErrors }, { status: 400 });
// }

// return json({
//   product: product,
//   variant:
//     variantResponseJson.data.productVariantsBulkUpdate.productVariants,
// });

// ProductsID: {JSON.stringify(salesProductsIds)}

{
  /* <Card>
            {/* <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexWrap: "wrap",
              }}
            > */
}
{
  /* <div></div> */
}
{
  /* <div>
                StartTime: {JSON.stringify(stime)} ---- EndTime:{" "}
                {JSON.stringify(etime)}-
              </div>
              <div>
                StartDate:
                {JSON.stringify(formatDateToDDMMYYYY(sDate))} ---- EndDate:
                {JSON.stringify(formatDateToDDMMYYYY(eDate))}
              </div> */
}
{
  /* <div>
                <div>{JSON.stringify(salesProductsIds)}</div>
                <div>{JSON.stringify(salesType)}</div>
              </div> */
}
{
  /* </div> */
}
{
  /* </Card>  */
}
//   const form = await request.formData();
