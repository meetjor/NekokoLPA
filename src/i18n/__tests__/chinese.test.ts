import en from '../en/main.json';
import zh from '../zh/main.json';
test('Chinese covers English keys and preserves interpolation arguments', () => {
  const variables = (value: string) => (value.match(/{{\s*[^}]+\s*}}/g) || []).sort();
  for (const [key, value] of Object.entries(en)) {
    expect(Object.hasOwn(zh, key)).toBe(true);
    expect(variables(zh[key as keyof typeof zh])).toEqual(variables(value));
  }
});
