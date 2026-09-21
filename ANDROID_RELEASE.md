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
