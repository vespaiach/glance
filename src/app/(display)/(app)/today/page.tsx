import { Suspense } from "react";
import { TodayScreen } from "@/features/today";

export default function TodayPage() {
  return (
    <Suspense>
      <TodayScreen />
    </Suspense>
  );
}
