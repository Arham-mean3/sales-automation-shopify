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
import { dateToCron, getSingleProduct, parseDate } from "../lib/utils";
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
    case "APPLY_SALES":
      try {
        const results = []; // Collect results here
        const startTime = performance.now(); // Start time measurement

        const { products } = formData;
        const productsData = JSON.parse(products);

        const startSaleForEachProduct = (product) => {
          // Destructuring the data from products
          const {
            id,
            products,
            sDate,
            stime,
            eDate,
            etime,
            salesType,
            salesValue,
          } = product;

          const startDate = parseDate(sDate); // Combines sDate and stime
          const endDate = parseDate(eDate); // Combines eDate and etime

          const cronExpressions = dateToCron(startDate, stime);
          const cronExpressione = dateToCron(endDate, etime);

          // console.log("Start Date:", startDate); // Log the start date
          // console.log("End Date:", endDate); // Log the end date
          console.log("---------------------------------------------------");
          console.log("Cron Expressions:", cronExpressions, cronExpressione);
          console.log("---------------------------------------------------");
          // Define the start and end functions
          const startSale = async () => {
            console.log("Starting sale at:", startDate);
            await prisma.sale.update({
              where: {
                id: id, // The ID of the sale you are starting
                status: "Schedule", // Only update if the current status is "Schedule"
              },
              data: {
                status: "Active", // Change the status to "Active"
              },
            });

            for (const product of products) {
              const { id: productId, variants } = product;
              console.log(productId, variants);
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

                  console.log(
                    "Original Price (before discount)",
                    originalPrice,
                  );

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
                            compareAtPrice:
                              parseFloat(originalPrice).toFixed(2),
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
                    saleStarted: true,
                    salesUpdate,
                    sale: true,
                  });
                } catch (error) {
                  console.log("Error processing variant ID:", variantId, error);
                  results.push({
                    productId,
                    variantId,
                    saleStarted: false,
                    error,
                  });
                }
              }
            }
          };

          const endSale = async () => {
            console.log("Ending sale at:", endDate);
            await prisma.sale.updateMany({
              where: {
                id: id, // The ID of the sale you are starting
                status: "Active", // Only update if the current status is "Active"
              },
              data: {
                status: "Disabled", // Change the status to "Disabled"
              },
            });
            for (const product of products) {
              const { id: productId, variants } = product;
              console.log(productId, variants);
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

                  console.log("Original Price", originalPrice);

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

                  console.log("Revert Update Response", revertUpdateResponse);

                  results.push({
                    productId,
                    variantId,
                    saleEnded: true,
                    revertUpdateResponse,
                    sale: false,
                  });
                } catch (error) {
                  console.log("Error reverting variant ID:", variantId, error);
                  results.push({
                    productId,
                    variantId,
                    saleEnded: false,
                    error,
                  });
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
        };

        for (const product of productsData) {
          startSaleForEachProduct(product);
        }

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
            status: "Schedule",
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

        // Fetch the updated list of all sales
        const allSales = await prisma.sale.findMany({
          include: {
            products: {
              include: {
                variants: true,
              },
            },
          },
        });

        console.log(newSale);
        return json(
          {
            message: "Sales Created Successfully!",
            salesAdded: true,
            sales: allSales,
          },
          { status: 201 },
        );
      } catch (error) {
        console.log("NEW Error", error);
        return json({ errors: error, salesAdded: false }, { status: 400 });
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

        const now = new Date();
        now.setMinutes(now.getMinutes() + 1); // Add 1 minute
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const currentTime = `${hours}:${minutes}`; // Time in HH:MM format, 1 minute ahead

        console.log("Time 1 minute later:", currentTime);
        // Fetch the current sale to get the current status
        const currentSale = await prisma.sale.findUnique({
          where: { id: id },
          select: {
            status: true,
            products: {
              select: {
                pId: true, // Assuming pId is a field on the 'products' model
                variants: {
                  select: {
                    variantId: true, // Assuming variantId is a field on the 'variants' model
                  },
                },
              },
            },
          },
        });

        const processedSaleData = currentSale.products.map((product) => {
          return {
            id: product.pId, // Product ID
            variants: product.variants.map((variant) => variant.variantId), // Map variants to an array of variant IDs
          };
        });

        if (!currentSale) {
          return json(
            { message: "Sale not found", statusChanged: false },
            { status: 404 },
          );
        }
        console.log("Current Sales", processedSaleData);

        if (currentSale.status === "Active") {
          const endDate = parseDate(new Date().toISOString());
          const cronExpressione = dateToCron(endDate, currentTime);

          console.log("Cron Expression for Ending sales", cronExpressione);

          const endSale = async () => {
            console.log("Ending sale at:", endDate);
            for (const product of processedSaleData) {
              const { id: productId, variants } = product;
              console.log(productId, variants);
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

                  console.log("Original Price", originalPrice);

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

                  console.log("Revert Update Response", revertUpdateResponse);
                } catch (error) {
                  console.log("Error reverting variant ID:", variantId, error);
                }
              }
            }
          };

          const endJob = cron.schedule(cronExpressione, endSale, {
            scheduled: true,
          });

          console.log(endJob);
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
    case "UPDATE_SALES":
      try {
        const {
          id,
          salesValue,
          salesType,
          salesTitle,
          saleTags,
          etime,
          stime,
          sDate,
          eDate,
          products,
        } = formData;

        // Parse the products JSON string to an array of products
        const parsedProducts = JSON.parse(products);

        console.log("Updating Products", parsedProducts);

        const existingSale = await prisma.sale.findUnique({
          where: { id: id },
          select: { status: true },
        });

        if (!existingSale) {
          return json({ error: "Sale not found!" });
        }

        // Determine the new status based on the current status
        let newStatus = existingSale.status;
        if (existingSale.status === "Disabled") {
          newStatus = "Scheduled";
        } else if (existingSale.status === "Active") {
          newStatus = "Schedule";
        }

        // Update the sale record in the database
        const updateSingleSale = await prisma.sale.update({
          where: { id: id },
          data: {
            salesValue,
            salesType,
            salesTitle,
            saleTags,
            status: newStatus,
            etime,
            stime,
            sDate: new Date(sDate),
            eDate: new Date(eDate),
            products: {
              connectOrCreate: parsedProducts.map((product) => ({
                where: { pId: product.id },
                create: { pId: product.id },
                variants: {
                  connectOrCreate: product.variants.map((variantId) => ({
                    where: { variantId: variantId },
                    create: { variantId: variantId },
                  })),
                },
              })),
            },
          },
        });


        return json({ success: true, sale: updateSingleSale });
      } catch (error) {
        console.error("Error updating sale:", error);
        return json({ error: "Something went wrong!", details: error.message });
      }

    default:
      break;
  }
};

