"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WidgetEmbed } from "@/components/navigator/WidgetEmbed";

function Widget() {
  const params = useSearchParams();
  const key = params.get("k");
  const chatHeaders = key ? { "x-widget-key": key } : undefined;
  return <WidgetEmbed chatHeaders={chatHeaders} />;
}

export default function WidgetPage() {
  return (
    <Suspense fallback={null}>
      <Widget />
    </Suspense>
  );
}
