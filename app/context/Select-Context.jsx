import React, {
  useState,
  createContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";

const INITIAL_STATES = {
  product: [],
  selectedCollection: [],
  activeProducts: [],
  disableProducts: [],
  scheduleProducts: [],
  update: true,
  checked: false,
  setProducts: () => {},
  setCollection: () => {},
  setSelectedCollection: () => {},
  setActiveProducts: () => {},
  setSales: () => {},
  setUpdate: () => {},
  handleChange: (newChecked) => {},
  handleAddProducts: (productVariants, productId) => {},
  removeProducts: (productId) => {},
  removeCollection: (collectionId) => {},
  removeVariant: (productId, variantId) => {},
  findMatchingCollectionIds: (collection, products) => {},
};
export const SelectContext = createContext(INITIAL_STATES);

export default function SelectContextProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [collection, setCollection] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState([]);
  const [activeProducts, setActiveProducts] = useState([]);
  const [scheduleProducts, setScheduleProducts] = useState([]);
  const [disableProducts, setDisableProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [update, setUpdate] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleChange = useCallback((newChecked) => setChecked(newChecked), []);

  const deselectedSalesData = useMemo(
    () =>
      sales.map((sale) => ({
        id: sale.id,
        salesType: sale.salesType,
        salesValue: sale.salesValue,
        sDate: sale.sDate,
        eDate: sale.eDate,
        stime: sale.stime,
        etime: sale.etime,
        status: sale.status,
        products: sale.products.map((product) => ({
          id: product.pId,
          variants: product.variants.map((variant) => variant.variantId),
        })),
      })),
    [sales],
  );

  const deselectedCollections = useMemo(
    () =>
      collection.map(({ node }) => ({
        value: node?.id,
        label: node?.title,
        products:
          node?.products?.edges?.map(({ node: productNode }) => ({
            id: productNode?.id,
            title: productNode?.title,
            variants:
              productNode?.variants?.edges?.map(({ node: variantNode }) => ({
                id: variantNode?.id,
                title: variantNode?.displayName,
              })) || [],
          })) || [],
      })),
    [collection],
  );

  const handleAddProducts = (productVariants, productId) => {
    // Extract only the variant IDs
    const variantIds = productVariants.map((variant) => variant.id);

    setProducts((prevProducts) => {
      const existingProduct = products.find(
        (product) => product.id === productId,
      );

      if (existingProduct) {
        // If product exists, update only the variants array
        return prevProducts.map((product) =>
          product.id === productId
            ? { ...product, variants: variantIds }
            : product,
        );
      } else {
        // If product doesn't exist, add it with variant IDs
        return [...prevProducts, { id: productId, variants: variantIds }];
      }
    });
  };

  const removeProduct = (productId) => {
    setProducts((prevProducts) =>
      prevProducts.filter((product) => {
        return product.id !== productId;
      }),
    );
  };

  const removeVariant = (productId, variantId) => {
    setProducts((prevProducts) => {
      // Map over the products to update the specific product
      let updatedVariants;
      const updatedProducts = prevProducts.map((product) => {
        if (product.id === productId) {
          // Remove the variant from the product's variants
          update
            ? (updatedVariants = product.variants.filter((variant) => {
                return variant.id !== variantId;
              }))
            : (updatedVariants = product.variants.filter((id) => {
                return id !== variantId;
              }));

          // Return the updated product
          return {
            ...product,
            variants: updatedVariants,
          };
        }
        return product;
      });

      // Filter out the product if its variants array is empty
      return updatedProducts.filter((product) => product.variants.length > 0);
    });
  };

  const fetchProductsFromSelectedCollections = () => {
    selectedCollection.forEach((collectionId) => {
      const collectionData = deselectedCollections.find(
        (col) => col.value === collectionId,
      );
      if (collectionData && collectionData.products) {
        collectionData.products.forEach((product) => {
          update ? [] : handleAddProducts(product.variants, product.id);
        });
      }
    });
  };

  // NEW FUNCTION: Remove all products associated with a deselected collection
  const removeCollection = (collectionId) => {
    console.log("Remove Collection Id", collectionId);
    // Find the collection data based on the provided collectionId
    const collectionData = deselectedCollections.find(
      (col) => col.value === collectionId,
    );

    // If the collection exists, gather its product IDs
    if (collectionData) {
      const productIdsToRemove = collectionData.products.map((product) => {
        return product.id;
      });

      // Update the products state to remove any product whose ID is in productIdsToRemove
      {
        update
          ? setProducts((prevProducts) =>
              prevProducts.filter((product) => {
                console.log("product Data Map Id", product.pId);
                return !productIdsToRemove.includes(product.pId);
              }),
            )
          : setProducts((prevProducts) =>
              prevProducts.filter((product) => {
                console.log("product Data Map Id", product.id);
                return !productIdsToRemove.includes(product.id);
              }),
            );
      }
    }
  };

  const findMatchingCollectionIds = (salesProduct) => {
    const productIdsMap = new Set(salesProduct.map((product) => product.pId));
    const matchingCollectionIds = [];
    const matchedProducts = new Set();

    // Iterate over each collection
    for (const collection of deselectedCollections) {
      const collectionProductIds = collection.products.map(
        (product) => product.id,
      );
      const foundProducts = collectionProductIds.filter((productId) =>
        productIdsMap.has(productId),
      );

      // If all products in the collection are found and the collection has more than one product
      if (
        foundProducts.length === collectionProductIds.length &&
        foundProducts.length > 1
      ) {
        matchingCollectionIds.push(collection.value);
        foundProducts.forEach((productId) => matchedProducts.add(productId));
      }
    }
    // Get all products, without filtering anything
    const orphanProducts = salesProduct.map((product) => ({
      // id: product.id,
      id: product.pId,
      // variants: product.variants.map((variant) => ({
      //   id: variant.id,
      //   variantId: variant.variantId,
      // })),
      variants: product.variants.map((variant) => variant.variantId),
    }));

    return { matchingCollectionIds, orphanProducts };
  };

  const filterActiveProducts = useCallback(() => {
    const isActive = deselectedSalesData.filter(
      (sale) => sale.status === "Active",
    );
    setActiveProducts(isActive);
  }, [deselectedSalesData]);

  const filterScheduleProducts = useCallback(() => {
    const isSchedule = deselectedSalesData.filter(
      (sale) => sale.status === "Schedule",
    );
    setScheduleProducts(isSchedule);
  }, [deselectedSalesData]);

  const filterDisableProducts = useCallback(() => {
    const isDisable = deselectedSalesData.filter(
      (sale) => sale.status === "Disabled",
    );
    setDisableProducts(isDisable);
  }, [deselectedSalesData]);

  // Run both filters whenever 'sales' changes
  useEffect(() => {
    // console.log("All Sales Value", sales);
    filterActiveProducts();
    filterScheduleProducts();
    filterDisableProducts();
  }, [sales, filterDisableProducts]);

  useEffect(() => {
    fetchProductsFromSelectedCollections();
  }, [selectedCollection]);

  const value = {
    products,
    selectedCollection,
    activeProducts,
    scheduleProducts,
    disableProducts,
    update,
    checked,
    handleAddProducts,
    findMatchingCollectionIds,
    removeProduct,
    removeVariant,
    setProducts,
    setCollection,
    setSelectedCollection,
    removeCollection,
    setActiveProducts,
    setSales,
    setUpdate,
    handleChange
  };

  return (
    <SelectContext.Provider value={value}>{children}</SelectContext.Provider>
  );
}
