import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import 'handunia_consultation_ui.dart';
import 'handunia_map_data.dart';

const String handuniaMapStyleUrl =
    'https://tiles.openfreemap.org/styles/liberty';
const LatLng handuniaBeninCenter = LatLng(9.3077, 2.3158);

double? _geoDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '');
}

String _geoText(Map<String, dynamic> place, String key) =>
    place[key]?.toString().trim() ?? '';

List<String> handuniaTerritorySegments(Map<String, dynamic>? place) {
  if (place == null) return const <String>['Bénin'];
  final values = <String>[
    'Bénin',
    _geoText(place, 'department'),
    _geoText(place, 'commune'),
    _geoText(place, 'arrondissement'),
    _geoText(place, 'village_quartier'),
  ];
  final result = <String>[];
  for (final value in values) {
    if (value.isEmpty) continue;
    if (result.any((item) => item.toLowerCase() == value.toLowerCase())) {
      continue;
    }
    result.add(value);
  }
  return result;
}

class HanduniaTerritoryPath extends StatelessWidget {
  const HanduniaTerritoryPath({
    super.key,
    required this.place,
    this.compact = false,
  });

  final Map<String, dynamic>? place;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final segments = handuniaTerritorySegments(place);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < segments.length; i++) ...[
            if (i > 0)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Icon(
                  Icons.chevron_right_rounded,
                  size: 16,
                  color: HanduniaTokens.cendre,
                ),
              ),
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: compact ? 8 : 10,
                vertical: compact ? 5 : 6,
              ),
              decoration: BoxDecoration(
                color: i == segments.length - 1
                    ? HanduniaTokens.braise.withValues(alpha: .15)
                    : HanduniaTokens.nuitPortee.withValues(alpha: .92),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: i == segments.length - 1
                      ? HanduniaTokens.braise.withValues(alpha: .72)
                      : HanduniaTokens.bordureForte,
                ),
              ),
              child: Text(
                segments[i],
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: 'Karla',
                  fontWeight: FontWeight.w700,
                  fontSize: compact ? 11.5 : 12.5,
                  color: i == segments.length - 1
                      ? HanduniaTokens.braise
                      : HanduniaTokens.ivoire,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class HanduniaUnifiedMap extends StatefulWidget {
  const HanduniaUnifiedMap({
    super.key,
    required this.places,
    this.selectedPlaceId,
    this.onSelected,
    this.onOpen,
    this.height = 430,
    this.showSelectionCard = true,
    this.initialZoom = 6.4,
  });

  final List<Map<String, dynamic>> places;
  final String? selectedPlaceId;
  final ValueChanged<Map<String, dynamic>>? onSelected;
  final ValueChanged<Map<String, dynamic>>? onOpen;
  final double height;
  final bool showSelectionCard;
  final double initialZoom;

  @override
  State<HanduniaUnifiedMap> createState() => _HanduniaUnifiedMapState();
}

class _HanduniaUnifiedMapState extends State<HanduniaUnifiedMap> {
  MapLibreMapController? _controller;
  bool _styleLoaded = false;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _selectedId = widget.selectedPlaceId;
  }

  @override
  void didUpdateWidget(covariant HanduniaUnifiedMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedPlaceId != oldWidget.selectedPlaceId) {
      _selectedId = widget.selectedPlaceId;
    }
    if (_styleLoaded &&
        (widget.places != oldWidget.places ||
            widget.selectedPlaceId != oldWidget.selectedPlaceId)) {
      unawaited(_renderPlaces());
    }
  }

  List<Map<String, dynamic>> get _located => widget.places
      .where(
        (place) =>
            _geoDouble(place['latitude']) != null &&
            _geoDouble(place['longitude']) != null,
      )
      .toList(growable: false);

  Map<String, dynamic>? get _selected {
    final id = _selectedId;
    if (id == null) return null;
    for (final place in widget.places) {
      if (place['id']?.toString() == id) return place;
    }
    return null;
  }

  Future<void> _onStyleLoaded() async {
    _styleLoaded = true;
    await _renderPlaces();
    final selected = _selected;
    if (selected != null) {
      await _focus(selected, zoom: 13.2);
    }
  }

  Future<void> _renderPlaces() async {
    final controller = _controller;
    if (controller == null || !_styleLoaded) return;
    await controller.clearCircles();
    final options = <CircleOptions>[];
    for (final place in _located) {
      final lat = _geoDouble(place['latitude'])!;
      final lon = _geoDouble(place['longitude'])!;
      final voices = (place['voice_count'] as num?)?.toInt() ?? 0;
      final memories = (place['memory_count'] as num?)?.toInt() ?? 0;
      final selected = place['id']?.toString() == _selectedId;
      final weight =
          math.max(voices, memories).clamp(0, 20).toDouble();
      options.add(
        CircleOptions(
          geometry: LatLng(lat, lon),
          circleRadius: selected ? 12 : 7.5 + weight * .22,
          circleColor: selected ? '#F3EFE6' : '#E6AA4A',
          circleStrokeColor: selected ? '#E6AA4A' : '#15202B',
          circleStrokeWidth: selected ? 4 : 2,
        ),
      );
    }
    if (options.isNotEmpty) {
      await controller.addCircles(options);
    }
  }

  Future<void> _focus(
    Map<String, dynamic> place, {
    double zoom = 12.8,
  }) async {
    final controller = _controller;
    final lat = _geoDouble(place['latitude']);
    final lon = _geoDouble(place['longitude']);
    if (controller == null || lat == null || lon == null) return;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: LatLng(lat, lon), zoom: zoom),
      ),
    );
  }

  Future<void> _focusBenin() async {
    final controller = _controller;
    if (controller == null) return;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: handuniaBeninCenter, zoom: widget.initialZoom),
      ),
    );
  }

  Future<void> _select(Map<String, dynamic> place) async {
    setState(() => _selectedId = place['id']?.toString());
    await _renderPlaces();
    await _focus(place);
    widget.onSelected?.call(place);
  }

  Future<void> _onMapTap(LatLng point) async {
    if (_located.isEmpty) return;
    Map<String, dynamic>? nearest;
    var distance = double.infinity;
    for (final place in _located) {
      final candidate = HanduniaMapData.distanceMeters(
        point.latitude,
        point.longitude,
        _geoDouble(place['latitude'])!,
        _geoDouble(place['longitude'])!,
      );
      if (candidate < distance) {
        distance = candidate;
        nearest = place;
      }
    }
    // Au niveau national, un toucher doit rester volontaire : on ne
    // rattache jamais un point lointain au lieu le plus proche.
    if (nearest != null && distance <= 35000) {
      await _select(nearest);
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selected;
    final quickPlaces = _located.take(6).toList(growable: false);
    final unlocated = widget.places.length - _located.length;
    return SizedBox(
      height: widget.height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          children: [
            Positioned.fill(
              child: MapLibreMap(
                styleString: handuniaMapStyleUrl,
                initialCameraPosition: CameraPosition(
                  target: handuniaBeninCenter,
                  zoom: widget.initialZoom,
                ),
                minMaxZoomPreference: const MinMaxZoomPreference(5, 18),
                rotateGesturesEnabled: false,
                tiltGesturesEnabled: false,
                onMapCreated: (controller) => _controller = controller,
                onStyleLoadedCallback: _onStyleLoaded,
                onMapClick: (point, latLng) => _onMapTap(latLng),
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              top: 10,
              child: Row(
                children: [
                  Expanded(
                    child: Material(
                      color: HanduniaTokens.nuitPortee.withValues(alpha: .94),
                      borderRadius: BorderRadius.circular(14),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 11,
                          vertical: 9,
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.map_outlined,
                              size: 18,
                              color: HanduniaTokens.braise,
                            ),
                            const SizedBox(width: 7),
                            Expanded(
                              child: Text(
                                '${_located.length} lieux géolocalisés · carte réelle du Bénin',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontFamily: 'Karla',
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: HanduniaTokens.ivoire,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 7),
                  Material(
                    color: HanduniaTokens.nuitPortee.withValues(alpha: .94),
                    shape: const CircleBorder(),
                    child: IconButton(
                      onPressed: _focusBenin,
                      icon: const Icon(Icons.public_rounded),
                      color: HanduniaTokens.braise,
                    ),
                  ),
                ],
              ),
            ),
            if (unlocated > 0)
              Positioned(
                left: 10,
                top: 62,
                child: Material(
                  color: HanduniaTokens.terre.withValues(alpha: .90),
                  borderRadius: BorderRadius.circular(999),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    child: Text(
                      '$unlocated à positionner',
                      style: const TextStyle(
                        fontFamily: 'Karla',
                        fontWeight: FontWeight.w700,
                        fontSize: 11.5,
                        color: HanduniaTokens.ivoire,
                      ),
                    ),
                  ),
                ),
              ),
            Positioned(
              left: 10,
              right: 10,
              bottom: selected != null && widget.showSelectionCard ? 110 : 10,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Material(
                    color: HanduniaTokens.nuitPortee.withValues(alpha: .90),
                    borderRadius: BorderRadius.circular(999),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                      child: Text(
                        'Touchez un lieu pour ouvrir sa mémoire. · Pincer pour zoomer · déplacer pour explorer',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Karla',
                          fontSize: 10.5,
                          color: HanduniaTokens.cendre,
                        ),
                      ),
                    ),
                  ),
                  if (selected == null && quickPlaces.isNotEmpty) ...[
                    const SizedBox(height: 7),
                    SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: quickPlaces.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 6),
                        itemBuilder: (context, index) {
                          final place = quickPlaces[index];
                          return ActionChip(
                            visualDensity: VisualDensity.compact,
                            avatar: const Icon(
                              Icons.location_on_rounded,
                              size: 16,
                              color: HanduniaTokens.braise,
                            ),
                            label: Text(
                              place['name']?.toString() ?? 'Lieu mémoire',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontFamily: 'Karla',
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: HanduniaTokens.ivoire,
                              ),
                            ),
                            backgroundColor:
                                HanduniaTokens.nuitPortee.withValues(alpha: .94),
                            side: const BorderSide(
                              color: HanduniaTokens.bordureForte,
                            ),
                            onPressed: () => _select(place),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (selected != null && widget.showSelectionCard)
              Positioned(
                left: 10,
                right: 10,
                bottom: 10,
                child: _SelectedPlaceCard(
                  place: selected,
                  onOpen:
                      widget.onOpen == null || selected['can_open'] == false
                      ? null
                      : () => widget.onOpen!(selected),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SelectedPlaceCard extends StatelessWidget {
  const _SelectedPlaceCard({
    required this.place,
    this.onOpen,
  });

  final Map<String, dynamic> place;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    final voices = (place['voice_count'] as num?)?.toInt() ?? 0;
    final memories = (place['memory_count'] as num?)?.toInt() ?? 0;
    return Material(
      color: HanduniaTokens.nuitPortee.withValues(alpha: .97),
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: HanduniaTokens.bordureForte),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.location_on_rounded,
              color: HanduniaTokens.braise,
              size: 27,
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    place['name']?.toString() ?? 'Lieu mémoire',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'Fraunces',
                      fontWeight: FontWeight.w600,
                      fontSize: 17,
                      color: HanduniaTokens.ivoire,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '$memories mémoires · $voices voix',
                    style: const TextStyle(
                      fontFamily: 'Karla',
                      fontWeight: FontWeight.w700,
                      fontSize: 11.5,
                      color: HanduniaTokens.cendre,
                    ),
                  ),
                ],
              ),
            ),
            if (onOpen != null)
              IconButton(
                onPressed: onOpen,
                icon: const Icon(Icons.arrow_forward_rounded),
                color: HanduniaTokens.braise,
              ),
          ],
        ),
      ),
    );
  }
}

