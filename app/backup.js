// case "CREATE_SALES":
//   try {
//     const results = []; // Collect results here

//     const { products, salesType, salesValue } = formData;
//     const productsData = JSON.parse(products);

//     for (const product of productsData) {
//       const { id: productId, variants } = product;

//       for (const variantId of variants) {
//         try {
//           // Fetch the original price if needed
//           let originalPrice;
//           let newPrice;
//           if (salesType === "PERCENTAGE") {
//             const variantPriceQuery = await admin.graphql(
//               `#graphql
//                 query getVariantPrice($id: ID!) {
//                   productVariant(id: $id) {
//                     price
//                   }
//                 }
//               `,
//               { variables: { id: variantId } },
//             );

//             const variantPriceResponse = await variantPriceQuery.json();
//             originalPrice = parseFloat(
//               variantPriceResponse?.data?.productVariant?.price,
//             );
//             // Calculate the new price

//             const discountPercentage = parseFloat(salesValue) / 100;
//             newPrice = originalPrice * (1 - discountPercentage);
//           }

//           // Use productVariantsBulkUpdate mutation to update the price
//           const productSaleUpdate = await admin.graphql(
//             `#graphql
//               ${updateProductVariantsPrice}
//             `,
//             {
//               variables: {
//                 productId: productId,
//                 variants: [
//                   {
//                     id: variantId,
//                     price: parseFloat(newPrice).toFixed(2),
//                     compareAtPrice: parseFloat(originalPrice).toFixed(2),
//                   },
//                 ],
//               },
//             },
//           );

//           const salesUpdate = await productSaleUpdate.json();
//           console.log("Sale Update for variant:", variantId);

//           // Add success result to results array
//           results.push({
//             productId,
//             variantId,
//             success: true,
//             salesUpdate,
//           });
//         } catch (error) {
//           console.log("Error processing variant ID:", variantId, error);

//           // Add error result to results array
//           results.push({
//             productId,
//             variantId,
//             success: false,
//             error,
//           });
//         }
//       }
//     }

//     // Return results after processing all products and variants
//     return json({
//       salesCreated: true,
//       results,
//     });
//   } catch (error) {
//     console.log("NEW Error", error);
//     return json({ errors: error }, { status: 400 });
//   }

// case "CREATE_SALES":
//     try {
//       const results = []; // Collect results here
//       const variantUpdates = [];

//       const { products, salesType, salesValue } = formData;
//       const productsData = JSON.parse(products);

//       for (const product of productsData) {
//         const { id: productId, variants } = product;

// for (const variantId of variants) {
//   try {
//     // Fetch the original price if needed
//     let originalPrice;
//     let newPrice;
//     if (salesType === "PERCENTAGE") {
//       const variantPriceQuery = await admin.graphql(
//         `#graphql
//           query getVariantPrice($id: ID!) {
//             productVariant(id: $id) {
//               price
//             }
//           }
//         `,
//         { variables: { id: variantId } },
//       );

//       const variantPriceResponse = await variantPriceQuery.json();
//       originalPrice = parseFloat(
//         variantPriceResponse?.data?.productVariant?.price,
//       );
//       // Calculate the new price

//       const discountPercentage = parseFloat(salesValue) / 100;
//       newPrice = originalPrice * (1 - discountPercentage);
//     }

//     // Use productVariantsBulkUpdate mutation to update the price
//     const productSaleUpdate = await admin.graphql(
//       `#graphql
//         ${updateProductVariantsPrice}
//       `,
//       {
//         variables: {
//           productId: productId,
//           variants: [
//             {
//               id: variantId,
//               price: parseFloat(newPrice).toFixed(2),
//               compareAtPrice: parseFloat(originalPrice).toFixed(2),
//             },
//           ],
//         },
//       },
//     );

//     const salesUpdate = await productSaleUpdate.json();
//     console.log("Sale Update for variant:", variantId);

//     // Add success result to results array
//     results.push({
//       productId,
//       variantId,
//       success: true,
//       salesUpdate,
//     });
//   } catch (error) {
//     console.log("Error processing variant ID:", variantId, error);

//     // Add error result to results array
//     results.push({
//       productId,
//       variantId,
//       success: false,
//       error,
//     });
//   }
// }

// const variantPromises = variants.map(async (variantId) => {
//   try {
//     let originalPrice, newPrice;

//     originalPrice = await getOriginalPriceVariants(admin, variantId);
//     // Calculate the new price (--- PERCENTAGE ---)
//     if (salesType === "PERCENTAGE") {
//       const discountPercentage = parseFloat(salesValue) / 100;
//       newPrice = originalPrice * (1 - discountPercentage);
//     }
//     variantUpdates.push({ productId, variantId, newPrice, originalPrice });
//     return { productId, variantId, success: true };
//   } catch (error) {
//     console.log(error);
//     return { productId, variantId, success: false };
//   }
// });

// results.push(...(await Promise.all(variantPromises)));
//   }

//   // Return results after processing all products and variants
//   return json({
//     salesCreated: true,
//     results,
//   });
// } catch (error) {
//   console.log("NEW Error", error);
//   return json({ errors: error }, { status: 400 });
// }

// for (const product of productsData) {
//   const { id: productId, variants } = product;

//   for (const variantId of variants) {
//     try {
//       // Fetch the original price if needed
//       let originalPrice;
//       let newPrice;
//       if (salesType === "PERCENTAGE") {
//         const variantPriceQuery = await admin.graphql(
//           `#graphql
//         query getVariantPrice($id: ID!) {
//           productVariant(id: $id) {
//             price
//           }
//         }
//       `,
//           { variables: { id: variantId } },
//         );

//         const variantPriceResponse = await variantPriceQuery.json();
//         originalPrice = parseFloat(
//           variantPriceResponse?.data?.productVariant?.price,
//         );
//         // Calculate the new price

//         const discountPercentage = parseFloat(salesValue) / 100;
//         newPrice = originalPrice * (1 - discountPercentage);
//       }

//       // Use productVariantsBulkUpdate mutation to update the price
//       const productSaleUpdate = await admin.graphql(
//         `#graphql
//       ${updateProductVariantsPrice}
//     `,
//         {
//           variables: {
//             productId: productId,
//             variants: [
//               {
//                 id: variantId,
//                 price: parseFloat(newPrice).toFixed(2),
//                 compareAtPrice: parseFloat(originalPrice).toFixed(2),
//               },
//             ],
//           },
//         },
//       );

//       const salesUpdate = await productSaleUpdate.json();
//       console.log("Sale Update for variant:", variantId);

//       // Add success result to results array
//       results.push({
//         productId,
//         variantId,
//         success: true,
//         salesUpdate,
//       });
//     } catch (error) {
//       console.log("Error processing variant ID:", variantId, error);

//       // Add error result to results array
//       results.push({
//         productId,
//         variantId,
//         success: false,
//         error,
//       });
//     }
//   }
// }
