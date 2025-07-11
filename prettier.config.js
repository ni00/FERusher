// prettier.config.js
module.exports = {
    // 不添加分号
    singleQuote: false,
    // 每行最大长度
    printWidth: 80,
    // 一个 tab 等于多少空格
    tabWidth: 2,
    // 对象、数组等括号两侧保留空格：{ foo: bar }
    bracketSpacing: true,
    // 箭头函数的参数可在只有一个参数时省略括号
    arrowParens: 'avoid',
    // 多行时尽可能打印尾逗号，便于 git diff
    trailingComma: 'es5',
    // 把 > 单独放一行
    bracketSameLine: false,
    // 统一换行符格式，避免不同系统冲突
    endOfLine: 'lf',
    // 针对特定文件类型做额外配置
    overrides: [
        {
            files: '*.json',
            options: {tabWidth: 2}
        },
        {
            files: '*.md',
            options: {
                proseWrap: 'always',
                printWidth: 80,
            },
        },
    ]
}