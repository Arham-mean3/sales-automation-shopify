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
    display: "flex",
    flexDirection: "column",
    flex: 4,
    overflowX: "auto",
  },
  info: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 54,
  },
  infoMain: {
    padding: "20px",
    margin: "20px auto",
    height: "100%",
  },
  infoTitle: {
    display: "block",
    fontSize: "1.2em",
    marginBottom: "10px",
  },
  infoText: {
    fontSize: "1em",
    lineHeight: "1.5",
    margin: 0,
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
  titleButton: {
    background: "none",
    border: 0,
    outline: "none",
    cursor: "pointer",
  },
  titleText: {
    fontWeight: "bold",
  },
};
