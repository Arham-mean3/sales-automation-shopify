import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Listbox, Combobox, Icon } from "@shopify/polaris";
import { CalendarTimeIcon } from "@shopify/polaris-icons";

export default function TimeSelector({ selectedTime, setSelectedTime, label }) {
  const generateTimeSlots = useCallback(() => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute++) {
        const formattedHour = hour % 12 === 0 ? 12 : hour % 12; // Convert to 12-hour format
        const formattedMinute = String(minute).padStart(2, "0");
        const amPm = hour < 12 ? "AM" : "PM";
        const label = `${formattedHour}:${formattedMinute} ${amPm}`;
        const value = `${String(hour).padStart(2, "0")}:${formattedMinute}`; // 24-hour format
        times.push({ value, label });
      }
    }
    return times;
  }, []);

  const deselectedOptions = useMemo(
    () => generateTimeSlots(),
    [generateTimeSlots]
  );

  const getCurrentTimeValue = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState(deselectedOptions);

  useEffect(() => {
    const currentTime = getCurrentTimeValue();
    setSelectedTime(currentTime);
    const currentTimeLabel = deselectedOptions.find(
      (option) => option.value === currentTime
    )?.label;
    setInputValue(currentTimeLabel || "");
  }, [deselectedOptions, setSelectedTime]);

  const escapeSpecialRegExCharacters = useCallback(
    (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    []
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
        option.label.match(filterRegex)
      );
      setOptions(resultOptions);
    },
    [deselectedOptions, escapeSpecialRegExCharacters]
  );

  const updateSelection = useCallback(
    (selected) => {
      setSelectedTime(selected); // Store 24-hour format value
      const matchedOption = options.find((option) => option.value === selected);
      setInputValue((matchedOption && matchedOption.label) || ""); // Display 12-hour format label
    },
    [options, setSelectedTime]
  );

  const optionsMarkup =
    options.length > 0
      ? options.map((option) => {
          const { label, value } = option;
          const isCurrentTime = value === getCurrentTimeValue();
          return (
            <Listbox.Option
              key={value}
              value={value}
              selected={selectedTime === value}
              accessibilityLabel={label}
              style={{ fontWeight: isCurrentTime ? "bold" : "normal" }}
            >
              {label}
            </Listbox.Option>
          );
        })
      : null;

  return (
    <div style={{ height: "10px" }}>
      <Combobox
        activator={
          <Combobox.TextField
            prefix={<Icon source={CalendarTimeIcon} />}
            onChange={updateText}
            label={label}
            labelHidden
            value={inputValue}
            placeholder={label}
            autoComplete="off"
          />
        }
      >
        {options.length > 0 ? (
          <Listbox onSelect={updateSelection}>{optionsMarkup}</Listbox>
        ) : null}
      </Combobox>
    </div>
  );
}
