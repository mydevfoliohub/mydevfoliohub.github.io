# Android release signing

Production updates for `io.mydevfoliohub.app` must always use the same private signing key. A differently signed APK cannot update an installed copy and Android reports that the app was not installed.

Create `android/keystore.properties` locally with these fields:

```properties
storeFile=C:/private/path/deviloq-release.jks
storePassword=your-private-password
keyAlias=deviloq
keyPassword=your-private-password
```

Both `android/keystore.properties` and keystore files are ignored by Git. Keep an offline backup; losing the key prevents future updates to existing installations.

Build the signed APK on Windows with:

```text
npm run mobile:release-apk
```

The output is `android/app/build/outputs/apk/release/app-release.apk`. The GitHub Actions workflow intentionally produces testing-only debug artifacts because a shared release key is not stored in the repository.

## One-time update from Android v2.3.1 without uninstalling

`Deviloq-Android-v2.3.1-debug.apk` used the Android debug signing certificate. The regular v2.3.4 release APK uses the stable release certificate, so Android rejects a direct update with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

On Android 9 or newer, install `Deviloq-v2.3.4-update-without-uninstall.apk` over v2.3.1 once. This APK contains an Android signing certificate lineage from the old debug certificate to the stable release certificate, with installed-data migration enabled. It keeps the package ID and uses `versionCode 5`. After that update, the regular stable-signed APK is accepted; future releases must continue using the stable release key and increasing version codes.

The transition was tested on an Android 15 emulator: v2.3.1 debug to the transition APK succeeded without uninstalling; an app-data marker remained; installing the regular v2.3.4 release APK afterward also succeeded and kept that marker. Signature verification passed for Android API levels 24, 28, 32, 33, and 35. Only the Android 9+ certificate rotation path is intended for this update. Keep the two v2.3.4 APKs clearly labeled so users of v2.3.1 choose the transition APK.

## Updating to v2.3.5

The v2.3.5 release APK uses the stable release certificate, package ID `io.mydevfoliohub.app`, and `versionCode 6`. It updates an installation already using the stable certificate. If the installed version is the original v2.3.1 debug APK, first install `Deviloq-v2.3.4-update-without-uninstall.apk` from the releases folder, then install the v2.3.5 release APK. Keep both APKs available for that one-time signing transition.

## Updating to v2.3.6

The v2.3.6 release APK keeps the stable release certificate and package ID `io.mydevfoliohub.app`, and increases `versionCode` to 7. It installs over v2.3.4 or v2.3.5 stable releases. An installation still signed with the original v2.3.1 debug certificate must first use the v2.3.4 one-time transition APK described above, then install v2.3.6.
