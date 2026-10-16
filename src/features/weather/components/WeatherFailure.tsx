import * as stylex from "@stylexjs/stylex";
import { CloudOff } from "lucide-react";
import { copy } from "@/copy";
import { SourceFailure } from "@/ui/SourceFailure";
import { WeatherBlock } from "./WeatherBlock";

type WeatherFailureProps = {
  location: string;
  minutes: number;
  onRetry: () => void;
};

const styles = stylex.create({
  failure: { gap: 32 },
});

export function WeatherFailure({ location, minutes, onRetry }: WeatherFailureProps) {
  return (
    <WeatherBlock>
      <SourceFailure
        icon={CloudOff}
        eyebrow={location}
        title={copy.weather.failed.title}
        body={copy.weather.failed.body(minutes)}
        retryLabel={copy.weather.failed.retry}
        onRetry={onRetry}
        size="lg"
        xstyle={styles.failure}
      />
    </WeatherBlock>
  );
}
