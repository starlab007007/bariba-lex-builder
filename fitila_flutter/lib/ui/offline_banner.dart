import 'package:flutter/material.dart';

import '../core/offline.dart';
import '../core/signature_theme.dart';

/// Bandeau discret : « Hors connexion » ou « n modifications à synchroniser ».
/// Invisible quand tout est à jour.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([FitilaOffline.online, FitilaOffline.pending]),
      builder: (context, _) {
        final online = FitilaOffline.online.value;
        final pending = FitilaOffline.pending.value;
        final show = !online || pending > 0;
        return AnimatedSize(
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: !show
              ? const SizedBox(width: double.infinity)
              : Padding(
                  padding: const EdgeInsets.fromLTRB(14, 4, 14, 6),
                  child: Material(
                    color: online ? SignatureTheme.goldTint : SignatureTheme.sageTint,
                    borderRadius: BorderRadius.circular(99),
                    child: InkWell(
                      key: const ValueKey('offline-banner'),
                      borderRadius: BorderRadius.circular(99),
                      onTap: FitilaOffline.refresh,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        child: Row(
                          children: [
                            Icon(online ? Icons.sync_rounded : Icons.cloud_off_rounded, size: 16, color: online ? SignatureTheme.goldDeep : SignatureTheme.sage),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                !online
                                    ? (pending > 0 ? 'Hors connexion · $pending modification${pending > 1 ? 's' : ''} sera${pending > 1 ? 'ont' : ''} envoyée${pending > 1 ? 's' : ''} au retour du réseau' : 'Hors connexion · tout reste disponible sur l’appareil')
                                    : 'Synchronisation de $pending modification${pending > 1 ? 's' : ''}…',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: online ? SignatureTheme.goldDeep : SignatureTheme.sage),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
        );
      },
    );
  }
}
