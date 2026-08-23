import { notFound } from "next/navigation";

import { getFinancialEventDetail } from "@/lib/data/activity-detail";

import { FinancialEventDetail } from "./financial-event-detail";

interface FinancialEventDetailServerProps {
  businessId: string | null;
  eventId: string;
}

export async function FinancialEventDetailServer({
  businessId,
  eventId,
}: FinancialEventDetailServerProps) {
  const detail = await getFinancialEventDetail(businessId, eventId);
  if (!detail) {
    notFound();
  }

  return <FinancialEventDetail detail={detail} />;
}
