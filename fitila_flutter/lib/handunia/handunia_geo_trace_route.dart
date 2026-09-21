import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import 'handunia_consultation_ui.dart';
import 'handunia_map_data.dart';
import 'handunia_unified_map.dart';

typedef HanduniaMapBuilder = Widget Function(ValueChanged<LatLng> onTap);

class HanduniaGeoTraceRoute extends StatefulWidget {
  const HanduniaGeoTraceRoute({
    super.key,
    required this.fragmentId,
    this.completionDelay = const Duration(milliseconds: 1200),
    this.mapBuilder,
  });

  final String fragmentId;
  final Duration completionDelay;
  final HanduniaMapBuilder? mapBuilder;

  @override
  State<HanduniaGeoTraceRoute> createState() => _HanduniaGeoTraceRouteState();
}

class _HanduniaGeoTraceRouteState extends State<HanduniaGeoTraceRoute> {
  static const _styleUrl = 'https://tiles.openfreemap.org/styles/liberty';
  static const _beninCenter = LatLng(9.3077, 2.3158);

  final TextEditingController _searchController = TextEditingController();

  MapLibreMapController? _mapController;
  bool _styleLoaded = false;
  bool _roadMode = true;
  bool _selectingStart = true;
  bool _searching = false;
  bool _routing = false;
  bool _saving = false;
  bool _saved = false;
  String? _notice;

  Map<String, dynamic>? _start;
  Map<String, dynamic>? _end;
  List<Map<String, dynamic>> _searchResults = const <Map<String, dynamic>>[];
  List<Map<String, double>> _routePoints = const <Map<String, double>>[];
  List<Map<String, dynamic>> _routePlaces = const <Map<String, dynamic>>[];
  final List<Map<String, double>> _historicalPoints = <Map<String, double>>[];
  double _distanceM = 0;
  double _durationS = 0;
  String _provider = 'handunia-manual';

