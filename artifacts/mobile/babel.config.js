module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      ["transform-inline-environment-variables", { include: ["GOOGLE_API_KEY"] }],
    ],
  };
};
