const assert = require('assert');
const sequelizeCacheKey = require('../lib/sequelizeCacheKey')

describe('sequelizeCacheKey', () => {
    describe('handles', () => {
        it('symbols', () => {
            const o = {a: 1, b: 'foo', [Symbol('c')]: 'bar'};
            assert.equal(sequelizeCacheKey(o), `{ a: 1, b: 'foo', [Symbol(c)]: 'bar' }`);
        })

        it('nested', () => {
            const o = {a: 1, b: 'foo', c: {d: 'bar'}};
            assert.equal(sequelizeCacheKey(o), `{ a: 1, b: 'foo', c: { d: 'bar' } }`);
        });

        it('circular', () => {
            const o = {a: 1, b: 'foo', [Symbol('d')]: 'bar'};
            o.c = o;
            assert.equal(sequelizeCacheKey(o), `<ref *1> { a: 1, b: 'foo', c: [Circular *1], [Symbol(d)]: 'bar' }`);
        });
    });
})
