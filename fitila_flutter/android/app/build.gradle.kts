import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
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
        applicationId = "bj.fitila.fitila_native"
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
