function getServerPriority(load, diskSpace) {
  return (0.5 * load) + (0.5 * diskSpace);
}

module.exports = { getServerPriority };
