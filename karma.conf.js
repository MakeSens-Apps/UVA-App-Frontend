// filepath: karma.conf.js
module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reports: ['html', 'lcovonly'],
      fixWebpackSourcePaths: true,
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadlessLinux', 'FirefoxHeadless'],
    customLaunchers: {
      ChromeHeadlessLinux: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          '--disable-extensions',
        ],
      },
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['--headless', '--no-sandbox', '--disable-gpu'],
      },
    },
    singleRun: true,
    files: [
      {
        pattern:
          './src/app/core/services/view/gamification/gamification.service.spec.ts',
        watched: false,
        type: 'service', // Add this line to specify the file type
      },
    ],
  });
};
