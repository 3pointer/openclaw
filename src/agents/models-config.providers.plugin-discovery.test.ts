import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { captureEnv } from "../test-utils/env.js";

describe("plugin-backed implicit provider discovery", () => {
  it("stays off by default without affecting non-plugin implicit providers", async () => {
    const envSnapshot = captureEnv([
      "MOONSHOT_API_KEY",
      "OPENCLAW_ENABLE_PLUGIN_PROVIDER_DISCOVERY",
    ]);
    process.env.MOONSHOT_API_KEY = "sk-test";
    delete process.env.OPENCLAW_ENABLE_PLUGIN_PROVIDER_DISCOVERY;

    vi.resetModules();
    const resolvePluginDiscoveryProviders = vi.fn(() => {
      throw new Error("plugin discovery should be skipped");
    });
    vi.doMock("../plugins/provider-discovery.js", () => ({
      groupPluginDiscoveryProvidersByOrder: () => ({
        simple: [],
        profile: [],
        paired: [],
        late: [],
      }),
      normalizePluginDiscoveryResult: () => ({}),
      resolvePluginDiscoveryProviders,
    }));

    try {
      const { resolveImplicitProviders } = await import("./models-config.providers.js");
      const providers = await resolveImplicitProviders({
        agentDir: mkdtempSync(join(tmpdir(), "openclaw-test-")),
      });
      expect(providers?.moonshot).toBeDefined();
      expect(resolvePluginDiscoveryProviders).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("../plugins/provider-discovery.js");
      vi.resetModules();
      envSnapshot.restore();
    }
  });

  it("stays off when plugins.autoDiscover is false even if the env opt-in is set", async () => {
    const envSnapshot = captureEnv([
      "MOONSHOT_API_KEY",
      "OPENCLAW_ENABLE_PLUGIN_PROVIDER_DISCOVERY",
    ]);
    process.env.MOONSHOT_API_KEY = "sk-test";
    process.env.OPENCLAW_ENABLE_PLUGIN_PROVIDER_DISCOVERY = "1";

    vi.resetModules();
    const resolvePluginDiscoveryProviders = vi.fn(() => {
      throw new Error("plugin discovery should be skipped");
    });
    vi.doMock("../plugins/provider-discovery.js", () => ({
      groupPluginDiscoveryProvidersByOrder: () => ({
        simple: [],
        profile: [],
        paired: [],
        late: [],
      }),
      normalizePluginDiscoveryResult: () => ({}),
      resolvePluginDiscoveryProviders,
    }));

    try {
      const { resolveImplicitProviders } = await import("./models-config.providers.js");
      const providers = await resolveImplicitProviders({
        agentDir: mkdtempSync(join(tmpdir(), "openclaw-test-")),
        config: {
          plugins: {
            autoDiscover: false,
          },
        },
      });
      expect(providers?.moonshot).toBeDefined();
      expect(resolvePluginDiscoveryProviders).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("../plugins/provider-discovery.js");
      vi.resetModules();
      envSnapshot.restore();
    }
  });

  it("can be re-enabled explicitly", async () => {
    const envSnapshot = captureEnv([
      "MOONSHOT_API_KEY",
      "OPENCLAW_ENABLE_PLUGIN_PROVIDER_DISCOVERY",
    ]);
    process.env.MOONSHOT_API_KEY = "sk-test";
    process.env.OPENCLAW_ENABLE_PLUGIN_PROVIDER_DISCOVERY = "1";

    vi.resetModules();
    vi.doMock("../plugins/provider-discovery.js", () => ({
      groupPluginDiscoveryProvidersByOrder: () => ({
        simple: [],
        profile: [],
        paired: [],
        late: [],
      }),
      normalizePluginDiscoveryResult: () => ({}),
      resolvePluginDiscoveryProviders: () => {
        throw new Error("plugin discovery reached");
      },
    }));

    try {
      const { resolveImplicitProviders } = await import("./models-config.providers.js");
      await expect(
        resolveImplicitProviders({
          agentDir: mkdtempSync(join(tmpdir(), "openclaw-test-")),
        }),
      ).rejects.toThrow("plugin discovery reached");
    } finally {
      vi.doUnmock("../plugins/provider-discovery.js");
      vi.resetModules();
      envSnapshot.restore();
    }
  });
});
