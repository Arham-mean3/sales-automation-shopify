import {
  LegacyStack,
  Tag,
  Listbox,
  Combobox,
  Icon,
  TextContainer,
} from "@shopify/polaris";

import { SearchIcon } from "@shopify/polaris-icons";

import { useState, useCallback, useMemo, useContext } from "react";
import { SelectContext } from "../context/Select-Context";

export default function MultiCollectionSelector({ collections }) {
  const deselectedCollections = useMemo(
    () =>
      collections.map(({ node }) => ({
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
    [collections],
  );

  const { selectedCollection, setSelectedCollection, removeCollection } =
    useContext(SelectContext);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState(deselectedCollections);

  const escapeSpecialRegExCharacters = useCallback(
    (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    [],
  );

  const updateText = useCallback(
    (value) => {
      setInputValue(value);

      if (value === "") {
        setOptions(deselectedCollections);
        return;
      }

      const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), "i");
      const resultOptions = deselectedCollections.filter((option) =>
        option.label.match(filterRegex),
      );
      setOptions(resultOptions);
    },
    [deselectedCollections, escapeSpecialRegExCharacters],
  );

  const updateSelection = useCallback(
    (selected) => {
      if (selectedCollection.includes(selected)) {
        setSelectedCollection(
          selectedCollection.filter((option) => option !== selected),
        );

        removeCollection(selected);
      } else {
        setSelectedCollection([...selectedCollection, selected]);
      }

      updateText("");
    },
    [selectedCollection, updateText],
  );

  const removeTag = useCallback(
    (tag) => () => {
      const options = [...selectedCollection];
      options.splice(options.indexOf(tag), 1);
      setSelectedCollection(options);
      console.log("Remove Tag", tag);

      removeCollection(tag);
    },
    [selectedCollection],
  );

  const tagsMarkup = selectedCollection.map((option) => {
    return (
      <Tag key={`option-${option}`} onRemove={removeTag(option)}>
        {option}
      </Tag>
    );
  });

  const optionsMarkup =
    options.length > 0
      ? options.map((option) => {
          const { label, value } = option;

          return (
            <Listbox.Option
              key={`${value}`}
              value={value}
              selected={selectedCollection.includes(value)}
              accessibilityLabel={label}
            >
              {label}
            </Listbox.Option>
          );
        })
      : null;

  return (
    <div style={{ height: "40px" }}>
      <Combobox
        allowMultiple
        activator={
          <Combobox.TextField
            prefix={<Icon source={SearchIcon} />}
            onChange={updateText}
            label="Collections"
            labelHidden
            value={inputValue}
            placeholder="Collections"
            autoComplete="off"
          />
        }
      >
        {optionsMarkup ? (
          <Listbox onSelect={updateSelection}>{optionsMarkup}</Listbox>
        ) : null}
      </Combobox>
      <TextContainer>
        <LegacyStack>{tagsMarkup}</LegacyStack>
      </TextContainer>
    </div>
  );
}
