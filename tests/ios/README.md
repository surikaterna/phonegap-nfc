# Native iOS checks

Use Node.js 18+ to run `npm run test:ios`. For native syntax validation on macOS
with Xcode and an installed Cordova iOS SDK:

```sh
CORDOVA_IOS_HEADERS=/path/to/cordova-ios/CordovaLib/include npm run test:ios
```

The compiler check targets iOS 16.0 and uses the actual plugin source. The
manifest checks verify default TAG-only entitlements in Debug and Release,
without overriding a host's deployment target. The explicit NDEF option is
only for legacy hosts and SDKs; it is not a modern App Store workaround.

NFC read/write, cancellation, permissions and tag-specific behavior must still
be tested on a supported physical device. These changes do not modify Android
or the runtime JavaScript API, and do not bump the package version.
