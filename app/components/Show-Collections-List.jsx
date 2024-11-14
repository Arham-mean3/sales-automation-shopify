import React, { useContext, useMemo } from "react";
import { Button, Icon } from "@shopify/polaris";
import { PlusIcon, XIcon } from "@shopify/polaris-icons";
import { SelectContext } from "../context/Select-Context";

export default function ShowCollectionsList({ products, disable }) {
  const {
    handleAddProducts,
    removeProduct,
    removeVariant,
    update,
    products: selected,
  } = useContext(SelectContext);

  console.log("Selected Products", selected);

  return (
    <div style={styles.container}>
      {/* SELECT THE COLLECTIONS */}
      <div style={styles.showContainer}>
        {/* SELECT PRODUCTS */}
        {products.length > 0 ? (
          products.map((product, index) => {
            const isAdded = selected.some((selectedProduct) =>
              update
                ? selectedProduct.id === product.id
                : selectedProduct.id === product.id,
            );

            return (
              <div style={styles.showWrapper} key={index}>
                <div style={styles.wrapperInsider}>
                  <h4 style={styles.title}>{product.title}</h4>
                </div>
                {disable ? null : (
                  <Button
                    variant="primary"
                    icon={<Icon source={PlusIcon} tone="base" />}
                    onClick={() =>
                      handleAddProducts(product.variants, product.id)
                    }
                    disabled={isAdded}
                  >
                    {isAdded ? "Added" : "Add"}
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <div style={styles.info}>
            <p>No Products Found</p>
          </div>
        )}
        {/* SELECT PRODUCTS END*/}
      </div>
      {/* SHOW SELECTED COLLECTIONS/PRODUCTS */}
      <div style={styles.selectedContainer}>
        {update
          ? selected.map((selectedProduct, index) => {
              // Find the full product data in the products list
              const fullProductData = products.find(
                (p) => p.id === selectedProduct.id,
              );

              return fullProductData ? (
                <div key={index} style={styles.selectedWrapper}>
                  <div style={styles.selected}>
                    {/* Display product title */}
                    <h3 style={styles.selectedTitle}>
                      {fullProductData.title}
                    </h3>
                    {disable ? null : (
                      <Button
                        variant="primary"
                        icon={<Icon source={XIcon} tone="critical" />}
                        onClick={() => removeProduct(selectedProduct.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {selectedProduct.variants.map((variant, variantIndex) => {
                    // Find the variant data within the product based on variant ID
                    // const variantData = fullProductData.variants.find(
                    //   (v) => v.id === variant.variantId,
                    // );
                    const variantData = fullProductData.variants.find(
                      (v) => v.id === variant,
                    );

                    return variantData ? (
                      <div key={variantIndex} style={styles.selectedVariants}>
                        <div style={styles.variants}>
                          {/* Display variant title */}
                          <h4>{variantData.title}</h4>
                          {disable ? null : (
                            <Button
                              variant="primary"
                              icon={<Icon source={XIcon} tone="critical" />}
                              onClick={() =>
                                removeVariant(selectedProduct.id, variant.id)
                              }
                            >
                              Remove Variant
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : null;
            })
          : selected.map((selectedProduct, index) => {
              // Find the full product data in the products list
              const fullProductData = products.find(
                (p) => p.id === selectedProduct.id,
              );

              return fullProductData ? (
                <div key={index} style={styles.selectedWrapper}>
                  <div style={styles.selected}>
                    {/* Display product title */}
                    <h3 style={styles.selectedTitle}>
                      {fullProductData.title}
                    </h3>
                    {disable ? null : (
                      <Button
                        variant="primary"
                        icon={<Icon source={XIcon} tone="critical" />}
                        onClick={() => removeProduct(selectedProduct.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {selectedProduct.variants.map((variantId, variantIndex) => {
                    // Find the variant data within the product based on variant ID
                    const variantData = fullProductData.variants.find(
                      (v) => v.id === variantId,
                    );

                    return variantData ? (
                      <div key={variantIndex} style={styles.selectedVariants}>
                        <div style={styles.variants}>
                          {/* Display variant title */}
                          <h4>{variantData.title}</h4>
                          {disable ? null : (
                            <Button
                              variant="primary"
                              icon={<Icon source={XIcon} tone="critical" />}
                              onClick={() =>
                                removeVariant(selectedProduct.id, variantId)
                              }
                            >
                              Remove Variant
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : null;
            })}

        {selected.length === 0 && (
          <div style={styles.info}>
            <p>No Products Selected</p>
          </div>
        )}

        {/* SHOW SELECTED COLLECTIONS/PRODUCTS END*/}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    display: "flex",
    backgroundColor: "#f2f2f2",
    height: 300,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 6,
    borderStyle: "solid",
    borderWidth: "0.5px",
    borderColor: "#3C3D37",
  },
  showContainer: {
    flex: 1,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: 300, // Set max height for scrolling
    overflowY: "auto", // Enable vertical scroll if content overflows
  },
  showWrapper: {
    width: "100%",
    display: "flex", // Added quotes around "flex"
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFE5CF",
    padding: 10,
    borderRadius: 8,
  },
  wrapperInsider: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  title: {
    textTransform: "capitalize",
  },
  selectedContainer: {
    flex: 1,
    backgroundColor: "#fff",
    height: "100%",
    padding: 10,
    maxHeight: 300,
    overflowY: "auto",
  },
  variantsContainer: {
    display: "flex",
    flexDirection: "space-between",
    marginLeft: 10,
  },
  selected: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#3C3D37",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedWrapper: {
    display: "flex",
    flexDirection: "column",
  },
  selectedTitle: {
    color: "white",
  },
  selectedVariants: {
    marginLeft: 20,
    marginTop: 5,
    marginBottom: 10,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "blue",
    padding: 10,
    borderRadius: 8,
  },
  variants: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "white",
  },
  info: {
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};
