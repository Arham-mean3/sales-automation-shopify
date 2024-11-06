import { Listbox, Combobox, Icon, AutoSelection } from "@shopify/polaris";
import { SelectIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useMemo } from "react";

export default function SelectProductComp({
  products,
  setSalesProductsIds,
  salesProductsIds,
  setSalesInfo,
  salesCollectionIds,
}) {
  const deselectedOptions = useMemo(
    () =>
      products.map(({ node }) => ({
        value: node.id,
        label: node.title,
        variants: node.variants.edges.map(({ node: variantNode }) => ({
          value: variantNode.id,
          label: variantNode.displayName,
        })),
      })),
    [products],
  );

  // const deselectedCollections = useMemo(
  //   () =>
  //     collections.map(({ node }) => ({
  //       value: node?.id,
  //       label: node?.title,
  //       products:
  //         node?.products?.edges?.map(({ node: productNode }) => ({
  //           value: productNode?.id,
  //           label: productNode?.title,
  //           variants:
  //             productNode?.variants?.edges?.map(({ node: variantNode }) => ({
  //               value: variantNode?.id,
  //               label: variantNode?.displayName,
  //             })) || [],
  //         })) || [],
  //     })),
  //   [collections],
  // );

  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState(deselectedOptions);
  // const [showProducts, setShowProducts] = useState(false);
  // const [showCollections, setShowCollections] = useState(false);
  // const [collectionsOptions, setCollectionsOptions] = useState(
  //   deselectedCollections,
  // );

  const escapeSpecialRegExCharacters = useCallback(
    (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    [],
  );

  const updateText = useCallback(
    (value) => {
      setInputValue(value);

      if (value === "") {
        setOptions(deselectedOptions);
        return;
      }

      const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), "i");
      const resultOptions = deselectedOptions.filter((option) =>
        option.label.match(filterRegex),
      );
      setOptions(resultOptions);
    },
    [deselectedOptions, escapeSpecialRegExCharacters],
  );

  const updateSelection = useCallback(
    (selected) => {
      // if (selected === "select_single_products") {
      //   setShowProducts((prev) => !prev);
      //   setShowCollections(false);
      //   return;
      // }

      // if (selected === "select_collections") {
      //   setShowCollections((prev) => !prev);
      //   setShowProducts(false);
      //   return;
      // }

      const isProduct = options.some((option) => option.value === selected);
      // const isCollection = collectionsOptions.some(
      //   (collection) => collection.value === selected,
      // );

      if (isProduct) {
        const product = options.find((option) => option.value === selected);
        const allVariants = product.variants.map((variant) => variant.value);

        const existingProduct = salesProductsIds.find(
          (item) => item.id === selected,
        );

        if (existingProduct) {
          const newSelectedProducts = salesProductsIds.filter(
            (item) => item.id !== selected,
          );
          setSalesProductsIds(newSelectedProducts);
          setSalesInfo(newSelectedProducts);
        } else {
          const newProduct = {
            id: selected,
            variants: allVariants,
          };
          setSalesProductsIds([...salesProductsIds, newProduct]);
          setSalesInfo([...salesProductsIds, newProduct]);
        }
      } else {
        const variantSelected = selected;
        const updatedProducts = salesProductsIds
          .map((product) => {
            if (product.variants.includes(variantSelected)) {
              const updatedVariants = product.variants.filter(
                (variant) => variant !== variantSelected,
              );
              if (updatedVariants.length === 0) {
                return null; // Filter out if no variants remain
              }
              return {
                ...product,
                variants: updatedVariants,
              };
            } else {
              return {
                ...product,
                variants: [...product.variants, variantSelected],
              };
            }
          })
          .filter(Boolean); // Remove nulls

        setSalesProductsIds(updatedProducts);
        setSalesInfo(updatedProducts);
      }

      updateText(""); // Clear the input text
    },
    [
      options,
      // collectionsOptions,
      salesProductsIds,
      salesCollectionIds,
      updateText,
    ],
  );


  console.log("sales product Ids", salesProductsIds);

  
  const optionsMarkup =
    options.length > 0
      ? options.map((option) => {
          const { label, value, variants } = option;

          return (
            <div key={value}>
              <Listbox.Option
                value={value}
                selected={salesProductsIds.some(
                  (product) => product.id === value,
                )}
                accessibilityLabel={label}
              >
                {label}
              </Listbox.Option>
              {salesProductsIds.some((product) => product.id === value) && (
                <div style={{ paddingLeft: "20px" }}>
                  {variants.map((variant) => (
                    <Listbox.Option
                      key={variant.value}
                      value={variant.value}
                      selected={salesProductsIds.some(
                        (product) =>
                          product.id === value &&
                          product.variants.includes(variant.value),
                      )}
                      accessibilityLabel={variant.label}
                    >
                      {variant.label}
                    </Listbox.Option>
                  ))}
                </div>
              )}
            </div>
          );
        })
      : null;

  // const collectionsMarkup =
  //   collectionsOptions.length > 0 && showCollections
  //     ? collectionsOptions.map((collectionOptions) => {
  //         const { label, value, products } = collectionOptions;

  //         return (
  //           <div key={value}>
  //             <Listbox.Option
  //               value={value}
  //               selected={salesCollectionIds.some(
  //                 (collection) => collection.collectionId === value,
  //               )}
  //               accessibilityLabel={label}
  //             >
  //               {label}
  //             </Listbox.Option>

  //             {salesCollectionIds.some(
  //               (collection) => collection.collectionId === value,
  //             ) &&
  //               products.map((productOptions) => {
  //                 const {
  //                   label: productLabel,
  //                   value: productValue,
  //                   variants,
  //                 } = productOptions;

  //                 return (
  //                   <div key={productValue} style={{ paddingLeft: "40px" }}>
  //                     <Listbox.Option
  //                       value={productValue}
  //                       selected={salesCollectionIds.some(
  //                         (product) =>
  //                           product.id === productValue &&
  //                           !product.isCollection,
  //                       )}
  //                       accessibilityLabel={productLabel}
  //                     >
  //                       {productLabel}
  //                     </Listbox.Option>

  //                     {/* {salesCollectionIds.some(
  //                       (product) => product.id === productValue,
  //                     ) &&
  //                       variants.map((variant) => (
  //                         <div
  //                           key={variant.value}
  //                           style={{ paddingLeft: "40px" }}
  //                         >
  //                           <Listbox.Option
  //                             value={variant.value}
  //                             selected={salesCollectionIds.some(
  //                               (product) =>
  //                                 product.id === productValue &&
  //                                 product.variants.includes(variant.value),
  //                             )}
  //                             accessibilityLabel={variant.label}
  //                           >
  //                             {variant.label}
  //                           </Listbox.Option>
  //                         </div>
  //                       ))} */}
  //                   </div>
  //                 );
  //               })}
  //           </div>
  //         );
  //       })
  //     : null;

  return (
    <div>
      <Combobox
        allowMultiple
        activator={
          <Combobox.TextField
            prefix={<Icon source={SelectIcon} />}
            onChange={updateText}
            placeholder={
              salesProductsIds.length === 0
                ? "Select Products for sale"
                : salesProductsIds.length > 0 &&
                  salesProductsIds.length > 0 &&
                  `${salesProductsIds.length} Products Selected!`
            }
            labelHidden
            value={inputValue}
            autoComplete="off"
          />
        }
      >
        <Listbox autoSelection={AutoSelection.None} onSelect={updateSelection}>
          {/* <Listbox.Option value="select_single_products">
            Select Products
          </Listbox.Option> */}
          {optionsMarkup}
        </Listbox>
      </Combobox>
    </div>
  );
}
