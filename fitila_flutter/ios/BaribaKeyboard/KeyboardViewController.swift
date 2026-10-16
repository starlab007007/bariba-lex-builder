import UIKit

/// FITILA Bariba system keyboard (iOS custom keyboard extension).
/// Feature parity with the Android IME: Bàátɔ̀nú letters, nasal vowels, tone
/// marks, suggestion bar, and a "Saisir et Traduire" mode (FR⇄BA).
final class KeyboardViewController: UIInputViewController {
    // Must match the App Group of Runner.entitlements / BaribaKeyboard.entitlements.
    private static let appGroup = "group.bj.fitila.fitilaFlutter"

    private let row1 = ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"]
    private let row2 = ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"]
    private let row3 = ["w", "x", "c", "v", "b", "n", "ɔ", "ɛ", "ŋ", "ə"]
    private let nasals = ["ã", "ĩ", "ũ", "õ", "ẽ", "ɛ̃", "ɔ̃"]
    private let tones: [(String, String)] = [("\u{0300}", "◌̀"), ("\u{0301}", "◌́"), ("\u{0303}", "◌̃")]
    private let sym1 = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
    private let sym2 = ["@", "#", "€", "_", "&", "-", "+", "(", ")", "/"]
    private let sym3 = ["*", "\"", "'", ":", ";", "!", "?", "%", "="]

    private let gold = UIColor(red: 0.788, green: 0.584, blue: 0.188, alpha: 1)
    private let goldDeep = UIColor(red: 0.612, green: 0.42, blue: 0.114, alpha: 1)
    private let goldTint = UIColor(red: 0.953, green: 0.89, blue: 0.725, alpha: 1)
    private let sageTint = UIColor(red: 0.863, green: 0.918, blue: 0.878, alpha: 1)
    private let clayTint = UIColor(red: 0.957, green: 0.871, blue: 0.824, alpha: 1)
    private let background = UIColor(red: 0.945, green: 0.929, blue: 0.875, alpha: 1)
    private let ink = UIColor(red: 0.141, green: 0.122, blue: 0.18, alpha: 1)

    private var shifted = false
    private var symbols = false
    private var translateMode = false
    private var toFrench = false            // false = FR→BA (default), true = BA→FR
    private var translation: String?
    private var translationTask: URLSessionDataTask?
    private var debounce: Timer?
    private var repeatTimer: Timer?

    private let root = UIStackView()
    private let suggestionBar = UIStackView()
    private let translateButton = UIButton(type: .system)
    private let translationStrip = UIView()
    private let translationLabel = UILabel()
    private let directionButton = UIButton(type: .system)
    private let applyButton = UIButton(type: .system)
    private let keysStack = UIStackView()
    private var suggestionButtons: [UIButton] = []
    private var currentSuggestions: [BaribaDictionary.Entry] = []

    private var defaults: UserDefaults? { UserDefaults(suiteName: Self.appGroup) }

