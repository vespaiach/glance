import * as stylex from "@stylexjs/stylex";
import { Image, Upload } from "lucide-react";
import { copy } from "@/copy";
import { type } from "@/theme/type.stylex";
import { Button } from "@/ui/Button";
import { ColorBlock } from "@/ui/ColorBlock";
import { Eyebrow } from "@/ui/Eyebrow";
import { Icon } from "@/ui/Icon";
import { OfflinePill } from "@/ui/OfflinePill";

type PhotosEmptyProps = {
  online: boolean;
  canUpload: boolean;
  onUpload: () => void;
};

const styles = stylex.create({
  root: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
  },
  block: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 28,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  title: {
    margin: 0,
    fontSize: type.displayXlSize,
    fontWeight: 340,
    letterSpacing: "-1px",
    lineHeight: 1.05,
  },
  body: {
    fontSize: 18,
    fontWeight: 330,
    lineHeight: 1.45,
    maxWidth: 520,
    textWrap: "pretty",
  },
});

export function PhotosEmpty({ online, canUpload, onUpload }: PhotosEmptyProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <ColorBlock tone="soft" padding="clamp(28px, 3.2vw, 48px)" xstyle={styles.block}>
        <Icon icon={Image} size={56} strokeWidth={1.25} />
        <div {...stylex.props(styles.text)}>
          <Eyebrow>{copy.photos.count(0)}</Eyebrow>
          <h2 {...stylex.props(styles.title)}>{copy.photos.emptyTitle}</h2>
          <span {...stylex.props(styles.body)}>{copy.photos.emptyBody}</span>
        </div>
        {canUpload && (
          <Button icon={Upload} disabled={!online} onClick={onUpload}>
            {copy.photos.uploadPhotos}
          </Button>
        )}
        {canUpload && !online && <OfflinePill label={copy.photos.row.offline} />}
      </ColorBlock>
    </div>
  );
}
