"use client";

import { LayoutGroup } from "framer-motion";
import FullPlayer from "./FullPlayer";
import MediaSessionManager from "./MediaSessionManager";
import MiniPlayer from "./MiniPlayer";
import QueueDrawer from "./QueueDrawer";

export default function GlobalPlayer() {
  return (
    <LayoutGroup id="keval-global-player">
      <MediaSessionManager />
      <MiniPlayer />
      <FullPlayer />
      <QueueDrawer />
    </LayoutGroup>
  );
}
