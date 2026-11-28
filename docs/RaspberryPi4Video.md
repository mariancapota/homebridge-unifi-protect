# Raspberry Pi 4 video roadmap

The experimental branch explores two ways to reduce the cost of delivering Protect video to Apple Home. Evaluate live viewing and HomeKit Secure Video (HKSV) recording separately because each negotiates its own video parameters.

1. **Use the camera's H.264 stream directly when possible.** The branch already implements this path. Match the camera channel to the negotiated format and keep any compatibility override scoped to the tested case. Verify live playback and the playback of a recorded event with audio. Confirm video stream copy in the FFmpeg arguments.
2. **Evaluate hardware acceleration when video conversion is required.** This is planned work. Use a request that actually requires conversion on the Pi 4. Identify which stages use hardware for decoding, resizing and encoding on the tested OS and FFmpeg build. Compare with software conversion using the same source and target. Record CPU load, temperature, startup time, and any playback or recording errors. Test repeated live sessions and multiple HKSV clips with audio before enabling a hardware path for either use.

Prefer stream copy wherever it works. When conversion is necessary, use a hardware path once validated for that use case, with software conversion as the fallback.
