"use client";

import dynamic from "next/dynamic";
import KevalPlayerLoading from "./KevalPlayerLoading";

const KevalPlayer = dynamic(() => import("@/components/KevalPlayer"), {
  ssr: false,
  loading: () => <KevalPlayerLoading />,
});

export default function KevalPlayerEntry() {
  return <KevalPlayer />;
}
