import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { globals: globals.node }},
  { languageOptions: { globals: globals.jest } },
  pluginJs.configs.recommended,
  {
    "overrides": [
      {
        "files": ["loadTests/**/*.js"],
        "parserOptions": {
          "sourceType": "module"
        }
      }
    ]
  }
];
