module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  moduleNameMapper: {
    // Mock Remix module imports if necessary
    "^@remix-run/(.*)$": "<rootDir>/node_modules/@remix-run/$1",
  },
};