class HanduniaLocationPickerRoute extends StatefulWidget {
  const HanduniaLocationPickerRoute({
    super.key,
    this.initialQuery = '',
  });

  final String initialQuery;

  @override
  State<HanduniaLocationPickerRoute> createState() =>
      _HanduniaLocationPickerRouteState();
}

class _HanduniaLocationPickerRouteState
    extends State<HanduniaLocationPickerRoute> {
  final TextEditingController _query = TextEditingController();
  MapLibreMapController? _controller;
  bool _styleLoaded = false;
  bool _searching = false;
  bool _resolving = false;
  String? _notice;
  List<Map<String, dynamic>> _results = const <Map<String, dynamic>>[];
  Map<String, dynamic>? _selected;

  @override
  void initState() {
    super.initState();
    _query.text = widget.initialQuery.trim();
    if (_query.text.length >= 2) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _search());
    }
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final query = _query.text.trim();
    if (query.length < 2 || _searching) return;
    setState(() {
      _searching = true;
      _notice = null;
    });
    try {
      final results = await HanduniaMapData.searchPlaces(query);
      if (!mounted) return;
      setState(() {
        _results = results;
        if (results.isEmpty) {
          _notice = 'Aucun lieu trouvé au Bénin pour « $query ».';
        }
      });
    } catch (_) {
      if (mounted) {
        setState(
          () => _notice = 'Recherche cartographique momentanément indisponible.',
        );
      }
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _select(Map<String, dynamic> place) async {
    setState(() {
      _selected = place;
      _results = const <Map<String, dynamic>>[];
      _notice = null;
    });
    await _renderSelected();
    final lat = _geoDouble(place['latitude']);
    final lon = _geoDouble(place['longitude']);
    if (_controller != null && lat != null && lon != null) {
      await _controller!.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(target: LatLng(lat, lon), zoom: 14),
        ),
      );
    }
  }

  Future<void> _renderSelected() async {
    final controller = _controller;
    final selected = _selected;
    if (!_styleLoaded || controller == null || selected == null) return;
    final lat = _geoDouble(selected['latitude']);
    final lon = _geoDouble(selected['longitude']);
    if (lat == null || lon == null) return;
    await controller.clearCircles();
    await controller.addCircles(
      <CircleOptions>[
        CircleOptions(
          geometry: LatLng(lat, lon),
          circleRadius: 11,
          circleColor: '#E6AA4A',
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 4,
        ),
      ],
    );
  }

  Future<void> _onMapTap(LatLng point) async {
    if (_resolving) return;
    setState(() {
      _resolving = true;
      _notice = 'Identification du lieu…';
    });
    try {
      final place = await HanduniaMapData.reversePlace(
        latitude: point.latitude,
        longitude: point.longitude,
      );
      if (!mounted) return;
      await _select(place);
    } catch (_) {
      if (mounted) {
        setState(
          () => _notice = 'Ce point n’a pas pu être identifié. Réessayez.',
        );
      }
    } finally {
      if (mounted) setState(() => _resolving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selected;
    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(
              child: MapLibreMap(
                styleString: handuniaMapStyleUrl,
                initialCameraPosition: const CameraPosition(
                  target: handuniaBeninCenter,
                  zoom: 6.4,
                ),
                minMaxZoomPreference: const MinMaxZoomPreference(5, 18),
                rotateGesturesEnabled: false,
                tiltGesturesEnabled: false,
                onMapCreated: (controller) => _controller = controller,
                onStyleLoadedCallback: () async {
                  _styleLoaded = true;
                  await _renderSelected();
                },
                onMapClick: (point, latLng) => _onMapTap(latLng),
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              top: 10,
              child: Material(
                color: HanduniaTokens.nuitPortee.withValues(alpha: .97),
                borderRadius: BorderRadius.circular(18),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(6, 7, 7, 7),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          IconButton(
                            onPressed: () => Navigator.of(context).maybePop(),
                            icon: const Icon(Icons.arrow_back_rounded),
                            color: HanduniaTokens.ivoire,
                          ),
                          const Expanded(
                            child: Text(
                              'Positionner le lieu',
                              style: TextStyle(
                                fontFamily: 'Fraunces',
                                fontWeight: FontWeight.w600,
                                fontSize: 21,
                                color: HanduniaTokens.ivoire,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _query,
                              onSubmitted: (_) => _search(),
                              style: const TextStyle(
                                fontFamily: 'Karla',
                                color: HanduniaTokens.ivoire,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Village, quartier, ville…',
                                hintStyle: const TextStyle(
                                  color: HanduniaTokens.cendre,
                                ),
                                prefixIcon: const Icon(Icons.search_rounded),
                                filled: true,
                                fillColor: HanduniaTokens.nuit,
                                isDense: true,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(
                                    color: HanduniaTokens.bordureForte,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 7),
                          IconButton.filled(
                            onPressed: _searching ? null : _search,
                            style: IconButton.styleFrom(
                              backgroundColor: HanduniaTokens.braise,
                              foregroundColor: HanduniaTokens.encre,
                            ),
                            icon: _searching
                                ? const SizedBox(
                                    width: 17,
                                    height: 17,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: HanduniaTokens.encre,
                                    ),
                                  )
                                : const Icon(Icons.search_rounded),
                          ),
                        ],
                      ),
                      if (_results.isNotEmpty)
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxHeight: 220),
                          child: ListView.separated(
                            shrinkWrap: true,
                            padding: const EdgeInsets.only(top: 7),
                            itemCount: _results.length,
                            separatorBuilder: (_, _) => const Divider(
                              height: 1,
                              color: HanduniaTokens.bordureForte,
                            ),
                            itemBuilder: (context, index) {
                              final place = _results[index];
                              return ListTile(
                                dense: true,
                                leading: const Icon(
                                  Icons.location_on_outlined,
                                  color: HanduniaTokens.braise,
                                ),
                                title: Text(
                                  place['display_name']?.toString() ??
                                      place['name']?.toString() ??
                                      '',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: 'Karla',
                                    fontWeight: FontWeight.w700,
                                    color: HanduniaTokens.ivoire,
                                  ),
                                ),
                                onTap: () => _select(place),
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            if (_notice != null)
              Positioned(
                left: 14,
                right: 14,
                top: 150,
                child: IgnorePointer(
                  child: Center(
                    child: Material(
                      color: HanduniaTokens.nuitPortee.withValues(alpha: .94),
                      borderRadius: BorderRadius.circular(999),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        child: Text(
                          _notice!,
                          style: const TextStyle(
                            fontFamily: 'Karla',
                            color: HanduniaTokens.cendre,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            Positioned(
              left: 10,
              right: 10,
              bottom: 10,
              child: Material(
                color: HanduniaTokens.nuitPortee.withValues(alpha: .97),
                borderRadius: BorderRadius.circular(18),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: selected == null
                      ? const Text(
                          'Recherchez un lieu ou touchez directement la carte. '
                          'La position réelle sera enregistrée après validation.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Karla',
                            color: HanduniaTokens.cendre,
                            fontSize: 12.5,
                            height: 1.35,
                          ),
                        )
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              selected['display_name']?.toString() ??
                                  selected['name']?.toString() ??
                                  'Lieu sélectionné',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontFamily: 'Fraunces',
                                fontWeight: FontWeight.w600,
                                fontSize: 17,
                                color: HanduniaTokens.ivoire,
                              ),
                            ),
                            const SizedBox(height: 7),
                            HanduniaTerritoryPath(place: selected, compact: true),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              height: 46,
                              child: FilledButton.icon(
                                onPressed: () =>
                                    Navigator.of(context).pop(selected),
                                style: FilledButton.styleFrom(
                                  backgroundColor: HanduniaTokens.braise,
                                  foregroundColor: HanduniaTokens.encre,
                                ),
                                icon: const Icon(Icons.check_rounded),
                                label: const Text('VALIDER CET EMPLACEMENT'),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
