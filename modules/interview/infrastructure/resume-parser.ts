export interface ParsedResume {
  text: string;
  pageCount?: number;
  truncated: boolean;
}

const MAX_RESUME_CHARACTERS = 50_000;
const MAX_RESUME_BYTES = 10 * 1024 * 1024;

function limitText(text: string): ParsedResume {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  return {
    text: normalized.slice(0, MAX_RESUME_CHARACTERS),
    truncated: normalized.length > MAX_RESUME_CHARACTERS,
  };
}

export async function parseResume(file: File): Promise<ParsedResume> {
  if (file.size > MAX_RESUME_BYTES) {
    throw new Error("简历文件不能超过 10 MB");
  }

  const extension = file.name.split(".").pop()?.toLocaleLowerCase();

  if (extension === "md" || extension === "markdown" || extension === "txt") {
    const parsed = limitText(await file.text());
    if (!parsed.text) throw new Error("简历文件中没有可读取的文字");
    return parsed;
  }

  if (extension !== "pdf" && file.type !== "application/pdf") {
    throw new Error("仅支持 PDF、Markdown 或纯文本简历");
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  let collectedCharacters = 0;

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map(item => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      page.cleanup();
      if (text) {
        pages.push(text);
        collectedCharacters += text.length + 2;
      }
      if (collectedCharacters > MAX_RESUME_CHARACTERS) break;
    }

    const parsed = limitText(pages.join("\n\n"));
    if (!parsed.text) {
      throw new Error("PDF 中没有提取到文字；扫描版简历请先转换为可复制文本");
    }
    return { ...parsed, pageCount: document.numPages };
  } finally {
    await document.cleanup();
    await loadingTask.destroy();
  }
}
