const { expo } = require('./app.json');

function extractVersionFromTag(tag) {
  if (!tag || typeof tag !== 'string') {
    return null;
  }

  const normalizedTag = tag.trim().replace(/^refs\/tags\//, '').replace(/^v/, '');
  const version = normalizedTag.split('-')[0];

  return /^\d+\.\d+\.\d+$/.test(version) ? version : null;
}

module.exports = () => {
  const tagVersion =
    extractVersionFromTag(process.env.APP_VERSION_FROM_TAG) ||
    extractVersionFromTag(process.env.EAS_BUILD_GIT_TAG);

  return {
    ...expo,
    version: tagVersion || expo.version,
  };
};
