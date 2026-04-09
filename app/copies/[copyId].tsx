import { useLocalSearchParams } from "expo-router";

import CopyDetailsScreen from "@/components/CopyDetailsScreen";

export default function ScanCopyDetailsScreen() {
  const params = useLocalSearchParams<{ copyId?: string }>();
  const copyId = typeof params.copyId === "string" ? params.copyId : null;

  return <CopyDetailsScreen copyId={copyId} showBackButton />;
}
