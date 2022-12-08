const cloneDeep = require("lodash.clonedeep");

// marks what would otherwise be a repeat reference to the same object when serializing a containing object
const DUPLICATE_MARKER = "[Duplicate]";

/**
 * Serialize Sequelize finder options, will form portion of cache key unique to a specific find method invocation.
 * @param finderOptions options passed to the find method, unmodified by this function
 * @returns string cache key
 */
const serializeFinderOptions = (finderOptions) =>
    stripDoubleQuotes(JSON.stringify(stringifySafe(cloneDeep(finderOptions))));

/**
 * Make input safe for fully-representative JSON.stringify:
 *  * replace Symbol keys with String representations (Symbol keys are ignored by JSON.stringify)
 *  * replace repeat values (possible cycles) with String indicator (circular refs are unhandled by JSON.stringify)
 * @param obj
 * @param seen optional, WeakSet to track previously-seen values
 * @returns {*|string|String}
 */
const stringifySafe = (obj, seen = new WeakSet()) => {
  if (obj === null) {
    return obj;
  }
  if (typeof obj === "undefined") {
    return obj;
  }
  if (obj.constructor === String) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return stringifySafeArray(obj, seen);
  }
  if (isObjectLike(obj)) {
    return stringifySafeObject(obj, seen);
  }
  return obj;
};

/**
 * Make array input safe for fully-representative JSON.stringify.
 * @param obj input
 * @param seen optional, WeakSet containing items seen previously during serialization
 * @returns {*|string}
 */
const stringifySafeArray = (obj, seen= new WeakSet()) => {
  if (!Array.isArray(obj)) {
    throw new Error("stringifySafeArray should only be called on arrays");
  }

  const replacement = replacementIfDuplicate(obj, seen);
  if (replacement) {
    return replacement;
  }

  return obj.map((item) => stringifySafe(item, seen));
};

/**
 * Make object input safe for fully-representative JSON.stringify
 * @param obj object
 * @param seen optional, WeakSet containing items seen previously during serialization
 * @returns {*|string}
 */
const stringifySafeObject = (obj, seen = new WeakSet()) => {
  if (!isObjectLike(obj)) {
    throw new Error("stringifySafeObject should only be called on objects");
  }

  // if we have already seen this object, don't serialize further - replace with String marker
  const replacement = replacementIfDuplicate(obj, seen);
  if (replacement) {
    return replacement;
  }

  // if this is a Sequelize model, don't serialize - replace with model name
  const modelReplacement = replacementIfSequelizeModel(obj);
  if (modelReplacement) {
    return modelReplacement;
  }

  // stringifySafe all children of this object
  // N.B. we must iterate over both String AND Symbol keys like Op.gt
  Reflect.ownKeys(obj).forEach((key) => {
    // ensure any Symbol-indexed values are set again on the Object with a String key
    // N.B. we do not need to remove the Symbol-indexed field since it will be ignored by JSON.stringify
    const stringKey = key.toString();
    obj[stringKey] = stringifySafe(obj[key], seen);
  });
  return obj;
};

/**
 * @param obj input
 * @returns {boolean} true if non-null/undefined, non-Array object
 */
const isObjectLike = (obj) => {
  return obj != null && typeof obj == "object" && !Array.isArray(obj);
};

const stripDoubleQuotes = (s) => s.replaceAll('"', "");

const isSequelizeModel = (obj) =>
  ["DAO", "sequelize"].some((property) => obj?.hasOwnProperty(property));

/**
 * If value is a Sequelize model, return a replacement, the String model name.
 * We don't need or want to serialize the whole model as part of the cache key.
 * @param obj
 * @returns {*|string}
 */
const replacementIfSequelizeModel = (obj) => {
  if (isSequelizeModel(obj)) {
    return obj?.name || "[sequelize model]";
  }
};

/**
 * If value is already contained in seen, return duplicate indicator, otherwise add to seen.
 * @param obj
 * @param seen WeakSet
 * @returns {string}
 */
const replacementIfDuplicate = (obj, seen) => {
  if (seen.has(obj)) {
    return DUPLICATE_MARKER;
  } else {
    seen.add(obj);
  }
};

const util = {
  serializeFinderOptions,
  isSequelizeModel,
  DUPLICATE_MARKER,
};

module.exports = util;
