export function bisect<T, E>(array: T[], e: E, cmp: (a: E, b: T) => number, l = 0, r = array.length) {
  let mid: number;
  let c: number;

  while (l < r) {
    mid = l + r >>> 1;
    c = cmp(e, array[mid] as any);
    if (c > 0) {
      l = mid + 1;
    } else {
      r = mid;
    }
  }

  return l;
}

function cmpKeyToEntry(a: any[], b: Entry<any[], any>) {
  return arrayCmp(a, b[0]);
}

export function arrayCmp(a: any[], b: any[]): number {
  for (let i = 0; i < a.length && i < b.length; ++i) {
    let aVal = a[i];
    let bVal = b[i];

    if (Array.isArray(aVal) && Array.isArray(bVal)) {
      let cmp = arrayCmp(aVal, bVal);
      if (cmp !== 0) return cmp;
      continue;
    }

    if (aVal === bVal) continue;

    if (bVal === Infinity) return -1;
    if (aVal === Infinity) return 1;
    if (aVal == null) return -1;
    if (bVal == null) return 1;
    if (aVal < bVal) return -1;
    return 1;
  }

  if (a.length === b.length) return 0;
  if (a.length > b.length) return 1;
  return -1;
}

export type Entry<K extends any[], V> = [K, V];
export type Index<K extends any[], V> = Entry<K, V>[];
export type Keyer<K extends any[], V> = (v: V) => K;
export type SearchKey = any[];
export type IndexIterator<V> = () => V | null

export class Indexer<K extends any[], V> {
  constructor(
    public keyer: Keyer<K, V>,
    public index: Index<K, V> = [],
  ) {
  }

  removeAll(values: V[]) {
    return this.splice(values, []);
  }

  removeByPk<PK extends any[]>(pkIndexer: Indexer<PK, V>, pk: SearchKey) {
    return this.removeAll(pkIndexer.getAllMatching(pk));
  }

  update<PK extends any[]>(values: V[], pkIdx: Indexer<PK, V>) {
    let oldValues = [] as V[];
    let newValues = [] as V[];

    let uniqueValues = uniqueIndex(pkIdx.keyer, values);
    uniqueValues.forEach(v => {
      let existing = pkIdx.getFirstMatching(v[0]);
      if (existing) oldValues.push(existing);
      newValues.push(v[1]);
    });

    return this.splice(oldValues, newValues);
  }

  static iterator<K extends any[], V>(index: Index<K, V>, startKey: SearchKey | null = null, endKey: SearchKey | null = null): IndexIterator<V> {
    let {startIdx, endIdx} = Indexer.getRangeFrom(index, startKey, endKey);
    let idx = startIdx;

    return () => {
      if (idx < endIdx) {
        return (index[idx++] as any)[1];
      }
      return null;
    }
  }

  static reverseIter<K extends any[], V>(index: Index<K, V>, startKey: SearchKey | null = null, endKey: SearchKey | null = null): IndexIterator<V> {
    if (startKey) startKey = [...startKey, undefined];
    if (endKey) endKey = [...endKey, undefined];

    let {startIdx, endIdx} = Indexer.getRangeFrom(index, endKey, startKey);
    let idx = endIdx;

    return () => {
      if (idx > startIdx) {
        return (index[--idx] as any)[1];
      }
      return null;
    }
  }

  getAllMatching(key: SearchKey): V[] {
    let {startIdx, endIdx} = Indexer.getRangeFrom(this.index, key, key.concat([Infinity]));
    return this.index.slice(startIdx, endIdx).map(([_, value]) => value);
  }

  getAllUniqueMatchingAnyOf(keys: SearchKey[]): V[] {
    let result = [] as V[];
    let retrievedIdxs = new Int8Array(this.index.length);

    for(let key of keys) {
      let {startIdx, endIdx} = Indexer.getRangeFrom(this.index, key, key.concat([Infinity]));
      for(; startIdx < endIdx; ++startIdx) {
        if (retrievedIdxs[startIdx]) continue;
        retrievedIdxs[startIdx] = 1;
        result.push((this.index[startIdx] as any)[1]);
      }
    }

    return result;
  }

  static getRangeFrom<K extends any[], V>(index: Index<K, V>, startKey: SearchKey | null = null, endKey: SearchKey | null = null) {
    let startIdx: number;
    let endIdx: number;

    if (startKey == null) {
      startIdx = 0;
    } else {
      startIdx = bisect<Entry<K, V>, any[]>(index, startKey, cmpKeyToEntry);
    }

    if (endKey == null) {
      endIdx = index.length;
    } else {
      endIdx = bisect<Entry<K, V>, any[]>(index, endKey, cmpKeyToEntry);
    }

    return {startIdx, endIdx};
  }

  getFirstMatching(key: K): V | null {
    let iter = Indexer.iterator(this.index, key, key.concat([Infinity]));
    return iter();
  }

  private splice(removeValues: V[], addValues: V[]): Indexer<K, V> {
    if (!removeValues.length && !addValues.length) {
      return this;
    }


    let index = [...this.index];
    let valuesToRemove = removeValues;
    let valuesToAdd = addValues;

    for (let value of valuesToRemove) {
      let key = this.keyer(value);
      let {startIdx, endIdx} = Indexer.getRangeFrom(index, key, key.concat([null]));
      index.splice(startIdx, endIdx - startIdx);
    }

    for (let value of valuesToAdd) {
      let key = this.keyer(value);
      let {startIdx} = Indexer.getRangeFrom(index, key);
      index.splice(startIdx, 0, [key, value]);
    }

    return new Indexer<K, V>(this.keyer, index);
  }
}

function uniqueIndex<K extends any[], V>(keyer: Keyer<K, V>, values: V[]): Index<K, V> {
  const index: Index<K, V> = [];

  for (let value of values) {
    let key = keyer(value);
    let {startIdx, endIdx} = Indexer.getRangeFrom(index, key, key.concat([null]));
    index.splice(startIdx, endIdx - startIdx, [key, value]);
  }

  return index;
}
