import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../web/stories/**/*.stories.tsx"],
  staticDirs: ["./public", "../web/static"],
  core: { disableTelemetry: true },
  // The app's Vite config is an MPA with an API proxy and a production output
  // directory. Storybook owns its own entrypoints and must never use that proxy.
  async viteFinal(config) {
    return { ...config, server: { ...config.server, proxy: undefined } };
  },
  framework: {
    name: "@storybook/react-vite",
    options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } },
  },
};
export default config;
