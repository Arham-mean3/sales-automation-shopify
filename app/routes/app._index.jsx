import { useCallback, useState } from "react";
import { json } from "@remix-run/node";
import { useActionData, useFetcher, useLoaderData } from "@remix-run/react";
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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import SelectProductComp from "../components/MultiCombobox";
import DateAndTimePicker from "../components/DateAndTimePicker";
import {
  getAllProductsQuery,
  getProductsQuery,
  singleProductVariantId,
  updateProductVariantsPrice,
} from "../lib/queries";
import {
  addProduct,
  updatePricesForSale,
  updateProductVariants,
} from "../lib/action";
import { formatDateToDDMMYYYY } from "../lib/utils";

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

        const { products, salesType, salesValue } = formData;
        const productsData = JSON.parse(products);

        for (const product of productsData) {
          const { id: productId, variants } = product;

          for (const variantId of variants) {
            try {
              // Fetch the original price if needed
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
                // Calculate the new price

                const discountPercentage = parseFloat(salesValue) / 100;
                newPrice = originalPrice * (1 - discountPercentage);
              }

              // Use productVariantsBulkUpdate mutation to update the price
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
              console.log("Sale Update for variant:", variantId);

              // Add success result to results array
              results.push({
                productId,
                variantId,
                success: true,
                salesUpdate,
              });
            } catch (error) {
              console.log("Error processing variant ID:", variantId, error);

              // Add error result to results array
              results.push({
                productId,
                variantId,
                success: false,
                error,
              });
            }
          }
        }

        // Return results after processing all products and variants
        return json({
          salesCreated: true,
          results,
        });
      } catch (error) {
        console.log("NEW Error", error);
        return json({ errors: error }, { status: 400 });
      }
    default:
      break;
  }
};

//   const { admin } = await authenticate.admin(request);
//   const form = await request.formData();
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
  const data = useActionData();

  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [salesType, setSalesType] = useState("PERCENTAGE");
  const [salesValue, setSalesValue] = useState("");
  const [selected, setSelected] = useState("ACTIVE");

  // Getting Data from the separate Components

  //----- Time ---- Data
  const [stime, setStime] = useState("12:00 AM");
  const [etime, setEtime] = useState("12:00 AM");

  //----- Date ---- Date
  const [sDate, setSdate] = useState(new Date());
  const [eDate, setEdate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 2)),
  );

  //----- Date ---- Date
  const [salesProductsIds, setSalesProductsIds] = useState([]);
  // const [, ] = useState("");

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

  const options = [
    { label: "Active", value: "ACTIVE" },
    { label: "Archive", value: "ARCHIVED" },
    { label: "Draft", value: "DRAFT" },
  ];

  const SalesTypeOption = [
    { label: "Fixed Amount", value: "FIXED-AMOUNT" },
    { label: "Percentage", value: "PERCENTAGE" },
  ];

  const fetcher = useFetcher();

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

  const createSale = async (e) => {
    console.log("Create Sales func Called!");

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
      setStime("12:00 AM");
      setEtime("12:00 AM");
    } catch (error) {
      console.log(error);
    }
  };

  console.log("Sales Created... ? ----", data);

  // console.log("Results -------- ", data?.results)

  return (
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
            <Text variant="heading3xl" as="h2">
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
        {/* Sales Provider */}
        <Layout.Section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{ backgroundColor: "#fff", padding: 20, borderRadius: 10 }}
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
                  {/* {JSON.stringify(product)} */}
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
                  onChange={setSalesValue}
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
                />
              </div>
            </div>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
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

// {/* <Card>
//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 flexWrap: "wrap",
//               }}
//             >
//               <div></div>
//               {/* <div>
//                 StartTime: {JSON.stringify(stime)} ---- EndTime:{" "}
//                 {JSON.stringify(etime)}-
//               </div>
//               <div>
//                 StartDate:
//                 {JSON.stringify(formatDateToDDMMYYYY(sDate))} ---- EndDate:
//                 {JSON.stringify(formatDateToDDMMYYYY(eDate))}
//               </div>
//               <div>
//                 <div>{JSON.stringify(salesValue)}</div>
//                 <div>{JSON.stringify(salesType)}</div>
//               </div> */}
//             </div>
//           </Card> */}
