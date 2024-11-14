import React, { useMemo } from "react";
import { SalesTypeOption } from "../lib/options";
import { Icon, Modal, Select, TextField } from "@shopify/polaris";
import { styles } from "../styles";
import DateAndTimePicker from "./DateAndTimePicker";
import { EditIcon } from "@shopify/polaris-icons";
import SelectCollections from "./Select-Collections";

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
  isScheduled,
  isDisable,
  updateSales,
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
  handleUpdate,
  code,
  handleExtendTime,
}) {
  const modelHeading = updateSales ? "Update Campaign" : "Create Campaign";
  const contentText = isDisable
    ? "Extend the Campaign!"
    : updateSales
      ? "Update Campaign Now!"
      : "Create Campaign Now!";
  const actionFunc = isDisable
    ? handleExtendTime
    : updateSales
      ? handleUpdate
      : createSale;

  return (
    <div>
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modelHeading}
        primaryAction={{
          content: contentText,
          onAction: actionFunc,
          icon: <Icon source={EditIcon} tone="base" />,
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
          <div className="m-0 p-0">
            {/* Main Content */}
            <div className="flex justify-center items-center">
              <div style={styles.innerContainer}>
                {/* SALES TITILE */}
                <div className="mb-4">
                  <TextField
                    type={"text"}
                    label="Title"
                    value={salesTitle}
                    onChange={setSaleTitle}
                    placeholder="Enter the Sales Title"
                    disabled={isDisable}
                  />
                </div>
                {/* Sales Type and Sales Value Fields */}
                <div style={styles.gridContainer}>
                  <Select
                    label="Type"
                    options={SalesTypeOption}
                    onChange={handleSelectSalesTypeChanges}
                    value={salesType}
                    disabled={isDisable}
                  />

                  <TextField
                    type={
                      salesType === "FIXED-AMOUNT"
                        ? "number"
                        : salesType === "PERCENTAGE" && "integer"
                    }
                    label="Value"
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
                        ? code
                        : salesType === "PERCENTAGE" && "%"
                    }
                    disabled={isScheduled}
                  />
                </div>

                {/* SELECTION CONTAINER */}
                <div className="my-4">
                  <SelectCollections
                    collections={collections}
                    products={products}
                    disabled={isDisable}
                  />
                </div>

                {/* <div>
                  <MultiCollectionSelector collections={collections} />
                </div> */}

                {/* SALES TAGES HERE */}
                <div className="mb-0">
                  <TextField
                    type={"text"}
                    label="Tag"
                    value={saleTags}
                    onChange={setSaleTags}
                    placeholder="Enter the Tag"
                    disabled={isDisable}
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
                    disabled={isDisable}
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
