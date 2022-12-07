var util = require('util')

// TODO shouldn't depend on util.inspect
const sequelizeCacheKey = finderOptions => util.inspect(finderOptions);

module.exports = sequelizeCacheKey;
