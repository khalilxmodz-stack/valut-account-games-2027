# Vault Accounts – Android app (WebView)

Your original website is packaged **unchanged** inside the APK
(`app/src/main/assets/`) and loaded locally from `file:///android_asset/index.html`.

- Package: `com.khalilxmodz.myapp` · minSdk 23 · target/compile SDK 35 · Java 17 · AGP 8.7.3 · Gradle 8.9
- Build: GitHub Actions (`.github/workflows/build.yml`) → artifact **MyApp-Android-APK**
- App name: edit `app/src/main/res/values/strings.xml` (`app_name`)
- Update the website: replace files in `app/src/main/assets/`, commit, push.
- Ads / remote images: uncomment `INTERNET` in `AndroidManifest.xml`.
- Disable fullscreen: remove `hideSystemBars()` calls in `MainActivity.java`.
