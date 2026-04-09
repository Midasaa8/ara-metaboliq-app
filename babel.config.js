module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", {
                jsxImportSource: "nativewind",
                worklets: true
            }],
            "nativewind/babel",
        ],
        plugins: ["react-native-reanimated/plugin"],
    };
};
