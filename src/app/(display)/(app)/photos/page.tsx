import { Suspense } from "react";
import { PhotosScreen } from "@/features/photos";

export default function PhotosPage() {
  return (
    <Suspense>
      <PhotosScreen />
    </Suspense>
  );
}
