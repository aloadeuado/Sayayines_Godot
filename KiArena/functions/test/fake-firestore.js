// Firestore en memoria, suficiente para probar el modelo de cuentas sin tocar
// datos reales: doc/collection/where/limit, set con merge y transacciones que
// exigen leer antes de escribir, como Firestore.
let autoId = 0;

const same = (a, b) => (a && typeof a === 'object' && 'path' in a ? b && b.path === a.path : a === b);

class Snapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = data !== undefined;
    this._data = data;
  }
  data() {
    return this._data === undefined ? undefined : { ...this._data };
  }
}

class DocRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split('/').pop();
  }
  async get() {
    return new Snapshot(this, this.db.store.get(this.path));
  }
  async set(data, options) {
    this.db.write(this.path, data, options);
  }
}

class Query {
  constructor(db, path, filters = [], max = Infinity) {
    this.db = db;
    this.path = path;
    this.filters = filters;
    this.max = max;
  }
  where(field, op, value) {
    if (op !== '==') throw new Error('Solo == en el fake');
    return new Query(this.db, this.path, [...this.filters, [field, value]], this.max);
  }
  limit(n) {
    return new Query(this.db, this.path, this.filters, n);
  }
  async get() {
    const docs = [];
    for (const [path, data] of this.db.store) {
      if (path.slice(0, path.lastIndexOf('/')) !== this.path) continue;
      if (this.filters.every(([field, value]) => same(value, data[field]))) docs.push(new Snapshot(new DocRef(this.db, path), data));
    }
    return { docs: docs.slice(0, this.max), empty: docs.length === 0 };
  }
}

class CollectionRef extends Query {
  doc(id) {
    return new DocRef(this.db, `${this.path}/${id || `auto${String(++autoId).padStart(6, '0')}`}`);
  }
}

export class FakeFirestore {
  constructor() {
    this.store = new Map();
  }
  collection(path) {
    return new CollectionRef(this, path);
  }
  doc(path) {
    return new DocRef(this, path);
  }
  write(path, data, options) {
    const base = options?.merge ? this.store.get(path) || {} : {};
    this.store.set(path, { ...base, ...data });
  }
  async runTransaction(fn) {
    const writes = [];
    const tx = {
      get: async target => {
        if (writes.length) throw new Error('Firestore exige leer antes de escribir en una transacción');
        return target.get();
      },
      set: (ref, data, options) => {
        writes.push([ref.path, data, options]);
      }
    };
    const result = await fn(tx);
    for (const [path, data, options] of writes) this.write(path, data, options);
    return result;
  }
  read(path) {
    return this.store.get(path);
  }
  list(prefix) {
    return [...this.store.entries()].filter(([path]) => path.startsWith(prefix)).map(([path, data]) => ({ path, ...data }));
  }
}
