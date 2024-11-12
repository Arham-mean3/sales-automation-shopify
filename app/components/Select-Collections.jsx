import { Select } from "@shopify/polaris";
import React, { useCallback, useMemo, useState } from "react";
import ShowCollectionsList from "./Show-Collections-List";
import MultiCollectionSelector from "./Collection-Selector";

function SelectCollections({ collections, products }) {
  const [choice, setChoice] = useState("select");
  const [selectedCollectionProducts, setSelectedCollectionProducts] = useState(
    [],
  );

  const deselectedProducts = useMemo(
    () =>
      products.map(({ node }) => ({
        id: node.id,
        title: node.title,
        variants: node.variants.edges.map(({ node: variantNode }) => ({
          id: variantNode.id,
          title: variantNode.displayName,
        })),
      })),
    [products],
  );

  const options = [
    { label: "Select your choice", value: "select" },
    { label: "By Products", value: "products" },
    { label: "By Collections", value: "collections" },
  ];

  const handleChoiceChange = useCallback(
    (value) => {
      setChoice(value);

      if (value === "products") {
        // Show all products if "By Products" is selected
        setSelectedCollectionProducts(deselectedProducts);
      } else {
        // Clear selected products if "By Collections" is selected
        setSelectedCollectionProducts([]);
      }
    },
    [deselectedProducts],
  );

  return (
    <>
      <Select
        label="Select"
        options={options}
        onChange={handleChoiceChange}
        value={choice}
      />

      {choice === "collections" && (
        <div style={styles.spacing}>
          {/* <Select
            label="Select Collections for Sale"
            options={collectionOptions}
            onChange={handleSelectChange}
            value={selectedId || ""}
          /> */}
          <MultiCollectionSelector collections={collections} />
        </div>
      )}
      {choice !== "select" && choice !== "collections" && (
        <ShowCollectionsList products={selectedCollectionProducts} />
      )}
    </>
  );
}

export default SelectCollections;

const styles = {
  spacing: {
    marginTop: 20,
  },
};

// const deselectedCollections = useMemo(() =>
//     collections.map(({ node }) => ({
//       id: node?.id,
//       label: node?.title,
//       products:
//         node?.products?.edges?.map(({ node: productNode }) => ({
//           id: productNode?.id,
//           title: productNode?.title,
//           variants:
//             productNode?.variants?.edges?.map(({ node: variantNode }) => ({
//               id: variantNode?.id,
//               title: variantNode?.displayName,
//             })) || [],
//         })) || [],
//     })),
//   [collections],
// );

// const handleSelectChange = useCallback(
//   (id) => {
//     setSelectedId(id);
//     if (choice === "collections") {
//       const collectionProducts = showSelectedCollectionProducts(id);
//       setSelectedCollectionProducts(collectionProducts);
//     } else if (choice === "products") {
//       const selectedProduct = showSelectedProducts(id);
//       setSelectedCollectionProducts(selectedProduct ? [selectedProduct] : []);
//     }
//   },
//   [choice],
// );

// const showSelectedCollectionProducts = useCallback(
//   (collectionId) => {
//     const collection = deselectedCollections.find(
//       (collection) => collection.id === collectionId,
//     );
//     return collection ? collection.products : [];
//   },
//   [deselectedCollections],
// );

// const showSelectedProducts = useCallback(
//   (productId) => {
//     return (
//       deselectedProducts.find((product) => product.id === productId) || null
//     );
//   },
//   [deselectedProducts],
// );

// const collectionOptions = deselectedCollections.map((collection) => ({
//   label: collection.label,
//   value: collection.id,
// }));
