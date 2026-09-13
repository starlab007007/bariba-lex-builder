allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
    // Certains plugins Flutter ne déclarent pas encore leurs sources générées
    // conformément au suivi incrémental strict de Gradle 9. Désactiver ce suivi
    // uniquement pour leurs tâches Kotlin évite les lectures d'inputs refusées,
    // sans désactiver R8, le shrink des ressources ou les optimisations release.
    tasks.matching {
        name.startsWith("compile") && name.endsWith("Kotlin")
    }.configureEach {
        doNotTrackState("Compatibilité plugins Flutter avec Gradle 9")
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
