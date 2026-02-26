import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./__tests__/setup.ts"],
        include: ["__tests__/**/*.test.ts"],
        exclude: ["e2e/**", "node_modules/**"],
        coverage: {
            provider: "istanbul",
            reportsDirectory: "./coverage",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: ["src/**/*.d.ts", "src/**/layout.tsx"],
        },
        testTimeout: 15000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
