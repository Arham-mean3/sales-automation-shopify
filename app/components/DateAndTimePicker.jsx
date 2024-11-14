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
import { useState, useRef, useContext } from "react";
import { CalendarIcon } from "@shopify/polaris-icons";
import TimeSelector from "./Time"; // Ensure the import matches your file structure
import { SelectContext } from "../context/Select-Context";

export default function DateAndTimePicker({
  sDate,
  eDate,
  stime,
  etime,
  setEtime,
  setStime,
  setSdate,
  setEdate,
  disabled,
}) {
  const { checked, handleChange } = useContext(SelectContext);
  const [startPickerVisible, setStartPickerVisible] = useState(false);
  const [endPickerVisible, setEndPickerVisible] = useState(false);

  const datePickerRef = useRef(null);
  const endDatePickerRef = useRef(null);

  const formattedStartDate = sDate.toLocaleDateString("en-PK");
  const formattedEndDate = eDate.toLocaleDateString("en-PK");

  // Handle Date Change for Start Date
  // Handle Date Change for Start Date
  const handleStartDateSelection = ({ end: newSelectedDate }) => {
    const utcDate = new Date(
      Date.UTC(
        newSelectedDate.getFullYear(),
        newSelectedDate.getMonth(),
        newSelectedDate.getDate(),
      ),
    );
    setSdate(utcDate);

    const newEndDate = new Date(utcDate);
    newEndDate.setUTCDate(newEndDate.getUTCDate() + 2);
    setEdate(newEndDate);
  };

  // Handle Date Change for End Date
  const handleEndDateSelection = ({ end: newSelectedDate }) => {
    const utcDate = new Date(
      Date.UTC(
        newSelectedDate.getFullYear(),
        newSelectedDate.getMonth(),
        newSelectedDate.getDate(),
      ),
    );
    setEdate(utcDate);
  };

  return (
    <BlockStack>
      <div style={styles.container}>
        <div style={styles.dateTimeColumn}>
          {/* Start Date and Time Inputs */}
          <div style={styles.row}>
            <Box minWidth="240px" style={{ flex: 1 }}>
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
                    disabled={disabled}
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

            <Box minWidth="240px" style={{ flex: 1 }}>
              <TimeSelector
                label={"Start time"}
                selectedTime={stime}
                setSelectedTime={setStime}
                disabled={disabled}
              />
            </Box>
          </div>

          <div>
            <Checkbox
              label="Set End Date for the Campaign."
              checked={checked}
              onChange={handleChange}
            />
          </div>

          {/* End Date and Time Inputs */}
          {checked && (
            <div style={styles.row}>
              <Box minWidth="240px" style={{ flex: 1 }}>
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

              <Box minWidth="240px" style={{ flex: 1 }}>
                <TimeSelector
                  label={"End time"}
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

// Styles with media queries for responsiveness
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  dateTimeColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  row: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  "@media (max-width: 768px)": {
    row: {
      flexDirection: "column",
      gap: "10px",
    },
    container: {
      padding: "5px",
    },
  },
  "@media (min-width: 769px) and (max-width: 1024px)": {
    row: {
      flexDirection: "row",
      gap: "20px",
    },
    dateTimeColumn: {
      gap: "16px",
    },
  },
};
