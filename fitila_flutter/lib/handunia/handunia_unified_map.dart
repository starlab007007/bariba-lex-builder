import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../ui/reference_creation_ui.dart';
import 'handunia_consultation_ui.dart';
import 'handunia_map_data.dart';

const String handuniaMapStyleUrl =
    'https://tiles.openfreemap.org/styles/liberty';
const String handuniaSatelliteMapStyle = '''
{
  "version": 8,
  "name": "FITILA Satellite",
  "sources": {
    "satellite": {
      "type": "raster",
      "tiles": [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      "tileSize": 256,
      "attribution": "Tiles © Esri"
    }
  },
  "layers": [
    {
      "id": "satellite",
      "type": "raster",
      "source": "satellite",
      "minzoom": 0,
      "maxzoom": 20
    }
  ]
}
''';
const LatLng handuniaBeninCenter = LatLng(9.3077, 2.3158);

bool get handuniaNativeMapAvailable {
  final bindingName = WidgetsBinding.instance.runtimeType.toString();
  if (bindingName.contains('TestWidgetsFlutterBinding')) return false;
  return kIsWeb ||
      defaultTargetPlatform == TargetPlatform.android ||
      defaultTargetPlatform == TargetPlatform.iOS;
}

double? _geoDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '');
}

String _geoText(Map<String, dynamic> place, String key) =>
    place[key]?.toString().trim() ?? '';

List<String> handuniaTerritorySegments(Map<String, dynamic>? place) {
  if (place == null) return const <String>['Bénin'];
  final values = <String>[
    _geoText(place, 'village_quartier'),
    _geoText(place, 'locality'),
    _geoText(place, 'arrondissement'),
    _geoText(place, 'commune'),
    _geoText(place, 'city'),
    _geoText(place, 'department'),
    'Bénin',
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
    this.showChrome = true,
    this.initialZoom = 6.4,
    this.routePoints = const <Map<String, double>>[],
    this.routeProgress,
    this.routeLabel,
    this.immersive = false,
  });

  final List<Map<String, dynamic>> places;
  final String? selectedPlaceId;
  final ValueChanged<Map<String, dynamic>>? onSelected;
  final ValueChanged<Map<String, dynamic>>? onOpen;
  final double height;
  final bool showSelectionCard;
  final bool showChrome;
  final double initialZoom;
  final List<Map<String, double>> routePoints;
  final double? routeProgress;
  final String? routeLabel;
  final bool immersive;

  @override
  State<HanduniaUnifiedMap> createState() => _HanduniaUnifiedMapState();
}

class _HanduniaUnifiedMapState extends State<HanduniaUnifiedMap> {
  MapLibreMapController? _controller;
  bool _styleLoaded = false;
  bool _satellite = false;
  String? _selectedId;
  String? _activeTerritory;
  late double _manualZoom;

  String get _activeStyle =>
      _satellite ? handuniaSatelliteMapStyle : handuniaMapStyleUrl;

  @override
  void initState() {
    super.initState();
    _selectedId = widget.selectedPlaceId;
    _manualZoom = widget.initialZoom;
  }

