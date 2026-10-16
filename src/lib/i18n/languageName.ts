/** Product display name only. API identifiers, URLs and original user text stay intact. */
export function displayLanguageName(text: string): string {
  return text.normalize("NFC").split(/((?:https?|wss?):\/\/[^\s<>"']+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/giu).map((part, index) => index % 2 ? part : part.replace(
      /(?<![\p{L}\p{N}_])(?:bariba|b[aàáâäãā]{1,2}t[ɔoóòôõöō]\p{M}*n[uúùûũüū]|baat[ɔo]n(?:u|ou)?m)(?![\p{L}\p{N}_])/giu,
      "Baatɔnum",
    )).join("");
}
