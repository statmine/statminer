

export function lookup(array, value, property = "name") {
  if (value === undefined) return undefined;
  for (let i = 0; i < array.length; ++i) {
    if (array[i][property] === value) return array[i];
  }
  return undefined;
}
