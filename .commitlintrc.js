module.exports = {
  extends: ["cz"],

  rules: {
    // 作用范围
    "scope-enum": [2, "always", ["app", "ui", "deps", "config", "workflow"]],
    // 主题大小写
    "subject-case": [
      2,
      "never",
      ["sentence-case", "start-case", "pascal-case", "upper-case"],
    ],
    // 主题不能为空
    "subject-empty": [2, "never"],
    // 主题长度
    "subject-max-length": [2, "always", 50],
    // 类型不能为空
    "type-empty": [2, "never"],
    // Header 最大长度
    "header-max-length": [2, "always", 72],
    // Body 行最大长度
    "body-max-line-length": [2, "always", 100],
    // Footer 行最大长度
    "footer-max-line-length": [2, "always", 100],
  },
  useEmoji: true,
};
