export function formatDateToDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, "0"); // Get day and pad with zero
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Get month (0-11) and pad with zero
  const year = date.getFullYear(); // Get full year

  return `${day}-${month}-${year}`; // Format as "dd-mm-yyyy"
}
