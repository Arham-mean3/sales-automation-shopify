export const calculateEstimatedTime = (salesProductsIds) => {
  let totalSeconds = 0;

  salesProductsIds.forEach((product) => {
    const variantCount = product.variants.length; // Assuming 'variants' is an array

    // Base time for each product
    let timeForProduct = 1.11; // in seconds

    // Adjust time based on number of variants
    if (variantCount >= 50) {
      timeForProduct += 52; // Additional time if variants exceed 50
    } else {
      timeForProduct += variantCount * 0.5; // Assuming 0.5 seconds per variant for lower counts
    }

    totalSeconds += timeForProduct;
  });

  // Convert seconds to minutes and seconds
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  return `${minutes} min ${seconds} sec`;
};

export const options = [
  { label: "Active", value: "ACTIVE" },
  { label: "Archive", value: "ARCHIVED" },
  { label: "Draft", value: "DRAFT" },
];

export const SalesTypeOption = [
  { label: "Fixed Amount", value: "FIXED-AMOUNT" },
  { label: "Percentage", value: "PERCENTAGE" },
];
