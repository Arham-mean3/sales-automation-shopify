export const styles = {
  relativeContainer: {
    position: "relative",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  bannerContainer: {
    width: "300px",
    margin: "20px auto",
    zIndex: 999,
  },
  mainContent: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },
  innerContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "100%",
    maxWidth: "800px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    marginBottom: 20,
  },
  tableContainer: {
    width: "100%",
    display: "flex",
    gap: 20,
  },
  table: {
    maxWidth: "75%",
    overflowX: "auto",
  },
  info: {
    maxWidth: "23%",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    height: 250,
    marginTop: 54,
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  dateTimePicker: {
    marginTop: 20,
    marginBottom: 20,
  },
  productSelection: {
    marginTop: 20,
    marginBottom: 20,
  },
  salesContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
  },
  salesTag: {
    marginBottom: 0,
  },
  "@media (max-width: 768px)": {
    gridContainer: {
      gridTemplateColumns: "1fr",
    },
    header: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "10px",
    },
    bannerContainer: {
      width: "100%",
      right: "auto",
      left: "0",
    },
  },
  "@media (min-width: 769px) and (max-width: 1024px)": {
    mainContent: {
      padding: "20px",
    },
    gridContainer: {
      gridTemplateColumns: "1fr 1fr",
    },
  },
};
