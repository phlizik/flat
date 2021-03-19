import path from "path";
import fs from "fs";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import typescript from "rollup-plugin-typescript2";
import styles from "rollup-plugin-styles";
import ignoreImport from "rollup-plugin-ignore-import";
import url from "@rollup/plugin-url";

const compNames = fs.readdirSync(path.resolve(__dirname, "src", "components"));

generateIndexTS(compNames);

const commonPlugins = [resolve({ browser: true }), commonjs(), peerDepsExternal(), url()];

// ignore assets that are not picked up by url plugin
const ignoreAssets = ignoreImport({
    extensions: [".less", ".css", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"],
});

const extractCSS = styles({ mode: "extract", sourceMap: true });

const rollupConfig = [...getMainEntryConfig(), ...getAllComponentConfigs(compNames)];

export default rollupConfig;

/**
 * Bundle all components into one file.
 */
function getMainEntryConfig() {
    const input = "./src/index.ts";
    const sharedPlugins = [
        ...commonPlugins,
        typescript({
            clean: true,
        }),
    ];

    return [
        {
            input,
            output: {
                dir: "./build/",
                format: "cjs",
                sourcemap: true,
                assetFileNames,
            },
            plugins: [...sharedPlugins, extractCSS],
        },
        {
            input,
            output: {
                dir: "./build/esm/",
                format: "esm",
                sourcemap: true,
            },
            plugins: [...sharedPlugins, ignoreAssets],
        },
    ];
}

/**
 * Merge all component configs
 */
function getAllComponentConfigs(compNames) {
    const configs = [];
    compNames.forEach(name => {
        configs.push(...getComponentConfig(name));
    });
    return configs;
}

/**
 * Bundle each component into its own directory.
 */
function getComponentConfig(name) {
    const input = path.resolve(__dirname, "src", "components", name, "index.tsx");

    const sharedPlugins = [
        ...commonPlugins,
        typescript({
            tsconfig: "tsconfig.base.json",
            tsconfigOverride: {
                include: [`src/components/${name}/**/*`],
            },
            // already checked in main entry bundling
            check: false,
            clean: true,
        }),
    ];

    return [
        {
            input,
            output: {
                dir: path.resolve(__dirname, "build", "components", name),
                format: "cjs",
                sourcemap: true,
                assetFileNames,
            },
            plugins: [...sharedPlugins, extractCSS],
        },
        {
            input,
            output: {
                dir: path.resolve(__dirname, "build", "esm", "components", name),
                format: "esm",
                sourcemap: true,
            },
            plugins: [...sharedPlugins, ignoreAssets],
        },
    ];
}

/**
 * generate index.ts which includes all the components
 */
function generateIndexTS(compNames) {
    const srcDir = path.resolve(__dirname, "src");

    const str =
        "// THIS IS AN AUTO-GENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.\n\n" +
        compNames.map(name => `export * from "./components/${name}";`).join("\n") +
        "\n";

    fs.writeFileSync(path.join(srcDir, "index.ts"), str);
}

function assetFileNames(assetInfo) {
    return assetInfo.name.endsWith(".css") ? "style.css" : "assets/[name][extname]";
}
