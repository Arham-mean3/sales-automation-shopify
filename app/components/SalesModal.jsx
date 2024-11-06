import React from "react";
import { SalesTypeOption } from "../lib/options";
import { Modal, Select, TextField } from "@shopify/polaris";
import { styles } from "../styles";
import DateAndTimePicker from "./DateAndTimePicker";
import SelectProductComp from "./MultiCombobox";
import SelectCollections from "./Select-Collections";
import ShowCollectionsList from "./Show-Collections-List";
import MultiCollectionSelector from "./Collection-Selector";

export default function SalesModal({
  showModal,
  salesTitle,
  saleTags,
  salesType,
  createSale,
  salesValue,
  etime,
  stime,
  eDate,
  sDate,
  setStime,
  setEtime,
  products,
  setShowModal,
  setSdate,
  setEdate,
  handleSelectSalesTypeChanges,
  setSalesValue,
  setSaleTitle,
  setSaleTags,
  collections,
}) {
  return (
    <div>
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Apply Sales"
        primaryAction={{
          content: "Apply Sales Now!",
          onAction: createSale,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowModal(false),
          },
        ]}
        size="large"
      >
        <Modal.Section>
          <div style={styles.relativeContainer}>
            {/* Main Content */}
            <div style={styles.mainContent}>
              <div style={styles.innerContainer}>
                {/* SALES TITILE */}
                <div style={styles.title}>
                  <TextField
                    type={"text"}
                    label="Sales Title"
                    value={salesTitle}
                    onChange={setSaleTitle}
                    placeholder="Enter the Sales Title"
                  />
                </div>
                {/* Sales Type and Sales Value Fields */}
                <div style={styles.gridContainer}>
                  <Select
                    label="Sales Type"
                    options={SalesTypeOption}
                    onChange={handleSelectSalesTypeChanges}
                    value={salesType}
                  />

                  <TextField
                    type={
                      salesType === "FIXED-AMOUNT"
                        ? "number"
                        : salesType === "PERCENTAGE" && "integer"
                    }
                    label="Sales values"
                    value={salesValue}
                    onChange={(value) => {
                      const intValue = parseInt(value, 10);

                      if (
                        value === "" ||
                        (Number.isInteger(intValue) && intValue >= 1)
                      ) {
                        setSalesValue(value);
                      }
                    }}
                    prefix={
                      salesType === "FIXED-AMOUNT"
                        ? "$"
                        : salesType === "PERCENTAGE" && "%"
                    }
                  />
                </div>

                <div style={styles.productSelection}>
                  <SelectCollections
                    collections={collections}
                    products={products}
                  />
                </div>

                {/* <div>
                  <MultiCollectionSelector collections={collections} />
                </div> */}

                {/* SALES TAGES HERE */}
                <div style={styles.salesTag}>
                  <TextField
                    type={"text"}
                    label="Sales Tag"
                    value={saleTags}
                    onChange={setSaleTags}
                    placeholder="Enter the Sales Tag"
                  />
                </div>

                {/* Date and Time Picker */}
                <div style={styles.dateTimePicker}>
                  <DateAndTimePicker
                    eDate={eDate}
                    sDate={sDate}
                    stime={stime}
                    etime={etime}
                    setStime={setStime}
                    setEtime={setEtime}
                    setSdate={setSdate}
                    setEdate={setEdate}
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal.Section>
      </Modal>
    </div>
  );
}
