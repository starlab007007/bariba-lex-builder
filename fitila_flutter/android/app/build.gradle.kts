import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // AGP 9 is running in Flutter's legacy-KGP compatibility mode
    // (android.builtInKotlin=false), so the app must apply KGP explicitly
    // because MainActivity/KeyboardChannel contain Kotlin sources.
    id("org.jetbrains.kotlin.android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val fitilaSigningProperties = Properties()
val fitilaSigningFile = rootProject.file("key.properties")
if (fitilaSigningFile.exists()) {
    FileInputStream(fitilaSigningFile).use(fitilaSigningProperties::load)
}
val fitilaStoreFile = fitilaSigningProperties.getProperty("storeFile")
val fitilaReleaseKeystore = fitilaStoreFile?.let(rootProject::file)
val releaseSigningReady = fitilaSigningFile.exists() &&
    fitilaReleaseKeystore?.exists() == true &&
    !fitilaSigningProperties.getProperty("storePassword").isNullOrBlank() &&
    !fitilaSigningProperties.getProperty("keyAlias").isNullOrBlank() &&
    !fitilaSigningProperties.getProperty("keyPassword").isNullOrBlank()
// A temporary CI certificate cannot update an APK signed by an older CI key.
// Isolate validation builds so users can test without removing their app/data.
val parallelKeyboardValidation = fitilaSigningProperties.getProperty("parallelValidation") == "true"
val releaseRequested = gradle.startParameter.taskNames.any {
    it.contains("release", ignoreCase = true)
}

if (releaseRequested && !releaseSigningReady) {
    throw GradleException(
        "Release signing is not configured. Provide android/key.properties " +
            "and the referenced keystore; debug-signed release APKs are forbidden.",
    )
}

android {
    namespace = "bj.fitila.fitila_native"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = if (parallelKeyboardValidation) "bj.fitila.fitila_native.keyboardfix" else "bj.fitila.fitila_native"
        manifestPlaceholders["fitilaAppLabel"] = if (parallelKeyboardValidation) "FITILA — Clavier corrigé" else "FITILA"
        manifestPlaceholders["fitilaKeyboardLabel"] = if (parallelKeyboardValidation) "Baatɔnum FITILA — clavier corrigé" else "Clavier Baatɔnum FITILA"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (releaseSigningReady) {
            create("fitilaRelease") {
                storeFile = fitilaReleaseKeystore!!
                storePassword = fitilaSigningProperties.getProperty("storePassword")
                keyAlias = fitilaSigningProperties.getProperty("keyAlias")
                keyPassword = fitilaSigningProperties.getProperty("keyPassword")
            }
        }
    }

    testOptions { unitTests.isIncludeAndroidResources = true }

    // sherpa_onnx already ships libonnxruntime.so for offline Omnilingual
    // ASR / MMS-TTS. The separate ByT5 ONNX Java binding brings the same
    // SONAME. Android cannot package both; use one shared native runtime.
    // Mandatory smoke tests: sherpa audio and ByT5 encoder/decoder on device.
    packaging {
        jniLibs {
            pickFirsts.add("**/libonnxruntime.so")
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.findByName("fitilaRelease")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.16.1")
    // DUNYA cerveau hors ligne : Gemma via LiteRT-LM (Google AI Edge).
    implementation("com.google.ai.edge.litertlm:litertlm-android:latest.release")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    // Optional installed ByT5 model (not bundled in APK); runs on device CPU.
    implementation("com.microsoft.onnxruntime:onnxruntime-android:1.22.0")
}


// AGP 9 host-test packaging consumes Flutter assets as well as merged Android
// assets. Flutter does not declare this host-test edge; Gradle 9 validates it.
tasks.configureEach {
    if (name == "packageDebugUnitTestForUnitTest") {
        dependsOn("copyFlutterAssetsDebug")
    }
}
