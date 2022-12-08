'use strict';

var redis = require('redis');
var Sequelize = require('sequelize');
var should = require('should');
var cacher = require('..');
const util = require('../lib/util')
const { isSequelizeModel } = util;

var opts = {};
opts.database = process.env.DB_NAME || 'sequelize_redis_cache_test';
opts.user = process.env.DB_USER || 'root';
opts.password = process.env.DB_PASS;
opts.dialect = process.env.DB_DIALECT || 'sqlite';
opts.logging = process.env.DB_LOG ? console.log : false;

var redisPort = process.env.REDIS_PORT || 6379;
var redisHost = process.env.REDIS_HOST;

/*global describe*/
/*global it*/
/*global before*/
/*global after*/

function onErr(err) {
  throw err;
}

describe('Sequelize-Redis-Cache', function() {
  var rc;
  var db;
  var Entity;
  var Entity2;
  var inst;

  before(async function() {
    rc = redis.createClient(redisPort, redisHost);
    rc.on('error', onErr);
    db = new Sequelize(opts.database, opts.user, opts.password, opts);
    Entity = db.define('entity', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: Sequelize.STRING(255)
    });
    Entity2 = db.define('entity2', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      }
    });
    Entity2.belongsTo(Entity, { foreignKey: 'entityId' });
    Entity.hasMany(Entity2, { foreignKey: 'entityId' });
    return Entity.sync({ force: true })
      .then(function() {
        return Entity2.sync({ force: true }).then(function() {
          return Entity.create({ name: 'Test Instance' }).then(function(entity) {
            inst = entity;
            return Entity2.create({ entityId: inst.id }).then(function() {

            })
            .catch(onErr);
          })
          .catch(onErr);
        })
        .catch(onErr);
      })
      .catch(onErr);
  });

  it('should fetch stuff from database with and without cache', function() {
    var query = { where: { createdAt: inst.createdAt } };
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.findOne(query)
      .then(function() {
        obj.cacheHit.should.equal(false);
        var obj2 = cacher(db, rc)
          .model('entity')
          .ttl(1);
        return obj2.findOne(query)
          .then(function(res) {
            should.exist(res);
            obj2.cacheHit.should.equal(true);
            obj2.clearCache().then(function() {}, onErr);
          }, onErr);
      }, onErr);
  });

  it('should not hit cache if no results', function() {
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.findOne({ where: { id: 2 } })
      .then(function(res) {
        should.not.exist(res);
        obj.cacheHit.should.equal(false);
      }, onErr);
  });

  it('should clear the cache correctly', function() {
    var query = { where: { createdAt: inst.createdAt } };
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.findOne(query)
      .then(function() {
        var key = obj.key();
        obj.clearCache(query)
          .then(function() {
            rc.get(key, function(err, res) {
              should.not.exist(err);
              should.not.exist(res);
            });
          }, onErr);
      }, onErr);
  });

  it('should not blow up with circular reference queries (includes)', function() {
    var query = { where: { createdAt: inst.createdAt }, include: [Entity2] };
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.findOne(query)
      .then(function() {}, onErr);
  });

  it('should return a POJO when retrieving from cache and when not', function() {
    var obj;
    var query = { where: { createdAt: inst.createdAt } };
    query.include = [Entity2];
    obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.findOne(query)
      .then(function(res) {
          res.toString().should.not.equal('[object SequelizeInstance]');
          res.should.have.property('entity2s');
          res.entity2s.should.have.length(1);
          res.entity2s[0].toString().should.not.equal('[object SequelizeInstance]');
      }, onErr);
  });

  it('should run a raw query correctly', function() {
    var obj = cacher(db, rc)
      .ttl(1);
    return obj.query('SELECT * FROM entities')
      .then(function(res) {
        should.exist(res);
        res.should.be.an.Array;
        res.should.have.length(1);
        res[0].should.have.property('id', 1);
        res[0].should.have.property('name', 'Test Instance');
        res[0].should.have.property('createdAt');
        res[0].should.have.property('updatedAt');
      });
  });

  it('should findAll correctly', function() {
    var query = { where: { createdAt: inst.createdAt } };
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.findAll(query)
      .then(function(res) {
        should.exist(res);
        res.should.be.an.Array;
        res.should.have.length(1);
        res[0].should.have.property('id');
      }, onErr);
  });

  it('should findAndCountAll correctly', function() {
    var query = { where: { createdAt: inst.createdAt } };
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.findAndCountAll(query)
      .then(function(res) {
        should.exist(res);
        res.should.have.property('count', 1);
      });
  });

  it('should count correctly', function() {
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.count()
      .then(function(res) {
        should.exist(res);
        res.should.equal(1);
      }, onErr);
  });

  it('should sum correctly', function() {
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.sum('id')
      .then(function(res) {
        should.exist(res);
        res.should.equal(1);
      }, onErr);
  });

  it('should max correctly', function() {
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.max('id')
      .then(function(res) {
        should.exist(res);
        res.should.equal(1);
      }, onErr);
  });

  it('should min correctly', function() {
    var obj = cacher(db, rc)
      .model('entity')
      .ttl(1);
    return obj.min('id')
      .then(function(res) {
        should.exist(res);
        res.should.equal(1);
      }, onErr);
  });

  // we test this here since we have a real Sequelize model available
  describe('isSequelizeModel', () => {
    it('returns true for a Sequelize model', () => {
      isSequelizeModel(Entity).should.be.true();
    })
    it('returns false for other values', () => {
      [{}, 'foo', {a: 1, b: 'foo', c: 'bar'}].forEach(value => isSequelizeModel(value).should.equal(false));
    })
  });
});
