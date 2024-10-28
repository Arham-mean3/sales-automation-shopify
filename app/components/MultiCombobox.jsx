import {
  Listbox,
  Combobox,
  Icon,
  AutoSelection,
} from "@shopify/polaris";
import { SelectIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useMemo } from "react";

export default function SelectProductComp({
  products,
  setSalesProductsIds,
  salesProductsIds,
}) {
  const deselectedOptions = useMemo(
    () =>
      products.map(({ node }) => ({
        value: node.id, // Product ID
        label: node.title,
        variants: node.variants.edges.map(({ node: variantNode }) => ({
          value: variantNode.id,
          label: variantNode.displayName,
        })),
      })),
    [products],
  );

  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState(deselectedOptions);

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
      const isProduct = options.some((option) => option.value === selected);
      
      if (isProduct) {
        const product = options.find((option) => option.value === selected);
        const allVariants = product.variants.map(variant => variant.value);
        
        // Check if the product is already selected
        const existingProduct = salesProductsIds.find(item => item.id === selected);

        if (existingProduct) {
          // Product is selected, deselect it and its variants
          const newSelectedProducts = salesProductsIds.filter(
            item => item.id !== selected
          );
          setSalesProductsIds(newSelectedProducts);
        } else {
          // Add product and all its variants to selected products
          const newProduct = {
            id: selected,
            variants: allVariants,
          };

          setSalesProductsIds([...salesProductsIds, newProduct]);
        }
      } else {
        // Handle variant selection/deselection
        const variantSelected = selected;
        const updatedProducts = salesProductsIds.map(product => {
          // If product is selected, toggle its variant
          if (product.variants.includes(variantSelected)) {
            return {
              ...product,
              variants: product.variants.filter(variant => variant !== variantSelected),
            };
          } else {
            // If variant is not selected, add it
            return {
              ...product,
              variants: [...product.variants, variantSelected],
            };
          }
        });
        
        setSalesProductsIds(updatedProducts);
      }
      updateText("");
    },
    [options, salesProductsIds, updateText],
  );

  const optionsMarkup =
    options.length > 0
      ? options.map((option) => {
          const { label, value, variants } = option;

          return (
            <div key={value}>
              <Listbox.Option
                value={value}
                selected={salesProductsIds.some(product => product.id === value)}
                accessibilityLabel={label}
              >
                {label}
              </Listbox.Option>
              {salesProductsIds.some(product => product.id === value) && (
                <div style={{ paddingLeft: '20px' }}>
                  {variants.map(variant => (
                    <Listbox.Option
                      key={variant.value}
                      value={variant.value}
                      selected={salesProductsIds.some(product => 
                        product.id === value && product.variants.includes(variant.value))}
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
                ? "Select products for sale"
                : `${salesProductsIds.length} Products Selected!`
            }
            labelHidden
            value={inputValue}
            autoComplete="off"
          />
        }
      >
        <Listbox
          autoSelection={AutoSelection.None}
          onSelect={updateSelection}
        >
          {optionsMarkup}
        </Listbox>
      </Combobox>
    </div>
  );
}
