import {
  BlockStack,
  Box,
  Card,
  DatePicker,
  Popover,
  TextField,
  Icon,
  Checkbox,
} from "@shopify/polaris";
import { useState, useRef } from "react";
import { CalendarIcon } from "@shopify/polaris-icons";
import TimeSelector from "./Time"; // Ensure the import matches your file structure

export default function DateAndTimePicker({
  sDate,
  eDate,
  stime,
  etime,
  setEtime,
  setStime,
  setSdate,
  setEdate,
}) {
  const [startPickerVisible, setStartPickerVisible] = useState(false);
  const [endPickerVisible, setEndPickerVisible] = useState(false);

  const datePickerRef = useRef(null);
  const endDatePickerRef = useRef(null);

  const formattedStartDate = sDate.toLocaleDateString("en-PK");
  const formattedEndDate = eDate.toLocaleDateString("en-PK");
  const [check, setCheck] = useState(false);

  // Handle Date Change for Start Date
  const handleStartDateSelection = ({ end: newSelectedDate }) => {
    const localDate = new Date(newSelectedDate);
    setSdate(localDate);
    const newEndDate = new Date(localDate);
    newEndDate.setDate(localDate.getDate() + 2);
    setEdate(newEndDate);
  };

  // Handle Date Change for End Date
  const handleEndDateSelection = ({ end: newSelectedDate }) => {
    const localDate = new Date(newSelectedDate);
    // if (localDate < sDate) {
    //   alert("End date cannot be before the start date.");
    //   return;
    // }
    setEdate(localDate);
  };

  return (
    <BlockStack>
      {/* Start Date and Time Inputs */}
      <div style={{ display: "flex", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Box minWidth="240px">
              <Popover
                active={startPickerVisible}
                onClose={() => setStartPickerVisible(false)}
                activator={
                  <TextField
                    role="combobox"
                    label={"Start date"}
                    value={formattedStartDate}
                    onFocus={() => setStartPickerVisible(true)}
                    prefix={<Icon source={CalendarIcon} />}
                    autoComplete="off"
                    readOnly
                  />
                }
              >
                <Card ref={datePickerRef}>
                  <DatePicker
                    month={sDate.getMonth()}
                    year={sDate.getFullYear()}
                    selected={sDate}
                    onMonthChange={(month, year) => {
                      setSdate(new Date(year, month, 1));
                    }}
                    onChange={handleStartDateSelection}
                  />
                </Card>
              </Popover>
            </Box>

            {/* Use TimeSelector for Start Time */}
            <Box minWidth="240px">
              <TimeSelector
                label={stime}
                selectedTime={stime}
                setSelectedTime={setStime}
              />
            </Box>
          </div>
          <Checkbox
            label={!check ? "Set End Date" : "Add The End Date"}
            checked={check}
            onChange={() => setCheck((prevCheck) => !prevCheck)}
          />
          {/* End Date and Time Inputs */}
          {check && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Box minWidth="240px">
                <Popover
                  active={endPickerVisible}
                  onClose={() => setEndPickerVisible(false)}
                  activator={
                    <TextField
                      role="combobox"
                      label={"End date"}
                      value={formattedEndDate}
                      prefix={<Icon source={CalendarIcon} />}
                      onFocus={() => setEndPickerVisible(true)}
                      autoComplete="off"
                      readOnly
                    />
                  }
                >
                  <Card ref={endDatePickerRef}>
                    <DatePicker
                      month={eDate.getMonth()}
                      year={eDate.getFullYear()}
                      selected={eDate}
                      onMonthChange={(month, year) => {
                        setEdate(new Date(year, month, 1));
                      }}
                      onChange={handleEndDateSelection}
                    />
                  </Card>
                </Popover>
              </Box>

              {/* Use TimeSelector for End Time */}
              <Box minWidth="240px">
                <TimeSelector
                  label={etime}
                  selectedTime={etime}
                  setSelectedTime={setEtime}
                />
              </Box>
            </div>
          )}
        </div>
      </div>
    </BlockStack>
  );
}
