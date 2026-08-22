import assert from "node:assert/strict";
import test from "node:test";
import { getPromptCompletenessRisk } from "../scripts/content/source-quality.mjs";

test("rejects source headings and fragments", () => {
  assert.equal(
    getPromptCompletenessRisk("设计中的关键考量"),
    "contextless-source-heading"
  );
  assert.equal(
    getPromptCompletenessRisk("定义数字列表"),
    "incomplete-source-command"
  );
  assert.equal(
    getPromptCompletenessRisk("是否表达了歉意？"),
    "contextless-binary-rubric"
  );
});

test("rejects unframed error titles and malformed wording", () => {
  assert.equal(
    getPromptCompletenessRisk("无法从 transformers 导入 pipeline"),
    "unframed-error-title"
  );
  assert.equal(
    getPromptCompletenessRisk("请说说说你对 Monorepo 的理解"),
    "malformed-question-wording"
  );
});

test("keeps complete basic and engineering questions", () => {
  assert.equal(getPromptCompletenessRisk("什么是 MVCC？"), undefined);
  assert.equal(
    getPromptCompletenessRisk(
      "设计 Agent Loop 时，如何处理终止条件、取消和工具重试？"
    ),
    undefined
  );
});
