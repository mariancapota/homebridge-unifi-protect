import type { CameraRecordingConfiguration, Resolution } from "homebridge";
import { FfmpegOptions, H264Level, H264Profile } from "homebridge-plugin-utils";
import type { ChannelProfile } from "./resolution.ts";
import type { LivestreamDescription } from "unifi-protect";

interface NativeFormat {

  bitrate: number;
  gopMs: number;
  level: H264Level;
  resolution: Resolution;
}

const levels = new Map([ [ 31, H264Level.LEVEL3_1 ], [ 32, H264Level.LEVEL3_2 ], [ 40, H264Level.LEVEL4_0 ] ]);

export interface NativeLiveFormat {

  channel: ChannelProfile;
  level: H264Level;
  profile: H264Profile;
}

export function nativeLiveFormat(description: LivestreamDescription | undefined, channel: ChannelProfile): NativeLiveFormat | null {

  const track = description?.tracks.find((entry) => entry.kind === "video");

  if((track?.kind !== "video") || (track.codec !== "h264") || (track.width !== channel.channel.width) || (track.height !== channel.channel.height)) {

    return null;
  }

  const level = levels.get(track.level);
  const profile = new Map([ [ 66, H264Profile.BASELINE ], [ 77, H264Profile.MAIN ], [ 100, H264Profile.HIGH ] ]).get(track.profile);

  return ((profile !== undefined) && (level !== undefined)) ? { channel, level, profile } : null;
}

// The Protect channel describes the expected rate and GOP. The current fMP4 init describes the pixels and H.264 parameters actually sent.
export function nativeRecordingFormat(description: LivestreamDescription | undefined, profile: ChannelProfile | null): NativeFormat | null {

  const track = description?.tracks.find((entry) => entry.kind === "video");
  const channel = profile?.channel;

  if(!channel || (track?.kind !== "video") || (track.codec !== "h264") || (track.profile !== 77) ||
    (track.width !== channel.width) || (track.height !== channel.height) || (channel.fps <= 0) || (channel.bitrate <= 0) || (channel.idrInterval <= 0)) {

    return null;
  }

  const level = levels.get(track.level);

  if(level === undefined) {

    return null;
  }

  const resolution: Resolution = [ track.width, track.height, channel.fps ];

  return { bitrate: channel.bitrate / 1000, gopMs: channel.idrInterval * 1000, level, resolution };
}

export function canCopyRecording(format: NativeFormat | null,
  config: Pick<CameraRecordingConfiguration, "mediaContainerConfiguration" | "videoCodec">, testedBitratePair?: string): boolean {

  if(!format) {

    return false;
  }

  const video = config.videoCodec;

  const bitrateMatches = (format.bitrate <= video.parameters.bitRate) || (testedBitratePair === [ video.parameters.bitRate, format.bitrate ].join("/"));

  return format.resolution.every((value, i) => value === video.resolution[i]) && (video.parameters.profile === H264Profile.MAIN) &&
    (format.level <= video.parameters.level) && bitrateMatches &&
    (format.gopMs <= Math.min(config.mediaContainerConfiguration.fragmentLength, video.parameters.iFrameInterval));
}

// Reuse the stock fMP4 muxer, process lifetime, and audio negotiation. Only the video pipeline changes.
export class NativeRecordingOptions extends FfmpegOptions {

  public override videoDecoder(): string[] { return []; }

  public override recordEncoder(): string[] { return [ "-codec:v", "copy" ]; }
}
