export const technologyBaselineReviewedAt = "2026-08-09";

const technology = (id, terms, officialSources, minimumQuestions = 10) => ({
  id,
  terms,
  officialSources,
  minimumQuestions,
});

export const technologyBaseline = {
  fundamentals: [
    technology(
      "quic-http3",
      ["QUIC", "HTTP/3"],
      ["https://www.rfc-editor.org/rfc/rfc9000"]
    ),
  ],
  frontend: [
    technology(
      "react-19",
      ["React 19"],
      ["https://react.dev/blog/2024/12/05/react-19"]
    ),
    technology(
      "nextjs-16",
      ["Next.js 16"],
      ["https://nextjs.org/blog/next-16"]
    ),
    technology(
      "typescript-5.9",
      ["TypeScript 5.9"],
      [
        "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html",
      ]
    ),
    technology("rspack", ["Rspack"], ["https://www.rspack.dev/"]),
    technology(
      "rsbuild",
      ["Rsbuild"],
      ["https://rsbuild.dev/guide/faq/general"]
    ),
    technology(
      "webassembly",
      ["WebAssembly"],
      ["https://webassembly.github.io/spec/core/"]
    ),
  ],
  backend: [
    technology(
      "nodejs-26",
      ["Node.js 26"],
      ["https://nodejs.org/docs/latest-v26.x/api/"]
    ),
    technology(
      "java-virtual-threads",
      ["虚拟线程"],
      ["https://openjdk.org/jeps/444"]
    ),
    technology(
      "postgresql",
      ["PostgreSQL"],
      ["https://www.postgresql.org/docs/current/"]
    ),
    technology("redis", ["Redis"], ["https://redis.io/docs/latest/"]),
    technology("kafka", ["Kafka"], ["https://kafka.apache.org/documentation/"]),
  ],
  mobile: [
    technology(
      "kotlin-multiplatform",
      ["Kotlin Multiplatform"],
      ["https://kotlinlang.org/docs/multiplatform/kmp-overview.html"]
    ),
    technology(
      "jetpack-compose",
      ["Jetpack Compose"],
      ["https://developer.android.com/compose"]
    ),
    technology(
      "swiftui",
      ["SwiftUI"],
      ["https://developer.apple.com/documentation/swiftui"]
    ),
    technology("flutter", ["Flutter"], ["https://docs.flutter.dev/"]),
    technology(
      "react-native",
      ["React Native"],
      ["https://reactnative.dev/docs/the-new-architecture/landing-page"]
    ),
    technology(
      "lynx",
      ["Lynx", "ReactLynx"],
      ["https://lynxjs.org/react/introduction.html"]
    ),
    technology(
      "uni-app",
      ["uni-app", "uni-app x"],
      ["https://github.com/dcloudio/uni-app"]
    ),
  ],
  quality: [
    technology(
      "playwright",
      ["Playwright"],
      ["https://playwright.dev/docs/intro"]
    ),
    technology("contract-testing", ["契约测试"], ["https://docs.pact.io/"]),
    technology(
      "property-testing",
      ["属性测试"],
      ["https://fast-check.dev/docs/introduction/why-property-based/"]
    ),
  ],
  platform: [
    technology(
      "kubernetes",
      ["Kubernetes"],
      ["https://kubernetes.io/docs/home/"]
    ),
    technology(
      "opentelemetry",
      ["OpenTelemetry"],
      ["https://opentelemetry.io/docs/specs/otel/overview/"]
    ),
    technology("ebpf", ["eBPF"], ["https://docs.ebpf.io/"]),
    technology("gitops", ["GitOps"], ["https://opengitops.dev/"]),
    technology(
      "terraform",
      ["Terraform"],
      ["https://developer.hashicorp.com/terraform/docs"]
    ),
  ],
  "llm-algorithm": [
    technology("cuda", ["CUDA"], ["https://docs.nvidia.com/cuda/"]),
    technology(
      "triton",
      ["Triton Kernel"],
      ["https://triton-lang.org/main/index.html"]
    ),
    technology("vllm", ["vLLM"], ["https://docs.vllm.ai/en/stable/"]),
    technology("sglang", ["SGLang"], ["https://docs.sglang.ai/"]),
    technology(
      "kv-cache",
      ["KV Cache"],
      ["https://docs.vllm.ai/en/stable/design/paged_attention.html"]
    ),
  ],
  "agent-evaluation": [
    technology("swe-bench", ["SWE-bench"], ["https://www.swebench.com/"]),
    technology(
      "llm-judge",
      ["LLM-as-a-Judge"],
      ["https://arxiv.org/abs/2306.05685"]
    ),
    technology(
      "trajectory-evaluation",
      ["轨迹评测", "Trajectory"],
      ["https://platform.openai.com/docs/guides/agent-evals"]
    ),
    technology(
      "trace-evaluation",
      ["Trace"],
      ["https://openai.github.io/openai-agents-js/guides/tracing/"]
    ),
  ],
  "agent-engineering": [
    technology(
      "agent-runtime",
      ["Agent Runtime"],
      ["https://docs.langchain.com/oss/python/langchain/runtime"]
    ),
    technology(
      "agent-loop",
      ["Agent Loop"],
      ["https://openai.github.io/openai-agents-js/guides/running-agents/"]
    ),
    technology(
      "agent-graph",
      ["Agent Graph"],
      ["https://docs.langchain.com/oss/python/langgraph/graph-api"]
    ),
    technology(
      "agent-trace",
      ["Agent Trace"],
      ["https://openai.github.io/openai-agents-js/guides/tracing/"]
    ),
    technology(
      "mcp",
      ["MCP"],
      ["https://modelcontextprotocol.io/docs/getting-started/intro"]
    ),
    technology(
      "vercel-ai-sdk",
      ["Vercel AI SDK"],
      ["https://ai-sdk.dev/docs/introduction"]
    ),
  ],
};

export function getTechnologyCoverage(pack, trackId) {
  return (technologyBaseline[trackId] ?? []).map(entry => {
    const terms = entry.terms.map(term => term.toLocaleLowerCase("en-US"));
    const count = pack.filter(question => {
      const searchable = [
        question.prompt,
        question.topicLabel,
        ...question.tags,
      ]
        .join("\n")
        .toLocaleLowerCase("en-US");
      return terms.some(term => searchable.includes(term));
    }).length;
    return { ...entry, count };
  });
}

export function assertTechnologyBaseline(pack, trackId) {
  const deficits = getTechnologyCoverage(pack, trackId).filter(
    entry => entry.count < entry.minimumQuestions
  );
  if (deficits.length) {
    throw new Error(
      `${trackId}: missing technology coverage ${deficits
        .map(entry => `${entry.id} ${entry.count}/${entry.minimumQuestions}`)
        .join(", ")}`
    );
  }
}
