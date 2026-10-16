import Foundation

/// Same JSON (entries / phrases / bigrams) and same folding rules as
/// `BaribaKeyboardEngine` (Dart) and `BaribaDictionary.java` (Android).
final class BaribaDictionary {
    struct Entry {
        let ba: String
        let fr: String
        let freq: Int
    }

    static let shared = BaribaDictionary()

    private(set) var entries: [Entry] = []
    private var byKey: [String: Entry] = [:]
    private var byFrench: [String: Entry] = [:]
    private var phraseBa: [String: String] = [:]
    private var phraseFr: [String: String] = [:]
    private var bigrams: [String: [String]] = [:]

    private init() {
        guard
            let url = Bundle(for: BaribaDictionary.self).url(forResource: "bariba_dictionary", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        else { return }

        for item in (root["entries"] as? [[String: Any]]) ?? [] {
            guard let ba = item["ba"] as? String, !ba.isEmpty else { continue }
            entries.append(Entry(ba: ba, fr: item["fr"] as? String ?? "", freq: item["freq"] as? Int ?? 0))
        }
        entries.sort { $0.freq > $1.freq }
        for e in entries {
            let k = BaribaDictionary.fold(e.ba)
            if byKey[k] == nil { byKey[k] = e }
            let f = BaribaDictionary.fold(e.fr)
            if !f.isEmpty, byFrench[f] == nil { byFrench[f] = e }
        }
        for p in (root["phrases"] as? [[String: String]]) ?? [] {
            guard let ba = p["ba"], let fr = p["fr"] else { continue }
            phraseBa[BaribaDictionary.fold(ba)] = fr
            phraseFr[BaribaDictionary.fold(fr)] = ba
        }
        for (k, v) in (root["bigrams"] as? [String: [String]]) ?? [:] {
            bigrams[BaribaDictionary.fold(k)] = v
        }
    }

    /// Lower-case, strip tones/nasals/accents; ɛ→e, ɔ→o, ŋ→n.
    static func fold(_ s: String) -> String {
        let base = s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil)
        var out = ""
        for ch in base {
            switch ch {
            case "ɛ", "Ɛ": out.append("e")
            case "ɔ", "Ɔ": out.append("o")
            case "ŋ", "Ŋ": out.append("n")
            default: out.append(ch)
            }
        }
        return out.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Completions for `prefix`; empty prefix uses bigrams of `previous`.
    func predict(prefix: String, previous: String, limit: Int = 3) -> [Entry] {
        let key = BaribaDictionary.fold(prefix)
        var result: [Entry] = []
        var seen = Set<String>()
        func add(_ e: Entry) {
            if result.count < limit, seen.insert(BaribaDictionary.fold(e.ba)).inserted { result.append(e) }
        }
        for w in bigrams[BaribaDictionary.fold(previous)] ?? [] {
            let fw = BaribaDictionary.fold(w)
            if key.isEmpty || fw.hasPrefix(key) { add(byKey[fw] ?? Entry(ba: w, fr: "", freq: 0)) }
        }
        if key.isEmpty {
            if result.isEmpty { entries.prefix(limit * 3).forEach(add) }
            return result
        }
        for e in entries where result.count < limit {
            let fe = BaribaDictionary.fold(e.ba)
            if fe.hasPrefix(key) && fe != key { add(e) }
        }
        if let exact = byKey[key] { add(exact) }
        return result
    }

    /// Offline word/phrase translation; nil when unknown.
    func translate(_ text: String, toFrench: Bool) -> String? {
        let key = BaribaDictionary.fold(text)
        if key.isEmpty { return nil }
        if let p = (toFrench ? phraseBa[key] : phraseFr[key]) { return p }
        if let single = toFrench ? byKey[key]?.fr : byFrench[key]?.ba, !single.isEmpty {
            return toFrench ? BaribaDictionary.head(single) : single
        }
        var known = 0, words = 0
        var out: [String] = []
        for token in text.split(whereSeparator: { $0 == " " }) {
            words += 1
            let k = BaribaDictionary.fold(String(token))
            if let hit = toFrench ? byKey[k]?.fr : byFrench[k]?.ba, !hit.isEmpty {
                known += 1
                out.append(toFrench ? BaribaDictionary.head(hit) : hit)
            } else {
                out.append(String(token))
            }
        }
        return known > 0 && known * 2 >= words ? out.joined(separator: " ") : nil
    }

    private static func head(_ gloss: String) -> String {
        let h = gloss.split(whereSeparator: { ",;(".contains($0) }).first.map(String.init) ?? gloss
        return h.trimmingCharacters(in: .whitespaces)
    }
}
