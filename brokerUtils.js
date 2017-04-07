function getServerPriority(load, diskSpace) {
  return 0.8 * load + 0.2 * diskSpace;
}

module.exports = { getServerPriority };
