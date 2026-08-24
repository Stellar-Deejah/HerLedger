import type { Metadata } from "next";

import { BusinessProfile } from "@/components/business/business-profile";

export const metadata: Metadata = { title: "Business Profile" };

export default function BusinessPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Business Profile
      </h1>
      <BusinessProfile />
    </div>
  );
}
