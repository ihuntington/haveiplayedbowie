import __SNOWPACK_ENV__ from '../../../__snowpack__/env.js';
import.meta.env = __SNOWPACK_ENV__;

import {h} from "../../../web_modules/preact.js";
import {useEffect, useState} from "../../../web_modules/preact/hooks.js";
import {sendSegment} from "../../services.js";
const {SNOWPACK_PUBLIC_BBC_URL} = import.meta.env;
export const NowPlaying = () => {
  const [artist, setArtist] = useState("");
  const [track, setTrack] = useState("");
  const handlePostMessage = async (event) => {
    if (event.origin !== SNOWPACK_PUBLIC_BBC_URL || !event.data) {
      return;
    }
    if (event.data.type === "NO_CURRENT_TRACK") {
      setArtist("");
      setTrack("");
    }
    if (event.data.type === "NOW_PLAYING") {
      setArtist(event.data.segment.titles.primary);
      setTrack(event.data.segment.titles.secondary);
    }
    if (event.data.type === "PLAYED") {
      await sendSegment(event.data);
    }
  };
  useEffect(() => {
    window.addEventListener("message", handlePostMessage, false);
    return () => {
      window.removeEventListener("message", handlePostMessage);
    };
  });
  if (!track || !artist) {
    return null;
  }
  return /* @__PURE__ */ h("div", {
    className: "now-playing"
  }, /* @__PURE__ */ h("strong", null, "Now playing"), /* @__PURE__ */ h("div", {
    className: "now-playing__track-name"
  }, track), /* @__PURE__ */ h("div", {
    className: "now-playing__artist-name"
  }, artist));
};
