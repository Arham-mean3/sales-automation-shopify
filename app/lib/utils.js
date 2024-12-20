export function formatDateToDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, "0"); // Get day and pad with zero
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Get month (0-11) and pad with zero
  const year = date.getFullYear(); // Get full year

  return `${day}-${month}-${year}`; // Format as "dd-mm-yyyy"
}

// export const parseDate = (dateString) => {
//   // Parse the date parts
//   const [dayName, monthName, day, year] = dateString.toString().split(" ");
//   const month = new Date(`${monthName} 1`).getMonth(); // Get month as a number
//   const date = new Date(year, month, day);

//   // Adjust to UTC by accounting for timezone offset
//   const offset = date.getTimezoneOffset(); // Offset in minutes
//   date.setMinutes(date.getMinutes() - offset);

//   return date;
// };

export const parseDate = (dateString) => {
  // Directly create a Date object from ISO 8601 string (no need for custom parsing)
  const date = new Date(dateString);

  // If the date is invalid, return an error or a default date
  if (isNaN(date)) {
    console.error("Invalid date:", dateString);
    return null; // Or handle the error as needed
  }

  // Return the date object directly (already in correct format)
  return date;
};

export const dateToCron = (date, time) => {
  // Parse the time string to get hours and minutes
  const [timeHours, timeMinutes] = time.split(":").map(Number);

  // Use the provided time for the cron expression
  const minutes = timeMinutes !== undefined ? timeMinutes : date.getMinutes();
  const hours = timeHours !== undefined ? timeHours : date.getHours();

  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // getMonth() is zero-based
  const dayOfWeek = "*"; // Generally left as '*' for this use case

  return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
};

export const formatDateTime = (dateString, timeString) => {
  const dateTime = new Date(`${dateString.split("T")[0]}T${timeString}`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(dateTime);
};

export const calculateTimeEstimation = (products) => {
  const timePerItem = 0.85; // Time taken per product or variant in seconds

  // Calculate total variants length
  const variantsLength = products.reduce((total, product) => total + product.variants.length, 0);

  // Total time for all products and variants
  const totalTimeForProducts = products.length * timePerItem; // Time for products
  const totalTimeForVariants = variantsLength * timePerItem; // Time for variants

  // Sum the total times for both
  const totalTime = totalTimeForProducts + totalTimeForVariants;

  // If the total time exceeds 60 seconds, convert to minutes
  if (totalTime > 60) {
    const minutes = Math.floor(totalTime / 60);
    const seconds = Math.floor(totalTime % 60);
    return `${minutes} min ${seconds} sec`;
  }

  // If the time is less than 60 seconds, return in seconds
  return Math.floor(totalTime) + " sec";
};

export const getSingleProduct = (id, sales) => {
  const getProductData = sales.filter((sale) => id === sale.id);
  return getProductData;
};
