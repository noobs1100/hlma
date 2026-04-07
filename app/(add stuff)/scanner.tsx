import { router, useLocalSearchParams } from "expo-router";

import AddStuffScannerModal from "@/components/AddStuffScannerModal";
import { AddStuffKind } from "@/lib/addStuffScanner";

export default function AddStuffScannerScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = params.kind === "b" ? "b" : ("r" as AddStuffKind);

  return (
    <AddStuffScannerModal
      kind={kind}
      onClose={() => router.back()}
      onScan={(result) => {
        console.log("Scanned add-stuff code:", result);
      }}
    />
  );
}
