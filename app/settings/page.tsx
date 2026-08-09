import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/modules/settings/ui/settings-panel";

export const metadata: Metadata = { title: "设置与数据" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="设置与数据" />
      <SettingsPanel />
    </>
  );
}
