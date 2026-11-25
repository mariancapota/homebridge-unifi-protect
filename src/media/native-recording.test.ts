import { H264Level, H264Profile, MediaContainerType, VideoCodecType } from "homebridge-plugin-utils";
import { canCopyRecording, nativeLiveFormat, nativeRecordingFormat } from "./native-recording.ts";
import { makeChannelProfile, makeTestCameraHost } from "./testing.helpers.ts";
import type { CameraRecordingConfiguration } from "homebridge";
import type { LivestreamDescription } from "unifi-protect";
import assert from "node:assert/strict";
import { test } from "node:test";

test("recording copy requires the actual H.264 init, channel and selected recording parameters to agree", () => {

  const { controller, host } = makeTestCameraHost();

  try {

    const channel = makeChannelProfile(host);

    channel.channel = { ...channel.channel, bitrate: 2000000, fps: 30, height: 720, idrInterval: 4, width: 1280 };

    const track = { codec: "h264", height: 720, id: 1, kind: "video", level: 31, profile: 77, width: 1280 } as const;
    const description: LivestreamDescription = { tracks: [track] };
    const format = nativeRecordingFormat(description, channel);
    const selected: Pick<CameraRecordingConfiguration, "mediaContainerConfiguration" | "videoCodec"> = {

      mediaContainerConfiguration: { fragmentLength: 4000, type: MediaContainerType.FRAGMENTED_MP4 },
      videoCodec: { parameters: { bitRate: 2000, iFrameInterval: 4000, level: H264Level.LEVEL3_1, profile: H264Profile.MAIN },
        resolution: [ 1280, 720, 30 ], type: VideoCodecType.H264 }
    };

    assert.equal(nativeLiveFormat({ tracks: [{ ...track, profile: 100 }] }, channel)?.profile, H264Profile.HIGH);
    assert.equal(nativeLiveFormat({ tracks: [{ ...track, level: 41 }] }, channel), null);
    const lowerRate = { ...selected, videoCodec: { ...selected.videoCodec, parameters: { ...selected.videoCodec.parameters, bitRate: 1600 } } };

    assert.equal(canCopyRecording(format, lowerRate), false);
    assert.ok(canCopyRecording(format, lowerRate, "1600/2000"));
    assert.equal(canCopyRecording(format, lowerRate, "1600/3000"), false);
    assert.ok(format);
    assert.ok(canCopyRecording(format, selected));
    assert.equal(nativeRecordingFormat({ tracks: [{ ...track, width: 1920 }] }, channel), null);
    assert.equal(nativeRecordingFormat({ tracks: [{ ...track, codec: "h265" }] }, channel), null);
    assert.equal(canCopyRecording({ ...format, bitrate: 3000 }, selected), false);
    assert.equal(canCopyRecording({ ...format, gopMs: 5000 }, selected), false);
    assert.equal(canCopyRecording({ ...format, level: H264Level.LEVEL4_0 }, selected), false);
    assert.equal(canCopyRecording({ ...format, resolution: [ 1920, 1080, 30 ] }, selected), false);
  } finally {

    controller.abort();
  }
});
