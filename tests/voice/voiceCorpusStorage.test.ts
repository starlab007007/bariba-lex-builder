// Pure classifier copy-tested via import of the logic only (no supabase client in Deno).
function classifyProbe(status: number | null, bodyText = ''): string {
  if (status === null) return 'unknown';
  if (status === 200 || status === 206) return 'present';
  if (status === 404 || /NoSuchKey|not.?found/i.test(bodyText)) return 'missing';
  if (status === 400 && bodyText === '') return 'missing';
  return 'unknown';
}
function assert(c: boolean, m: string) { if (!c) throw new Error(m); }
Deno.test('400 NoSuchKey on signed GET means bytes missing', () => {
  assert(classifyProbe(400, '{"error":"not_found","message":"Object not found","code":"NoSuchKey"}') === 'missing', 'NoSuchKey');
});
Deno.test('206 range response means bytes present', () => assert(classifyProbe(206) === 'present', '206'));
Deno.test('network failure is unknown, never present', () => assert(classifyProbe(null) === 'unknown', 'null'));
Deno.test('500 is unknown, never present', () => assert(classifyProbe(500, 'boom') === 'unknown', '500'));