  @override
  void didUpdateWidget(covariant HanduniaUnifiedMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedPlaceId != oldWidget.selectedPlaceId) {
      _selectedId = widget.selectedPlaceId;
    }
    if (_styleLoaded &&
        (widget.places != oldWidget.places ||
            widget.selectedPlaceId != oldWidget.selectedPlaceId ||
            widget.routePoints != oldWidget.routePoints ||
            widget.routeProgress != oldWidget.routeProgress ||
            widget.immersive != oldWidget.immersive)) {
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
      await _focus(selected);
    }
  }

  LatLng? _routeCursor() {
    final progress = widget.routeProgress;
    final points = widget.routePoints;
    if (progress == null || points.length < 2) return null;
    final clamped = progress.clamp(0.0, 1.0).toDouble();
    var total = 0.0;
    final distances = <double>[];
    for (var i = 1; i < points.length; i++) {
      final distance = HanduniaMapData.distanceMeters(
        points[i - 1]['latitude']!,
        points[i - 1]['longitude']!,
        points[i]['latitude']!,
        points[i]['longitude']!,
      );
      distances.add(distance);
      total += distance;
    }
    if (total <= 0) {
      return LatLng(points.first['latitude']!, points.first['longitude']!);
    }
    var remaining = total * clamped;
    for (var i = 0; i < distances.length; i++) {
      final segment = distances[i];
      if (remaining <= segment || i == distances.length - 1) {
        final ratio = segment <= 0 ? 0.0 : (remaining / segment).clamp(0.0, 1.0);
        final from = points[i];
        final to = points[i + 1];
        return LatLng(
          from['latitude']! + (to['latitude']! - from['latitude']!) * ratio,
          from['longitude']! + (to['longitude']! - from['longitude']!) * ratio,
        );
      }
      remaining -= segment;
    }
    return LatLng(points.last['latitude']!, points.last['longitude']!);
  }

  Future<void> _renderPlaces() async {
    final controller = _controller;
    if (controller == null || !_styleLoaded) return;
    await controller.clearCircles();
    await controller.clearLines();
    if (widget.routePoints.length >= 2) {
      await controller.addLine(
        LineOptions(
          geometry: widget.routePoints
              .map(
                (point) => LatLng(
                  point['latitude']!,
                  point['longitude']!,
                ),
              )
              .toList(growable: false),
          lineColor: '#E6AA4A',
          lineWidth: widget.immersive ? 6 : 4.5,
          lineOpacity: .92,
        ),
      );
    }
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
    final cursor = _routeCursor();
    if (cursor != null) {
      options.add(
        CircleOptions(
          geometry: cursor,
          circleRadius: widget.immersive ? 10 : 8,
          circleColor: '#F3EFE6',
          circleStrokeColor: '#E6AA4A',
          circleStrokeWidth: 4,
        ),
      );
    }
    if (options.isNotEmpty) {
      await controller.addCircles(options);
    }
  }

  double _zoomFor(Map<String, dynamic> place) {
    final hint = _geoDouble(place['zoom_hint']);
    if (hint != null) return hint.clamp(5.0, 18.0).toDouble();
    if (_geoText(place, 'village_quartier').isNotEmpty) return 16.0;
    if (_geoText(place, 'locality').isNotEmpty) return 15.2;
    if (_geoText(place, 'arrondissement').isNotEmpty) return 13.0;
    if (_geoText(place, 'commune').isNotEmpty) return 10.8;
    if (_geoText(place, 'city').isNotEmpty) return 9.8;
    if (_geoText(place, 'department').isNotEmpty) return 8.0;
    return 14.8;
  }

  List<({String kind, String label, double zoom})> _territoryLevels(
    Map<String, dynamic> place,
  ) {
    final candidates = <({String kind, String label, double zoom})>[
      if (_geoText(place, 'village_quartier').isNotEmpty)
        (
          kind: 'Quartier / village',
          label: _geoText(place, 'village_quartier'),
          zoom: 16.0,
        ),
      if (_geoText(place, 'locality').isNotEmpty)
        (
          kind: 'Localité',
          label: _geoText(place, 'locality'),
          zoom: 15.0,
        ),
      if (_geoText(place, 'arrondissement').isNotEmpty)
        (
          kind: 'Arrondissement',
          label: _geoText(place, 'arrondissement'),
          zoom: 13.0,
        ),
      if (_geoText(place, 'commune').isNotEmpty)
        (
          kind: 'Commune',
          label: _geoText(place, 'commune'),
          zoom: 10.8,
        ),
      if (_geoText(place, 'city').isNotEmpty)
        (
          kind: 'Ville',
          label: _geoText(place, 'city'),
          zoom: 9.8,
        ),
      if (_geoText(place, 'department').isNotEmpty)
        (
          kind: 'Département',
          label: _geoText(place, 'department'),
          zoom: 8.0,
        ),
      (kind: 'Pays', label: 'Bénin', zoom: 6.2),
    ];
    final result = <({String kind, String label, double zoom})>[];
    final seen = <String>{};
    for (final item in candidates) {
      final key = item.label.trim().toLowerCase();
      if (key.isEmpty || !seen.add(key)) continue;
      result.add(item);
    }
    return result;
  }

  Future<void> _focusTerritory(
    Map<String, dynamic> place,
    ({String kind, String label, double zoom}) level,
  ) async {
    _manualZoom = level.zoom;
    setState(() => _activeTerritory = level.label);
    if (level.label.toLowerCase() == 'bénin') {
      await _focusBenin();
      return;
    }
    await _focus(place, zoom: level.zoom);
  }

  void _toggleSatellite() {
    setState(() {
      _satellite = !_satellite;
      _styleLoaded = false;
      _controller = null;
    });
  }

  Widget _territoryZoomRail(Map<String, dynamic> place) {
    final levels = _territoryLevels(place);
    return Material(
      color: HanduniaTokens.nuitPortee.withValues(alpha: .96),
      borderRadius: BorderRadius.circular(16),
      elevation: 1,
      child: SizedBox(
        height: 46,
        child: ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 6),
          scrollDirection: Axis.horizontal,
          itemCount: levels.length,
          separatorBuilder: (_, _) => const SizedBox(width: 6),
          itemBuilder: (context, index) {
            final level = levels[index];
            final active =
                (_activeTerritory ?? levels.first.label).toLowerCase() ==
                level.label.toLowerCase();
            return InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: () => _focusTerritory(place, level),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: active
                      ? HanduniaTokens.braise.withValues(alpha: .18)
                      : HanduniaTokens.nuit,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: active
                        ? HanduniaTokens.braise
                        : HanduniaTokens.bordureForte,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      active
                          ? Icons.location_on_rounded
                          : Icons.zoom_out_map_rounded,
                      size: 14,
                      color: active
                          ? HanduniaTokens.braise
                          : HanduniaTokens.cendre,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      '${level.kind} · ${level.label}',
                      style: TextStyle(
                        fontFamily: 'Karla',
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: active
                            ? HanduniaTokens.braise
                            : HanduniaTokens.ivoire,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _focus(Map<String, dynamic> place, {double? zoom}) async {
    final controller = _controller;
    final lat = _geoDouble(place['latitude']);
    final lon = _geoDouble(place['longitude']);
    if (controller == null || lat == null || lon == null) return;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: LatLng(lat, lon),
          zoom: zoom ?? _zoomFor(place),
          tilt: widget.immersive ? 42 : 0,
        ),
      ),
    );
  }

  Future<void> _focusBenin() async {
    final controller = _controller;
    if (controller == null) return;
    _manualZoom = widget.initialZoom;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: handuniaBeninCenter,
          zoom: _manualZoom,
          tilt: widget.immersive ? 42 : 0,
        ),
      ),
    );
  }

  Future<void> _recenter() async {
    final selected = _selected;
    if (selected != null) {
      _manualZoom = _zoomFor(selected);
      await _focus(selected, zoom: _manualZoom);
      return;
    }
    await _focusBenin();
  }

  Future<void> _changeZoom(double delta) async {
    final controller = _controller;
    if (controller == null) return;
    _manualZoom = (_manualZoom + delta).clamp(5.0, 18.0).toDouble();
    final selected = _selected;
    final lat = selected == null ? null : _geoDouble(selected['latitude']);
    final lon = selected == null ? null : _geoDouble(selected['longitude']);
    final target = lat != null && lon != null
        ? LatLng(lat, lon)
        : handuniaBeninCenter;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: target,
          zoom: _manualZoom,
          tilt: widget.immersive ? 42 : 0,
        ),
      ),
    );
  }

  Future<void> _select(Map<String, dynamic> place) async {
    final levels = _territoryLevels(place);
    _manualZoom = _zoomFor(place);
    setState(() {
      _selectedId = place['id']?.toString();
      _activeTerritory = levels.isEmpty ? null : levels.first.label;
    });
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
    final locatedCount = _located.length;
    return SizedBox(
      height: widget.height,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: HanduniaTokens.nuitPortee,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: HanduniaTokens.bordure),
          boxShadow: const [
            BoxShadow(
              color: Color(0x16241F2E),
              blurRadius: 22,
              offset: Offset(0, 10),
              spreadRadius: -10,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Stack(
            children: [
              Positioned.fill(
                child: handuniaNativeMapAvailable
                    ? MapLibreMap(
                        key: ValueKey(_satellite),
                        styleString: _activeStyle,
                        initialCameraPosition: CameraPosition(
                          target: handuniaBeninCenter,
                          zoom: widget.initialZoom,
                          tilt: widget.immersive ? 42 : 0,
                        ),
                        minMaxZoomPreference:
                            const MinMaxZoomPreference(5, 18),
                        rotateGesturesEnabled: false,
                        tiltGesturesEnabled: widget.immersive,
                        onMapCreated: (controller) => _controller = controller,
                        onStyleLoadedCallback: _onStyleLoaded,
                        onMapClick: (point, latLng) => _onMapTap(latLng),
                      )
                    : const ColoredBox(
                        color: HanduniaTokens.nuitPortee,
                        child: Center(
                          child: Icon(
                            Icons.map_rounded,
                            size: 72,
                            color: HanduniaTokens.bordureForte,
                          ),
                        ),
                      ),
              ),
              if (widget.showChrome)
                Positioned(
                  left: 10,
                  right: 10,
                  top: 10,
                  child: Row(
                    children: [
                      Expanded(
                        child: Material(
                          color: HanduniaTokens.nuitPortee.withValues(alpha: .95),
                          borderRadius: BorderRadius.circular(999),
                          elevation: 1,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 11,
                              vertical: 8,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  _satellite
                                      ? Icons.satellite_alt_rounded
                                      : Icons.map_outlined,
                                  size: 17,
                                  color: HanduniaTokens.braise,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    widget.routeLabel?.trim().isNotEmpty == true
                                        ? widget.routeLabel!
                                        : '$locatedCount lieu${locatedCount > 1 ? 'x' : ''} · ${_satellite ? 'Satellite' : 'Plan'}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontFamily: 'Karla',
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800,
                                      color: HanduniaTokens.ivoire,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Material(
                        color: HanduniaTokens.nuitPortee.withValues(alpha: .96),
                        shape: const CircleBorder(),
                        elevation: 1,
                        child: IconButton(
                          tooltip: _satellite
                              ? 'Afficher le plan'
                              : 'Afficher le satellite',
                          onPressed: _toggleSatellite,
                          icon: Icon(
                            _satellite
                                ? Icons.layers_rounded
                                : Icons.satellite_alt_rounded,
                          ),
                          color: HanduniaTokens.braise,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Material(
                        color: HanduniaTokens.nuitPortee.withValues(alpha: .96),
                        shape: const CircleBorder(),
                        elevation: 1,
                        child: IconButton(
                          tooltip: 'Voir tout le Bénin',
                          onPressed: _focusBenin,
                          icon: const Icon(Icons.public_rounded),
                          color: HanduniaTokens.braise,
                        ),
                      ),
                    ],
                  ),
                ),
              if (widget.showChrome && selected != null)
                Positioned(
                  left: 10,
                  right: 10,
                  top: 62,
                  child: _territoryZoomRail(selected),
                ),
              if (widget.showChrome &&
                  selected == null &&
                  widget.immersive &&
                  widget.places.isNotEmpty)
                Positioned(
                  left: 56,
                  right: 56,
                  top: 58,
                  child: Center(
                    child: Material(
                      color: HanduniaTokens.nuitPortee.withValues(alpha: .92),
                      borderRadius: BorderRadius.circular(999),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        child: Text(
                          widget.places
                              .take(4)
                              .map(
                                (place) =>
                                    place['name']?.toString() ?? 'Lieu',
                              )
                              .join(' • '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: 'Karla',
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: HanduniaTokens.cendre,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              if (widget.showChrome && selected == null)
                Positioned(
                  left: 12,
                  right: 12,
                  bottom: 12,
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
                          locatedCount == 0
                              ? 'Aucun lieu n’est encore positionné sur la carte.'
                              : 'Touchez un point · pincez pour zoomer',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: 'Karla',
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: HanduniaTokens.cendre,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              if (widget.showChrome)
                Positioned(
                  right: 10,
                  bottom: selected != null && widget.showSelectionCard
                      ? 146
                      : 58,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _MapRoundAction(
                        tooltip: 'Me centrer',
                        icon: Icons.my_location_rounded,
                        onTap: _recenter,
                      ),
                      const SizedBox(height: 7),
                      _MapRoundAction(
                        tooltip: 'Zoomer',
                        icon: Icons.add_rounded,
                        onTap: () => _changeZoom(1),
                      ),
                      const SizedBox(height: 7),
                      _MapRoundAction(
                        tooltip: 'Dézoomer',
                        icon: Icons.remove_rounded,
                        onTap: () => _changeZoom(-1),
                      ),
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
      ),
    );
  }
}


class _MapRoundAction extends StatelessWidget {
  const _MapRoundAction({
    required this.tooltip,
    required this.icon,
    required this.onTap,
  });

  final String tooltip;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: HanduniaTokens.nuitPortee.withValues(alpha: .97),
      shape: const CircleBorder(),
      elevation: 2,
      shadowColor: const Color(0x22241F2E),
      child: IconButton(
        tooltip: tooltip,
        onPressed: onTap,
        icon: Icon(icon),
        color: HanduniaTokens.ivoire,
        iconSize: 20,
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
    final territory = handuniaTerritorySegments(place)
        .where((segment) => segment.toLowerCase() != 'bénin')
        .join(' › ');
    final description = place['description']?.toString().trim() ?? '';
    return Material(
      color: HanduniaTokens.nuitPortee.withValues(alpha: .98),
      borderRadius: BorderRadius.circular(20),
      elevation: 4,
      shadowColor: const Color(0x22241F2E),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: HanduniaTokens.bordure),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: HanduniaTokens.orClair,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    place['icon']?.toString() ?? '📍',
                    style: const TextStyle(fontSize: 19),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
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
                      if (territory.isNotEmpty)
                        Text(
                          territory,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Karla',
                            fontSize: 10.5,
                            color: HanduniaTokens.cendre,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                    ],
                  ),
                ),
                Text(
                  '$memories souvenir${memories > 1 ? 's' : ''} · $voices voix',
                  style: const TextStyle(
                    fontFamily: 'Karla',
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: HanduniaTokens.cendre,
                  ),
                ),
              ],
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 7),
              Text(
                description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: 'Karla',
                  fontSize: 11.5,
                  height: 1.35,
                  color: HanduniaTokens.cendre,
                ),
              ),
            ],
            if (onOpen != null) ...[
              const SizedBox(height: 9),
              SizedBox(
                width: double.infinity,
                height: 40,
                child: FilledButton.icon(
                  onPressed: onOpen,
                  style: FilledButton.styleFrom(
                    backgroundColor: HanduniaTokens.braise,
                    foregroundColor: HanduniaTokens.encre,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(13),
                    ),
                  ),
                  icon: const Icon(Icons.auto_stories_outlined, size: 17),
                  label: const Text(
                    'Voir la mémoire',
                    style: TextStyle(
                      fontFamily: 'Karla',
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
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
  bool _satellite = false;
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
          CameraPosition(target: LatLng(lat, lon), zoom: 16.0),
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
      bottomNavigationBar: const FitilaBridgedBottomNav(selectedIndex: 0),
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(
              child: handuniaNativeMapAvailable
                  ? MapLibreMap(
                      key: ValueKey(_satellite),
                      styleString: _satellite
                          ? handuniaSatelliteMapStyle
                          : handuniaMapStyleUrl,
                      initialCameraPosition: const CameraPosition(
                        target: handuniaBeninCenter,
                        zoom: 6.4,
                      ),
                      minMaxZoomPreference:
                          const MinMaxZoomPreference(5, 18),
                      rotateGesturesEnabled: false,
                      tiltGesturesEnabled: false,
                      onMapCreated: (controller) => _controller = controller,
                      onStyleLoadedCallback: () async {
                        _styleLoaded = true;
                        await _renderSelected();
                      },
                      onMapClick: (point, latLng) => _onMapTap(latLng),
                    )
                  : const ColoredBox(
                      color: HanduniaTokens.nuitPortee,
                      child: Center(
                        child: Icon(
                          Icons.add_location_alt_rounded,
                          size: 72,
                          color: HanduniaTokens.bordureForte,
                        ),
                      ),
                    ),
            ),
            Positioned(
              left: 10,
              right: 10,
              top: 10,
              child: Material(
                color: HanduniaTokens.nuitPortee.withValues(alpha: .96),
                elevation: 3,
                shadowColor: const Color(0x216B4A22),
                borderRadius: BorderRadius.circular(24),
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
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.workspace_premium_rounded,
                                  size: 15,
                                  color: HanduniaTokens.braise,
                                ),
                                Text(
                                  'Positionner le lieu',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontFamily: 'Fraunces',
                                    fontWeight: FontWeight.w600,
                                    fontSize: 20,
                                    height: 1.05,
                                    color: HanduniaTokens.ivoire,
                                  ),
                                ),
                                Text(
                                  'HANDUNIA WASA · CARTE VIVANTE',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontFamily: 'Karla',
                                    fontSize: 8.2,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.1,
                                    color: HanduniaTokens.cendre,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            tooltip: _satellite
                                ? 'Afficher le plan'
                                : 'Afficher le satellite',
                            onPressed: () {
                              setState(() {
                                _satellite = !_satellite;
                                _styleLoaded = false;
                                _controller = null;
                              });
                            },
                            icon: Icon(
                              _satellite
                                  ? Icons.layers_rounded
                                  : Icons.satellite_alt_rounded,
                            ),
                            color: HanduniaTokens.braise,
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
                                fillColor: HanduniaTokens.orClair.withValues(alpha: .38),
                                isDense: true,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(18),
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