export default function Index() {
  const { allProducts, allCollection, allSales } = useLoaderData();
  const AllSales = JSON.parse(allSales);
  const fetcher = useFetcher();

  console.log(AllSales);
  const {
    products,
    scheduleProducts,
    update,
    setCollection,
    setProducts,
    setSelectedCollection,
    setSales,
    findMatchingCollectionIds,
    setUpdate,
  } = useContext(SelectContext);

  const [salesType, setSalesType] = useState("PERCENTAGE");
  const [salesValue, setSalesValue] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [salesCollectionIds, setSalesCollectionIds] = useState([]);
  // const [updateSales, setUpdateSales] = useState(false);
  const [id, setId] = useState("");
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

  const salesData = fetcher.data?.sales;
  const salesStarted = fetcher.data?.result?.saleStarted;
  const res = fetcher.data?.statusChanged;

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

  const handleApplySales = async () => {
    const formData = {
      actionKey: "APPLY_SALES",
      products: JSON.stringify(scheduleProducts),
    };
    try {
      await fetcher.submit(formData, { method: "POST" });
    } catch (error) {
      console.log("Something went wrong.", error);
    }
  };

  const deleteSale = async (id) => {
    try {
      const formData = {
        actionKey: "DELETE",
        saleId: id,
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

  const handleUpdateSale = async (id) => {
    // For Updating and opening the model
    setShowModal(true);
    setUpdate(true);

    // Setting Id for Updation
    setId(id);
    // Getting single product data
    const product = getSingleProduct(id, AllSales);
    const data = { ...product };
    const value = data[0];
    console.log("Single Product fetched", value);
    const { matchingCollectionIds, orphanProducts } = findMatchingCollectionIds(
      data[0].products,
    );
    console.log(matchingCollectionIds, "Orphan Products:------", orphanProducts);
    setSelectedCollection(matchingCollectionIds);
    setProducts(orphanProducts);
    setSaleTitle(value.salesTitle);
    setSaleTags(value.saleTags);
    setSalesValue(value.salesValue);
  };

  const handleUpdate = async () => {
    if (!validateSaleInputs()) {
      return;
    } else {
      const formData = {
        actionKey: "UPDATE_SALES",
        id,
        salesValue,
        salesType,
        salesTitle,
        saleTags,
        etime,
        stime,
        sDate,
        eDate,
        products: JSON.stringify(products),
        newProducts: products,
      };
      try {
        console.log("Form Data", formData);
        // await fetcher.submit(formData, { method: "POST" });
        setShowModal(false);
        setToastMessage("Successfully Updated Sales");
        setShowToast(true);
        setError(false);
      } catch (error) {
        console.log("Something went wrong!", error);
      }
    }
  };

  console.log("Sale Started", salesStarted);

  useEffect(() => {
    setCollection(allCollection);
  }, [allCollection]);

  useEffect(() => {
    setSales(AllSales);
  }, []);

  useEffect(() => {
    console.log("All Sales", salesData);
    if (salesData) {
      setSales(salesData);
    }
  }, [salesData]);

  useEffect(() => {
    if (scheduleProducts.length > 0) {
      console.log("Schedule Products:------", scheduleProducts);
      handleApplySales();
    }
  }, [scheduleProducts.length > 0, salesData]);

  useEffect(() => {
    console.log("Id", id);
  }, [id]);

  useEffect(() => {
    if (res) {
      setShowToast(true);
      setError(false);
      setToastMessage("Status updated successfully!");
    }
  }, [res]);

  useEffect(() => {
    if (salesStarted) {
      console.log("Sale Started data", allSales);
    } else {
      console.log("Not Sale Started data");
    }
  }, [salesStarted]);

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
                updateSales={update}
                setStime={setStime}
                setEtime={setEtime}
                createSale={createSale}
                handleSelectSalesTypeChanges={handleSelectSalesTypeChanges}
                handleUpdate={handleUpdate}
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

                    <Button
                      onClick={() => {
                        setProducts([]);
                        setSelectedCollection([]);
                        setSaleTitle("");
                        setSalesValue("");
                        setSaleTags("");
                        setUpdate(false);
                        setShowModal(true);
                      }}
                      primary
                    >
                      Create Sales
                    </Button>

                    {/* <Button
                      onClick={() =>
                        deleteSale("762637ab-5bad-43dc-976a-366a17131dde")
                      }
                    >
                      Delete Sales
                    </Button> */}
                  </div>
                  <IndexTableWithViewsSearch
                    data={AllSales}
                    salesHandler={handleStatus}
                    updateSalesHandler={handleUpdateSale}
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
