module.exports = {
  singleQuote: false,
  printWidth: 80,
  tabWidth: 2,
  bracketSpacing: true,
  arrowParens: "avoid",
  trailingComma: "es5",
  bracketSameLine: false,
  endOfLine: "lf",
  overrides: [
    {
      files: "*.json",
      options: { tabWidth: 2 },
    },
    {
      files: "*.md",
      options: {
        proseWrap: "always",
        printWidth: 80,
      },
    },
  ],
};
