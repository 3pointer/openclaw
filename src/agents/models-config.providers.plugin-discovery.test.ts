import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderPlugin } from "../plugins/types.js";

const resolvePluginDiscoveryProvidersMock = vi.fn();
const discoveryRunMock = vi.fn();

vi.mock("../plugins/provider-discovery.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../plugins/provider-discovery.js")>();
  return {
    ...actual,
    resolvePluginDiscoveryProviders: (...args: unknown[]) =>
      resolvePluginDiscoveryProvidersMock(...args),
  };
});

function makeAgentDir(): string {
  return mkdtempSync(join(tmpdir(), "openclaw-plugin-discovery-"));
}

function makePluginProvider(): ProviderPlugin {
  return {
    id: "demo-plugin-provider",
    label: "Demo Plugin Provider",
    auth: [],
    discovery: {
      order: "simple",
      run: discoveryRunMock,
    },
  };
}

describe("resolveImplicitProviders plugin discovery gating", () => {
  beforeEach(() => {
    resolvePluginDiscoveryProvidersMock.mockReset();
    discoveryRunMock.mockReset();
    resolvePluginDiscoveryProvidersMock.mockReturnValue([makePluginProvider()]);
    discoveryRunMock.mockResolvedValue({
      provider: {
        baseUrl: "http://127.0.0.1:4010/v1",
        models: [],
      },
    });
  });

  it("skips plugin discovery when explicitly disabled", async () => {
    const { resolveImplicitProviders } = await import("./models-config.providers.js");

    const providers = await resolveImplicitProviders({
      agentDir: makeAgentDir(),
      env: {},
      includePluginDiscovery: false,
    });

    expect(resolvePluginDiscoveryProvidersMock).not.toHaveBeenCalled();
    expect(discoveryRunMock).not.toHaveBeenCalled();
    expect(providers?.["demo-plugin-provider"]).toBeUndefined();
  });

  it("keeps plugin discovery enabled by default", async () => {
    const { resolveImplicitProviders } = await import("./models-config.providers.js");

    const providers = await resolveImplicitProviders({
      agentDir: makeAgentDir(),
      env: {},
    });

    expect(resolvePluginDiscoveryProvidersMock).toHaveBeenCalled();
    expect(discoveryRunMock).toHaveBeenCalled();
    expect(providers?.["demo-plugin-provider"]).toEqual({
      baseUrl: "http://127.0.0.1:4010/v1",
      models: [],
    });
  });
});
