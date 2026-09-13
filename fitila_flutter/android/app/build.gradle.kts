import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val fitilaSigningProperties = Properties()
val fitilaSigningFile = rootProject.file("../../android/app/signing.properties")
val fitilaReleaseKeystore = rootProject.file("../../.keystore/fitila-release.jks")
if (fitilaSigningFile.exists()) {
    FileInputStream(fitilaSigningFile).use(fitilaSigningProperties::load)
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
        applicationId = "bj.fitila.fitila_native"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (fitilaSigningFile.exists() && fitilaReleaseKeystore.exists()) {
            create("fitilaRelease") {
                storeFile = fitilaReleaseKeystore
                storePassword = fitilaSigningProperties.getProperty("storePassword")
                keyAlias = fitilaSigningProperties.getProperty("keyAlias")
                keyPassword = fitilaSigningProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.findByName("fitilaRelease")
                ?: signingConfigs.getByName("debug")
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
