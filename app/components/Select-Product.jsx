import React, { useState } from "react";

export default function SelectProduct() {
  const [selected, setSelected] = useState("collections");
  const [selectedProducts, setSelectedProducts] = useState(
    [],
  );
  return <div>SelectProduct</div>;
}
