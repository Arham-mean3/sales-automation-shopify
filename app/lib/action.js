import {
  addProductsQuery,
  addProductVariantsQuery,
  singleProductVariantId,
  updateProductVariantsPrice,
} from "./queries";

export async function addProduct(admin, formData) {
  const response = await admin.graphql(
    `#graphql
        ${addProductsQuery}`,
    {
      variables: {
        input: {
          title: formData.title,
          handle: formData.handle,
          status: formData.status,
        },
      },
    },
  );

  const responseJson = await response.json();

  // Check for user errors
  const userErrors = responseJson.data.productCreate.userErrors;
  if (userErrors.length > 0) {
    throw new Error(JSON.stringify(userErrors));
  }

  return responseJson.data.productCreate.product;
}

// Function to update the product variants
export async function updateProductVariants(
  admin,
  productId,
  variantId,
  formData,
) {
  const response = await admin.graphql(
    `#graphql
        ${addProductVariantsQuery}`,
    {
      variables: {
        productId: productId,
        variants: [
          { id: variantId, price: formData.price, barcode: formData.barcode },
        ],
      },
    },
  );

  const responseJson = await response.json();

  // Check for user errors in variant update
  const userErrors = responseJson.data.productVariantsBulkUpdate.userErrors;
  if (userErrors.length > 0) {
    throw new Error(JSON.stringify(userErrors));
  }

  return responseJson.data.productVariantsBulkUpdate.productVariants;
}

export const updatePricesForSale = async (
  admin,
  salesProductsIds,
  salesType,
  salesValue,
) => {
  for (const { id } of salesProductsIds) {
    // Fetch the product details (including variant ID and current price)
    const productQuery = await admin.graphql(
      `#graphql
        ${singleProductVariantId}`,
      {
        variables: { id: id },
      },
    );

    const productVariant = productQuery.data.product.variants.edges[0].node;

    // Calculate the new price based on sales type
    let newPrice;
    if (salesType === "FIXED-AMOUNT") {
      newPrice = parseFloat(salesValue);
    } else if (salesType === "PERCENTAGE") {
      const discountPercentage = parseFloat(salesValue) / 100;
      newPrice = parseFloat(productVariant.price) * (1 - discountPercentage);
    }

    console.log(newPrice);
    // Update the product variant price
    await admin.graphql(
      `#graphql
        ${updateProductVariantsPrice}`,
      {
        variables: {
          input: {
            id: productVariant.id,
            price: newPrice.toFixed(2), // Apply the new sale price
            compareAtPrice: parseFloat(productVariant.price).toFixed(2), // Move original price to compare_at_price
          },
        },
      },
    );
  }
};
