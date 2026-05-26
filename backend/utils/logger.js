function _format(level, msg, meta) {
  const out = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta
  };
  return JSON.stringify(out);
}

function info(msg, meta = {}) {
  console.log(_format('info', msg, meta));
}

function warn(msg, meta = {}) {
  console.warn(_format('warn', msg, meta));
}

function error(msg, meta = {}) {
  console.error(_format('error', msg, meta));
}

module.exports = { info, warn, error };
