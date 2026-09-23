import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
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
    final visibleSegments = compact && segments.length > 2
        ? segments.sublist(segments.length - 2)
        : segments;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < visibleSegments.length; i++) ...[
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
                color: i == visibleSegments.length - 1
                    ? HanduniaTokens.braise.withValues(alpha: .15)
                    : HanduniaTokens.nuitPortee.withValues(alpha: .92),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: i == visibleSegments.length - 1
                      ? HanduniaTokens.braise.withValues(alpha: .72)
                      : HanduniaTokens.bordureForte,
                ),
              ),
              child: Text(
                visibleSegments[i],
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: 'Karla',
                  fontWeight: FontWeight.w700,
                  fontSize: compact ? 11.5 : 12.5,
                  color: i == visibleSegments.length - 1
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
    this.focusUserOnOpen = false,
    this.showUserLocation = true,
    this.showTerritoryRail = true,
    this.openOnMarkerTap = false,
    this.minimalChrome = false,
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
  final bool focusUserOnOpen;
  final bool showUserLocation;
  final bool showTerritoryRail;
  final bool openOnMarkerTap;
  final bool minimalChrome;

  @override
  State<HanduniaUnifiedMap> createState() => _HanduniaUnifiedMapState();
}

class _HanduniaUnifiedMapState extends State<HanduniaUnifiedMap> {
  MapLibreMapController? _controller;
  bool _styleLoaded = false;
  bool _satellite = false;
  String? _selectedId;
  String? _activeTerritory;
  Position? _userPosition;
  Future<Position?>? _locationFuture;
  late double _manualZoom;
  LatLng _cameraTarget = handuniaBeninCenter;

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

    if (widget.focusUserOnOpen) {
      final focused = await _locateUser(focus: true);
      if (focused) return;
    }

