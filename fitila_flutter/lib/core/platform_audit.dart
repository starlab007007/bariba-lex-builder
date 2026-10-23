import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'fitila_backend.dart';

/// Journal d'activité plateforme, consultable par les administrateurs
/// (écran « Journal d'activité », voir `lib/admin/platform_audit_screen.dart`)
/// via la table Supabase `platform_audit_log` : lecture réservée aux admins
/// (RLS `has_role(auth.uid(), 'admin')`), écriture limitée à ses propres
/// événements pour chaque utilisateur connecté.
///
/// Chaque appel est *best-effort* : hors ligne, non connecté, ou en cas
/// d'erreur réseau, l'écriture est silencieusement ignorée. Le journal
/// n'a jamais le droit de faire échouer la fonctionnalité qu'il observe —
/// c'est pourquoi [log] n'est jamais `await`é par ses appelants (voir les
/// usages dans `fitila_backend.dart` et `dunya_local_store.dart`).
class PlatformAudit {
  const PlatformAudit._();

  /// Regroupe les événements par domaine à l'écran admin (filtre).
  /// Valeurs utilisées dans l'app : 'auth', 'dictionary', 'dunya_voice'.
  static Future<void> log(
    String module,
    String eventType, {
    Map<String, dynamic> details = const {},
    String severity = 'info',
  }) async {
    if (!FitilaBackend.configured) return;
    try {
      final user = FitilaBackend.client.auth.currentUser;
      await FitilaBackend.client.from('platform_audit_log').insert({
        'actor': user?.id,
        'actor_label': _actorLabel(user),
        'module': module,
        'event_type': eventType,
        'severity': severity,
        'details': details,
        'client': _clientLabel(),
      });
    } catch (_) {
      // Jamais d'impact sur la fonctionnalité observée.
    }
  }

  static String? _actorLabel(User? user) {
    if (user == null) return null;
    final name = user.userMetadata?['display_name']?.toString().trim();
    if (name != null && name.isNotEmpty) return name;
    final email = user.email;
    return (email != null && email.isNotEmpty) ? email : null;
  }

  static String _clientLabel() {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'flutter_android';
      case TargetPlatform.iOS:
        return 'flutter_ios';
      default:
        return 'flutter_other';
    }
  }
}
