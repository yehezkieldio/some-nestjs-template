/** @type {import('jest').Config} */
export default {
    roots: ["."],
    testRegex: ".e2e-spec.ts$",
    transform: {
        "^.+\\.(t|j)sx?$": ["@swc/jest"]
    },
    coverageDirectory: "./coverage",
    collectCoverageFrom: ["**/.(t|j)s"],
    moduleFileExtensions: ["js", "json", "ts"],
    setupFilesAfterEnv: ["../jest.setup.ts"]
};
