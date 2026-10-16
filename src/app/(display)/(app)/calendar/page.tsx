import { Suspense } from "react";
import { CalendarScreen } from "@/features/calendar";

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarScreen />
    </Suspense>
  );
}
