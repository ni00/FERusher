export function normalizePublishedPrompt(value) {
  return String(value)
    .trim()
    .replace(/HTTP\/1\.2(?=\D|$)/gi, "HTTP/1.1")
    .replace(/\bTypescript\b/gi, "TypeScript")
    .replace(/\bsetTimeOut\b/g, "setTimeout")
    .replace(/\bhttps:abc\.com\b/g, "https://abc.com");
}

export function getPromptQualityRejection(prompt) {
  const lineNumberedItems =
    prompt.match(/(?:^|\n)\s*(?:[1-9]|[12]\d)[.、．)](?!\d)\s*/gm)?.length ?? 0;
  const numberedItems =
    prompt.match(/(?:^|\s|[。？！?!])\s*(?:[1-9]|[12]\d)[.、．)](?!\d)\s*/gm)
      ?.length ?? 0;
  const questionMarks = prompt.match(/[？?]/g)?.length ?? 0;
  const codingSections =
    prompt.match(/(?:算法题|手写题|编程题|手撕代码)[:：]/g)?.length ?? 0;
  const semicolonItems = prompt.match(/[；;]/g)?.length ?? 0;
  const looksLikeCode =
    /```|(?:^|\n)\s*(?:const|let|var|function|if|for|while)\b|[{}]/m.test(
      prompt
    );

  if (
    lineNumberedItems >= 3 ||
    (numberedItems >= 3 && !looksLikeCode) ||
    (semicolonItems >= 4 && !looksLikeCode) ||
    codingSections >= 2 ||
    (questionMarks >= 5 && prompt.length > 180 && !looksLikeCode)
  ) {
    return "multi-question-bundle";
  }
  if (
    /需要具体的题目内容/.test(prompt) ||
    /\/\/\s*\.\.\.(?:具体数据|省略)/.test(prompt) ||
    (prompt.length < 30 && /相关的问题[。？?]*$/.test(prompt))
  ) {
    return "vague-placeholder";
  }
  if (
    /如果你想要.{0,20}(?:XSS|CSRF|网站).{0,10}攻击|如何(?:对|向).{0,20}进行.{0,8}攻击/i.test(
      prompt
    )
  ) {
    return "unsafe-offensive-framing";
  }
  return undefined;
}
