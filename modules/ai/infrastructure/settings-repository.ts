import {
  getRecord,
  localStores,
  putRecord,
} from "@/modules/local-data/infrastructure/database";
import {
  aiSettingsSchema,
  defaultAiSettings,
  type AiSettings,
} from "../domain/settings";

const AI_SETTINGS_KEY = "ai-settings";

interface StoredSettings {
  key: typeof AI_SETTINGS_KEY;
  value: AiSettings;
}

export async function getAiSettings(): Promise<AiSettings> {
  const stored = await getRecord<StoredSettings>(
    localStores.settings,
    AI_SETTINGS_KEY
  );
  const parsed = aiSettingsSchema.safeParse(stored?.value);
  return parsed.success ? parsed.data : defaultAiSettings;
}

export function saveAiSettings(value: AiSettings): Promise<void> {
  return putRecord<StoredSettings>(localStores.settings, {
    key: AI_SETTINGS_KEY,
    value: aiSettingsSchema.parse(value),
  });
}
