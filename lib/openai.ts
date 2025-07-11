import OpenAI from "openai";

export interface AiSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
  prompt: string;
  streaming: boolean;
}

export async function getAiAnalysis(
  question: string,
  settings: AiSettings,
  onChunk?: (chunk: string) => void
): Promise<string> {
  try {
    if (!settings.apiKey) {
      if (settings.streaming && onChunk) {
        // 模拟流式输出
        const mockAnalysis = getMockAnalysisText(question);
        const chunks = mockAnalysis.split(" ");

        let cumulativeText = "";
        const delay = (ms: number) =>
          new Promise(resolve => setTimeout(resolve, ms));

        for (const chunk of chunks) {
          await delay(50);
          cumulativeText += chunk + " ";
          onChunk(cumulativeText);
        }

        return cumulativeText;
      }
      return getMockAnalysis(question);
    }

    // 初始化OpenAI客户端
    const openai = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl,
      dangerouslyAllowBrowser: true, // 允许在浏览器环境中运行
    });

    // 替换提示词中的问题占位符
    const processedPrompt = settings.prompt.replace("{question}", question);

    if (settings.streaming && onChunk) {
      // 使用流式API
      const stream = await openai.chat.completions.create({
        model: settings.model,
        messages: [
          {
            role: "system",
            content: processedPrompt,
          },
        ],
        temperature: 0.7,
        stream: true,
      });

      let cumulativeContent = "";

      for await (const chunk of stream) {
        // 累积内容
        if (chunk.choices[0]?.delta?.content) {
          cumulativeContent += chunk.choices[0].delta.content;
          onChunk(cumulativeContent);
        }
      }

      return cumulativeContent;
    } else {
      // 使用非流式API
      const response = await openai.chat.completions.create({
        model: settings.model,
        messages: [
          {
            role: "system",
            content: processedPrompt,
          },
        ],
        temperature: 0.7,
      });

      return (
        response.choices[0]?.message?.content || "无法生成分析，请检查API设置。"
      );
    }
  } catch (error) {
    console.error("OpenAI API调用失败:", error);
    return `分析生成失败: ${error instanceof Error ? error.message : "未知错误"}`;
  }
}

// 当用户没有设置API密钥时使用的模拟数据
function getMockAnalysisText(question: string): string {
  return `# 模拟AI分析（未配置API密钥）

## 问题解析
这是一个关于"${question}"的模拟分析。请注意，这不是真实的AI分析，因为您尚未配置OpenAI API密钥。

## 考察要点
- 技术概念理解
- 实践经验
- 解决问题的能力
- 技术深度

## 建议回答框架
1. 先解释概念和原理
2. 分享实际项目中的应用
3. 讨论常见挑战和解决方案
4. 提及最佳实践

## 可能的追问
- 你在实际项目中如何应用这一技术？
- 遇到了哪些问题，如何解决的？

## 准备建议
要真实使用AI分析功能，请在设置中配置您的OpenAI API密钥。`;
}

// 当用户没有设置API密钥时使用的模拟数据
function getMockAnalysis(question: string): Promise<string> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(getMockAnalysisText(question));
    }, 1000);
  });
}
