"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  aiSettingsSchema,
  reasoningEfforts,
  type AiSettings,
  type ReasoningEffort,
} from "@/modules/ai/domain/settings";
import { streamCompatibleChat } from "@/modules/ai/infrastructure/openai-compatible-browser-client";
import { useAiSettings } from "@/modules/ai/ui/use-ai-settings";
import {
  clearAllLocalData,
  createLocalBackup,
  restoreLocalBackup,
} from "@/modules/local-data/application/backup";
import {
  getAnalysisPromptPreset,
  type AnalysisPromptId,
} from "@/modules/question-analysis/domain/prompt-presets";

type Feedback = { kind: "success" | "error"; message: string } | undefined;
const isLocalDevelopment = process.env.NODE_ENV === "development";
const reasoningEffortLabels: Record<ReasoningEffort, string> = {
  auto: "自动（兼容性最佳）",
  none: "关闭（none）",
  minimal: "最低（minimal）",
  low: "低（low）",
  medium: "中（medium）",
  high: "高（high）",
  xhigh: "极高（xhigh）",
};

function getLocalDateKey(): string {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function SettingsPanel() {
  const { settings, isReady, persist } = useAiSettings();

  if (!isReady) {
    return (
      <div className="grid min-h-56 place-items-center rounded-lg border border-border bg-surface">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          正在读取本地设置
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <SettingsForm
        key={`${settings.baseUrl}:${settings.model}:${settings.reasoningEffort}:${settings.apiKey.length}:${settings.requiresApiKey}:${settings.streamResponse}:${settings.defaultAnalysisPrompt}:${settings.superModeByDefault}:${settings.analysisPromptOrder.join(",")}:${settings.analysisPromptOrder.map(id => settings.analysisReasoningEfforts[id]).join(",")}`}
        initialSettings={settings}
        onSave={persist}
      />
      <DataManagement />
    </div>
  );
}

function SettingsForm({
  initialSettings,
  onSave,
}: {
  initialSettings: AiSettings;
  onSave: (value: AiSettings) => Promise<void>;
}) {
  const [form, setForm] = useState(initialSettings);
  const [feedback, setFeedback] = useState<Feedback>();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [promptId, setPromptId] = useState<AnalysisPromptId>(
    initialSettings.defaultAnalysisPrompt
  );
  const orderedPromptPresets = form.analysisPromptOrder.map(
    getAnalysisPromptPreset
  );

  const movePrompt = (id: AnalysisPromptId, offset: -1 | 1) => {
    setForm(current => {
      const order = [...current.analysisPromptOrder];
      const index = order.indexOf(id);
      const destination = index + offset;
      if (index < 0 || destination < 0 || destination >= order.length) {
        return current;
      }

      [order[index], order[destination]] = [order[destination], order[index]];
      return { ...current, analysisPromptOrder: order };
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = aiSettingsSchema.safeParse(form);

    if (!parsed.success) {
      setFeedback({
        kind: "error",
        message: "请检查地址、模型名和系统提示词。",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(parsed.data);
      setFeedback({ kind: "success", message: "设置已保存在当前浏览器。" });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "保存失败",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    const parsed = aiSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setFeedback({ kind: "error", message: "请先填写完整、有效的模型设置。" });
      return;
    }

    setIsTesting(true);
    setFeedback(undefined);
    try {
      await streamCompatibleChat({
        settings: parsed.data,
        messages: [
          { role: "system", content: "你正在执行连通性检查。" },
          { role: "user", content: "只回复：连接成功" },
        ],
        onText: () => undefined,
      });
      setFeedback({ kind: "success", message: "模型连接成功。" });
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? `连接失败：${error.message}`
            : "模型连接失败",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface"
    >
      <div className="border-b border-border p-5 sm:p-6">
        <h2 className="text-base font-semibold">模型端点</h2>
      </div>
      <div className="grid gap-5 p-5 sm:p-6">
        <label className="grid gap-2">
          <Label htmlFor="base-url">兼容 API Base URL</Label>
          <Input
            id="base-url"
            type="url"
            value={form.baseUrl}
            placeholder="https://api.openai.com/v1"
            onChange={event =>
              setForm(current => ({ ...current, baseUrl: event.target.value }))
            }
          />
          <span className="text-xs leading-5 text-muted-foreground">
            {isLocalDevelopment
              ? "开发环境自动通过本机代理转发跨域请求；生产环境仍需端点支持 CORS。"
              : "端点需允许浏览器跨域访问，或使用同源网关。"}
          </span>
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">端点能力</legend>
          <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-border bg-background p-4">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.streamResponse}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    streamResponse: event.target.checked,
                  }))
                }
                className="size-4 shrink-0 accent-[hsl(var(--primary))]"
              />
              使用流式响应
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.requiresApiKey}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    requiresApiKey: event.target.checked,
                  }))
                }
                className="size-4 shrink-0 accent-[hsl(var(--primary))]"
              />
              端点需要 API Key
            </label>
          </div>
        </fieldset>

        {form.requiresApiKey ? (
          <label className="grid gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={form.apiKey}
              autoComplete="off"
              placeholder="仅保存在当前浏览器"
              onChange={event =>
                setForm(current => ({ ...current, apiKey: event.target.value }))
              }
            />
          </label>
        ) : null}

        <section className="grid gap-5 border-t border-border pt-6">
          <h3 className="text-sm font-semibold">题目解析</h3>

          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <label className="grid gap-2">
              <Label htmlFor="default-analysis-prompt">默认解析 Prompt</Label>
              <select
                id="default-analysis-prompt"
                value={form.defaultAnalysisPrompt}
                onChange={event => {
                  const value = event.target.value as AnalysisPromptId;
                  setForm(current => ({
                    ...current,
                    defaultAnalysisPrompt: value,
                  }));
                  setPromptId(value);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
              >
                {orderedPromptPresets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md border border-input bg-background px-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.superModeByDefault}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    superModeByDefault: event.target.checked,
                  }))
                }
                className="size-4 shrink-0 accent-[hsl(var(--primary))]"
              />
              默认启用超能模式
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              解析顺序、模型与思考强度
            </legend>
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              {orderedPromptPresets.map((preset, index) => (
                <div
                  key={preset.id}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-3 border-b border-border p-3 last:border-b-0 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:items-end"
                >
                  <span className="grid h-10 place-items-center text-sm tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                    <label className="grid min-w-0 gap-2">
                      <Label htmlFor={`analysis-model-${preset.id}`}>
                        {preset.label}模型
                      </Label>
                      <Input
                        id={`analysis-model-${preset.id}`}
                        value={form.analysisModels[preset.id]}
                        autoComplete="off"
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            analysisModels: {
                              ...current.analysisModels,
                              [preset.id]: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="grid min-w-0 gap-2">
                      <Label htmlFor={`analysis-reasoning-${preset.id}`}>
                        思考强度
                      </Label>
                      <ReasoningEffortSelect
                        id={`analysis-reasoning-${preset.id}`}
                        value={form.analysisReasoningEfforts[preset.id]}
                        onChange={value =>
                          setForm(current => ({
                            ...current,
                            analysisReasoningEfforts: {
                              ...current.analysisReasoningEfforts,
                              [preset.id]: value,
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="col-start-2 flex justify-end sm:col-start-auto">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={index === 0}
                      aria-label={`上移${preset.label}`}
                      title={`上移${preset.label}`}
                      onClick={() => movePrompt(preset.id, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={index === orderedPromptPresets.length - 1}
                      aria-label={`下移${preset.label}`}
                      title={`下移${preset.label}`}
                      onClick={() => movePrompt(preset.id, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              自动模式不发送 reasoning_effort；显式档位需要模型端点支持。
            </p>
          </fieldset>

          <div>
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="选择要编辑的解析 Prompt"
            >
              {orderedPromptPresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  role="tab"
                  aria-selected={promptId === preset.id}
                  onClick={() => setPromptId(preset.id)}
                  className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    promptId === preset.id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="mt-3 grid gap-2">
              <Label htmlFor="analysis-prompt">
                {getAnalysisPromptPreset(promptId).label} Prompt
              </Label>
              <Textarea
                id="analysis-prompt"
                value={form.analysisPrompts[promptId]}
                className="min-h-72 font-mono text-sm leading-6"
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    analysisPrompts: {
                      ...current.analysisPrompts,
                      [promptId]: event.target.value,
                    },
                  }))
                }
              />
            </label>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <label className="grid gap-2">
            <Label htmlFor="model">模拟面试模型</Label>
            <Input
              id="model"
              value={form.model}
              autoComplete="off"
              onChange={event =>
                setForm(current => ({ ...current, model: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-2">
            <Label htmlFor="reasoning-effort">思考强度</Label>
            <ReasoningEffortSelect
              id="reasoning-effort"
              value={form.reasoningEffort}
              onChange={value =>
                setForm(current => ({
                  ...current,
                  reasoningEffort: value,
                }))
              }
            />
          </label>
        </div>

        <label className="grid gap-2">
          <Label htmlFor="system-prompt">模拟面试系统提示词</Label>
          <Textarea
            id="system-prompt"
            value={form.systemPrompt}
            className="min-h-52 font-mono text-sm leading-6"
            onChange={event =>
              setForm(current => ({
                ...current,
                systemPrompt: event.target.value,
              }))
            }
          />
        </label>

        {feedback ? (
          <p
            className={`text-sm ${
              feedback.kind === "success" ? "text-success" : "text-destructive"
            }`}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isTesting || isSaving}
            onClick={testConnection}
          >
            {isTesting ? <LoaderCircle className="animate-spin" /> : null}
            测试连接
          </Button>
          <Button type="submit" disabled={isSaving || isTesting}>
            {isSaving ? <LoaderCircle className="animate-spin" /> : null}
            保存设置
          </Button>
        </div>
      </div>
    </form>
  );
}

function ReasoningEffortSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ReasoningEffort;
  onChange: (value: ReasoningEffort) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={event => onChange(event.target.value as ReasoningEffort)}
      className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
    >
      {reasoningEfforts.map(effort => (
        <option key={effort} value={effort}>
          {reasoningEffortLabels[effort]}
        </option>
      ))}
    </select>
  );
}

function DataManagement() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<Feedback>();
  const [isBusy, setIsBusy] = useState(false);

  const exportData = async () => {
    setIsBusy(true);
    try {
      const backup = await createLocalBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `devrusher-backup-${getLocalDateKey()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback({ kind: "success", message: "备份已导出，不包含 API Key。" });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "导出失败",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const importData = async (file: File) => {
    setIsBusy(true);
    try {
      await restoreLocalBackup(JSON.parse(await file.text()) as unknown);
      window.location.reload();
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error ? `导入失败：${error.message}` : "导入失败",
      });
      setIsBusy(false);
    }
  };

  const clearData = async () => {
    const confirmed = window.confirm(
      "确定清空当前浏览器中的学习进度、复习记录、学习计划、面试记录和模型设置吗？此操作不可撤销。"
    );
    if (!confirmed) return;

    setIsBusy(true);
    try {
      await clearAllLocalData();
      window.location.reload();
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "清空失败",
      });
      setIsBusy(false);
    }
  };

  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">本地数据</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          学习进度、收藏、复习记录、学习计划、模拟面试和设置只在当前浏览器。清理网站数据后无法自动恢复。
        </p>
        <div className="mt-5 grid gap-2">
          <Button variant="secondary" disabled={isBusy} onClick={exportData}>
            <Download aria-hidden="true" /> 导出备份
          </Button>
          <Button
            variant="secondary"
            disabled={isBusy}
            onClick={() => fileInput.current?.click()}
          >
            <Upload aria-hidden="true" /> 导入备份
          </Button>
          <input
            ref={fileInput}
            type="file"
            aria-label="选择本地备份文件"
            accept="application/json,.json"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void importData(file);
            }}
          />
          <Button variant="danger" disabled={isBusy} onClick={clearData}>
            <Trash2 aria-hidden="true" /> 清空本地数据
          </Button>
        </div>
        {feedback ? (
          <p
            className={`mt-3 text-xs leading-5 ${
              feedback.kind === "success" ? "text-success" : "text-destructive"
            }`}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">隐私边界</h2>
        <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
          <li>API Key 不进入导出文件。</li>
          {isLocalDevelopment ? (
            <li>开发代理只在当前机器运行，生产构建默认禁用。</li>
          ) : null}
          <li>简历只在浏览器解析；发送前可编辑并确认文本。</li>
          <li>不提供账号与跨设备同步。</li>
        </ul>
        <Link
          href="/interview"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          前往模拟面试 <ExternalLink className="size-3" aria-hidden="true" />
        </Link>
      </section>
    </aside>
  );
}
