const assert = require('assert');
const util = require('../lib/util');
const { serializeFinderOptions, DUPLICATE_MARKER } = util;

describe('serializeFinderOptions', () => {
    describe('handles', () => {
        it('symbol key', () => {
            const o = {a: 1, b: 'foo', [Symbol('c')]: 'bar'};
            assert.equal(serializeFinderOptions(o), `{a:1,b:foo,Symbol(c):bar}`);
        })
        it('nested', () => {
            const o = {a: 1, b: 'foo', c: {d: 'bar'}};
            assert.equal(serializeFinderOptions(o), `{a:1,b:foo,c:{d:bar}}`);
        });
        it('cycle', () => {
            const o = {a: 1, b: 'foo' };
            o.c = o;
            assert.equal(serializeFinderOptions(o), `{a:1,b:foo,c:${DUPLICATE_MARKER}}`);
        });
        it('cycle with symbol key', () => {
            const o = {a: 1, b: 'foo', [Symbol('d')]: 'bar'};
            o.c = o;
            assert.equal(serializeFinderOptions(o), `{a:1,b:foo,c:${DUPLICATE_MARKER},Symbol(d):bar}`);
        });
        describe('arrays', () => {
            it('basic', () => {
                const o = [1, 2, 3];
                assert.equal(serializeFinderOptions(o), '[1,2,3]');
            });
            it('cycle in nested array', () => {
                const o = {a: 1, b: []};
                o.b.push(o);
                assert.equal(serializeFinderOptions(o), `{a:1,b:[${DUPLICATE_MARKER}]}`);
            });
            it('cycle in nested object', () => {
                const b = {};
                b.cycle = b;
                const o = {a: 1, b};
                assert.equal(serializeFinderOptions(o), `{a:1,b:{cycle:${DUPLICATE_MARKER}}}`);
            });
            it('cycle in self-referencing array', () => {
                const arr = [1,2];
                arr.push(arr);
                assert.equal(serializeFinderOptions(arr), `[1,2,${DUPLICATE_MARKER}]`);
            });
        })
    });
})
