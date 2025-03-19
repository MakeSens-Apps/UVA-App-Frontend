module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      './src/app/core/services/view/gamification/gamification.service.spec.ts',
    ],
    browsers: ['ChromeHeadlessCustom'],
    customLaunchers: {
      ChromeHeadlessCustom: {
        base: 'ChromeHeadless',
        flags: [
          '--disable-web-security',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-features=NetworkService',
          '--proxy-server="direct://"',
          '--proxy-bypass-list=*',
          '--disable-dev-shm-usage',
        ],
      },
    },
    singleRun: true,
  });
};
