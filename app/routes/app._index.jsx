import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import cron from "node-cron";
import { Text, Button, Toast, Frame } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  getAllCollections,
  getAllProductsQuery,
  getCurrencyCode,
  getProductsQuery,
  updateProductVariantsPrice,
} from "../lib/queries";
import { dateToCron, getSingleProduct, parseDate } from "../lib/utils";
import SalesModal from "../components/SalesModal";
import { SelectContext } from "../context/Select-Context";
import prisma from "../db.server";
import SalesTable from "../components/SalesAllList";

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

  const currencyCodeResponse = await admin.graphql(
    `#graphql
    ${getCurrencyCode}
    `,
  );

  const sessions = await prisma.session.findMany();

  const data = await response.json();
  const productsData = await newResponse.json();
  const collections = await collectionResponse.json();
  const currencyCode = await currencyCodeResponse.json();

  return json({
    products: data.data.products.edges,
    allProducts: productsData.data.products.edges,
    allCollection: collections.data.collections.edges,
    allSales: JSON.stringify(allSales),
    sessions: sessions,
    currencyCode: currencyCode.data.shop.currencyCode,
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
                  } else if (salesType === "FIXED-AMOUNT") {
                    const fixedAmountValue = parseFloat(salesValue);
                    newPrice = originalPrice - fixedAmountValue;

                    console.log(
                      "Fixed Amount Discount Value New Price",
                      newPrice,
                    );
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

        // console.log(
        //   "------------------------------",
        //   salesTitle,
        //   saleTags,
        //   productsData,
        //   salesValue,
        //   sDate,
        //   eDate,
        //   etime,
        //   stime,
        //   salesType,
        // );
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

        if (
          currentSale.status === "Active" ||
          currentSale.status === "Schedule"
        ) {
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
          currentSale.status === "Active" || currentSale.status === "Schedule"
            ? "Disabled"
            : currentSale.status === "Disabled" && "Active";

        // Update the sale with the new status
        await prisma.sale.update({
          where: { id: id },
          data: { status: newStatus },
        });
        // console.log("Updated Value", updateSaleStatustext);
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

        // const existingSale = await prisma.sale.findUnique({
        //   where: { id: id },
        //   select: { status: true },
        // });

        // if (!existingSale) {
        //   return json({ error: "Sale not found!" });
        // }

        // // Determine the new status based on the current status
        // let newStatus = existingSale.status;
        // if (existingSale.status === "Disabled") {
        //   newStatus = "Schedule";
        // } else if (existingSale.status === "Active") {
        //   newStatus = "Schedule";
        // }

        // Update the sale record in the database
        // const updateSingleSale = await prisma.sale.update({
        //   where: { id: id },
        //   data: {
        //     salesValue,
        //     salesType,
        //     salesTitle,
        //     saleTags,
        //     status: newStatus,
        //     etime,
        //     stime,
        //     sDate: new Date(sDate),
        //     eDate: new Date(eDate),
        //     products: {
        //       // connectOrCreate: parsedProducts.map((product) => ({
        //       //   where: { id: product.id },
        //       //   create: {
        //       //     pId: product.pId,
        //       //     variants: {
        //       //       connectOrCreate: product.variants.map((variant) => ({
        //       //         where: { id: variant.id },
        //       //         create: { variantId: variant.variantId },
        //       //       })),
        //       //     },
        //       //   },
        //       // })),
        //       create: parsedProducts.map((product) => ({
        //         pId: product.id,
        //         variants: {
        //           create: product.variants.map((variantId) => ({
        //             variantId: variantId,
        //           })),
        //         },
        //       })),
        //     },
        //   },
        // });

        await prisma.sale.delete({
          where: {
            id: id, // The unique ID of the sale to delete
          },
        });

        const updateSingleSale = await prisma.sale.create({
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
              create: parsedProducts.map((product) => ({
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

        return json({ success: true, sale: updateSingleSale, sales: allSales });
      } catch (error) {
        console.error("Error updating sale:", error);
        return json({ error: "Something went wrong!", details: error.message });
      }
    case "EXTEND_SALES_END_TIME":
      try {
        const { id, eDate, etime } = formData;

        console.log(id, eDate, etime);

        const updated = await prisma.sale.update({
          where: { id: id },
          data: { eDate: new Date(eDate), etime: etime },
        });
        console.log("Updated", updated);
        return json(
          { message: "Successfully Campaign Time Extended", success: true },
          { status: "201" },
        );
      } catch (error) {
        return json({ error: "Something went wrong!", details: error.message });
      }

    default:
      break;
  }
};

export default function Index() {
  const { allProducts, allCollection, allSales, currencyCode } =
    useLoaderData();
  const AllSales = JSON.parse(allSales);
  const fetcher = useFetcher();

  console.log("All Sales", AllSales);
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

  let code = currencyCode;

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

  const [isDisable, setIsDisable] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  //----- Date ---- Date

  // error----- setError
  const [error, setError] = useState(false);

  const salesData = fetcher.data?.sales;
  // const salesStarted = fetcher.data?.result?.saleStarted;
  const res = fetcher.data?.statusChanged;

  const deselectedSalesData = useMemo(() => {
    return AllSales.map((sale) => ({
      id: sale.id,
      status: sale.status,
    }));
  }, [AllSales]);

  console.log("Sale Data for sales data", deselectedSalesData);

  useEffect(() => {
    console.log("All Products ", products);
  }, [products]);

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
    // Finding if any status has an active status or not
    if (value.status === "Active") {
      setIsDisable(true);
    }

    if (value.status === "Schedule") {
      setIsScheduled(true);
    }
    // Getting the data if there is any collection or not
    const { matchingCollectionIds, orphanProducts } = findMatchingCollectionIds(
      data[0].products,
    );
    console.log("dataa---------------", data[0].products);
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
        // newProducts: products,
      };
      try {
        // console.log("Form Data", formData);
        await fetcher.submit(formData, { method: "POST" });
        setShowModal(false);
        setToastMessage("Successfully Updated Sales");
        setShowToast(true);
        setError(false);
        setProducts([]);
      } catch (error) {
        console.log("Something went wrong!", error);
      }
    }
  };

  const handleExtendTime = async () => {
    console.log("Extended Time of Sale", id);
    const formData = {
      actionKey: "EXTEND_SALES_END_TIME",
      id,
      eDate,
      etime,
    };
    console.log(formData);
    try {
      await fetcher.submit(formData, { method: "POST" });
    } catch (error) {
      console.log("Something Went Wrong!");
    }
  };

  useEffect(() => {
    setCollection(allCollection);
  }, [allCollection]);

  useEffect(() => {
    setSales(AllSales);
  }, []);

  useEffect(() => {
    // console.log("All Sales", salesData);
    if (salesData) {
      setSales(salesData);
    }
  }, [salesData]);

  useEffect(() => {
    if (scheduleProducts.length > 0) {
      // console.log("Schedule Products:------", scheduleProducts);
      handleApplySales();
    }
  }, [scheduleProducts.length > 0, salesData]);

  // if (res) {
  //   setShowToast(true);
  //   setError(false);
  //   setToastMessage("Status updated successfully!");
  // }

  // useEffect(() => {
  //   // console.log("Id", id);
  // }, [id]);

  useEffect(() => {
    if (res) {
      setShowToast(true);
      setError(false);
      setToastMessage("Status updated successfully!");
    }
  }, [res]);

  // useEffect(() => {
  //   setAllProducts(allProducts);
  // }, [])

  return (
    <Frame>
      <div className="w-full h-full bg-[#DCE4C9]">
        {/* <TitleBar title="Remix app template"></TitleBar> */}
        <div className="px-4 md:px-8 lg:px-10">
          {/* Toast Container */}
          <div>
            {showToast ? (
              <Toast
                content={toastMessage}
                error={error}
                onDismiss={() => setShowToast(false)}
              />
            ) : null}
          </div>

          {/* Sales Provider */}
          <div>
            <div style={{ width: "100%", height: "100%" }}>
              {/* Modal for displaying the content */}
              <SalesModal
                isScheduled={isScheduled}
                isDisable={isDisable}
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
                code={code}
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
                handleExtendTime={handleExtendTime}
              />
              {/* ALL SALES LIST */}

              <div className="w-full flex flex-col-reverse gap-10 lg:flex-row">
                {/* <SalesList /> */}
                <div className="flex flex-col overflow-x-auto flex-[4]">
                  {/* SALES HEADING AND BUTTON CONTAINER */}
                  <div className="flex justify-between mb-4 lg:my-6">
                    <h1 className="text-xl lg:text-2xl font-bold">All Sales Listed</h1>
                    <div className="flex justify-center items-center gap-4">
                      <Button
                        variant="primary"
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
                        Create Campaign
                      </Button>

                      <Button
                        tone="critical"
                        onClick={() =>
                          deleteSale("71ca4748-d9e8-46f0-a616-5c277994db12")
                        }
                      >
                        Delete Campaign
                      </Button>
                    </div>
                  </div>
                  <SalesTable
                    data={AllSales}
                    salesHandler={handleStatus}
                    updateSalesHandler={handleUpdateSale}
                  />
                </div>
                {/* INFO TEXT AND TITLE */}

                <div className="flex flex-col mt-4 lg:mt-20 gap-4 w-[60%] lg:flex-1">
                  <div className="p-4 bg-white rounded-md flex flex-col items-center">
                    <strong className="block text-base mb-4">
                      Boost Sales Effortlessly with Automated Discounts!
                    </strong>
                    <p className="text-xs lg:text-sm m-0">
                      Our Shopify Sales Automation app makes it simple to manage
                      and activate sales across your store. Apply discounts to
                      individual products or entire collections with just a few
                      clicks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// export function ErrorBoundary({ error }) {
//   console.log("Something went wrong! ", error);
//   return (
//     <div style={{ width: "100%", height: "500px" }}>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           padding: 40,
//           backgroundColor: "#ddd",
//           borderRadius: 10,
//         }}
//       >
//         <p>There is an error encountered</p>
//       </div>
//     </div>
//   );
// }
