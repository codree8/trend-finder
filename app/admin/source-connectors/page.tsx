import { SourceConnectorReadinessView } from "@/components/admin/SourceConnectorReadinessView";
import { getConnectorReadinessSummary } from "@/lib/scan/connector-readiness";

export const dynamic = "force-dynamic";

export default function SourceConnectorsPage() {
  return <SourceConnectorReadinessView readiness={getConnectorReadinessSummary()} />;
}
