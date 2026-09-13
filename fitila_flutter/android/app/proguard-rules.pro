# Le service IME est instancié par Android depuis le manifeste.
-keep class com.fitila.bariba.BaribaInputMethodService { *; }
-keep class com.fitila.bariba.BaribaDictionary { *; }
-keep class com.fitila.bariba.BaribaDictionary$* { *; }

# L'application n'utilise pas les modules différés du Play Store. Ces classes
# facultatives sont référencées par l'embedding Flutter mais absentes d'un APK.
-dontwarn com.google.android.play.core.splitcompat.SplitCompatApplication
-dontwarn com.google.android.play.core.splitinstall.SplitInstallException
-dontwarn com.google.android.play.core.splitinstall.SplitInstallManager
-dontwarn com.google.android.play.core.splitinstall.SplitInstallManagerFactory
-dontwarn com.google.android.play.core.splitinstall.SplitInstallRequest$Builder
-dontwarn com.google.android.play.core.splitinstall.SplitInstallRequest
-dontwarn com.google.android.play.core.splitinstall.SplitInstallSessionState
-dontwarn com.google.android.play.core.splitinstall.SplitInstallStateUpdatedListener
-dontwarn com.google.android.play.core.tasks.OnFailureListener
-dontwarn com.google.android.play.core.tasks.OnSuccessListener
-dontwarn com.google.android.play.core.tasks.Task
