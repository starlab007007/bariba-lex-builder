import 'package:flutter/material.dart';

import '../ui/reference_creation_ui.dart';
import 'handunia_consultation_ui.dart';
import 'handunia_map_data.dart';
import 'handunia_territory_repository.dart';

class HanduniaTerritoryPickerRoute extends StatefulWidget {
  const HanduniaTerritoryPickerRoute({super.key});

  @override
  State<HanduniaTerritoryPickerRoute> createState() =>
      _HanduniaTerritoryPickerRouteState();
}

class _HanduniaTerritoryPickerRouteState
    extends State<HanduniaTerritoryPickerRoute> {
  final TextEditingController _village = TextEditingController();

  List<String> _departments = const <String>[];
  List<String> _communes = const <String>[];
  List<String> _arrondissements = const <String>[];

  String? _department;
  String? _commune;
  String? _arrondissement;
  bool _loading = true;
  bool _resolving = false;
  String? _notice;

  @override
  void initState() {
    super.initState();
    _loadDepartments();
  }

  @override
  void dispose() {
    _village.dispose();
    super.dispose();
  }

  Future<void> _loadDepartments() async {
    try {
      final values = await HanduniaTerritoryRepository.departments();
      if (!mounted) return;
      setState(() {
        _departments = values;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _notice = 'Le référentiel territorial local est indisponible.';
      });
    }
  }

  Future<void> _selectDepartment(String? value) async {
    if (value == null) return;
    setState(() {
      _department = value;
      _commune = null;
      _arrondissement = null;
      _communes = const <String>[];
      _arrondissements = const <String>[];
      _notice = null;
    });
    final values = await HanduniaTerritoryRepository.communes(value);
    if (!mounted || _department != value) return;
    setState(() => _communes = values);
  }

  Future<void> _selectCommune(String? value) async {
    final department = _department;
    if (value == null || department == null) return;
    setState(() {
      _commune = value;
      _arrondissement = null;
      _arrondissements = const <String>[];
      _notice = null;
    });
    final values = await HanduniaTerritoryRepository.arrondissements(
      department: department,
      commune: value,
    );
    if (!mounted || _commune != value) return;
    setState(() => _arrondissements = values);
  }

  void _selectArrondissement(String? value) {
    setState(() {
      _arrondissement = value;
      _notice = null;
    });
  }

  HanduniaTerritorySelection get _selection => HanduniaTerritorySelection(
        department: _department,
        commune: _commune,
        arrondissement: _arrondissement,
        villageQuartier: _village.text.trim().isEmpty
            ? null
            : _village.text.trim(),
      );

  Future<void> _resolve() async {
    if (_department == null || _resolving) {
      if (_department == null) {
        setState(() => _notice = 'Choisissez au moins un département.');
      }
      return;
    }

    final selection = _selection;
    setState(() {
      _resolving = true;
      _notice = 'Positionnement sur la carte du Bénin…';
    });

    try {
      final results = await HanduniaMapData.searchPlaces(selection.searchQuery);
      if (!mounted) return;

      final result = <String, dynamic>{
        'id': '__territory_focus__',
        'name': selection.mostSpecific,
        'display_name': selection.searchQuery,
        ...selection.toMap(),
        'memory_count': 0,
        'voice_count': 0,
        'can_open': false,
        'territory_focus': true,
        'zoom_hint': selection.villageQuartier != null
            ? 14.2
            : selection.arrondissement != null
                ? 12.2
                : selection.commune != null
                    ? 10.2
                    : 8.0,
      };

      if (results.isNotEmpty) {
        final geocoded = results.first;
        result.addAll(<String, dynamic>{
          'latitude': geocoded['latitude'],
          'longitude': geocoded['longitude'],
          'osm_id': geocoded['osm_id'],
          'osm_type': geocoded['osm_type'],
          'geo_provider': geocoded['geo_provider'],
          'extent': geocoded['extent'],
        });
      } else {
        result['geo_unresolved'] = true;
      }

      if (mounted) Navigator.of(context).pop(result);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _notice =
            'Le territoire est sélectionné, mais son centrage cartographique '
            'nécessite le réseau. Vous pouvez réessayer.';
      });
    } finally {
      if (mounted) setState(() => _resolving = false);
    }
  }

  InputDecoration _decoration(String label) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(
          fontFamily: 'Karla',
          color: HanduniaTokens.cendre,
        ),
        filled: true,
        fillColor: HanduniaTokens.nuitPortee,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15),
          borderSide: const BorderSide(color: HanduniaTokens.bordureForte),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15),
          borderSide: const BorderSide(color: HanduniaTokens.bordureForte),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      bottomNavigationBar: const FitilaBridgedBottomNav(selectedIndex: 0),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 12, 4),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.arrow_back_rounded),
                    color: HanduniaTokens.ivoire,
                  ),
                  const SizedBox(width: 4),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Explorer le Bénin',
                          style: TextStyle(
                            fontFamily: 'Fraunces',
                            fontWeight: FontWeight.w600,
                            fontSize: 23,
                            color: HanduniaTokens.ivoire,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Département → commune → arrondissement → village / quartier',
                          style: TextStyle(
                            fontFamily: 'Karla',
                            fontSize: 11.5,
                            color: HanduniaTokens.cendre,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: HanduniaTokens.braise,
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      children: [
                        const _TerritoryInfoCard(),
                        const SizedBox(height: 14),
                        DropdownButtonFormField<String>(
                          initialValue: _department,
                          isExpanded: true,
                          dropdownColor: HanduniaTokens.nuitPortee,
                          style: const TextStyle(
                            fontFamily: 'Karla',
                            color: HanduniaTokens.ivoire,
                            fontWeight: FontWeight.w700,
                          ),
                          decoration: _decoration('1. Département'),
                          items: _departments
                              .map(
                                (value) => DropdownMenuItem<String>(
                                  value: value,
                                  child: Text(value),
                                ),
                              )
                              .toList(growable: false),
                          onChanged: _selectDepartment,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: _commune,
                          isExpanded: true,
                          dropdownColor: HanduniaTokens.nuitPortee,
                          style: const TextStyle(
                            fontFamily: 'Karla',
                            color: HanduniaTokens.ivoire,
                            fontWeight: FontWeight.w700,
                          ),
                          decoration: _decoration('2. Commune'),
                          items: _communes
                              .map(
                                (value) => DropdownMenuItem<String>(
                                  value: value,
                                  child: Text(value),
                                ),
                              )
                              .toList(growable: false),
                          onChanged:
                              _department == null ? null : _selectCommune,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: _arrondissement,
                          isExpanded: true,
                          dropdownColor: HanduniaTokens.nuitPortee,
                          style: const TextStyle(
                            fontFamily: 'Karla',
                            color: HanduniaTokens.ivoire,
                            fontWeight: FontWeight.w700,
                          ),
                          decoration: _decoration('3. Arrondissement'),
                          items: _arrondissements
                              .map(
                                (value) => DropdownMenuItem<String>(
                                  value: value,
                                  child: Text(value),
                                ),
                              )
                              .toList(growable: false),
                          onChanged:
                              _commune == null ? null : _selectArrondissement,
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _village,
                          onChanged: (_) => setState(() => _notice = null),
                          textCapitalization: TextCapitalization.words,
                          style: const TextStyle(
                            fontFamily: 'Karla',
                            color: HanduniaTokens.ivoire,
                            fontWeight: FontWeight.w700,
                          ),
                          decoration: _decoration(
                            '4. Village / quartier (facultatif)',
                          ).copyWith(
                            hintText: 'Ex. Tasso, Banigourou…',
                            hintStyle: const TextStyle(
                              fontFamily: 'Karla',
                              color: HanduniaTokens.cendre,
                            ),
                            prefixIcon: const Icon(Icons.location_on_outlined),
                          ),
                        ),
                        if (_notice != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            _notice!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontFamily: 'Karla',
                              color: HanduniaTokens.cendre,
                              fontSize: 12.5,
                              height: 1.35,
                            ),
                          ),
                        ],
                        const SizedBox(height: 18),
                        SizedBox(
                          height: 50,
                          child: FilledButton.icon(
                            onPressed: _resolving ? null : _resolve,
                            style: FilledButton.styleFrom(
                              backgroundColor: HanduniaTokens.braise,
                              foregroundColor: HanduniaTokens.encre,
                            ),
                            icon: _resolving
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: HanduniaTokens.encre,
                                    ),
                                  )
                                : const Icon(Icons.map_rounded),
                            label: Text(
                              _resolving
                                  ? 'POSITIONNEMENT…'
                                  : 'AFFICHER SUR LA CARTE',
                              style: const TextStyle(
                                fontFamily: 'Karla',
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TerritoryInfoCard extends StatelessWidget {
  const _TerritoryInfoCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: HanduniaTokens.nuitPortee,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: HanduniaTokens.bordureForte),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.account_tree_rounded, color: HanduniaTokens.braise),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Référentiel embarqué : 12 départements, 77 communes et '
              '546 arrondissements. Le village ou quartier est ensuite '
              'positionné sur la carte réelle.',
              style: TextStyle(
                fontFamily: 'Karla',
                color: HanduniaTokens.cendre,
                fontSize: 12.5,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