    // MARK: Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = background
        buildLayout()
        rebuildKeys()
        refreshSuggestions()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Best-effort status handshake with the containing Flutter app.
        // With Full Access, the shared App Group is writable. When access is
        // later revoked iOS can make the shared container unavailable, so the
        // containing app treats this value as advisory only.
        defaults?.set(hasFullAccess, forKey: "full_access")
        defaults?.set(Date().timeIntervalSince1970, forKey: "keyboard_seen_at")
        _ = BaribaDictionary.shared // warm the dictionary off the first keystroke
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        debounce?.invalidate()
        debounce = nil
        repeatTimer?.invalidate()
        repeatTimer = nil
        translationTask?.cancel()
        translationTask = nil
    }

    override func textDidChange(_ textInput: UITextInput?) {
        refreshSuggestions()
        if translateMode { scheduleTranslation() }
    }

    // MARK: Layout

    private func buildLayout() {
        root.axis = .vertical
        root.spacing = 4
        root.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(root)
        NSLayoutConstraint.activate([
            root.topAnchor.constraint(equalTo: view.topAnchor, constant: 6),
            root.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 3),
            root.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -3),
            root.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
        ])

        // Top bar: 3 suggestions + translate toggle.
        suggestionBar.axis = .horizontal
        suggestionBar.spacing = 4
        suggestionBar.distribution = .fill
        for i in 0..<3 {
            let b = UIButton(type: .system)
            b.tag = i
            b.titleLabel?.font = .systemFont(ofSize: 16, weight: .heavy)
            b.setTitleColor(goldDeep, for: .normal)
            b.backgroundColor = .white
            b.layer.cornerRadius = 14
            b.addTarget(self, action: #selector(suggestionTapped(_:)), for: .touchUpInside)
            b.isHidden = true
            suggestionButtons.append(b)
            suggestionBar.addArrangedSubview(b)
        }
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        suggestionBar.addArrangedSubview(spacer)
        translateButton.setTitle("⇄ Saisie", for: .normal)
        translateButton.titleLabel?.font = .systemFont(ofSize: 12, weight: .heavy)
        translateButton.layer.cornerRadius = 14
        translateButton.contentEdgeInsets = UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10)
        translateButton.addTarget(self, action: #selector(toggleTranslateMode), for: .touchUpInside)
        translateButton.setContentHuggingPriority(.required, for: .horizontal)
        suggestionBar.addArrangedSubview(translateButton)
        suggestionBar.heightAnchor.constraint(equalToConstant: 32).isActive = true
        root.addArrangedSubview(suggestionBar)
        styleTranslateButton()

        // Translation strip (hidden until "Saisir et Traduire").
        translationStrip.backgroundColor = goldTint
        translationStrip.layer.cornerRadius = 10
        translationStrip.isHidden = true
        let strip = UIStackView(arrangedSubviews: [directionButton, translationLabel, applyButton])
        strip.axis = .horizontal
        strip.spacing = 8
        strip.alignment = .center
        strip.translatesAutoresizingMaskIntoConstraints = false
        translationStrip.addSubview(strip)
        NSLayoutConstraint.activate([
            strip.topAnchor.constraint(equalTo: translationStrip.topAnchor, constant: 6),
            strip.bottomAnchor.constraint(equalTo: translationStrip.bottomAnchor, constant: -6),
            strip.leadingAnchor.constraint(equalTo: translationStrip.leadingAnchor, constant: 8),
            strip.trailingAnchor.constraint(equalTo: translationStrip.trailingAnchor, constant: -8),
        ])
        directionButton.titleLabel?.font = .systemFont(ofSize: 12, weight: .heavy)
        directionButton.setTitleColor(ink, for: .normal)
        directionButton.addTarget(self, action: #selector(swapDirection), for: .touchUpInside)
        directionButton.setContentHuggingPriority(.required, for: .horizontal)
        translationLabel.font = .systemFont(ofSize: 14, weight: .bold)
        translationLabel.textColor = ink
        translationLabel.numberOfLines = 2
        applyButton.setTitle("Remplacer", for: .normal)
        applyButton.titleLabel?.font = .systemFont(ofSize: 13, weight: .heavy)
        applyButton.setTitleColor(goldDeep, for: .normal)
        applyButton.addTarget(self, action: #selector(applyTranslation), for: .touchUpInside)
        applyButton.setContentHuggingPriority(.required, for: .horizontal)
        root.addArrangedSubview(translationStrip)
        updateDirectionTitle()

        keysStack.axis = .vertical
        keysStack.spacing = 5
        keysStack.distribution = .fillEqually
        root.addArrangedSubview(keysStack)
        keysStack.heightAnchor.constraint(greaterThanOrEqualToConstant: 200).isActive = true
    }

    private func rebuildKeys() {
        keysStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        if symbols {
            keysStack.addArrangedSubview(letterRow(sym1))
            keysStack.addArrangedSubview(letterRow(sym2))
            keysStack.addArrangedSubview(letterRow(sym3))
        } else {
            keysStack.addArrangedSubview(letterRow(row1))
            keysStack.addArrangedSubview(letterRow(row2))
            keysStack.addArrangedSubview(thirdRow())
            keysStack.addArrangedSubview(accentRow())
        }
        keysStack.addArrangedSubview(bottomRow())
    }

    private func makeRow(_ keys: [UIView], weights: [CGFloat]? = nil) -> UIStackView {
        let row = UIStackView(arrangedSubviews: keys)
        row.axis = .horizontal
        row.spacing = 4
        row.distribution = weights == nil ? .fillEqually : .fill
        if let weights = weights, let first = keys.first {
            for (i, k) in keys.enumerated() where i > 0 {
                k.widthAnchor.constraint(equalTo: first.widthAnchor, multiplier: weights[i] / weights[0]).isActive = true
            }
        }
        return row
    }

    private func key(_ title: String, tint: UIColor = .white, textColor: UIColor? = nil,
                     action: Selector = #selector(letterTapped(_:))) -> UIButton {
        let b = UIButton(type: .system)
        b.setTitle(title, for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: title.count > 2 ? 13 : 20, weight: .semibold)
        b.titleLabel?.adjustsFontSizeToFitWidth = true
        b.titleLabel?.minimumScaleFactor = 0.6
        b.setTitleColor(textColor ?? ink, for: .normal)
        b.backgroundColor = tint
        b.layer.cornerRadius = 7
        b.layer.shadowColor = UIColor.black.cgColor
        b.layer.shadowOpacity = 0.25
        b.layer.shadowOffset = CGSize(width: 0, height: 1)
        b.layer.shadowRadius = 0
        b.addTarget(self, action: action, for: .touchUpInside)
        b.accessibilityLabel = title
        return b
    }

    private func display(_ s: String) -> String { shifted ? s.uppercased() : s }

    private func letterRow(_ keys: [String]) -> UIStackView {
        makeRow(keys.map { key(display($0)) })
    }

    private func thirdRow() -> UIStackView {
        let shift = key(shifted ? "⇧" : "⇪", tint: shifted ? gold : .white, action: #selector(shiftTapped))
        var views: [UIView] = [shift]
        for k in row3 {
            let special = ["ɔ", "ɛ", "ŋ", "ə"].contains(k)
            views.append(key(display(k), tint: special ? goldTint : .white))
        }
        return makeRow(views, weights: [1.6] + Array(repeating: 1, count: row3.count))
    }

    private func accentRow() -> UIStackView {
        var views: [UIView] = nasals.map { key(display($0), tint: sageTint) }
        for t in tones {
            let b = key(t.1, tint: clayTint, action: #selector(toneTapped(_:)))
            b.accessibilityIdentifier = t.0
            views.append(b)
        }
        return makeRow(views)
    }

    private func bottomRow() -> UIStackView {
        var views: [UIView] = []
        var weights: [CGFloat] = []
        if needsInputModeSwitchKey {
            let g = key("🌐", action: #selector(handleInputModeList(from:with:)))
            g.removeTarget(nil, action: nil, for: .allEvents)
            g.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
            views.append(g); weights.append(1.3)
        }
        views.append(key(symbols ? "ABC" : "123", action: #selector(symbolsTapped))); weights.append(1.5)
        views.append(key(",")); weights.append(1)
        views.append(key("espace", action: #selector(spaceTapped))); weights.append(4.5)
        views.append(key(".")); weights.append(1)
        let del = key("⌫", action: #selector(noop))
        del.addTarget(self, action: #selector(deleteDown), for: .touchDown)
        del.addTarget(self, action: #selector(deleteUp), for: [.touchUpInside, .touchUpOutside, .touchCancel])
        views.append(del); weights.append(1.5)
        views.append(key("↵", tint: gold, textColor: .white, action: #selector(returnTapped))); weights.append(1.5)
        return makeRow(views, weights: weights)
    }

    // MARK: Actions

    @objc private func noop() {}

    @objc private func letterTapped(_ sender: UIButton) {
        guard let t = sender.title(for: .normal) else { return }
        textDocumentProxy.insertText(t)
        if shifted { shifted = false; rebuildKeys() }
        refreshSuggestions()
        if translateMode { scheduleTranslation() }
    }

    @objc private func toneTapped(_ sender: UIButton) {
        guard let mark = sender.accessibilityIdentifier,
              textDocumentProxy.documentContextBeforeInput?.isEmpty == false else { return }
        textDocumentProxy.insertText(mark)
        refreshSuggestions()
    }

    @objc private func shiftTapped() { shifted.toggle(); rebuildKeys() }
    @objc private func symbolsTapped() { symbols.toggle(); rebuildKeys() }

    @objc private func spaceTapped() {
        textDocumentProxy.insertText(" ")
        refreshSuggestions()
        if translateMode { scheduleTranslation() }
    }

    @objc private func returnTapped() { textDocumentProxy.insertText("\n") }

    @objc private func deleteDown() {
        deleteOnce()
        repeatTimer?.invalidate()
        repeatTimer = Timer.scheduledTimer(withTimeInterval: 0.38, repeats: false) { [weak self] _ in
            self?.repeatTimer = Timer.scheduledTimer(withTimeInterval: 0.06, repeats: true) { _ in self?.deleteOnce() }
        }
    }

    @objc private func deleteUp() { repeatTimer?.invalidate(); repeatTimer = nil }

    private func deleteOnce() {
        textDocumentProxy.deleteBackward()
        refreshSuggestions()
        if translateMode { scheduleTranslation() }
    }

    // MARK: Prediction

    private func wordBounds() -> (current: String, previous: String) {
        let ctx = textDocumentProxy.documentContextBeforeInput ?? ""
        func isWord(_ c: Character) -> Bool { c.isLetter || c.isNumber || c == "'" || c == "’" || c.unicodeScalars.allSatisfy { $0.properties.generalCategory == .nonspacingMark } }
        var chars = Array(ctx)
        var cur = ""
        while let last = chars.last, isWord(last) { cur = String(last) + cur; chars.removeLast() }
        while let last = chars.last, !isWord(last) { chars.removeLast() }
        var prev = ""
        while let last = chars.last, isWord(last) { prev = String(last) + prev; chars.removeLast() }
        return (cur, prev)
    }

    private func refreshSuggestions() {
        let (cur, prev) = wordBounds()
        currentSuggestions = BaribaDictionary.shared.predict(prefix: cur, previous: prev)
        for (i, b) in suggestionButtons.enumerated() {
            if i < currentSuggestions.count {
                b.setTitle(currentSuggestions[i].ba, for: .normal)
                b.isHidden = false
            } else {
                b.isHidden = true
            }
        }
    }

    @objc private func suggestionTapped(_ sender: UIButton) {
        guard sender.tag < currentSuggestions.count else { return }
        let (cur, _) = wordBounds()
        for _ in 0..<cur.count { textDocumentProxy.deleteBackward() }
        textDocumentProxy.insertText(currentSuggestions[sender.tag].ba + " ")
        refreshSuggestions()
        if translateMode { scheduleTranslation() }
    }

    // MARK: Translation ("Saisir et Traduire")

    private func styleTranslateButton() {
        translateButton.backgroundColor = translateMode ? gold : .white
        translateButton.setTitleColor(translateMode ? .white : ink, for: .normal)
        translateButton.setTitle(translateMode ? "⇄ Traduire" : "⇄ Saisie", for: .normal)
    }

    private func updateDirectionTitle() {
        directionButton.setTitle(toFrench ? "BA ⇄ FR" : "FR ⇄ BA", for: .normal)
    }

    @objc private func toggleTranslateMode() {
        translateMode.toggle()
        translation = nil
        translationLabel.text = nil
        styleTranslateButton()
        UIView.animate(withDuration: 0.18) { self.translationStrip.isHidden = !self.translateMode }
        if translateMode { scheduleTranslation() }
    }

    @objc private func swapDirection() {
        toFrench.toggle()
        updateDirectionTitle()
        scheduleTranslation()
    }

    @objc private func applyTranslation() {
        guard let t = translation, !t.isEmpty else { return }
        let ctx = textDocumentProxy.documentContextBeforeInput ?? ""
        for _ in 0..<ctx.count { textDocumentProxy.deleteBackward() }
        textDocumentProxy.insertText(t)
        toggleTranslateMode()
        refreshSuggestions()
    }

    private func scheduleTranslation() {
        debounce?.invalidate()
        translationTask?.cancel()
        let text = (textDocumentProxy.documentContextBeforeInput ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            translation = nil
            translationLabel.text = "Tapez pour traduire…"
            return
        }
        let offline = BaribaDictionary.shared.translate(text, toFrench: toFrench)
        translation = offline
        translationLabel.text = offline ?? "…"
        guard hasFullAccess else { return }
        debounce = Timer.scheduledTimer(withTimeInterval: 0.55, repeats: false) { [weak self] _ in
            self?.fetchRemote(text)
        }
    }

    private func fetchRemote(_ text: String) {
        guard let d = defaults,
              let base = d.string(forKey: "supabase_url"), !base.isEmpty,
              let key = d.string(forKey: "supabase_key"), !key.isEmpty else { return }
        let payload: [String: String] = [
            "text": text,
            "sourceLang": toFrench ? "bariba" : "french",
            "targetLang": toFrench ? "french" : "bariba",
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        tryEngine(["ai-translate", "byt5-bariba-translate"], base: base, key: key, body: body, text: text)
    }

    private func tryEngine(_ engines: [String], base: String, key: String, body: Data, text: String) {
        guard let fn = engines.first, let url = URL(string: "\(base)/functions/v1/\(fn)") else { return }
        var req = URLRequest(url: url, timeoutInterval: 8)
        req.httpMethod = "POST"
        req.httpBody = body
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(key, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        translationTask = URLSession.shared.dataTask(with: req) { [weak self] data, response, _ in
            guard let self = self else { return }
            let ok = (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
            if ok, let data = data,
               let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
               let t = (json["translation"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty {
                DispatchQueue.main.async {
                    // Ignore stale answers if the user kept typing.
                    let now = (self.textDocumentProxy.documentContextBeforeInput ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                    guard now == text else { return }
                    self.translation = t
                    self.translationLabel.text = t
                }
            } else if engines.count > 1 {
                self.tryEngine(Array(engines.dropFirst()), base: base, key: key, body: body, text: text)
            }
        }
        translationTask?.resume()
    }
}
