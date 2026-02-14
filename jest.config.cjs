/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  transform: {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.js$": "babel-jest",
  },

  transformIgnorePatterns: [
    "/node_modules/(?!(@gradio|jose|uuid|cloudinary)/)",
  ],

  moduleNameMapper: {
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^src/(.*)$": "<rootDir>/src/$1", 
  },
  setupFiles: ["dotenv/config"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/tests/**/*.test.ts"],
  verbose: true,
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
