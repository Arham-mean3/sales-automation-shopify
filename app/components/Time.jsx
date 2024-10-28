import React from 'react';
import { Listbox, Combobox, Icon } from '@shopify/polaris';
import { CalendarTimeIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useMemo } from 'react';

export default function TimeSelector({ selectedTime, setSelectedTime, label }) {
// Generate time slots with 30-minute intervals
const generateTimeSlots = useCallback(() => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12; // Convert to 12-hour format
      const formattedMinute = String(minute).padStart(2, '0');
      const amPm = hour < 12 ? 'AM' : 'PM';
      const timeLabel = `${formattedHour}:${formattedMinute} ${amPm}`;
      times.push({ value: `${hour}:${formattedMinute}`, label: timeLabel });
    }
  }
  return times;
}, []);

const deselectedOptions = useMemo(() => generateTimeSlots(), [generateTimeSlots]);


  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState(deselectedOptions);

  const escapeSpecialRegExCharacters = useCallback(
    (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    [],
  );

  const updateText = useCallback(
    (value) => {
      setInputValue(value);
      if (value === '') {
        setOptions(deselectedOptions);
        return;
      }

      const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), 'i');
      const resultOptions = deselectedOptions.filter((option) =>
        option.label.match(filterRegex),
      );
      setOptions(resultOptions);
    },
    [deselectedOptions, escapeSpecialRegExCharacters],
  );

  const updateSelection = useCallback(
    (selected) => {
      setSelectedTime(selected);
      const matchedOption = options.find((option) => option.value === selected);
      setInputValue((matchedOption && matchedOption.label) || '');
    },
    [options, setSelectedTime],
  );

  const optionsMarkup =
    options.length > 0
      ? options.map((option) => {
          const { label, value } = option;
          return (
            <Listbox.Option
              key={value}
              value={value}
              selected={selectedTime === value}
              accessibilityLabel={label}
            >
              {label}
            </Listbox.Option>
          );
        })
      : null;

  return (
    <div style={{ height: '10px' }}>
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
