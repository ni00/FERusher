"use client";

import { useEffect, useState } from "react";
import { defaultAiSettings, type AiSettings } from "../domain/settings";
import {
  getAiSettings,
  saveAiSettings,
} from "../infrastructure/settings-repository";

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(defaultAiSettings);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    getAiSettings()
      .then(value => {
        if (!active) return;
        setSettings(value);
        setIsReady(true);
      })
      .catch(error => {
        console.error("Failed to load AI settings", error);
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const persist = async (value: AiSettings) => {
    await saveAiSettings(value);
    setSettings(value);
  };

  return { settings, isReady, persist };
}