  @override
  void initState() {
    super.initState();
    unawaited(HanduniaMapData.syncPending());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _onStyleLoaded() async {
    _styleLoaded = true;
    await _renderAnnotations();
  }

  Future<void> _renderAnnotations() async {
    final controller = _mapController;
    if (controller == null || !_styleLoaded) {
      return;
    }
    await controller.clearLines();
    await controller.clearCircles();

    final points = _roadMode ? _routePoints : _historicalPoints;
    if (points.length >= 2) {
      await controller.addLine(
        LineOptions(
          geometry: points
              .map(
                (point) => LatLng(
                  point['latitude']!,
                  point['longitude']!,
                ),
              )
              .toList(growable: false),
          lineColor: '#E6AA4A',
          lineWidth: 5.0,
          lineOpacity: .96,
          lineJoin: 'round',
        ),
      );
    }

    final circles = <CircleOptions>[];
    if (_roadMode) {
      final start = _start;
      final end = _end;
      if (start != null) {
        circles.add(
          CircleOptions(
            geometry: _latLng(start),
            circleRadius: 9,
            circleColor: '#E6AA4A',
            circleStrokeColor: '#FFFFFF',
            circleStrokeWidth: 3,
          ),
        );
      }
      if (end != null) {
        circles.add(
          CircleOptions(
            geometry: _latLng(end),
            circleRadius: 9,
            circleColor: '#DF8058',
            circleStrokeColor: '#FFFFFF',
            circleStrokeWidth: 3,
          ),
        );
      }
    } else {
      for (var i = 0; i < _historicalPoints.length; i++) {
        circles.add(
          CircleOptions(
            geometry: LatLng(
              _historicalPoints[i]['latitude']!,
              _historicalPoints[i]['longitude']!,
            ),
            circleRadius: i == 0 || i == _historicalPoints.length - 1 ? 8 : 6,
            circleColor: i == 0 ? '#E6AA4A' : '#DF8058',
            circleStrokeColor: '#FFFFFF',
            circleStrokeWidth: 2,
          ),
        );
      }
    }
    if (circles.isNotEmpty) {
      await controller.addCircles(circles);
    }
  }

  Future<void> _search() async {
    final query = _searchController.text.trim();
    if (query.length < 2 || _searching) {
      return;
    }
    setState(() {
      _searching = true;
      _notice = null;
    });
    try {
      final results = await HanduniaMapData.searchPlaces(query);
      if (!mounted) {
        return;
      }
      setState(() {
        _searchResults = results;
        if (results.isEmpty) {
          _notice = 'Aucun lieu trouvé au Bénin pour « $query ».';
        }
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _notice = 'Recherche cartographique momentanément indisponible.';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _searching = false);
      }
    }
  }

  Future<void> _selectSearchResult(Map<String, dynamic> place) async {
    _searchController.clear();
    setState(() => _searchResults = const <Map<String, dynamic>>[]);
    await _usePlace(place);
    final controller = _mapController;
    if (controller != null) {
      await controller.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(target: _latLng(place), zoom: 13.5),
        ),
      );
    }
  }

  Future<void> _onMapTap(LatLng point) async {
    if (_saved || _routing || _saving) {
      return;
    }
    if (_roadMode) {
      final fallback = <String, dynamic>{
        'name':
            '${point.latitude.toStringAsFixed(5)}, ${point.longitude.toStringAsFixed(5)}',
        'display_name':
            '${point.latitude.toStringAsFixed(5)}, ${point.longitude.toStringAsFixed(5)}',
        'latitude': point.latitude,
        'longitude': point.longitude,
      };
      await _usePlace(fallback);
      unawaited(_enrichTappedPlace(point));
    } else {
      setState(() {
        _historicalPoints.add(<String, double>{
          'latitude': point.latitude,
          'longitude': point.longitude,
        });
        _distanceM = HanduniaMapData.pathDistanceMeters(_historicalPoints);
        _notice = _historicalPoints.length < 2
            ? 'Ajoutez au moins un second point.'
            : '${_historicalPoints.length} étapes · prêt à valider.';
      });
      await _renderAnnotations();
    }
  }

  Future<void> _enrichTappedPlace(LatLng point) async {
    try {
      final place = await HanduniaMapData.reversePlace(
        latitude: point.latitude,
        longitude: point.longitude,
      );
      if (!mounted) {
        return;
      }
      final targetIsStart = _sameCoordinate(_start, point);
      final targetIsEnd = _sameCoordinate(_end, point);
      setState(() {
        if (targetIsStart) {
          _start = place;
        }
        if (targetIsEnd) {
          _end = place;
        }
      });
    } catch (_) {
      // Coordinate fallback remains valid.
    }
  }

  Future<void> _usePlace(Map<String, dynamic> place) async {
    if (_roadMode) {
      setState(() {
        if (_selectingStart || _start == null) {
          _start = place;
          _selectingStart = false;
          _end = null;
          _routePoints = const <Map<String, double>>[];
          _routePlaces = const <Map<String, dynamic>>[];
          _distanceM = 0;
          _durationS = 0;
          _notice = 'Départ choisi · sélectionnez maintenant l’arrivée.';
        } else {
          _end = place;
          _notice = 'Calcul de la route…';
        }
      });
      await _renderAnnotations();
      if (_start != null && _end != null) {
        await _calculateRoadRoute();
      }
    } else {
      final lat = _double(place['latitude']);
      final lon = _double(place['longitude']);
      if (lat == null || lon == null) {
        return;
      }
      setState(() {
        _historicalPoints.add(<String, double>{
          'latitude': lat,
          'longitude': lon,
        });
        _distanceM = HanduniaMapData.pathDistanceMeters(_historicalPoints);
      });
      await _renderAnnotations();
    }
  }

  Future<void> _calculateRoadRoute() async {
    final start = _start;
    final end = _end;
    if (start == null || end == null || _routing) {
      return;
    }
    setState(() {
      _routing = true;
      _notice = 'Recherche de la route réelle…';
    });
    try {
      final result = await HanduniaMapData.route(
        fromLatitude: _double(start['latitude'])!,
        fromLongitude: _double(start['longitude'])!,
        toLatitude: _double(end['latitude'])!,
        toLongitude: _double(end['longitude'])!,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _routePoints = List<Map<String, double>>.from(
          result['points'] as List,
        );
        _routePlaces = result['places'] is List
            ? List<Map<String, dynamic>>.from(
                (result['places'] as List).whereType<Map>(),
              )
            : const <Map<String, dynamic>>[];
        _distanceM = _double(result['distance_m']) ?? 0;
        _durationS = _double(result['duration_s']) ?? 0;
        _provider = result['provider']?.toString() ?? 'osrm-osm';
        _notice = 'Route trouvée · vérifiez puis validez.';
      });
      await _renderAnnotations();
      await _focusRoute();
    } catch (_) {
      if (mounted) {
        setState(() {
          _routePoints = const <Map<String, double>>[];
          _routePlaces = const <Map<String, dynamic>>[];
          _notice =
              'Aucune route carrossable trouvée. Essayez le mode « Historique libre ».';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _routing = false);
      }
    }
  }

  Future<void> _focusRoute() async {
    final controller = _mapController;
    final points = _routePoints;
    if (controller == null || points.length < 2) {
      return;
    }
    var minLat = points.first['latitude']!;
    var maxLat = minLat;
    var minLon = points.first['longitude']!;
    var maxLon = minLon;
    for (final point in points.skip(1)) {
      minLat = math.min(minLat, point['latitude']!);
      maxLat = math.max(maxLat, point['latitude']!);
      minLon = math.min(minLon, point['longitude']!);
      maxLon = math.max(maxLon, point['longitude']!);
    }
    final span = math.max(maxLat - minLat, maxLon - minLon);
    final zoom = span < .02
        ? 14.5
        : span < .06
        ? 12.5
        : span < .18
        ? 10.5
        : span < .55
        ? 8.5
        : 6.8;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: LatLng(
            (minLat + maxLat) / 2,
            (minLon + maxLon) / 2,
          ),
          zoom: zoom,
        ),
      ),
    );
  }

  void _changeMode(bool roadMode) {
    setState(() {
      _roadMode = roadMode;
      _notice = roadMode
          ? 'Choisissez le départ puis l’arrivée.'
          : 'Touchez la carte pour placer les étapes du chemin ancien.';
      _selectingStart = true;
      _start = null;
      _end = null;
      _routePoints = const <Map<String, double>>[];
      _routePlaces = const <Map<String, dynamic>>[];
      _historicalPoints.clear();
      _distanceM = 0;
      _durationS = 0;
      _provider = roadMode ? 'osrm-osm' : 'handunia-manual';
    });
    unawaited(_renderAnnotations());
  }

  void _undoHistoricalPoint() {
    if (_historicalPoints.isEmpty) {
      return;
    }
    setState(() {
      _historicalPoints.removeLast();
      _distanceM = HanduniaMapData.pathDistanceMeters(_historicalPoints);
    });
    unawaited(_renderAnnotations());
  }

  Future<void> _reset() async {
    setState(() {
      _selectingStart = true;
      _start = null;
      _end = null;
      _routePoints = const <Map<String, double>>[];
      _routePlaces = const <Map<String, dynamic>>[];
      _historicalPoints.clear();
      _distanceM = 0;
      _durationS = 0;
      _notice = _roadMode
          ? 'Choisissez le départ puis l’arrivée.'
          : 'Touchez la carte pour placer les étapes.';
      _saved = false;
    });
    await _renderAnnotations();
  }

  bool get _canSave =>
      !_saving &&
      !_saved &&
      (_roadMode ? _routePoints.length >= 2 : _historicalPoints.length >= 2);

  Future<void> _save() async {
    if (!_canSave) {
      return;
    }
    final points = _roadMode ? _routePoints : _historicalPoints;
    final startName = _roadMode
        ? _displayName(_start)
        : 'Point historique 1';
    final endName = _roadMode
        ? _displayName(_end)
        : 'Point historique ${_historicalPoints.length}';
    setState(() {
      _saving = true;
      _notice = 'Enregistrement du trajet…';
    });
    try {
      final online = await HanduniaMapData.saveOrQueuePath(
        fragmentId: widget.fragmentId,
        points: points,
        routeMode: _roadMode ? 'road' : 'historical',
        startName: startName,
        endName: endName,
        distanceM: _distanceM,
        durationS: _roadMode ? _durationS : null,
        provider: _provider,
        roadMatched: _roadMode,
        routePlaces: _routePlaces,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _saved = true;
        _notice = online
            ? 'Trajet validé · ouverture automatique de la suite…'
            : 'Trajet conservé sur cet appareil · ouverture de la suite…';
      });
      await Future<void>.delayed(widget.completionDelay);
      if (mounted && _saved) {
        Navigator.of(context).pop(true);
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final map = widget.mapBuilder?.call(_onMapTap) ??
        (handuniaNativeMapAvailable
            ? MapLibreMap(
                styleString: _styleUrl,
                initialCameraPosition: const CameraPosition(
                  target: _beninCenter,
                  zoom: 6.4,
                ),
                minMaxZoomPreference:
                    const MinMaxZoomPreference(5, 18),
                rotateGesturesEnabled: false,
                tiltGesturesEnabled: false,
                onMapCreated: (controller) => _mapController = controller,
                onStyleLoadedCallback: _onStyleLoaded,
                onMapClick: (point, latLng) => _onMapTap(latLng),
              )
            : const ColoredBox(
                color: HanduniaTokens.nuitPortee,
                child: Center(
                  child: Icon(
                    Icons.route_rounded,
                    size: 72,
                    color: HanduniaTokens.bordureForte,
                  ),
                ),
              ));

    return Scaffold(
      backgroundColor: HanduniaTokens.nuit,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(child: map),
            Positioned(
              left: 12,
              right: 12,
              top: 8,
              child: _topPanel(),
            ),
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: _bottomPanel(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _topPanel() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: HanduniaTokens.nuitPortee.withValues(alpha: .97),
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 10, 10),
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.arrow_back_outlined),
                      color: HanduniaTokens.ivoire,
                    ),
                    Expanded(
                      child: Text(
                        'Tracer sur la carte',
                        style: _fraunces(size: 23),
                      ),
                    ),
                    IconButton(
                      onPressed: _reset,
                      icon: const Icon(Icons.restart_alt_outlined),
                      color: HanduniaTokens.cendre,
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onSubmitted: (_) => _search(),
                        style: _karla(size: 14.5),
                        decoration: InputDecoration(
                          hintText: 'Village, quartier, ville…',
                          hintStyle: _karla(
                            size: 13.5,
                            color: HanduniaTokens.cendre,
                          ),
                          prefixIcon: const Icon(Icons.search_outlined),
                          filled: true,
                          fillColor: HanduniaTokens.nuit,
                          isDense: true,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(
                              color: HanduniaTokens.bordureForte,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(
                              color: HanduniaTokens.bordureForte,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(
                              color: HanduniaTokens.braise,
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 7),
                    SizedBox(
                      width: 48,
                      height: 48,
                      child: FilledButton(
                        onPressed: _searching ? null : _search,
                        style: FilledButton.styleFrom(
                          padding: EdgeInsets.zero,
                          backgroundColor: HanduniaTokens.braise,
                          foregroundColor: HanduniaTokens.encre,
                        ),
                        child: _searching
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: HanduniaTokens.encre,
                                ),
                              )
                            : const Icon(Icons.search_outlined),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SegmentedButton<bool>(
                  showSelectedIcon: false,
                  segments: const <ButtonSegment<bool>>[
                    ButtonSegment<bool>(
                      value: true,
                      icon: Icon(Icons.route_outlined),
                      label: Text('Suivre les routes'),
                    ),
                    ButtonSegment<bool>(
                      value: false,
                      icon: Icon(Icons.timeline_outlined),
                      label: Text('Historique libre'),
                    ),
                  ],
                  selected: <bool>{_roadMode},
                  onSelectionChanged: (value) => _changeMode(value.first),
                  style: ButtonStyle(
                    foregroundColor:
                        WidgetStateProperty.resolveWith((states) {
                      return states.contains(WidgetState.selected)
                          ? HanduniaTokens.encre
                          : HanduniaTokens.ivoire;
                    }),
                    backgroundColor:
                        WidgetStateProperty.resolveWith((states) {
                      return states.contains(WidgetState.selected)
                          ? HanduniaTokens.braise
                          : HanduniaTokens.nuitPortee;
                    }),
                    textStyle: WidgetStateProperty.all(
                      _karla(size: 12.5, weight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_searchResults.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 5),
            constraints: const BoxConstraints(maxHeight: 250),
            decoration: BoxDecoration(
              color: HanduniaTokens.nuitPortee,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: HanduniaTokens.bordureForte),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(vertical: 5),
              itemCount: _searchResults.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final place = _searchResults[index];
                return ListTile(
                  dense: true,
                  leading: const Icon(
                    Icons.location_on_outlined,
                    color: HanduniaTokens.braise,
                  ),
                  title: Text(
                    _displayName(place),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: _karla(size: 14, weight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    place['type']?.toString() ?? '',
                    style: _karla(size: 12, color: HanduniaTokens.cendre),
                  ),
                  onTap: () => _selectSearchResult(place),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _bottomPanel() {
    final startLabel = _displayName(_start);
    final endLabel = _displayName(_end);
    return Material(
      color: HanduniaTokens.nuitPortee.withValues(alpha: .98),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: HanduniaTokens.bordureForte),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_roadMode) ...[
              Row(
                children: [
                  Expanded(
                    child: _placeSelector(
                      title: 'DÉPART',
                      value: startLabel.isEmpty
                          ? 'Touchez la carte'
                          : startLabel,
                      selected: _selectingStart,
                      onTap: () => setState(() => _selectingStart = true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.arrow_forward_outlined,
                    color: HanduniaTokens.braise,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _placeSelector(
                      title: 'ARRIVÉE',
                      value:
                          endLabel.isEmpty ? 'À choisir' : endLabel,
                      selected: !_selectingStart,
                      onTap: () => setState(() => _selectingStart = false),
                    ),
                  ),
                ],
              ),
            ] else ...[
              Row(
                children: [
                  const Icon(
                    Icons.touch_app_outlined,
                    color: HanduniaTokens.braise,
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      _historicalPoints.isEmpty
                          ? 'Touchez la carte pour placer le premier point.'
                          : '${_historicalPoints.length} étape(s) placée(s) sur la carte.',
                      style: _karla(size: 13.5, weight: FontWeight.w600),
                    ),
                  ),
                  if (_historicalPoints.isNotEmpty)
                    IconButton(
                      onPressed: _undoHistoricalPoint,
                      icon: const Icon(Icons.undo_outlined),
                      color: HanduniaTokens.cendre,
                    ),
                ],
              ),
            ],
            if (_roadMode && _routePlaces.isNotEmpty) ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'LOCALITÉS SUR LE TRAJET',
                  style: _karla(
                    size: 11.5,
                    color: HanduniaTokens.cendre,
                    weight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _routePlaces.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 6),
                  itemBuilder: (context, index) {
                    final place = _routePlaces[index];
                    final label =
                        place['name']?.toString().trim().isNotEmpty == true
                        ? place['name'].toString()
                        : (place['display_name']?.toString() ?? 'Lieu');
                    return Container(
                      constraints: const BoxConstraints(maxWidth: 170),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: HanduniaTokens.nuit,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: HanduniaTokens.bordureForte,
                        ),
                      ),
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: _karla(
                          size: 12.5,
                          color: HanduniaTokens.ivoire,
                          weight: FontWeight.w700,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
            if (_distanceM > 0) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _distanceLabel(_distanceM),
                      style: _fraunces(
                        size: 20,
                        color: HanduniaTokens.braise,
                      ),
                    ),
                  ),
                  if (_roadMode && _durationS > 0)
                    Text(
                      _durationLabel(_durationS),
                      style: _karla(
                        size: 13,
                        color: HanduniaTokens.cendre,
                        weight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ],
            if (_notice != null) ...[
              const SizedBox(height: 8),
              Text(
                _notice!,
                textAlign: TextAlign.center,
                style: _karla(
                  size: 12.5,
                  color: _saved
                      ? HanduniaTokens.braise
                      : HanduniaTokens.ivoire,
                  weight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton.icon(
                onPressed: _canSave ? _save : null,
                style: FilledButton.styleFrom(
                  backgroundColor: HanduniaTokens.braise,
                  foregroundColor: HanduniaTokens.encre,
                  disabledBackgroundColor:
                      HanduniaTokens.bordureForte.withValues(alpha: .72),
                  shape: const StadiumBorder(),
                ),
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: HanduniaTokens.encre,
                        ),
                      )
                    : const Icon(Icons.check_circle_outline),
                label: Text(
                  _saved ? 'TRAJET VALIDÉ' : 'VALIDER CE TRAJET',
                  style: _karla(
                    size: 14.5,
                    color: _canSave || _saved
                        ? HanduniaTokens.encre
                        : HanduniaTokens.cendre,
                    weight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 7),
            Text(
              'Carte réelle du Bénin · OpenStreetMap/OpenFreeMap · itinéraire OSRM',
              textAlign: TextAlign.center,
              style: _karla(size: 10.5, color: HanduniaTokens.cendre),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeSelector({
    required String title,
    required String value,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(13),
      child: Container(
        constraints: const BoxConstraints(minHeight: 62),
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: HanduniaTokens.nuit,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(
            color: selected
                ? HanduniaTokens.braise
                : HanduniaTokens.bordureForte,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: _karla(
                size: 10.5,
                color: selected
                    ? HanduniaTokens.braise
                    : HanduniaTokens.cendre,
                weight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: _karla(size: 12.5, weight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  LatLng _latLng(Map<String, dynamic> place) => LatLng(
        _double(place['latitude'])!,
        _double(place['longitude'])!,
      );

  bool _sameCoordinate(Map<String, dynamic>? place, LatLng point) {
    if (place == null) {
      return false;
    }
    final lat = _double(place['latitude']);
    final lon = _double(place['longitude']);
    if (lat == null || lon == null) {
      return false;
    }
    return (lat - point.latitude).abs() < .000001 &&
        (lon - point.longitude).abs() < .000001;
  }

  String _displayName(Map<String, dynamic>? place) {
    if (place == null) {
      return '';
    }
    final display = place['display_name']?.toString().trim() ?? '';
    if (display.isNotEmpty) {
      return display;
    }
    return place['name']?.toString().trim() ?? '';
  }

  double? _double(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }
    return double.tryParse(value?.toString() ?? '');
  }

  String _distanceLabel(double meters) {
    if (meters < 1000) {
      return '${meters.round()} m';
    }
    return '${(meters / 1000).toStringAsFixed(meters >= 10000 ? 0 : 1)} km';
  }

  String _durationLabel(double seconds) {
    final minutes = math.max(1, (seconds / 60).round());
    if (minutes < 60) {
      return '≈ $minutes min';
    }
    final hours = minutes ~/ 60;
    final rest = minutes % 60;
    return rest == 0 ? '≈ $hours h' : '≈ $hours h $rest';
  }
}

TextStyle _fraunces({
  double size = 18,
  Color color = HanduniaTokens.ivoire,
  double height = 1.22,
}) {
  return TextStyle(
    fontFamily: 'Fraunces',
    fontWeight: FontWeight.w600,
    fontSize: size,
    height: height,
    color: color,
  );
}

TextStyle _karla({
  double size = 14.5,
  FontWeight weight = FontWeight.w400,
  Color color = HanduniaTokens.ivoire,
  double height = 1.35,
}) {
  return TextStyle(
    fontFamily: 'Karla',
    fontWeight: weight,
    fontSize: size,
    height: height,
    color: color,
  );
}
