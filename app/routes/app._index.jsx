import { useCallback, useContext, useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import cron from "node-cron";
import { Page, Layout, Text, Button, Toast, Frame } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  getAllCollections,
  getAllProductsQuery,
  getProductsQuery,
  updateProductVariantsPrice,
} from "../lib/queries";
import { addProduct, updateProductVariants } from "../lib/action";
import { dateToCron, parseDate } from "../lib/utils";
import { styles } from "../styles";
import IndexTableWithViewsSearch from "../components/SalesAllList";
import SalesModal from "../components/SalesModal";
import { SelectContext } from "../context/Select-Context";
import prisma from "../db.server";

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

  const collectionResponse = await admin.graphql(
    `#graphql
    ${getAllCollections}
    `,
  );

  const allSales = await prisma.sale.findMany({
    include: {
      products: {
        include: {
          variants: true, // Include the variants associated with each product
        },
      },
    },
  });

  const sessions = await prisma.session.findMany();

  const data = await response.json();
  const productsData = await newResponse.json();
  const collections = await collectionResponse.json();

  return json({
    products: data.data.products.edges,
    allProducts: productsData.data.products.edges,
    allCollection: collections.data.collections.edges,
    allSales: JSON.stringify(allSales),
    sessions: sessions,
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

                const variantPriceQuery = await admin.graphql(
                  `#graphql
                  query getVariantPrice($id: ID!) {
                    productVariant(id: $id) {
                      price
                      compareAtPrice
                    }
                  }
                `,
                  { variables: { id: variantId } },
                );

                const variantPriceResponse = await variantPriceQuery.json();
                let price = parseFloat(
                  variantPriceResponse?.data?.productVariant?.price,
                );
                let compareAtPrice = parseFloat(
                  variantPriceResponse?.data?.productVariant?.compareAtPrice,
                );

                // If compareAtPrice exists, use it as the current price and set compareAtPrice to null
                if (compareAtPrice) {
                  originalPrice = compareAtPrice;
                  compareAtPrice = null;
                } else {
                  originalPrice = price;
                }

                console.log("Original Price (before discount)", originalPrice);

                if (salesType === "PERCENTAGE") {
                  const discountPercentage = parseFloat(salesValue) / 100;
                  newPrice = originalPrice * (1 - discountPercentage);

                  console.log("Discounted New Price", newPrice);
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
                  sale: true,
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
                  sale: false,
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
    case "CREATE":
      try {
        const {
          products,
          salesType,
          saleTags,
          salesTitle,
          salesValue,
          sDate,
          eDate,
          etime,
          stime,
        } = formData;
        const productsData = JSON.parse(products);

        console.log(
          "------------------------------",
          salesTitle,
          saleTags,
          productsData,
          salesValue,
          sDate,
          eDate,
          etime,
          stime,
          salesType,
        );
        // Prepare the sale data for database insertion
        const newSale = await prisma.sale.create({
          data: {
            salesType: salesType,
            saleTags: saleTags,
            salesTitle: salesTitle,
            salesValue: salesValue,
            sDate: new Date(sDate), // Ensure sDate is a Date object
            eDate: new Date(eDate), // Ensure eDate is a Date object
            stime: stime,
            etime: etime,
            status: "Active",
            products: {
              create: productsData.map((product) => ({
                pId: product.id,
                variants: {
                  create: product.variants.map((variantId) => ({
                    variantId: variantId,
                  })),
                },
              })),
            },
          },
        });

        console.log(newSale);
        return json(
          { message: "Sales Created Successfully!", salesCreated: true },
          { status: 201 },
        );
      } catch (error) {
        console.log("NEW Error", error);
        return json({ errors: error, salesCreated: false }, { status: 400 });
      }
    case "DELETE":
      try {
        const { saleId } = formData;
        const deletedSale = await prisma.sale.delete({
          where: {
            id: saleId, // The unique ID of the sale to delete
          },
        });
        console.log("Deleted sale:", deletedSale);
        return json({ status: 200 });
      } catch (error) {
        return json(
          { error: "Error while deleting the sales" },
          { status: 400 },
        );
      }
    case "CHANGE_STATUS_TEXT":
      try {
        const { id } = formData;

        // Fetch the current sale to get the current status
        const currentSale = await prisma.sale.findUnique({
          where: { id: id },
          select: { status: true }, // Select only the status field
        });

        if (!currentSale) {
          return json(
            { message: "Sale not found", statusChanged: false },
            { status: 404 },
          );
        }

        // Toggle the status text
        const newStatus =
          currentSale.status === "Active"
            ? "Disabled"
            : currentSale.status === "Disabled" && "Active";

        // Update the sale with the new status
        const updateSaleStatustext = await prisma.sale.update({
          where: { id: id },
          data: { status: newStatus },
        });
        console.log("Updated Value", updateSaleStatustext);
        return json(
          { message: "Status Text Changed", statusChanged: true },
          { status: 201 },
        );
      } catch (error) {
        console.error("Error updating status text:", error);
        return json(
          {
            message: "There is an error while updating the status text",
            statusChanged: false,
          },
          { status: 400 },
        );
      }
    default:
      break;
  }
};

export default function Index() {
  const { allProducts, allCollection, allSales } = useLoaderData();
  const AllSales = JSON.parse(allSales);
  const fetcher = useFetcher();

  const { products, setCollection, setProducts, setSelectedCollection } =
    useContext(SelectContext);

  const [salesType, setSalesType] = useState("PERCENTAGE");
  const [salesValue, setSalesValue] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [salesCollectionIds, setSalesCollectionIds] = useState([]);

  // Getting Data from the separate Components

  //----- Sales Title ---- Sales Tag
  const [salesTitle, setSaleTitle] = useState("");
  const [saleTags, setSaleTags] = useState("");

  //----- Time ---- Data
  const [stime, setStime] = useState("12:00");
  const [etime, setEtime] = useState("12:00");

  //----- Date ---- Date
  const [sDate, setSdate] = useState(new Date());
  const [eDate, setEdate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 2)),
  );
  //----- Date ---- Date

  // error----- setError
  const [error, setError] = useState(false);

  // Handle Sales Types Function
  const handleSelectSalesTypeChanges = useCallback(
    (value) => setSalesType(value),
    [],
  );

  const validateSaleInputs = () => {
    // Check if any of the required fields are missing
    if (!salesTitle) {
      setToastMessage("Please add a sales title.");
      setError(true);
      setShowToast(true);
      return false;
    }

    if (!salesValue) {
      setToastMessage("Please enter a sales value.");
      setError(true);

      setShowToast(true);
      return false;
    }

    if (products.length === 0) {
      setToastMessage("Kindly add products in order to apply the sale.");
      setError(true);

      setShowToast(true);
      return false;
    }

    if (!stime) {
      setToastMessage("Please set a start time for the sale.");
      setError(true);

      setShowToast(true);
      return false;
    }

    if (!etime) {
      setToastMessage("Please set an end time for the sale.");
      setError(true);
      setShowToast(true);
      return false;
    }

    // All checks passed
    return true;
  };

  const createSale = async () => {
    // Check for required fields
    if (!validateSaleInputs()) {
      return;
    } else {
      const formData = {
        actionKey: "CREATE",
        salesTitle,
        salesType,
        salesValue,
        saleTags,
        products: JSON.stringify(products),
        eDate,
        sDate,
        etime,
        stime,
      };

      try {
        // Submit the form data using the existing fetcher
        await fetcher.submit(formData, { method: "POST" });

        setSaleTitle("");
        setSaleTags("");
        setSalesType("PERCENTAGE");
        setProducts([]);
        setCollection([]);
        setSelectedCollection([]);
        setSalesValue("");
        setSdate(new Date());
        setEdate(new Date(new Date().setDate(new Date().getDate() + 2)));
        setStime("12:00");
        setEtime("12:00");
        setShowModal(false);
        setToastMessage("Successfully Created Sales");
        setShowToast(true);
        setError(false);
      } catch (error) {
        console.log("There is an error encountered", error);
      }
    }
  };

  const deleteSale = async () => {
    try {
      const formData = {
        actionKey: "DELETE",
        saleId: "624d1aaa-c988-4508-b786-42baa0ed9535",
      };
      await fetcher.submit(formData, { method: "POST" });
    } catch (error) {
      console.log(error);
    }
  };

  const handleStatus = async (id) => {
    try {
      const formData = { actionKey: "CHANGE_STATUS_TEXT", id };
      await fetcher.submit(formData, { method: "POST" });
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    setCollection(allCollection);
  }, [allCollection]);

  // useEffect(() => {
  //   console.log("All Sales", AllSales);
  //   // console.log("Sessions", sessions)
  // }, [AllSales]);

  const res = fetcher.data?.statusChanged;

  useEffect(() => {
    if (res) {
      setShowToast(true);
      setError(false);
      setToastMessage("Status updated successfully!");
    }
  }, [res]);

  return (
    <Frame>
      <Page>
        <TitleBar title="Remix app template"></TitleBar>
        <Layout>
          {/* Toast Container */}
          <Layout.Section>
            {showToast ? (
              <Toast
                content={toastMessage}
                error={error}
                onDismiss={() => setShowToast(false)}
              />
            ) : null}
          </Layout.Section>

          {/* Sales Provider */}
          <Layout.Section>
            <div>
              {/* Modal for displaying the content */}
              <SalesModal
                showModal={showModal}
                salesType={salesType}
                salesValue={salesValue}
                etime={etime}
                stime={stime}
                products={allProducts}
                sDate={sDate}
                eDate={eDate}
                salesTitle={salesTitle}
                saleTags={saleTags}
                collections={allCollection}
                salesCollectionIds={salesCollectionIds}
                setStime={setStime}
                setEtime={setEtime}
                createSale={createSale}
                handleSelectSalesTypeChanges={handleSelectSalesTypeChanges}
                setShowModal={setShowModal}
                setSalesValue={setSalesValue}
                setSdate={setSdate}
                setEdate={setEdate}
                setSaleTags={setSaleTags}
                setSaleTitle={setSaleTitle}
                setSalesCollectionIds={setSalesCollectionIds}
              />
              {/* ALL SALES LIST */}

              <div style={styles.tableContainer}>
                {/* <SalesList /> */}
                <div style={styles.table}>
                  {/* SALES HEADING AND BUTTON CONTAINER */}
                  <div style={styles.salesContainer}>
                    <Text variant="headingXl" as="h1">
                      All Sales Listed
                    </Text>

                    <Button onClick={() => setShowModal(true)} primary>
                      Create Sales
                    </Button>

                    {/* <Button onClick={() => deleteSale()}>Delete Sales</Button> */}
                  </div>
                  <IndexTableWithViewsSearch
                    data={AllSales}
                    salesHandler={handleStatus}
                  />
                </div>
                <div style={styles.info}>
                  <strong>
                    Boost Sales Effortlessly with Automated Discounts!
                  </strong>
                  <p>
                    Our Shopify Sales Automation app makes it simple to manage
                    and activate sales across your store. Apply discounts to
                    individual products or entire collections with just a few
                    clicks.
                  </p>
                </div>
              </div>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