    final selected = _selected;
    if (selected != null) {
      await _focus(selected);
    }
  }

  Future<Position?> _resolveUserPosition() {
    final pending = _locationFuture;
    if (pending != null) return pending;

    final future = () async {
      try {
        if (!await Geolocator.isLocationServiceEnabled()) return null;

        var permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          return null;
        }

        final cached = await Geolocator.getLastKnownPosition();
        if (cached != null) {
          _userPosition = cached;
          if (_styleLoaded) {
            await _renderPlaces();
          }
        }

        try {
          final current = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              timeLimit: Duration(seconds: 8),
            ),
          );
          _userPosition = current;
          if (_styleLoaded) {
            await _renderPlaces();
          }
          return current;
        } catch (_) {
          return cached;
        }
      } catch (_) {
        return _userPosition;
      }
    }();

    _locationFuture = future.whenComplete(() => _locationFuture = null);
    return _locationFuture!;
  }

  Future<bool> _locateUser({bool focus = false}) async {
    final position = await _resolveUserPosition();
    if (position == null) return false;

    if (focus && _controller != null) {
      _manualZoom = 16.2;
      _cameraTarget = LatLng(position.latitude, position.longitude);
      await _controller!.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: _cameraTarget,
            zoom: _manualZoom,
            tilt: widget.immersive ? 42 : 0,
          ),
        ),
      );
    }
    return true;
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
    await controller.clearSymbols();
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
    if (widget.showUserLocation && _userPosition != null) {
      options.add(
        CircleOptions(
          geometry: LatLng(
            _userPosition!.latitude,
            _userPosition!.longitude,
          ),
          circleRadius: 8.5,
          circleColor: '#2563EB',
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 3,
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

    final memorySymbols = <SymbolOptions>[];
    for (final place in _located) {
      final memories = (place['memory_count'] as num?)?.toInt() ?? 0;
      if (memories <= 0) continue;
      final lat = _geoDouble(place['latitude']);
      final lon = _geoDouble(place['longitude']);
      if (lat == null || lon == null) continue;
      memorySymbols.add(
        SymbolOptions(
          geometry: LatLng(lat, lon),
          textField: memories > 99 ? '99+' : '$memories',
          textSize: 11,
          textColor: '#4A260D',
          textHaloColor: '#FFF7E8',
          textHaloWidth: 2,
          textOffset: const Offset(0, -1.7),
        ),
      );
    }
    if (memorySymbols.isNotEmpty) {
      await controller.addSymbols(memorySymbols);
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
      borderRadius: BorderRadius.circular(18),
      elevation: 1,
      child: SizedBox(
        height: 58,
        child: ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
          scrollDirection: Axis.horizontal,
          itemCount: levels.length,
          separatorBuilder: (_, _) => const SizedBox(width: 5),
          itemBuilder: (context, index) {
            final level = levels[index];
            final active =
                (_activeTerritory ?? levels.first.label).toLowerCase() ==
                level.label.toLowerCase();
            final icon = switch (level.kind) {
              'Quartier / village' => Icons.home_rounded,
              'Localité' => Icons.place_rounded,
              'Arrondissement' => Icons.hub_rounded,
              'Commune' => Icons.domain_rounded,
              'Ville' => Icons.location_city_rounded,
              'Département' => Icons.map_rounded,
              _ => Icons.public_rounded,
            };
            final shortLabel = switch (level.kind) {
              'Quartier / village' => 'Village',
              'Localité' => 'Lieu',
              'Arrondissement' => 'Arrond.',
              'Commune' => 'Commune',
              'Ville' => 'Ville',
              'Département' => 'Départ.',
              _ => 'Bénin',
            };
            return Semantics(
              button: true,
              selected: active,
              label: '${level.kind} : ${level.label}',
              child: Tooltip(
                message: level.label,
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => _focusTerritory(place, level),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 52,
                    height: 50,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      color: active
                          ? HanduniaTokens.braise.withValues(alpha: .18)
                          : HanduniaTokens.nuit,
                      border: Border.all(
                        color: active
                            ? HanduniaTokens.braise
                            : HanduniaTokens.bordureForte,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          icon,
                          size: 17,
                          color: active
                              ? HanduniaTokens.braise
                              : HanduniaTokens.cendre,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          shortLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontFamily: 'Karla',
                            fontSize: 7.8,
                            fontWeight: FontWeight.w800,
                            color: active
                                ? HanduniaTokens.braise
                                : HanduniaTokens.cendre,
                          ),
                        ),
                      ],
                    ),
                  ),
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
    final target = LatLng(lat, lon);
    _cameraTarget = target;
    _manualZoom = zoom ?? _zoomFor(place);
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

  Future<void> _focusBenin() async {
    final controller = _controller;
    if (controller == null) return;
    _manualZoom = widget.initialZoom;
    _cameraTarget = handuniaBeninCenter;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: _cameraTarget,
          zoom: _manualZoom,
          tilt: widget.immersive ? 42 : 0,
        ),
      ),
    );
  }

  Future<void> _recenter() async {
    if (await _locateUser(focus: true)) return;

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
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: _cameraTarget,
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

    final hitRadiusMeters = _manualZoom < 7
        ? 22000.0
        : _manualZoom < 9
            ? 12000.0
            : _manualZoom < 12
                ? 5000.0
                : 1600.0;
    if (nearest != null && distance <= hitRadiusMeters) {
      await _select(nearest);
      if (widget.openOnMarkerTap &&
          widget.onOpen != null &&
          nearest['can_open'] != false) {
        widget.onOpen!(nearest);
      }
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
                        onCameraMove: (position) {
                          _cameraTarget = position.target;
                          _manualZoom = position.zoom;
                        },
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
              if (widget.showChrome && !widget.minimalChrome)
                Positioned(
                  left: 10,
                  right: 10,
                  top: 10,
                  child: Row(
                    children: [
                      if (!widget.minimalChrome) ...[
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
                                        : widget.openOnMarkerTap
                                            ? '$locatedCount lieu${locatedCount > 1 ? 'x' : ''} · toucher un point'
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
                      ] else
                        const Spacer(),
                      HanduniaNamedAction(
                        label: _satellite ? 'Plan' : 'Satellite',
                        color: HanduniaTokens.braise,
                        fontSize: 7.8,
                        maxWidth: 54,
                        child: Material(
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
                      ),
                      if (!widget.minimalChrome) ...[
                        const SizedBox(width: 4),
                        HanduniaNamedAction(
                          label: 'Bénin',
                          color: HanduniaTokens.braise,
                          fontSize: 7.8,
                          maxWidth: 48,
                          child: Material(
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
                        ),
                      ],
                    ],
                  ),
                ),
              if (widget.showChrome &&
                  !widget.minimalChrome &&
                  widget.showTerritoryRail &&
                  selected != null)
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
                  left: 76,
                  right: 76,
                  top: 60,
                  child: Semantics(
                    label: 'Parcours de ${widget.places.first['name']} à ${widget.places.last['name']}',
                    child: Container(
                      height: 34,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: HanduniaTokens.nuitPortee.withValues(alpha: .94),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: HanduniaTokens.bordureForte),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '${widget.places.first['name'] ?? 'Lieu'} → ${widget.places.last['name'] ?? 'Lieu'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: 'Karla',
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: HanduniaTokens.ivoire,
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
                        label: 'Centrer',
                        icon: Icons.my_location_rounded,
                        onTap: _recenter,
                      ),
                      const SizedBox(height: 7),
                      _MapRoundAction(
                        tooltip: 'Zoomer',
                        label: 'Zoom +',
                        icon: Icons.add_rounded,
                        onTap: () => _changeZoom(1),
                      ),
                      const SizedBox(height: 7),
                      _MapRoundAction(
                        tooltip: 'Dézoomer',
                        label: 'Zoom −',
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
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String tooltip;
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return HanduniaNamedAction(
      label: label,
      color: HanduniaTokens.ivoire,
      fontSize: 7.5,
      maxWidth: 54,
      child: Material(
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
      color: HanduniaTokens.nuitPortee.withValues(alpha: .98),
      borderRadius: BorderRadius.circular(18),
      elevation: 3,
      shadowColor: const Color(0x22241F2E),
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 9, 8, 9),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: HanduniaTokens.bordure),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: HanduniaTokens.orClair,
              ),
              child: Text(
                place['icon']?.toString() ?? '📍',
                style: const TextStyle(fontSize: 20),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    place['name']?.toString() ?? 'Lieu',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'Fraunces',
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                      color: HanduniaTokens.ivoire,
                    ),
                  ),
                  const SizedBox.shrink(),
                ],
              ),
            ),
            Semantics(
              label: '$memories souvenirs, $voices voix',
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.auto_stories_rounded,
                    size: 15,
                    color: HanduniaTokens.cendre,
                  ),
                  const SizedBox(width: 2),
                  Text(
                    '$memories',
                    style: const TextStyle(
                      color: HanduniaTokens.cendre,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(
                    Icons.graphic_eq_rounded,
                    size: 15,
                    color: HanduniaTokens.braise,
                  ),
                  const SizedBox(width: 2),
                  Text(
                    '$voices',
                    style: const TextStyle(
                      color: HanduniaTokens.braise,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            if (onOpen != null) ...[
              const SizedBox(width: 5),
              Semantics(
                button: true,
                label: 'Ouvrir la mémoire',
                child: IconButton.filled(
                  onPressed: onOpen,
                  style: IconButton.styleFrom(
                    minimumSize: const Size(42, 42),
                    backgroundColor: HanduniaTokens.braise,
                    foregroundColor: HanduniaTokens.encre,
                  ),
                  icon: const Icon(Icons.chevron_right_rounded, size: 24),
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
                borderRadius: BorderRadius.circular(20),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(5, 5, 5, 7),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          IconButton(
                            tooltip: 'Retour',
                            onPressed: () => Navigator.of(context).maybePop(),
                            icon: const Icon(Icons.arrow_back_rounded),
                            color: HanduniaTokens.ivoire,
                          ),
                          const Expanded(
                            child: Text(
                              'Lieu',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontFamily: 'Fraunces',
                                fontWeight: FontWeight.w600,
                                fontSize: 20,
                                color: HanduniaTokens.ivoire,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: _satellite
                                ? 'Plan'
                                : 'Satellite',
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
                                hintText: 'Lieu…',
                                prefixIcon:
                                    const Icon(Icons.search_rounded),
                                filled: true,
                                fillColor: HanduniaTokens.orClair
                                    .withValues(alpha: .34),
                                isDense: true,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: const BorderSide(
                                    color: HanduniaTokens.bordureForte,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          IconButton.filled(
                            tooltip: 'Chercher',
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
                          constraints: const BoxConstraints(maxHeight: 180),
                          child: ListView.builder(
                            shrinkWrap: true,
                            padding: const EdgeInsets.only(top: 5),
                            itemCount: _results.length,
                            itemBuilder: (context, index) {
                              final place = _results[index];
                              return ListTile(
                                dense: true,
                                leading: const Icon(
                                  Icons.location_on_rounded,
                                  color: HanduniaTokens.braise,
                                ),
                                title: Text(
                                  place['display_name']?.toString() ??
                                      place['name']?.toString() ??
                                      '',
                                  maxLines: 1,
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
                left: 70,
                right: 70,
                top: 128,
                child: Semantics(
                  label: _notice!,
                  child: Material(
                    color: HanduniaTokens.nuitPortee.withValues(alpha: .93),
                    borderRadius: BorderRadius.circular(999),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      child: Icon(
                        _resolving
                            ? Icons.sync_rounded
                            : Icons.info_outline_rounded,
                        size: 18,
                        color: HanduniaTokens.cendre,
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
                  padding: const EdgeInsets.all(9),
                  child: selected == null
                      ? Semantics(
                          label:
                              'Touchez la carte ou recherchez un lieu',
                          child: Center(
                            child: Icon(
                              Icons.touch_app_rounded,
                              size: 30,
                              color: HanduniaTokens.braise,
                            ),
                          ),
                        )
                      : Row(
                          children: [
                            const Icon(
                              Icons.location_on_rounded,
                              color: HanduniaTokens.braise,
                              size: 24,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                selected['name']?.toString() ??
                                    selected['display_name']?.toString() ??
                                    'Lieu',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontFamily: 'Fraunces',
                                  fontWeight: FontWeight.w600,
                                  fontSize: 16,
                                  color: HanduniaTokens.ivoire,
                                ),
                              ),
                            ),
                            Semantics(
                              button: true,
                              label: 'Valider cet emplacement',
                              child: IconButton.filled(
                                onPressed: () =>
                                    Navigator.of(context).pop(selected),
                                style: IconButton.styleFrom(
                                  minimumSize: const Size(50, 50),
                                  backgroundColor: HanduniaTokens.braise,
                                  foregroundColor: HanduniaTokens.encre,
                                ),
                                icon: const Icon(
                                  Icons.check_rounded,
                                  size: 26,
                                ),
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
